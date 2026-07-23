// Task 3 (provisioning-state-machine): legt twee gedragingen vast die
// activation.js nu regelt zonder de bestaande garanties (registry-gebruik,
// wacht_op_klant, manual-escape-hatch, replay-idempotentie — zie
// activation.test.js / activation-registry.test.js) te breken:
//
//   1. Een mislukte provisioning-poging alert NIET meer meteen — attempts
//      wordt bijgehouden in provisioning_json en pas de 3e opeenvolgende
//      mislukking (attempts >= 3) escaleert naar park()'s storingsalert.
//   2. wacht_op_klant (spec §5) alert NOOIT — noch bij het interim-seintje
//      dat Task 3 heeft verwijderd, noch anderszins. De klant wordt voortaan
//      via /portal/onboarding + de nudge-cron benaderd (Task 8/13), niet via
//      een staff-alert.
//
// De provisioner-registry (resolve/canProvision) EN notify.js (alertStaff)
// zijn hier gemockt: dit bestand dekt de state-machine in activation.js
// zelf, niet wat een specifieke provisioner besluit of hoe een alert wordt
// afgeleverd (dat dekken provisioners/voice.test.js en notify.test.js).
import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';

const provisionMock = vi.fn();

vi.mock('../src/lib/provisioners/index.js', () => ({
  resolve: (pk) => (pk === 'emma-telefoon' ? { provision: provisionMock } : null),
  canProvision: (pk) => pk === 'emma-telefoon',
}));

const alertStaffMock = vi.fn();
vi.mock('../src/lib/notify.js', () => ({
  alertStaff: (...args) => alertStaffMock(...args),
}));

const { activateOrder } = await import('../src/lib/activation.js');

beforeEach(() => {
  provisionMock.mockReset();
  alertStaffMock.mockReset();
});

// In-memory D1-dubbel, zelfde stijl als activation.test.js / activation-registry.test.js.
// `initialOrderStatus` + de CAS-achtige WHERE-clausules op de 'in_uitvoering'-
// UPDATE volgen de echte SQL in activation.js, zodat deze dubbel dezelfde
// fires-once-garanties test die de productiecode moet leveren.
function makeDb({ servicesSeed = null, initialOrderStatus = 'ingediend' } = {}) {
  const state = {
    services: servicesSeed ? [{ ...servicesSeed }] : [],
    orderStatusUpdates: [],
    orderStatus: initialOrderStatus,
  };
  return {
    state,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (sql.startsWith('INSERT OR IGNORE INTO services')) {
                const orderId = args[9];
                if (!state.services.some((s) => s.order_id === orderId)) {
                  state.services.push({
                    id: args[0], customer_id: args[1], product_key: args[2], order_id: orderId,
                    provisioning_json: null,
                  });
                }
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith('UPDATE services SET provisioning_json')) {
                const [provisioningJson, svcId] = args;
                const svc = state.services.find((s) => s.id === svcId);
                if (svc) svc.provisioning_json = provisioningJson;
                return { meta: { changes: svc ? 1 : 0 } };
              }
              if (sql.startsWith("UPDATE service_orders SET status = 'actief'")) {
                state.orderStatusUpdates.push({ status: 'actief', orderId: args[0] });
                state.orderStatus = 'actief';
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith("UPDATE service_orders SET status = 'in_uitvoering'")) {
                if (state.orderStatus === 'in_uitvoering' || state.orderStatus === 'actief') {
                  return { meta: { changes: 0 } }; // CAS-miss: al in die toestand
                }
                state.orderStatus = 'in_uitvoering';
                state.orderStatusUpdates.push({ status: 'in_uitvoering', orderId: args[0] });
                return { meta: { changes: 1 } };
              }
              throw new Error(`makeDb: geen .run() canned voor: ${sql}`);
            },
            async first() {
              if (sql.startsWith('SELECT id, provisioning_json FROM services WHERE order_id')) {
                const svc = state.services.find((s) => s.order_id === args[0]);
                return svc ? { id: svc.id, provisioning_json: svc.provisioning_json } : null;
              }
              throw new Error(`makeDb: geen .first() canned voor: ${sql}`);
            },
          };
        },
      };
    },
  };
}

function funnelOrder(overrides = {}) {
  return {
    id: 'ord_1', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter',
    status: 'ingediend', intake_json: '{}', voorstel_id: 'vst_1', ...overrides,
  };
}

describe('activateOrder — attempts-teller op het fout-pad', () => {
  it('eerste mislukking: attempts gaat van 0 naar 1, GEEN alert, order stil op in_uitvoering', async () => {
    const db = makeDb();
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    provisionMock.mockResolvedValueOnce({ status: 'fout', error: 'boom' });

    const result = await activateOrder(env, funnelOrder());

    expect(result.status).toBe('in_uitvoering');
    expect(alertStaffMock).not.toHaveBeenCalled();
    const svc = db.state.services.find((s) => s.order_id === 'ord_1');
    expect(JSON.parse(svc.provisioning_json)).toEqual({ status: 'fout', error: 'boom', attempts: 1 });
    expect(db.state.orderStatusUpdates).toEqual([{ status: 'in_uitvoering', orderId: 'ord_1' }]);
  });

  it('derde mislukking op rij (binnenkomend attempts:2 → 3): WEL alert, park-pad', async () => {
    const db = makeDb({
      servicesSeed: {
        id: 'svc_1', customer_id: 'cust_1', product_key: 'emma-telefoon', order_id: 'ord_1',
        provisioning_json: JSON.stringify({ status: 'fout', error: 'eerder boom', attempts: 2 }),
      },
    });
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    provisionMock.mockResolvedValueOnce({ status: 'fout', error: 'boom opnieuw' });

    const result = await activateOrder(env, funnelOrder());

    expect(result.status).toBe('in_uitvoering');
    expect(alertStaffMock).toHaveBeenCalledTimes(1);
    const [, subject, body] = alertStaffMock.mock.calls[0];
    expect(subject).toContain('ord_1');
    expect(body).toContain('boom opnieuw');
    const svc = db.state.services.find((s) => s.order_id === 'ord_1');
    expect(JSON.parse(svc.provisioning_json)).toEqual({ status: 'fout', error: 'boom opnieuw', attempts: 3 });
  });

  it('tweede mislukking op rij (binnenkomend attempts:1 → 2): nog GEEN alert', async () => {
    const db = makeDb({
      servicesSeed: {
        id: 'svc_1', customer_id: 'cust_1', product_key: 'emma-telefoon', order_id: 'ord_1',
        provisioning_json: JSON.stringify({ status: 'fout', error: 'eerder boom', attempts: 1 }),
      },
    });
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    provisionMock.mockResolvedValueOnce({ status: 'fout', error: 'boom' });

    const result = await activateOrder(env, funnelOrder());

    expect(result.status).toBe('in_uitvoering');
    expect(alertStaffMock).not.toHaveBeenCalled();
    const svc = db.state.services.find((s) => s.order_id === 'ord_1');
    expect(JSON.parse(svc.provisioning_json).attempts).toBe(2);
  });

  it('een geslaagde run na eerdere mislukkingen wist de attempts-teller (nieuw object, geen attempts-veld)', async () => {
    const db = makeDb({
      servicesSeed: {
        id: 'svc_1', customer_id: 'cust_1', product_key: 'emma-telefoon', order_id: 'ord_1',
        provisioning_json: JSON.stringify({ status: 'fout', error: 'eerder boom', attempts: 2 }),
      },
    });
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    provisionMock.mockResolvedValueOnce({ status: 'klaar', provisioning: { status: 'agent_aangemaakt', agent_id: 'ag_1' } });

    // Portal-order (geen voorstel_id) zodat een geslaagde run direct 'actief' wordt
    // en we het geschreven provisioning_json rechtstreeks kunnen inspecteren.
    const result = await activateOrder(env, funnelOrder({ voorstel_id: null }));

    expect(result.status).toBe('actief');
    const svc = db.state.services.find((s) => s.order_id === 'ord_1');
    expect(JSON.parse(svc.provisioning_json)).toEqual({ status: 'agent_aangemaakt', agent_id: 'ag_1' });
  });
});

describe('activateOrder — wacht_op_klant alert NOOIT', () => {
  it('provisioner geeft wacht_op_klant (onvolledige intake): order op in_uitvoering, alertStaff NIET aangeroepen', async () => {
    const db = makeDb();
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    provisionMock.mockResolvedValueOnce({ status: 'wacht_op_klant', wachtOp: ['bereikbaarheid.openingstijden'] });

    const result = await activateOrder(env, funnelOrder());

    expect(result.status).toBe('wacht_op_klant');
    expect(alertStaffMock).not.toHaveBeenCalled();
    expect(db.state.orderStatusUpdates).toEqual([{ status: 'in_uitvoering', orderId: 'ord_1' }]);
  });

  it('funnel-order met geslaagde provisioning: wacht_op_klant, alertStaff NIET aangeroepen (interim-seintje is verwijderd)', async () => {
    const db = makeDb();
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    provisionMock.mockResolvedValueOnce({ status: 'klaar', provisioning: { status: 'agent_aangemaakt', agent_id: 'ag_1' } });

    const result = await activateOrder(env, funnelOrder());

    expect(result.status).toBe('wacht_op_klant');
    expect(alertStaffMock).not.toHaveBeenCalled();
    expect(db.state.orderStatusUpdates).toEqual([{ status: 'in_uitvoering', orderId: 'ord_1' }]);
  });

  it('manual:true op een order met ONVOLLEDIGE intake: provisioner geeft wacht_op_klant, order gaat NIET naar actief', async () => {
    const db = makeDb();
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    provisionMock.mockResolvedValueOnce({ status: 'wacht_op_klant', wachtOp: ['bereikbaarheid.openingstijden'] });

    const result = await activateOrder(env, funnelOrder(), { manual: true });

    // manual forceert geen live agent zonder geslaagde provisioning: de
    // provisioner besliste zelf dat de intake niet compleet genoeg is, en dat
    // oordeel geldt ongeacht manual.
    expect(result.status).toBe('wacht_op_klant');
    expect(db.state.orderStatusUpdates).toEqual([{ status: 'in_uitvoering', orderId: 'ord_1' }]);
    expect(db.state.orderStatusUpdates.some((u) => u.status === 'actief')).toBe(false);
    expect(alertStaffMock).not.toHaveBeenCalled();
  });
});

describe('activateOrder — geslaagde provisioning wordt nooit herhaald', () => {
  it('provisioning_json.status is al niet-fout: provisioner wordt niet opnieuw aangeroepen', async () => {
    const db = makeDb({
      servicesSeed: {
        id: 'svc_1', customer_id: 'cust_1', product_key: 'emma-telefoon', order_id: 'ord_1',
        provisioning_json: JSON.stringify({ status: 'agent_aangemaakt', agent_id: 'ag_1' }),
      },
    });
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };

    // portal-order (voorstel_id null): geslaagde provisioning gaat direct naar actief
    const result = await activateOrder(env, funnelOrder({ voorstel_id: null }));

    expect(result.status).toBe('actief');
    expect(provisionMock).not.toHaveBeenCalled();
    expect(alertStaffMock).not.toHaveBeenCalled();
  });

  it('manual:true op een reeds-geprovisionede funnel-order: sluit af op actief, geen tweede provision-call', async () => {
    const db = makeDb({
      servicesSeed: {
        id: 'svc_1', customer_id: 'cust_1', product_key: 'emma-telefoon', order_id: 'ord_1',
        provisioning_json: JSON.stringify({ status: 'agent_aangemaakt', agent_id: 'ag_1' }),
      },
    });
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };

    const result = await activateOrder(env, funnelOrder(), { manual: true });

    expect(result.status).toBe('actief');
    expect(provisionMock).not.toHaveBeenCalled();
  });
});

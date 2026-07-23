// Task 4: legt vast dat de */15-cron (scheduled(), worker.js) fout-services
// automatisch herprobeert zonder de bestaande attempts-drempel (Task 3) te
// omzeilen en zonder dat één kapotte order de rest van de batch blokkeert.
//
// De provisioner-registry (resolve/canProvision) EN notify.js (alertStaff)
// zijn hier gemockt — zelfde stijl als activation-statemachine.test.js — dit
// bestand dekt retryFailedProvisions() zelf (kandidaat-selectie + best-effort
// batch-verwerking via de echte activateOrder()), niet wat een specifieke
// provisioner besluit.
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

const { retryFailedProvisions } = await import('../src/lib/activation.js');

beforeEach(() => {
  provisionMock.mockReset();
  alertStaffMock.mockReset();
});

// In-memory D1-dubbel voor meerdere orders tegelijk (retryFailedProvisions
// verwerkt een batch, in tegenstelling tot activation.test.js/
// activation-statemachine.test.js die één order per keer testen). Ondersteunt
// zowel de nieuwe join-query van retryFailedProvisions als de bestaande
// per-order queries van activateOrder (zelfde SQL-vormen als
// activation-statemachine.test.js se makeDb).
function makeDb({ orders = [], services = [] } = {}) {
  const state = {
    orders: orders.map((o) => ({ ...o })),
    services: services.map((s) => ({ ...s })),
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
                if (orderId === 'ord_dberr') {
                  throw new Error('db boom (simulated failure for ord_dberr)');
                }
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
              if (sql.startsWith("UPDATE services SET status = 'actief'")) {
                const [svcId] = args;
                const svc = state.services.find((s) => s.id === svcId);
                if (svc) svc.status = 'actief';
                return { meta: { changes: svc ? 1 : 0 } };
              }
              if (sql.startsWith("UPDATE service_orders SET status = 'actief'")) {
                const order = state.orders.find((o) => o.id === args[0]);
                if (order) order.status = 'actief';
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith("UPDATE service_orders SET status = 'in_uitvoering'")) {
                const order = state.orders.find((o) => o.id === args[0]);
                if (order && order.status === 'actief') return { meta: { changes: 0 } };
                return { meta: { changes: order ? 1 : 0 } };
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
            async all() {
              throw new Error(`makeDb: geen .bind().all() canned voor: ${sql}`);
            },
          };
        },
        // retryFailedProvisions' kandidaat-query neemt geen bind-argumenten.
        async all() {
          if (sql.includes('FROM service_orders so') && sql.includes('JOIN services s')) {
            const results = state.orders
              .filter((o) => o.status === 'in_uitvoering')
              .map((o) => {
                const svc = state.services.find((s) => s.order_id === o.id);
                if (!svc) return null;
                return { ...o, provisioning_json: svc.provisioning_json };
              })
              .filter(Boolean);
            return { results };
          }
          throw new Error(`makeDb: geen .all() canned voor: ${sql}`);
        },
      };
    },
  };
}

function order(overrides = {}) {
  return {
    id: 'ord_1', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter',
    status: 'in_uitvoering', intake_json: '{}', voorstel_id: null, ...overrides,
  };
}

describe('retryFailedProvisions — kandidaat-selectie', () => {
  it('order met fout-service (attempts:1) wordt opnieuw geprovisioned', async () => {
    const db = makeDb({
      orders: [order({ id: 'ord_1' })],
      services: [{
        id: 'svc_1', order_id: 'ord_1',
        provisioning_json: JSON.stringify({ status: 'fout', error: 'boom', attempts: 1 }),
      }],
    });
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    provisionMock.mockResolvedValueOnce({ status: 'klaar', provisioning: { status: 'agent_aangemaakt', agent_id: 'ag_1' } });

    await retryFailedProvisions(env);

    expect(provisionMock).toHaveBeenCalledTimes(1);
    const svc = db.state.services.find((s) => s.order_id === 'ord_1');
    expect(JSON.parse(svc.provisioning_json)).toEqual({ status: 'agent_aangemaakt', agent_id: 'ag_1' });
    expect(db.state.orders.find((o) => o.id === 'ord_1').status).toBe('actief');
  });

  it('order met attempts:3 wordt NIET opnieuw geprovisioned', async () => {
    const db = makeDb({
      orders: [order({ id: 'ord_2' })],
      services: [{
        id: 'svc_2', order_id: 'ord_2',
        provisioning_json: JSON.stringify({ status: 'fout', error: 'boom', attempts: 3 }),
      }],
    });
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };

    await retryFailedProvisions(env);

    expect(provisionMock).not.toHaveBeenCalled();
    expect(db.state.orders.find((o) => o.id === 'ord_2').status).toBe('in_uitvoering');
  });

  it('order met geslaagde (niet-fout) service wordt NIET opnieuw geprovisioned', async () => {
    const db = makeDb({
      orders: [order({ id: 'ord_3' })],
      services: [{
        id: 'svc_3', order_id: 'ord_3',
        provisioning_json: JSON.stringify({ status: 'agent_aangemaakt', agent_id: 'ag_3' }),
      }],
    });
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };

    await retryFailedProvisions(env);

    expect(provisionMock).not.toHaveBeenCalled();
  });

  it('een fout bij één order (activateOrder gooit) stopt de verwerking van de andere niet', async () => {
    const db = makeDb({
      orders: [
        order({ id: 'ord_dberr' }), // INSERT OR IGNORE gooit voor deze order (zie makeDb)
        order({ id: 'ord_ok' }),
      ],
      services: [
        {
          id: 'svc_dberr', order_id: 'ord_dberr',
          provisioning_json: JSON.stringify({ status: 'fout', error: 'boom', attempts: 1 }),
        },
        {
          id: 'svc_ok', order_id: 'ord_ok',
          provisioning_json: JSON.stringify({ status: 'fout', error: 'boom', attempts: 1 }),
        },
      ],
    });
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    provisionMock.mockResolvedValue({ status: 'klaar', provisioning: { status: 'agent_aangemaakt', agent_id: 'ag_ok' } });

    await expect(retryFailedProvisions(env)).resolves.toBeUndefined();

    // ord_ok is wel degelijk verwerkt ondanks dat ord_dberr faalde.
    const svcOk = db.state.services.find((s) => s.order_id === 'ord_ok');
    expect(JSON.parse(svcOk.provisioning_json)).toEqual({ status: 'agent_aangemaakt', agent_id: 'ag_ok' });
    expect(db.state.orders.find((o) => o.id === 'ord_ok').status).toBe('actief');
    // ord_dberr bleef ongewijzigd op zijn oude provisioning_json (de INSERT
    // gooide vóór er iets geschreven kon worden).
    const svcErr = db.state.services.find((s) => s.order_id === 'ord_dberr');
    expect(JSON.parse(svcErr.provisioning_json)).toEqual({ status: 'fout', error: 'boom', attempts: 1 });
  });
});

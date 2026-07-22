// Legt de derde provisioning-uitkomst vast (spec §5, "wacht_op_klant"): een
// order die uit de self-serve funnel komt (service_orders.voorstel_id gezet)
// heeft alleen de ondiepe wizard-intake. Een geslaagde ElevenLabs-provisioning
// mag zo'n order NOOIT op 'actief' zetten — de diepe intake ontbreekt nog —
// maar mag ook geen alertStaff() afvuren: dit is een normale tussentoestand,
// geen storing. Een order zonder voorstel_id (het bestaande portaalpad) moet
// zich exact blijven gedragen als vandaag: succesvolle provisioning -> 'actief'.
import { describe, it, expect, afterEach } from 'vitest';
import { activateOrder } from '../src/lib/activation.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function jsonRes(obj) {
  return { ok: true, text: async () => JSON.stringify(obj) };
}

// Stubt de twee ElevenLabs-aanroepen die provisionAgent doet (KB-doc + agent).
// Telt ook aanroepen naar Brevo/Telegram (alertStaff) zodat een test kan
// bewijzen dat er GEEN alert is afgevuurd.
function makeFetchStub({ elevenlabsFails = false } = {}) {
  const alertCalls = [];
  const fn = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('api.brevo.com') || u.includes('api.telegram.org')) {
      alertCalls.push(u);
      return { ok: true, text: async () => '{}' };
    }
    if (u.includes('/convai/knowledge-base/text')) {
      if (elevenlabsFails) return { ok: false, status: 500, text: async () => 'boom' };
      return jsonRes({ id: 'kb_1', name: 'kb' });
    }
    if (u.includes('/convai/agents/create')) {
      return jsonRes({ agent_id: 'agent_1' });
    }
    throw new Error(`onverwachte fetch: ${u}`);
  };
  fn.alertCalls = alertCalls;
  return fn;
}

// In-memory D1-dubbel voor activation.js. `servicesSeed` laat een test een
// reeds-geprovisionede services-rij vooraf plaatsen (replay-scenario).
function makeDb({ servicesSeed = null } = {}) {
  const state = {
    services: servicesSeed ? [{ ...servicesSeed }] : [],
    orderStatusUpdates: [], // [{status}], laatste = actueel
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
                    id: args[0], customer_id: args[1], product_key: args[2], naam: args[3],
                    tier: args[4], status: args[5], config_json: args[6], order_id: orderId,
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
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith("UPDATE service_orders SET status = 'in_uitvoering'")) {
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
    id: 'ord_funnel_1', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter',
    status: 'ingediend', intake_json: '{}', voorstel_id: 'vst_1', ...overrides,
  };
}
function portalOrder(overrides = {}) {
  return {
    id: 'ord_portal_1', customer_id: 'cust_2', product_key: 'emma-telefoon', tier: 'Starter',
    status: 'ingediend', intake_json: '{}', voorstel_id: null, ...overrides,
  };
}

describe('activateOrder — derde uitkomst wacht_op_klant voor funnel-orders', () => {
  it('funnel-order (voorstel_id gezet): geslaagde provisioning zet NOOIT op actief, wel op in_uitvoering, GEEN alert', async () => {
    const db = makeDb();
    const fetchStub = makeFetchStub();
    globalThis.fetch = fetchStub;
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key', BREVO_API_KEY: 'brevo_key' };

    const order = funnelOrder();
    const result = await activateOrder(env, order);

    expect(result.status).toBe('wacht_op_klant');
    expect(result.provisioned).toBe(true);
    expect(db.state.orderStatusUpdates).toEqual([{ status: 'in_uitvoering', orderId: order.id }]);
    expect(db.state.orderStatusUpdates.some((u) => u.status === 'actief')).toBe(false);
    expect(fetchStub.alertCalls).toEqual([]); // geen storing = geen mens gepingd
  });

  it('portal-order (voorstel_id null): geslaagde provisioning gedraagt zich exact als vandaag — actief', async () => {
    const db = makeDb();
    globalThis.fetch = makeFetchStub();
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };

    const order = portalOrder();
    const result = await activateOrder(env, order);

    expect(result.status).toBe('actief');
    expect(db.state.orderStatusUpdates).toEqual([{ status: 'actief', orderId: order.id }]);
  });

  it('replay (al eerder succesvol geprovisioned): funnel-order blijft wacht_op_klant, geen tweede provisioning-call', async () => {
    const db = makeDb({
      servicesSeed: {
        id: 'svc_1', customer_id: 'cust_1', product_key: 'emma-telefoon', order_id: 'ord_funnel_1',
        provisioning_json: JSON.stringify({ status: 'agent_aangemaakt', agent_id: 'agent_1' }),
      },
    });
    let elevenlabsCalled = false;
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.includes('/convai/')) { elevenlabsCalled = true; }
      throw new Error(`mag niet worden aangeroepen bij een replay: ${u}`);
    };

    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    const result = await activateOrder(env, funnelOrder());

    expect(result.status).toBe('wacht_op_klant');
    expect(elevenlabsCalled).toBe(false);
    expect(db.state.orderStatusUpdates.some((u) => u.status === 'actief')).toBe(false);
  });

  it('replay (al eerder succesvol geprovisioned): portal-order gedraagt zich exact als vandaag — actief, geen tweede provisioning-call', async () => {
    const db = makeDb({
      servicesSeed: {
        id: 'svc_2', customer_id: 'cust_2', product_key: 'emma-telefoon', order_id: 'ord_portal_1',
        provisioning_json: JSON.stringify({ status: 'agent_aangemaakt', agent_id: 'agent_2' }),
      },
    });
    globalThis.fetch = async (url) => { throw new Error(`mag niet worden aangeroepen bij een replay: ${url}`); };

    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    const result = await activateOrder(env, portalOrder());

    expect(result.status).toBe('actief');
    expect(db.state.orderStatusUpdates).toEqual([{ status: 'actief', orderId: 'ord_portal_1' }]);
  });

  it('een handmatige admin-klik (manual:true) op een funnel-order forceert GEEN actief zolang de diepe intake ontbreekt', async () => {
    const db = makeDb({
      servicesSeed: {
        id: 'svc_3', customer_id: 'cust_1', product_key: 'emma-telefoon', order_id: 'ord_funnel_1',
        provisioning_json: JSON.stringify({ status: 'agent_aangemaakt', agent_id: 'agent_3' }),
      },
    });
    globalThis.fetch = async (url) => { throw new Error(`mag niet worden aangeroepen bij een replay: ${url}`); };

    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    const result = await activateOrder(env, funnelOrder(), { manual: true });

    expect(result.status).toBe('wacht_op_klant');
  });
});

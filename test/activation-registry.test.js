// Task 2 (spec Plak B): activation.js moet provisioning niet meer rechtstreeks
// via elevenlabs.js draaien, maar via de provisioner-registry
// (src/lib/provisioners/index.js: resolve()/canProvision()). Deze test bewijst
// de registry-integratie zelf, los van wat een specifieke provisioner
// (voice.js) precies doet — dat wordt al gedekt door test/activation.test.js
// en de provisioner-eigen tests. Vandaar: provisioners/index.js gemockt.
import {
  describe, it, expect, vi, afterEach,
} from 'vitest';

vi.mock('../src/lib/provisioners/index.js', () => ({
  resolve: (pk) => (pk === 'emma-telefoon'
    ? { provision: async () => ({ status: 'klaar', provisioning: { status: 'agent_aangemaakt', agent_id: 'ag_1' } }) }
    : null),
  canProvision: (pk) => pk === 'emma-telefoon',
}));

const { activateOrder } = await import('../src/lib/activation.js');

afterEach(() => vi.restoreAllMocks());

// D1-stub in dezelfde stijl als test/activation.test.js / test/checkout-*.test.js:
// INSERT OR IGNORE INTO services materialiseert de service-rij, de SELECT
// leest 'm terug (provisioning_json start op null), en de twee UPDATE's
// registreren precies welke overgangen echt plaatsvonden.
function makeDb({ servicesSeed = null } = {}) {
  const state = {
    services: servicesSeed ? [{ ...servicesSeed }] : [],
    orderStatusUpdates: [],
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
              if (sql.startsWith("UPDATE services SET status = 'actief'")) {
                const [svcId] = args;
                const svc = state.services.find((s) => s.id === svcId);
                if (svc) svc.status = 'actief';
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

describe('activateOrder — gebruikt de provisioner-registry', () => {
  it('provisioned een emma-telefoon funnel-order (voorstel_id gezet) via de registry: status actief, ZONDER manual', async () => {
    const db = makeDb();
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    const order = {
      id: 'ord_1', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter',
      status: 'ingediend', intake_json: '{}', voorstel_id: 'vst_1',
    };

    // Geen { manual: true } — provision()'s 'klaar'-uitkomst (de registry-mock
    // hierboven) is de enige poort, voorstel_id is irrelevant (Task 7).
    const result = await activateOrder(env, order);

    expect(result.status).toBe('actief');
    expect(result.provisioned).toBe(true);
    expect(db.state.orderStatusUpdates).toEqual([{ status: 'actief', orderId: 'ord_1' }]);
    // De registry-mock leverde de detailwaarden — die moeten in provisioning_json
    // terechtkomen (zelfde vorm als vóór de refactor: het geneste 'provisioning'-object,
    // niet de buitenste {status:'klaar', ...}-envelop).
    const svc = db.state.services.find((s) => s.order_id === 'ord_1');
    expect(JSON.parse(svc.provisioning_json)).toEqual({ status: 'agent_aangemaakt', agent_id: 'ag_1' });
  });

  it('een niet-provisionabel product (registry kent het niet) park\'t — nooit ElevenLabs/registry aangeraakt', async () => {
    const db = makeDb();
    const env = { PORTAL_DB: db, ELEVENLABS_API_KEY: 'test_key' };
    const order = {
      id: 'ord_2', customer_id: 'cust_2', product_key: 'geo', tier: null,
      status: 'ingediend', intake_json: '{}', voorstel_id: null,
    };

    const result = await activateOrder(env, order);

    expect(result.status).toBe('in_uitvoering');
    expect(result.provisioned).toBe(false);
    expect(db.state.orderStatusUpdates).toEqual([{ status: 'in_uitvoering', orderId: 'ord_2' }]);
  });
});

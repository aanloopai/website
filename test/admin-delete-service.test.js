// Task 3 (spec plak A): deleteService — dienst volledig opruimen: agent+KB weg
// (teardownProvisioning, gemockt — die heeft zijn eigen elevenlabs.test.js),
// abonnement annuleren zodat billing stopt, order op 'geannuleerd' zodat hij
// uit de actieve telling valt, en tot slot de service-rij weg.
import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';

const teardownProvisioningMock = vi.fn();
vi.mock('../src/lib/elevenlabs.js', () => ({
  teardownProvisioning: (...args) => teardownProvisioningMock(...args),
}));

const { deleteService } = await import('../src/lib/admin-routes.js');

const SERVICE_SELECT = 'SELECT id, customer_id, order_id, provisioning_json FROM services WHERE id = ?';

function makeDb({ service, runCalls }) {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.startsWith(SERVICE_SELECT)) return service;
              throw new Error(`geen .first() voor: ${sql} (${JSON.stringify(args)})`);
            },
            async run() {
              if (
                sql.startsWith('UPDATE subscriptions SET')
                || sql.startsWith('UPDATE service_orders SET')
                || sql.startsWith('DELETE FROM services')
              ) {
                runCalls.push({ sql, args });
                return {};
              }
              throw new Error(`geen .run() voor: ${sql} (${JSON.stringify(args)})`);
            },
          };
        },
      };
    },
  };
}
function makeRequest(url, body) {
  return {
    url: url || 'https://aanloopai.nl/api/admin/service',
    json: async () => body ?? null,
  };
}

beforeEach(() => {
  teardownProvisioningMock.mockReset();
});

describe('deleteService', () => {
  it('bestaande dienst met provisioning → 200, teardown + subscription canceled + order geannuleerd + service weg', async () => {
    const service = {
      id: 'svc_1',
      customer_id: 'cus_1',
      order_id: 'ord_1',
      provisioning_json: JSON.stringify({ status: 'agent_aangemaakt', agent_id: 'ag_1', kb_id: 'kb_1' }),
    };
    const runCalls = [];
    const env = { PORTAL_DB: makeDb({ service, runCalls }) };

    const req = makeRequest('https://aanloopai.nl/api/admin/service?id=svc_1');
    const res = await deleteService(req, env);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);

    expect(teardownProvisioningMock).toHaveBeenCalledWith(env, { status: 'agent_aangemaakt', agent_id: 'ag_1', kb_id: 'kb_1' });

    expect(runCalls).toHaveLength(3);
    const subUpdate = runCalls.find((c) => c.sql.startsWith('UPDATE subscriptions SET'));
    expect(subUpdate.args).toEqual(['canceled', 'ord_1']);
    const orderUpdate = runCalls.find((c) => c.sql.startsWith('UPDATE service_orders SET'));
    expect(orderUpdate.args).toEqual(['geannuleerd', 'ord_1']);
    const del = runCalls.find((c) => c.sql.startsWith('DELETE FROM services'));
    expect(del.args).toEqual(['svc_1']);
  });

  it('dienst zonder order_id (handmatig aangemaakt) → geen subscription/order-UPDATE, wel teardown + delete', async () => {
    const service = {
      id: 'svc_2', customer_id: 'cus_2', order_id: null, provisioning_json: null,
    };
    const runCalls = [];
    const env = { PORTAL_DB: makeDb({ service, runCalls }) };

    const res = await deleteService(makeRequest('https://aanloopai.nl/api/admin/service?id=svc_2'), env);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(teardownProvisioningMock).toHaveBeenCalledWith(env, {});
    expect(runCalls).toHaveLength(1);
    expect(runCalls[0].sql.startsWith('DELETE FROM services')).toBe(true);
  });

  it('onbekend id → 404, geen teardown, geen deletes', async () => {
    const runCalls = [];
    const env = { PORTAL_DB: makeDb({ service: null, runCalls }) };

    const res = await deleteService(makeRequest('https://aanloopai.nl/api/admin/service?id=svc_ghost'), env);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(teardownProvisioningMock).not.toHaveBeenCalled();
    expect(runCalls).toHaveLength(0);
  });

  it('id ontbreekt (geen query-param, geen body) → 400', async () => {
    const runCalls = [];
    const env = { PORTAL_DB: makeDb({ service: null, runCalls }) };

    const res = await deleteService(makeRequest('https://aanloopai.nl/api/admin/service'), env);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(teardownProvisioningMock).not.toHaveBeenCalled();
    expect(runCalls).toHaveLength(0);
  });

  it('id ontbreekt in query maar aanwezig in body → gebruikt body.id', async () => {
    const service = {
      id: 'svc_3', customer_id: 'cus_3', order_id: 'ord_3', provisioning_json: null,
    };
    const runCalls = [];
    const env = { PORTAL_DB: makeDb({ service, runCalls }) };

    const res = await deleteService(makeRequest('https://aanloopai.nl/api/admin/service', { id: 'svc_3' }), env);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(runCalls).toHaveLength(3);
  });
});

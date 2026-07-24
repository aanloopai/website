// Task 4 (spec plak A): deleteCustomer — meest destructieve admin-actie.
// Vereist een EXACTE bedrijfsnaam-bevestiging in de body; bij mismatch wordt
// er GEEN enkele rij aangeraakt (geen teardown, geen delete). Bij een match:
// per dienst teardownProvisioning (gemockt — eigen elevenlabs.test.js), dan
// de volledige cascade-DELETE in kind→ouder-volgorde, elk gescoped op de
// klant (nooit een kale WHERE-loze of lege `IN ()` delete). Inclusief de
// AVG-leaf-tabellen documents/service_requests/support_tickets/team_invites
// (customer_id-gescoped, geen eigen child-tabellen).
import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';

const teardownProvisioningMock = vi.fn();
vi.mock('../src/lib/elevenlabs.js', () => ({
  teardownProvisioning: (...args) => teardownProvisioningMock(...args),
}));

const { deleteCustomer } = await import('../src/lib/admin-routes.js');

const CUSTOMER_SELECT = 'SELECT id, bedrijf FROM customers WHERE id = ?';
const SERVICES_SELECT = 'SELECT id, provisioning_json FROM services WHERE customer_id = ?';
const VOORSTEL_IDS_SELECT = 'SELECT voorstel_id FROM service_orders WHERE customer_id = ? AND voorstel_id IS NOT NULL';

function makeDb({
  customer, services = [], voorstelIds = [], runCalls,
}) {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.startsWith(CUSTOMER_SELECT)) return customer;
              throw new Error(`geen .first() voor: ${sql} (${JSON.stringify(args)})`);
            },
            async all() {
              if (sql.startsWith(SERVICES_SELECT)) return { results: services };
              if (sql.startsWith(VOORSTEL_IDS_SELECT)) return { results: voorstelIds.map((v) => ({ voorstel_id: v })) };
              throw new Error(`geen .all() voor: ${sql} (${JSON.stringify(args)})`);
            },
            async run() {
              if (!sql.startsWith('DELETE FROM')) {
                throw new Error(`geen .run() voor: ${sql} (${JSON.stringify(args)})`);
              }
              runCalls.push({ sql, args });
              return {};
            },
          };
        },
      };
    },
  };
}

function makeRequest(url, body) {
  return {
    url,
    json: async () => body ?? null,
  };
}

beforeEach(() => {
  teardownProvisioningMock.mockReset();
});

describe('deleteCustomer', () => {
  it('confirm komt niet overeen met bedrijfsnaam → 400, geen teardown, geen enkele delete', async () => {
    const customer = { id: 'cust_1', bedrijf: 'Acme B.V.' };
    const runCalls = [];
    const env = { PORTAL_DB: makeDb({ customer, runCalls }) };

    const req = makeRequest('https://aanloopai.nl/api/admin/customer?id=cust_1', { confirm: 'Foute Naam' });
    const res = await deleteCustomer(req, env);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(teardownProvisioningMock).not.toHaveBeenCalled();
    expect(runCalls).toHaveLength(0);
  });

  it('lege/ontbrekende confirm → 400, geen delete', async () => {
    const customer = { id: 'cust_1', bedrijf: 'Acme B.V.' };
    const runCalls = [];
    const env = { PORTAL_DB: makeDb({ customer, runCalls }) };

    const req = makeRequest('https://aanloopai.nl/api/admin/customer?id=cust_1', {});
    const res = await deleteCustomer(req, env);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(runCalls).toHaveLength(0);
  });

  it('onbekende klant → 404, geen teardown, geen delete', async () => {
    const runCalls = [];
    const env = { PORTAL_DB: makeDb({ customer: null, runCalls }) };

    const req = makeRequest('https://aanloopai.nl/api/admin/customer?id=cust_ghost', { confirm: 'wat dan ook' });
    const res = await deleteCustomer(req, env);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(teardownProvisioningMock).not.toHaveBeenCalled();
    expect(runCalls).toHaveLength(0);
  });

  it('id ontbreekt → 400, geen delete', async () => {
    const runCalls = [];
    const env = { PORTAL_DB: makeDb({ customer: null, runCalls }) };

    const req = makeRequest('https://aanloopai.nl/api/admin/customer', { confirm: 'x' });
    const res = await deleteCustomer(req, env);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(runCalls).toHaveLength(0);
  });

  it('correcte confirm, klant MET voorstellen → teardown per service + volledige cascade in juiste volgorde en scope, customers als laatste', async () => {
    const customer = { id: 'cust_1', bedrijf: 'Acme B.V.' };
    const services = [
      { id: 'svc_1', provisioning_json: JSON.stringify({ status: 'agent_aangemaakt', agent_id: 'ag_1', kb_id: 'kb_1' }) },
      { id: 'svc_2', provisioning_json: null },
    ];
    const voorstelIds = ['vst_1', 'vst_2'];
    const runCalls = [];
    const env = { PORTAL_DB: makeDb({
      customer, services, voorstelIds, runCalls,
    }) };

    const req = makeRequest('https://aanloopai.nl/api/admin/customer?id=cust_1', { confirm: 'Acme B.V.' });
    const res = await deleteCustomer(req, env);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);

    // Teardown per service, ook wanneer provisioning_json ontbreekt (safeParseJson → {}).
    expect(teardownProvisioningMock).toHaveBeenCalledTimes(2);
    expect(teardownProvisioningMock).toHaveBeenNthCalledWith(1, env, { status: 'agent_aangemaakt', agent_id: 'ag_1', kb_id: 'kb_1' });
    expect(teardownProvisioningMock).toHaveBeenNthCalledWith(2, env, {});

    // Exacte volgorde + scope van de cascade-DELETEs.
    const tables = runCalls.map((c) => c.sql);
    expect(tables).toEqual([
      expect.stringMatching(/^DELETE FROM invoices WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM payments WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM voorstel_claims WHERE voorstel_id IN \(\?,\?\)$/),
      expect.stringMatching(/^DELETE FROM subscriptions WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM services WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM service_orders WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM intake_requests WHERE id IN \(SELECT intake_id FROM voorstellen WHERE id IN \(\?,\?\)\)$/),
      expect.stringMatching(/^DELETE FROM voorstellen WHERE id IN \(\?,\?\)$/),
      expect.stringMatching(/^DELETE FROM magic_links WHERE user_id IN \(SELECT id FROM users WHERE customer_id = \?\)$/),
      expect.stringMatching(/^DELETE FROM users WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM documents WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM service_requests WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM support_tickets WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM team_invites WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM customers WHERE id = \?$/),
    ]);

    // Elke scope-bind klopt: customer_id-gescoopte deletes gebruiken cust_1,
    // de voorstel-IN-clauses gebruiken de verzamelde voorstelIds.
    expect(runCalls[0].args).toEqual(['cust_1']); // invoices
    expect(runCalls[1].args).toEqual(['cust_1']); // payments
    expect(runCalls[2].args).toEqual(['vst_1', 'vst_2']); // voorstel_claims
    expect(runCalls[3].args).toEqual(['cust_1']); // subscriptions
    expect(runCalls[4].args).toEqual(['cust_1']); // services
    expect(runCalls[5].args).toEqual(['cust_1']); // service_orders
    expect(runCalls[6].args).toEqual(['vst_1', 'vst_2']); // intake_requests
    expect(runCalls[7].args).toEqual(['vst_1', 'vst_2']); // voorstellen
    expect(runCalls[8].args).toEqual(['cust_1']); // magic_links
    expect(runCalls[9].args).toEqual(['cust_1']); // users
    expect(runCalls[10].args).toEqual(['cust_1']); // documents
    expect(runCalls[11].args).toEqual(['cust_1']); // service_requests
    expect(runCalls[12].args).toEqual(['cust_1']); // support_tickets
    expect(runCalls[13].args).toEqual(['cust_1']); // team_invites
    expect(runCalls[14].args).toEqual(['cust_1']); // customers — laatste

    // Nooit een WHERE-loze delete.
    for (const call of runCalls) {
      expect(call.sql).toMatch(/WHERE/);
    }
  });

  it('correcte confirm, klant ZONDER voorstellen → voorstel_claims/voorstellen/intake-deletes overgeslagen (geen kale IN ())', async () => {
    const customer = { id: 'cust_2', bedrijf: 'Zonder Voorstel BV' };
    const services = [];
    const voorstelIds = [];
    const runCalls = [];
    const env = { PORTAL_DB: makeDb({
      customer, services, voorstelIds, runCalls,
    }) };

    const req = makeRequest('https://aanloopai.nl/api/admin/customer?id=cust_2', { confirm: 'Zonder Voorstel BV' });
    const res = await deleteCustomer(req, env);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(teardownProvisioningMock).not.toHaveBeenCalled();

    const tables = runCalls.map((c) => c.sql);
    expect(tables).toEqual([
      expect.stringMatching(/^DELETE FROM invoices WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM payments WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM subscriptions WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM services WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM service_orders WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM magic_links WHERE user_id IN \(SELECT id FROM users WHERE customer_id = \?\)$/),
      expect.stringMatching(/^DELETE FROM users WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM documents WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM service_requests WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM support_tickets WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM team_invites WHERE customer_id = \?$/),
      expect.stringMatching(/^DELETE FROM customers WHERE id = \?$/),
    ]);
    expect(tables.some((s) => s.includes('voorstel'))).toBe(false);
    expect(tables.some((s) => s.includes('intake_requests'))).toBe(false);
    expect(runCalls[7].args).toEqual(['cust_2']); // documents
    expect(runCalls[8].args).toEqual(['cust_2']); // service_requests
    expect(runCalls[9].args).toEqual(['cust_2']); // support_tickets
    expect(runCalls[10].args).toEqual(['cust_2']); // team_invites
  });

  it('confirm met omringende whitespace wordt getrimd voor vergelijking', async () => {
    const customer = { id: 'cust_3', bedrijf: 'Trim Test BV' };
    const runCalls = [];
    const env = { PORTAL_DB: makeDb({ customer, runCalls }) };

    const req = makeRequest('https://aanloopai.nl/api/admin/customer?id=cust_3', { confirm: '  Trim Test BV  ' });
    const res = await deleteCustomer(req, env);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(runCalls.length).toBeGreaterThan(0);
  });
});

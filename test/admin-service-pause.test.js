// Task 2 (spec plak A): updateService — pauzeren ruimt de ElevenLabs-agent op,
// hervatten re-provisiont via activateOrder in plaats van een losse UPDATE die
// activateOrder's eigen status/provisioning-beslissing zou overschrijven.
//
// teardownProvisioning/activateOrder worden gemockt: deze test isoleert de
// routing-logica in updateService() zelf (welk pad wordt genomen, met welke
// argumenten), los van wat ElevenLabs of het activation-statemachine echt doen
// — die hebben hun eigen tests (elevenlabs.test.js, activation*.test.js).
import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';

const teardownProvisioningMock = vi.fn();
vi.mock('../src/lib/elevenlabs.js', () => ({
  teardownProvisioning: (...args) => teardownProvisioningMock(...args),
}));

const activateOrderMock = vi.fn();
vi.mock('../src/lib/activation.js', () => ({
  activateOrder: (...args) => activateOrderMock(...args),
}));

const { updateService } = await import('../src/lib/admin-routes.js');

const SERVICE_SELECT = 'SELECT status, tier, naam, config_json, started_at, provisioning_json, order_id, product_key FROM services WHERE id = ?';

function makeDb({ service, order, updateCalls }) {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.startsWith(SERVICE_SELECT)) return service;
              if (sql.startsWith('SELECT * FROM service_orders WHERE id = ?')) return order;
              throw new Error(`geen .first() voor: ${sql} (${JSON.stringify(args)})`);
            },
            async run() {
              if (sql.startsWith('UPDATE services SET')) {
                updateCalls.push({ sql, args });
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
function makeRequest(body) {
  return { json: async () => body };
}

beforeEach(() => {
  teardownProvisioningMock.mockReset();
  activateOrderMock.mockReset();
});

describe('updateService — pauzeren (agent-teardown)', () => {
  it('actieve dienst met agent → teardownProvisioning aangeroepen + provisioning_json op NULL, status gepauzeerd', async () => {
    const service = {
      status: 'actief', tier: 'basis', naam: 'Emma — Klant BV', config_json: null, started_at: '2026-01-01',
      provisioning_json: JSON.stringify({ status: 'agent_aangemaakt', agent_id: 'ag_1', kb_id: 'kb_1' }),
      order_id: 'ord_1', product_key: 'emma-telefoon',
    };
    const updateCalls = [];
    const env = { PORTAL_DB: makeDb({ service, order: null, updateCalls }) };

    const res = await updateService(makeRequest({ id: 'svc_1', status: 'gepauzeerd' }), env);
    const body = await res.json();

    expect(teardownProvisioningMock).toHaveBeenCalledWith(env, { status: 'agent_aangemaakt', agent_id: 'ag_1', kb_id: 'kb_1' });
    expect(activateOrderMock).not.toHaveBeenCalled();
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].sql).toContain('provisioning_json = NULL');
    // bind order: naam, tier, status, config_json, started_at, id
    expect(updateCalls[0].args[2]).toBe('gepauzeerd');
    expect(updateCalls[0].args[5]).toBe('svc_1');
    expect(body.ok).toBe(true);
  });

  it('al gepauzeerde dienst nogmaals op gepauzeerd zetten → geen teardown (geen echte overgang)', async () => {
    const service = {
      status: 'gepauzeerd', tier: 'basis', naam: 'Emma — Klant BV', config_json: null, started_at: '2026-01-01',
      provisioning_json: null, order_id: 'ord_1', product_key: 'emma-telefoon',
    };
    const updateCalls = [];
    const env = { PORTAL_DB: makeDb({ service, order: null, updateCalls }) };

    await updateService(makeRequest({ id: 'svc_1', status: 'gepauzeerd' }), env);

    expect(teardownProvisioningMock).not.toHaveBeenCalled();
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].sql).not.toContain('provisioning_json = NULL');
  });
});

describe('updateService — hervatten (re-provisioning)', () => {
  it('gepauzeerde emma-telefoon-dienst met lege provisioning → activateOrder aangeroepen, geen losse status-UPDATE', async () => {
    const order = { id: 'ord_1', product_key: 'emma-telefoon', customer_id: 'cus_1', status: 'in_uitvoering' };
    const service = {
      status: 'gepauzeerd', tier: 'basis', naam: 'Emma — Klant BV', config_json: null, started_at: '2026-01-01',
      provisioning_json: null, order_id: 'ord_1', product_key: 'emma-telefoon',
    };
    const updateCalls = [];
    const env = { PORTAL_DB: makeDb({ service, order, updateCalls }) };
    activateOrderMock.mockResolvedValue({ status: 'actief', serviceId: 'svc_1', provisioned: true });

    const res = await updateService(makeRequest({ id: 'svc_1', status: 'actief' }), env);
    const body = await res.json();

    expect(activateOrderMock).toHaveBeenCalledWith(env, order);
    expect(teardownProvisioningMock).not.toHaveBeenCalled();
    // Geen losse UPDATE services SET ... die activateOrder's eigen status-zet zou overschrijven.
    expect(updateCalls).toHaveLength(0);
    expect(body.ok).toBe(true);
  });

  it('gepauzeerde dienst met eerder mislukte provisioning (status fout) → ook hervat via activateOrder', async () => {
    const order = { id: 'ord_2', product_key: 'emma-telefoon', customer_id: 'cus_2', status: 'in_uitvoering' };
    const service = {
      status: 'gepauzeerd', tier: 'basis', naam: 'Emma — Klant BV', config_json: null, started_at: '2026-01-01',
      provisioning_json: JSON.stringify({ status: 'fout', error: 'HTTP 500', attempts: 1 }),
      order_id: 'ord_2', product_key: 'emma-telefoon',
    };
    const updateCalls = [];
    const env = { PORTAL_DB: makeDb({ service, order, updateCalls }) };
    activateOrderMock.mockResolvedValue({ status: 'actief', serviceId: 'svc_2', provisioned: true });

    await updateService(makeRequest({ id: 'svc_2', status: 'actief' }), env);

    expect(activateOrderMock).toHaveBeenCalledWith(env, order);
    expect(updateCalls).toHaveLength(0);
  });

  it('niet-provisionbaar product met lege provisioning → geen activateOrder, bestaande UPDATE draait', async () => {
    const service = {
      status: 'gepauzeerd', tier: 'basis', naam: 'Handmatige dienst', config_json: null, started_at: '2026-01-01',
      provisioning_json: null, order_id: 'ord_3', product_key: 'iets-handmatigs',
    };
    const updateCalls = [];
    const env = { PORTAL_DB: makeDb({ service, order: null, updateCalls }) };

    const res = await updateService(makeRequest({ id: 'svc_3', status: 'actief' }), env);
    const body = await res.json();

    expect(activateOrderMock).not.toHaveBeenCalled();
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].args[2]).toBe('actief');
    expect(body.ok).toBe(true);
  });
});

describe('updateService — naam/tier-wijziging zonder statusverandering', () => {
  it('actieve dienst met geldige provisioning: naam/tier bijwerken raakt geen teardown of activateOrder aan', async () => {
    const service = {
      status: 'actief', tier: 'basis', naam: 'Oude naam', config_json: null, started_at: '2026-01-01',
      provisioning_json: JSON.stringify({ status: 'agent_aangemaakt', agent_id: 'ag_9', kb_id: 'kb_9' }),
      order_id: 'ord_9', product_key: 'emma-telefoon',
    };
    const updateCalls = [];
    const env = { PORTAL_DB: makeDb({ service, order: null, updateCalls }) };

    const res = await updateService(makeRequest({ id: 'svc_9', naam: 'Nieuwe naam', tier: 'pro' }), env);
    const body = await res.json();

    expect(teardownProvisioningMock).not.toHaveBeenCalled();
    expect(activateOrderMock).not.toHaveBeenCalled();
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].args[0]).toBe('Nieuwe naam');
    expect(updateCalls[0].args[1]).toBe('pro');
    expect(updateCalls[0].args[2]).toBe('actief');
    expect(body.message).toBe('Dienst bijgewerkt');
  });
});

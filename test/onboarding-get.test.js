// GET /api/portal/onboarding — IDOR-veilig ophalen van onboarding-state.
// Volgt exact het sessie-/dispatchpatroon van handlePortalApi in
// src/lib/portal-routes.js (zelfde cookie → getSessionUser → 401, zelfde
// jsonResponse-vorm) en het ownership-patroon van getOrder (id=? AND
// customer_id=? → 404, nooit lekken of de order bestaat).
import { describe, it, expect } from 'vitest';
import { handlePortalApi } from '../src/lib/portal-routes.js';
import { createSession, sessionCookie, SESSION_COOKIE } from '../src/lib/auth.js';

const SECRET = 'test-session-secret';

// Minimale D1-stub: .prepare(sql).bind(...).first()/.all()/.run() op basis
// van SQL-substring-match — zelfde stijl als makeDbStub in
// test/checkout-start-bind.test.js.
function makeDbStub({ users = [], orders = [] }) {
  function respond(sql, args) {
    if (sql.includes('FROM users WHERE id = ?')) {
      const [id] = args;
      return { first: async () => users.find((u) => u.id === id) || null };
    }
    if (sql.includes('FROM service_orders WHERE id = ? AND customer_id = ?')) {
      const [id, customerId] = args;
      return { first: async () => orders.find((o) => o.id === id && o.customer_id === customerId) || null };
    }
    throw new Error(`makeDbStub: geen canned-antwoord voor SQL: ${sql}`);
  }
  return {
    prepare(sql) {
      return {
        bind(...args) {
          const r = respond(sql, args);
          return {
            first: r.first || (async () => { throw new Error(`geen .first() voor: ${sql}`); }),
            all: r.all || (async () => { throw new Error(`geen .all() voor: ${sql}`); }),
            run: r.run || (async () => { throw new Error(`geen .run() voor: ${sql}`); }),
          };
        },
      };
    },
  };
}

// Minimale KV-stub voor GOOGLE_TOKENS.
function makeKvStub(store = {}) {
  return {
    async get(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
  };
}

async function makeRequest(path, userId) {
  const headers = {};
  if (userId) {
    const token = await createSession(userId, SECRET);
    headers.Cookie = `${SESSION_COOKIE}=${token}`;
  }
  return new Request(`https://aanloopai.nl${path}`, { method: 'GET', headers });
}

const compleetIntake = {
  bedrijf: { bedrijfsnaam: 'Testbedrijf', branche: 'tandarts' },
  bereikbaarheid: { huidig_nummer: '+31 6 1', openingstijden: 'Ma-Vr 9-17', buiten_tijden: 'Voicemail buiten openingstijden' },
  afhandeling: { taken: ['Afspraken inplannen'] },
  kennis: { toon: 'Zakelijk en warm' },
  integraties: { agenda: 'Geen / weet ik nog niet' },
};

describe('GET /api/portal/onboarding', () => {
  it('order van de sessie-klant → 200 met {productKey, missing, progressPct, klaar, schema}', async () => {
    const users = [{ id: 'usr_1', customer_id: 'cus_1', email: 'a@test.nl', naam: 'A', role: 'eigenaar' }];
    const orders = [{ id: 'ord_1', customer_id: 'cus_1', product_key: 'emma-telefoon', intake_json: JSON.stringify(compleetIntake) }];
    const db = makeDbStub({ users, orders });
    const env = { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, GOOGLE_TOKENS: makeKvStub() };

    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding?order=ord_1', 'usr_1'), env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, productKey: 'emma-telefoon', klaar: true, progressPct: 100, missing: [] });
    expect(body.schema).toBeTruthy();
    expect(Array.isArray(body.schema.steps)).toBe(true);
    // MEDIUM-1: bestaande intake-waarden komen mee terug zodat de wizard
    // reeds-ingevulde velden kan voorvullen i.p.v. leeg te tonen.
    expect(body.answers).toEqual(compleetIntake);
  });

  it('order van een ANDERE klant → 404, geen state gelekt', async () => {
    const users = [{ id: 'usr_2', customer_id: 'cus_2', email: 'b@test.nl', naam: 'B', role: 'eigenaar' }];
    // Order bestaat, maar hoort bij cus_1, niet bij de sessie-klant cus_2.
    const orders = [{ id: 'ord_1', customer_id: 'cus_1', product_key: 'emma-telefoon', intake_json: JSON.stringify(compleetIntake) }];
    const db = makeDbStub({ users, orders });
    const env = { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, GOOGLE_TOKENS: makeKvStub() };

    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding?order=ord_1', 'usr_2'), env);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.productKey).toBeUndefined();
    expect(body.missing).toBeUndefined();
    expect(body.schema).toBeUndefined();
    expect(body.answers).toBeUndefined();
  });

  it('onbekende order-id → 404, identiek aan een order van een andere klant', async () => {
    const users = [{ id: 'usr_1', customer_id: 'cus_1', email: 'a@test.nl', naam: 'A', role: 'eigenaar' }];
    const db = makeDbStub({ users, orders: [] });
    const env = { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, GOOGLE_TOKENS: makeKvStub() };

    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding?order=ord_onbekend', 'usr_1'), env);
    expect(res.status).toBe(404);
  });

  it('geen sessie → 401', async () => {
    const db = makeDbStub({ users: [], orders: [] });
    const env = { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, GOOGLE_TOKENS: makeKvStub() };

    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding?order=ord_1'), env);
    expect(res.status).toBe(401);
  });

  it('agendaGekoppeld wordt afgeleid uit GOOGLE_TOKENS KV (oauth:google:cust:<customerId>)', async () => {
    const users = [{ id: 'usr_1', customer_id: 'cus_1', email: 'a@test.nl', naam: 'A', role: 'eigenaar' }];
    const intake = { ...compleetIntake, integraties: { agenda: 'Google Agenda' } };
    const orders = [{ id: 'ord_1', customer_id: 'cus_1', product_key: 'emma-telefoon', intake_json: JSON.stringify(intake) }];
    const db = makeDbStub({ users, orders });
    const env = {
      PORTAL_DB: db,
      PORTAL_SESSION_SECRET: SECRET,
      GOOGLE_TOKENS: makeKvStub({ 'oauth:google:cust:cus_1': JSON.stringify({ access_token: 'x' }) }),
    };

    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding?order=ord_1', 'usr_1'), env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.missing).not.toContain('agenda_koppeling');
    expect(body.klaar).toBe(true);
  });
});

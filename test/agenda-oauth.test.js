// Task 11: per-tenant Google-agenda OAuth (initiate + callback).
// Volgt hetzelfde sessie-/dispatchpatroon als test/onboarding-get.test.js
// (handlePortalApi → getSessionUser → 401, id=? AND customer_id=? → 404).
import {
  describe, it, expect, afterEach,
} from 'vitest';
import { handlePortalApi } from '../src/lib/portal-routes.js';
import { createSession, sessionCookie, SESSION_COOKIE } from '../src/lib/auth.js';
import { buildAgendaState, verifyAgendaState } from '../src/lib/agenda-oauth.js';

// Eén secret voor beide doelen — precies zoals in productie: PORTAL_SESSION_SECRET
// ondertekent zowel de sessie-cookie (auth.js) als de agenda-oauth state (agenda-oauth.js).
const SECRET = 'test-portal-session-secret';
const STATE_SECRET = SECRET;

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

// Minimale D1-stub — zelfde stijl als test/onboarding-get.test.js.
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
          };
        },
      };
    },
  };
}

// Minimale KV-stub met muteerbare state + get/put — zelfde stijl als
// test/google-auth-multitenant.test.js.
function makeKvStub(initial = {}) {
  const store = { ...initial };
  return {
    store,
    async get(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    async put(key, value) { store[key] = value; },
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

function baseEnv({ users, orders, kvStore } = {}) {
  return {
    PORTAL_DB: makeDbStub({ users, orders }),
    PORTAL_SESSION_SECRET: STATE_SECRET,
    GOOGLE_TOKENS: makeKvStub(kvStore),
    GOOGLE_CLIENT_ID: 'client-id-test',
    GOOGLE_CLIENT_SECRET: 'client-secret-test',
  };
}

function mockTokenExchangeFetch({ access_token = 'access-xyz', refresh_token = 'refresh-xyz', expires_in = 3600 } = {}) {
  globalThis.fetch = async (u) => {
    expect(String(u)).toContain('oauth2.googleapis.com/token');
    return { ok: true, json: async () => ({ access_token, refresh_token, expires_in }) };
  };
}

describe('buildAgendaState / verifyAgendaState', () => {
  it('rond-trip: geldige state → { customerId, orderId }', async () => {
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1');
    const result = await verifyAgendaState(STATE_SECRET, state);
    expect(result).toEqual({ customerId: 'cus_1', orderId: 'ord_1' });
  });

  it('één gewijzigd teken in de HMAC-hex → null', async () => {
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1');
    const [body, sigHex] = state.split('.');
    const flippedChar = sigHex[0] === '0' ? '1' : '0';
    const tampered = `${body}.${flippedChar}${sigHex.slice(1)}`;
    expect(await verifyAgendaState(STATE_SECRET, tampered)).toBeNull();
  });

  it('gewijzigde payload (andere customerId) → null', async () => {
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1');
    const forged = await buildAgendaStateWithMismatchedSig(state);
    expect(await verifyAgendaState(STATE_SECRET, forged)).toBeNull();
  });

  it('verkeerd secret → null', async () => {
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1');
    expect(await verifyAgendaState('ander-secret', state)).toBeNull();
  });

  it('misvormde state (geen punt) → null', async () => {
    expect(await verifyAgendaState(STATE_SECRET, 'niet-een-geldige-state')).toBeNull();
  });

  it('lege/undefined state → null', async () => {
    expect(await verifyAgendaState(STATE_SECRET, '')).toBeNull();
    expect(await verifyAgendaState(STATE_SECRET, undefined)).toBeNull();
  });
});

// Helper: neemt een geldige state, vervangt alleen de base64url-payload door
// een payload voor een ANDER klant-id, maar behoudt de oorspronkelijke
// (nu niet meer passende) HMAC-hex — simuleert een aanvaller die de payload
// probeert te wijzigen zonder het secret te kennen.
async function buildAgendaStateWithMismatchedSig(originalState) {
  const [, sigHex] = originalState.split('.');
  const forgedPayload = btoa('cus_ATTACKER.ord_1').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${forgedPayload}.${sigHex}`;
}

describe('GET /api/portal/onboarding/agenda/initiate', () => {
  it('geen sessie → 401', async () => {
    const env = baseEnv({ users: [], orders: [] });
    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding/agenda/initiate?order=ord_1'), env);
    expect(res.status).toBe(401);
  });

  it('vreemde/onbekende order → 404', async () => {
    const users = [{ id: 'usr_1', customer_id: 'cus_1', email: 'a@test.nl', naam: 'A', role: 'eigenaar' }];
    const orders = [{ id: 'ord_1', customer_id: 'cus_ANDER' }]; // hoort niet bij cus_1
    const env = baseEnv({ users, orders });
    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding/agenda/initiate?order=ord_1', 'usr_1'), env);
    expect(res.status).toBe(404);
  });

  it('eigen order → 302 naar Google-consent met signed state + calendar.events scope', async () => {
    const users = [{ id: 'usr_1', customer_id: 'cus_1', email: 'a@test.nl', naam: 'A', role: 'eigenaar' }];
    const orders = [{ id: 'ord_1', customer_id: 'cus_1' }];
    const env = baseEnv({ users, orders });
    const res = await handlePortalApi(await makeRequest('/api/portal/onboarding/agenda/initiate?order=ord_1', 'usr_1'), env);
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('Location'));
    expect(location.origin + location.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(location.searchParams.get('client_id')).toBe('client-id-test');
    expect(location.searchParams.get('redirect_uri')).toBe('https://aanloopai.nl/api/portal/onboarding/agenda/callback');
    expect(location.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/calendar.events');
    expect(location.searchParams.get('access_type')).toBe('offline');
    expect(location.searchParams.get('prompt')).toBe('consent');
    const state = location.searchParams.get('state');
    expect(await verifyAgendaState(STATE_SECRET, state)).toEqual({ customerId: 'cus_1', orderId: 'ord_1' });
  });
});

// De callback is UNAUTHENTICATED by design (state-HMAC is de enige
// autorisatie — zie de comment op handleAgendaCallback + de dispatcher in
// portal-routes.js): geen van onderstaande requests draagt een sessiecookie,
// precies zoals een echte browser die terugkomt van accounts.google.com dat
// ook niet doet (SameSite=Strict wordt niet meegestuurd op een cross-site
// top-level redirect).
describe('GET /api/portal/onboarding/agenda/callback', () => {
  it('ongeldige/gemanipuleerde state → 400', async () => {
    const env = baseEnv({});
    const res = await handlePortalApi(
      await makeRequest('/api/portal/onboarding/agenda/callback?code=abc&state=niet-geldig'), env,
    );
    expect(res.status).toBe(400);
  });

  it('geldige callback ZONDER sessiecookie: wisselt code in, slaat token op onder oauth:google:cust:<customerId uit state>, redirect naar /portal/onboarding', async () => {
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1');
    const env = baseEnv({});
    mockTokenExchangeFetch({ access_token: 'access-123', refresh_token: 'refresh-123', expires_in: 3600 });

    const before = Date.now();
    // makeRequest zonder userId → geen sessiecookie, exact het echte-browser-scenario.
    const res = await handlePortalApi(
      await makeRequest(`/api/portal/onboarding/agenda/callback?code=abc&state=${encodeURIComponent(state)}`),
      env,
    );

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('https://aanloopai.nl/portal/onboarding?order=ord_1');

    const stored = JSON.parse(env.GOOGLE_TOKENS.store['oauth:google:cust:cus_1']);
    expect(stored.access_token).toBe('access-123');
    expect(stored.refresh_token).toBe('refresh-123');
    expect(stored.expires_at).toBeGreaterThanOrEqual(before + 3600 * 1000);
    // Geen andere/admin-key aangeraakt.
    expect(env.GOOGLE_TOKENS.store['oauth:google:admin']).toBeUndefined();
  });

  it('Google levert geen refresh_token → 502, niets opgeslagen (ook zonder sessiecookie)', async () => {
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1');
    const env = baseEnv({});
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ access_token: 'access-123', expires_in: 3600 }) });

    const res = await handlePortalApi(
      await makeRequest(`/api/portal/onboarding/agenda/callback?code=abc&state=${encodeURIComponent(state)}`),
      env,
    );
    expect(res.status).toBe(502);
    expect(env.GOOGLE_TOKENS.store['oauth:google:cust:cus_1']).toBeUndefined();
  });

  it('OAuth error-param (gebruiker weigerde consent) → 400 (ook zonder sessiecookie)', async () => {
    const env = baseEnv({});
    const res = await handlePortalApi(
      await makeRequest('/api/portal/onboarding/agenda/callback?error=access_denied'), env,
    );
    expect(res.status).toBe(400);
  });
});

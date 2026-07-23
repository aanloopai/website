// Task 11: per-tenant Google-agenda OAuth (initiate + callback).
// Volgt hetzelfde sessie-/dispatchpatroon als test/onboarding-get.test.js
// (handlePortalApi → getSessionUser → 401, id=? AND customer_id=? → 404).
import {
  describe, it, expect, afterEach,
} from 'vitest';
import { handlePortalApi } from '../src/lib/portal-routes.js';
import {
  createSession, sessionCookie, SESSION_COOKIE, sha256Hex,
} from '../src/lib/auth.js';
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

async function makeRequest(path, userId, bindCookieValue) {
  const headers = {};
  const cookieParts = [];
  if (userId) {
    const token = await createSession(userId, SECRET);
    cookieParts.push(`${SESSION_COOKIE}=${token}`);
  }
  if (bindCookieValue) cookieParts.push(`agenda_oauth_bind=${bindCookieValue}`);
  if (cookieParts.length) headers.Cookie = cookieParts.join('; ');
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

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

describe('buildAgendaState / verifyAgendaState', () => {
  it('rond-trip: geldige state → { customerId, orderId, nonceHash }', async () => {
    const nonceHash = await sha256Hex('agn_abc123');
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1', nonceHash);
    const result = await verifyAgendaState(STATE_SECRET, state);
    expect(result).toEqual({ customerId: 'cus_1', orderId: 'ord_1', nonceHash });
  });

  it('één gewijzigd teken in de HMAC-hex → null', async () => {
    const nonceHash = await sha256Hex('agn_abc123');
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1', nonceHash);
    const [body, sigHex] = state.split('.');
    const flippedChar = sigHex[0] === '0' ? '1' : '0';
    const tampered = `${body}.${flippedChar}${sigHex.slice(1)}`;
    expect(await verifyAgendaState(STATE_SECRET, tampered)).toBeNull();
  });

  it('gewijzigde payload (andere customerId) → null', async () => {
    const nonceHash = await sha256Hex('agn_abc123');
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1', nonceHash);
    const forged = await buildAgendaStateWithMismatchedSig(state);
    expect(await verifyAgendaState(STATE_SECRET, forged)).toBeNull();
  });

  it('verkeerd secret → null', async () => {
    const nonceHash = await sha256Hex('agn_abc123');
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1', nonceHash);
    expect(await verifyAgendaState('ander-secret', state)).toBeNull();
  });

  it('misvormde state (geen punt) → null', async () => {
    expect(await verifyAgendaState(STATE_SECRET, 'niet-een-geldige-state')).toBeNull();
  });

  it('lege/undefined state → null', async () => {
    expect(await verifyAgendaState(STATE_SECRET, '')).toBeNull();
    expect(await verifyAgendaState(STATE_SECRET, undefined)).toBeNull();
  });

  it('verlopen state (ts > 15 min geleden) → null', async () => {
    const nonceHash = await sha256Hex('agn_abc123');
    const state = await buildStateWithTimestamp('cus_1', 'ord_1', nonceHash, Date.now() - FIFTEEN_MIN_MS - 1000);
    expect(await verifyAgendaState(STATE_SECRET, state)).toBeNull();
  });

  it('state net binnen de 15 minuten → geldig', async () => {
    const nonceHash = await sha256Hex('agn_abc123');
    const state = await buildStateWithTimestamp('cus_1', 'ord_1', nonceHash, Date.now() - FIFTEEN_MIN_MS + 1000);
    expect(await verifyAgendaState(STATE_SECRET, state)).toEqual({ customerId: 'cus_1', orderId: 'ord_1', nonceHash });
  });

  it('ontbrekende/verkeerde prefix → null', async () => {
    const state = await buildStateWithRawPayload('cus_1.ord_1.agn_abc123.' + Date.now());
    expect(await verifyAgendaState(STATE_SECRET, state)).toBeNull();
  });

  it('te weinig velden na de prefix → null', async () => {
    const state = await buildStateWithRawPayload(`agenda-state:v1|cus_1.ord_1.${Date.now()}`);
    expect(await verifyAgendaState(STATE_SECRET, state)).toBeNull();
  });
});

// Helper: neemt een geldige state, vervangt alleen de base64url-payload door
// een payload voor een ANDER klant-id, maar behoudt de oorspronkelijke
// (nu niet meer passende) HMAC-hex — simuleert een aanvaller die de payload
// probeert te wijzigen zonder het secret te kennen.
async function buildAgendaStateWithMismatchedSig(originalState) {
  const [, sigHex] = originalState.split('.');
  const forgedPayload = btoa('agenda-state:v1|cus_ATTACKER.ord_1.agn_x.0').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${forgedPayload}.${sigHex}`;
}

// Helpers die rechtstreeks (correct-ondertekende) state-tokens bouwen met een
// controleerbare timestamp of rauwe payload — voor TTL/prefix/veldtelling-tests.
async function signRawPayload(payload) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(STATE_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const sigHex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const body = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${body}.${sigHex}`;
}
async function buildStateWithTimestamp(customerId, orderId, nonceHash, ts) {
  return signRawPayload(`agenda-state:v1|${customerId}.${orderId}.${nonceHash}.${ts}`);
}
async function buildStateWithRawPayload(payload) {
  return signRawPayload(payload);
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

  it('eigen order → 302 naar Google-consent met signed state + calendar.events scope + Lax bind-cookie', async () => {
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
    const verified = await verifyAgendaState(STATE_SECRET, state);
    expect(verified).toMatchObject({ customerId: 'cus_1', orderId: 'ord_1' });
    expect(verified.nonceHash).toBeTruthy();

    const setCookie = res.headers.get('Set-Cookie');
    expect(setCookie).toContain('agenda_oauth_bind=');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Max-Age=900');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('Path=/api/portal/onboarding/agenda/callback');
    // De state bevat NOOIT de rauwe nonce — alleen de hash. De cookie-waarde
    // is de rauwe nonce; sha256(cookie-waarde) moet matchen met de hash in de
    // state (bewijst dat het gat uit de MEDIUM-fix gesloten is: een gelekte
    // state onthult alleen de hash, niet de rauwe nonce zelf).
    const cookieMatch = setCookie.match(/agenda_oauth_bind=([^;]+);/);
    expect(cookieMatch).toBeTruthy();
    const rawNonceFromCookie = cookieMatch[1];
    expect(rawNonceFromCookie).not.toBe(verified.nonceHash);
    expect(await sha256Hex(rawNonceFromCookie)).toBe(verified.nonceHash);
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

  it('geldige state + MATCHENDE agenda_oauth_bind-cookie (rauwe nonce in cookie, hash in state, zonder sessiecookie): wisselt code in, slaat token op onder oauth:google:cust:<customerId uit state>, redirect naar /portal/onboarding', async () => {
    const rawNonce = 'agn_nonce1';
    const nonceHash = await sha256Hex(rawNonce);
    // De state bevat de HASH, nooit de rauwe nonce — bewijst dat de match op
    // sha256(rauwe nonce uit cookie) === nonceHash-in-state werkt, niet op
    // een directe string-vergelijking met de state-inhoud.
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1', nonceHash);
    const env = baseEnv({});
    mockTokenExchangeFetch({ access_token: 'access-123', refresh_token: 'refresh-123', expires_in: 3600 });

    const before = Date.now();
    // makeRequest zonder userId → geen sessiecookie, exact het echte-browser-scenario;
    // WEL de bind-cookie (SameSite=Lax overleeft de cross-site redirect van Google)
    // met de RAUWE nonce — nooit de hash.
    const res = await handlePortalApi(
      await makeRequest(
        `/api/portal/onboarding/agenda/callback?code=abc&state=${encodeURIComponent(state)}`,
        null,
        rawNonce,
      ),
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

  it('aanvaller zet de nonceHash zelf (uit de state) als cookie-waarde → 400: bewijst dat de state-inhoud niet volstaat om de cookie te vervalsen', async () => {
    const rawNonce = 'agn_nonce1';
    const nonceHash = await sha256Hex(rawNonce);
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1', nonceHash);
    const env = baseEnv({});
    let fetchCalled = false;
    globalThis.fetch = async () => { fetchCalled = true; return { ok: true, json: async () => ({}) }; };

    // Aanvaller leest de (gelekte) state, decodeert de payload, en zet de
    // daaruit gehaalde nonceHash zelf als cookie — hij kent de rauwe nonce
    // niet. sha256(nonceHash) !== nonceHash, dus de match faalt.
    const res = await handlePortalApi(
      await makeRequest(
        `/api/portal/onboarding/agenda/callback?code=abc&state=${encodeURIComponent(state)}`,
        null,
        nonceHash,
      ),
      env,
    );

    expect(res.status).toBe(400);
    expect(fetchCalled).toBe(false);
    expect(env.GOOGLE_TOKENS.store['oauth:google:cust:cus_1']).toBeUndefined();
  });

  it('geldige state ZONDER agenda_oauth_bind-cookie → 400, geen token-exchange, geen KV-put', async () => {
    const nonceHash = await sha256Hex('agn_nonce1');
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1', nonceHash);
    const env = baseEnv({});
    let fetchCalled = false;
    globalThis.fetch = async () => { fetchCalled = true; return { ok: true, json: async () => ({}) }; };

    const res = await handlePortalApi(
      await makeRequest(`/api/portal/onboarding/agenda/callback?code=abc&state=${encodeURIComponent(state)}`),
      env,
    );

    expect(res.status).toBe(400);
    expect(fetchCalled).toBe(false);
    expect(env.GOOGLE_TOKENS.store['oauth:google:cust:cus_1']).toBeUndefined();
  });

  it('geldige state met VERKEERDE agenda_oauth_bind-cookie → 400, geen token-exchange, geen KV-put', async () => {
    const nonceHash = await sha256Hex('agn_nonce1');
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1', nonceHash);
    const env = baseEnv({});
    let fetchCalled = false;
    globalThis.fetch = async () => { fetchCalled = true; return { ok: true, json: async () => ({}) }; };

    const res = await handlePortalApi(
      await makeRequest(
        `/api/portal/onboarding/agenda/callback?code=abc&state=${encodeURIComponent(state)}`,
        null,
        'agn_ANDERE-NONCE',
      ),
      env,
    );

    expect(res.status).toBe(400);
    expect(fetchCalled).toBe(false);
    expect(env.GOOGLE_TOKENS.store['oauth:google:cust:cus_1']).toBeUndefined();
  });

  it('verlopen state (ouder dan 15 min) mét matchende cookie → 400, geen token-exchange', async () => {
    const rawNonce = 'agn_nonce1';
    const nonceHash = await sha256Hex(rawNonce);
    const payload = `agenda-state:v1|cus_1.ord_1.${nonceHash}.${Date.now() - FIFTEEN_MIN_MS - 1000}`;
    const state = await signRawPayload(payload);
    const env = baseEnv({});
    let fetchCalled = false;
    globalThis.fetch = async () => { fetchCalled = true; return { ok: true, json: async () => ({}) }; };

    const res = await handlePortalApi(
      await makeRequest(
        `/api/portal/onboarding/agenda/callback?code=abc&state=${encodeURIComponent(state)}`,
        null,
        rawNonce,
      ),
      env,
    );

    expect(res.status).toBe(400);
    expect(fetchCalled).toBe(false);
  });

  it('Google levert geen refresh_token → 502, niets opgeslagen (ook zonder sessiecookie)', async () => {
    const rawNonce = 'agn_nonce1';
    const nonceHash = await sha256Hex(rawNonce);
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1', nonceHash);
    const env = baseEnv({});
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ access_token: 'access-123', expires_in: 3600 }) });

    const res = await handlePortalApi(
      await makeRequest(
        `/api/portal/onboarding/agenda/callback?code=abc&state=${encodeURIComponent(state)}`,
        null,
        rawNonce,
      ),
      env,
    );
    expect(res.status).toBe(502);
    expect(env.GOOGLE_TOKENS.store['oauth:google:cust:cus_1']).toBeUndefined();
  });

  it('token-response zonder geldige expires_in → 502, niets opgeslagen', async () => {
    const rawNonce = 'agn_nonce1';
    const nonceHash = await sha256Hex(rawNonce);
    const state = await buildAgendaState(STATE_SECRET, 'cus_1', 'ord_1', nonceHash);
    const env = baseEnv({});
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ access_token: 'access-123', refresh_token: 'refresh-123', expires_in: 'niet-een-getal' }),
    });

    const res = await handlePortalApi(
      await makeRequest(
        `/api/portal/onboarding/agenda/callback?code=abc&state=${encodeURIComponent(state)}`,
        null,
        rawNonce,
      ),
      env,
    );
    expect(res.status).toBe(502);
    expect(env.GOOGLE_TOKENS.store['oauth:google:cust:cus_1']).toBeUndefined();
  });

  it('OAuth error-param (gebruiker weigerde consent) → 400 met vaste boodschap, param wordt niet gereflecteerd', async () => {
    const env = baseEnv({});
    const res = await handlePortalApi(
      await makeRequest('/api/portal/onboarding/agenda/callback?error=access_denied%3Cscript%3E'), env,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Google-agenda koppelen is niet gelukt');
    expect(body.error).not.toContain('access_denied');
    expect(body.error).not.toContain('<script>');
  });
});

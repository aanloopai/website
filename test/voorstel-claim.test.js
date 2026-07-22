// handleVoorstelClaim maakt met opzet NIETS aan (geen customer/user/order) —
// alleen een voorstel_claims-rij + een verificatiemail naar het adres uit de
// intake-rij. Zie src/lib/voorstel-claim.js voor het waarom.
import {
  describe, it, expect, afterEach,
} from 'vitest';
import { bouwClaimMail, CLAIM_TTL_MS, handleVoorstelClaim } from '../src/lib/voorstel-claim.js';

describe('claim-mail', () => {
  it('bevat de verificatielink en geen wachtwoord-taal', () => {
    const html = bouwClaimMail('https://aanloopai.nl/api/voorstel/verify?t=abc', 'Jan');
    expect(html).toContain('https://aanloopai.nl/api/voorstel/verify?t=abc');
    expect(html).toContain('Jan');
    expect(html.toLowerCase()).not.toContain('wachtwoord');
  });

  it('houdt de claim kort geldig', () => {
    expect(CLAIM_TTL_MS).toBe(30 * 60 * 1000);
  });
});

// ── handleVoorstelClaim ──────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

const GELDIG_TOKEN = 'a'.repeat(64);

// Minimale D1-dubbel over drie tabellen: voorstellen, intake_requests,
// voorstel_claims. Elke .prepare(sql) matcht op een sql-substring, net als
// de stub in test/checkout-start-bind.test.js.
function makeDb({ voorstel, intake }) {
  const claimInserts = [];
  const statusUpdates = [];
  let voorstelRow = voorstel ? { ...voorstel } : null;

  return {
    claimInserts,
    statusUpdates,
    get voorstelRow() { return voorstelRow; },
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.startsWith('SELECT id, intake_id, expires_at FROM voorstellen')) {
                return voorstelRow && voorstelRow.token === args[0] ? voorstelRow : null;
              }
              if (sql.startsWith('SELECT customer_json FROM intake_requests')) {
                return intake && intake.id === args[0] ? intake : null;
              }
              throw new Error(`makeDb: geen .first() canned voor: ${sql}`);
            },
            async run() {
              if (sql.startsWith('INSERT INTO voorstel_claims')) {
                claimInserts.push({ tokenHash: args[0], voorstelId: args[1], email: args[2], expiresAt: args[3], createdAt: args[4] });
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith("UPDATE voorstellen SET status = 'geclaimd'")) {
                statusUpdates.push(args[0]);
                if (voorstelRow && voorstelRow.id === args[0]) voorstelRow = { ...voorstelRow, status: 'geclaimd' };
                return { meta: { changes: 1 } };
              }
              throw new Error(`makeDb: geen .run() canned voor: ${sql}`);
            },
          };
        },
      };
    },
  };
}

function makeRequest(bodyObj, method = 'POST') {
  return {
    method,
    headers: { get: () => '203.0.113.9' },
    json: async () => bodyObj,
  };
}

function brevoOkFetch() {
  return async () => ({ ok: true, status: 200, text: async () => '{}' });
}
function brevoFailFetch() {
  return async () => ({ ok: false, status: 500, text: async () => 'boom' });
}

const VOORSTEL = { id: 'vst_1', token: GELDIG_TOKEN, intake_id: 'intake_1', expires_at: Date.now() + 100000 };
const INTAKE = { id: 'intake_1', customer_json: JSON.stringify({ email: 'echte-klant@example.nl', name: 'Jan Jansen' }) };

describe('handleVoorstelClaim', () => {
  it('weigert non-POST', async () => {
    const env = { PORTAL_DB: makeDb({ voorstel: VOORSTEL, intake: INTAKE }) };
    const res = await handleVoorstelClaim(makeRequest({}, 'GET'), env);
    expect(res.status).toBe(405);
  });

  it('geeft 503 zonder PORTAL_DB — nooit een technische melding', async () => {
    const res = await handleVoorstelClaim(makeRequest({ t: GELDIG_TOKEN }), {});
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('weigert een ongeldig tokenformaat met 400, zonder de database te raken', async () => {
    const db = makeDb({ voorstel: VOORSTEL, intake: INTAKE });
    const env = { PORTAL_DB: db, BREVO_API_KEY: 'x' };
    globalThis.fetch = brevoOkFetch();
    const res = await handleVoorstelClaim(makeRequest({ t: 'niet-hex' }), env);
    expect(res.status).toBe(400);
    expect(db.claimInserts).toHaveLength(0);
  });

  it('geeft 404 voor een onbekend voorstel-token', async () => {
    const db = makeDb({ voorstel: null, intake: null });
    const env = { PORTAL_DB: db, BREVO_API_KEY: 'x' };
    const res = await handleVoorstelClaim(makeRequest({ t: GELDIG_TOKEN }), env);
    expect(res.status).toBe(404);
  });

  it('geeft 404 voor een verlopen voorstel', async () => {
    const verlopen = { ...VOORSTEL, expires_at: Date.now() - 1000 };
    const db = makeDb({ voorstel: verlopen, intake: INTAKE });
    const env = { PORTAL_DB: db, BREVO_API_KEY: 'x' };
    const res = await handleVoorstelClaim(makeRequest({ t: GELDIG_TOKEN }), env);
    expect(res.status).toBe(404);
  });

  it('geeft 409 wanneer de intake-rij geen e-mailadres bevat', async () => {
    const leegIntake = { id: 'intake_1', customer_json: JSON.stringify({ name: 'Jan' }) };
    const db = makeDb({ voorstel: VOORSTEL, intake: leegIntake });
    const env = { PORTAL_DB: db, BREVO_API_KEY: 'x' };
    const res = await handleVoorstelClaim(makeRequest({ t: GELDIG_TOKEN }), env);
    expect(res.status).toBe(409);
    expect(db.claimInserts).toHaveLength(0);
  });

  it('gebruikt UITSLUITEND het e-mailadres uit de intake-rij, nooit dat uit de request body', async () => {
    const db = makeDb({ voorstel: VOORSTEL, intake: INTAKE });
    const env = { PORTAL_DB: db, BREVO_API_KEY: 'x' };
    let verstuurdAan = null;
    globalThis.fetch = async (url, opts) => {
      verstuurdAan = JSON.parse(opts.body).to[0].email;
      return { ok: true, status: 200, text: async () => '{}' };
    };

    // De aanroeper probeert een ander (slachtoffer)adres mee te sturen.
    const res = await handleVoorstelClaim(
      makeRequest({ t: GELDIG_TOKEN, email: 'slachtoffer@evil.example' }),
      env,
    );

    expect(res.status).toBe(200);
    expect(verstuurdAan).toBe('echte-klant@example.nl');
    expect(db.claimInserts[0].email).toBe('echte-klant@example.nl');
  });

  it('happy path: slaat een gehashte claim op, verstuurt de mail, zet status op geclaimd, en antwoordt generiek', async () => {
    const db = makeDb({ voorstel: VOORSTEL, intake: INTAKE });
    const env = { PORTAL_DB: db, BREVO_API_KEY: 'x' };
    globalThis.fetch = brevoOkFetch();

    const res = await handleVoorstelClaim(makeRequest({ t: GELDIG_TOKEN }), env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // Geen technische taal, geen wachtwoord-taal in de respons.
    expect(body.message.toLowerCase()).not.toContain('wachtwoord');

    expect(db.claimInserts).toHaveLength(1);
    const claim = db.claimInserts[0];
    // Rauw token nooit opgeslagen — alleen de sha256-hex hash (64 hex chars).
    expect(claim.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(claim.voorstelId).toBe('vst_1');
    expect(claim.expiresAt - claim.createdAt).toBe(CLAIM_TTL_MS);

    expect(db.statusUpdates).toEqual(['vst_1']);
  });

  it('mislukte mailverzending: 502, generieke boodschap, maar de claim-rij blijft (inert) staan', async () => {
    const db = makeDb({ voorstel: VOORSTEL, intake: INTAKE });
    const env = { PORTAL_DB: db, BREVO_API_KEY: 'x' };
    globalThis.fetch = brevoFailFetch();

    const res = await handleVoorstelClaim(makeRequest({ t: GELDIG_TOKEN }), env);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.message).not.toMatch(/error|Brevo|HTTP|500/i);

    // De claim is al ingevoegd vóór de mailpoging (zelfde volgorde als de
    // andere claim-achtige flows in dit codebase) — bij falen blijft hij
    // staan, maar is onbruikbaar: alleen de hash is opgeslagen en het rauwe
    // token is nooit verzonden, dus niemand kan hem ooit inwisselen.
    expect(db.claimInserts).toHaveLength(1);
    // Status wordt NIET op geclaimd gezet wanneer de mail niet is verstuurd.
    expect(db.statusUpdates).toHaveLength(0);
  });

  it('begrenst herhaalde aanvragen per IP (spam-vector)', async () => {
    const db = makeDb({ voorstel: VOORSTEL, intake: INTAKE });
    const kv = new Map();
    const fakeKv = {
      async get(key) { return kv.has(key) ? kv.get(key) : null; },
      async put(key, value) { kv.set(key, value); },
    };
    const env = { PORTAL_DB: db, GOOGLE_TOKENS: fakeKv, BREVO_API_KEY: 'x' };
    globalThis.fetch = brevoOkFetch();

    let laatsteStatus = 0;
    for (let i = 0; i < 6; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await handleVoorstelClaim(makeRequest({ t: GELDIG_TOKEN }), env);
      laatsteStatus = res.status;
    }
    expect(laatsteStatus).toBe(429);
    // 5 toegestaan, de 6e geweigerd — dus hooguit 5 mails/claims.
    expect(db.claimInserts.length).toBeLessThanOrEqual(5);
  });
});

import {
  describe, it, expect,
} from 'vitest';
import { mintKlantEnOrder, handleVoorstelVerify } from '../src/lib/voorstel-verify.js';
import { sha256Hex, verifySession } from '../src/lib/auth.js';

// ── D1-dubbel voor mintKlantEnOrder-tests ───────────────────────────────────
// Elke .prepare(sql).bind(...args) matcht op een sql-substring. `.batch()`
// modelleert D1's atomiciteit: alle statements slagen samen, of geen enkele
// blijft staan (snapshot/rollback bij een gooiende .run()).
// `failInsert`: naam van de tabel waarvan de INSERT moet gooien — simuleert
// een D1-storing op precies dat statement.
function fakeDb(opts = {}) {
  const db = { customers: [], users: [], orders: [], subscriptions: [] };
  const failInsert = opts.failInsert || null;

  const first = (sql, args) => {
    if (sql.includes('FROM users WHERE email')) return db.users.find((u) => u.email === args[0]) || null;
    if (sql.includes('FROM service_orders WHERE voorstel_id')) return db.orders.find((o) => o.voorstel_id === args[0]) || null;
    if (sql.includes('FROM subscriptions')) {
      return db.subscriptions.find((s) => s.customer_id === args[0] && s.product_key === args[1]) || null;
    }
    return null;
  };
  const run = (sql, args) => {
    if (sql.startsWith('INSERT INTO customers')) {
      if (failInsert === 'customers') throw new Error('gesimuleerde D1-storing op INSERT INTO customers');
      db.customers.push({ id: args[0], bedrijf: args[1] });
    }
    if (sql.startsWith('INSERT INTO users')) {
      if (failInsert === 'users') throw new Error('gesimuleerde D1-storing op INSERT INTO users');
      db.users.push({
        id: args[0], customer_id: args[1], email: args[2], naam: args[3], role: args[4],
      });
    }
    if (sql.startsWith('INSERT OR IGNORE INTO service_orders')) {
      if (failInsert === 'service_orders') throw new Error('gesimuleerde D1-storing op INSERT INTO service_orders');
      if (!db.orders.some((o) => o.voorstel_id === args[6])) {
        db.orders.push({
          id: args[0], customer_id: args[1], user_id: args[2], product_key: args[3], tier: args[4], voorstel_id: args[6], status: 'concept',
        });
      }
    }
    return { meta: { changes: 1 } };
  };

  return {
    data: db,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() { return first(sql, args); },
            async run() { return run(sql, args); },
          };
        },
      };
    },
    // Atomisch: snapshot vooraf, bij een gooiende .run() alles terugdraaien —
    // net als removeMember() in portal-routes.js.
    async batch(stmts) {
      const snapCustomers = [...db.customers];
      const snapUsers = [...db.users];
      try {
        const results = [];
        for (const s of stmts) results.push(await s.run());
        return results;
      } catch (err) {
        db.customers.length = 0; db.customers.push(...snapCustomers);
        db.users.length = 0; db.users.push(...snapUsers);
        throw err;
      }
    },
  };
}

const VOORSTEL = { id: 'vst_1', product_key: 'emma-telefoon', tier_naam: 'Starter' };

describe('mintKlantEnOrder', () => {
  it('maakt customer, user en order voor een nieuwe klant', async () => {
    const env = { PORTAL_DB: fakeDb() };
    const res = await mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'jan@example.nl', klant: { name: 'Jan', company: 'Jansen' } });
    expect(env.PORTAL_DB.data.customers).toHaveLength(1);
    expect(env.PORTAL_DB.data.users[0].role).toBe('eigenaar');
    expect(res.orderId).toBeTruthy();
    expect(res.bestondAl).toBe(false);
  });

  it('hergebruikt een bestaande klant in plaats van een tweede aan te maken', async () => {
    const env = { PORTAL_DB: fakeDb() };
    env.PORTAL_DB.data.customers.push({ id: 'cust_1', bedrijf: 'Jansen' });
    env.PORTAL_DB.data.users.push({
      id: 'usr_1', customer_id: 'cust_1', email: 'jan@example.nl', naam: 'Jan', role: 'eigenaar',
    });
    const res = await mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'jan@example.nl', klant: { name: 'Jan' } });
    expect(env.PORTAL_DB.data.customers).toHaveLength(1);
    expect(res.userId).toBe('usr_1');
    expect(res.bestondAl).toBe(true);
  });

  it('is idempotent: hetzelfde voorstel levert nooit twee orders', async () => {
    const env = { PORTAL_DB: fakeDb() };
    const a = await mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'jan@example.nl', klant: {} });
    const b = await mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'jan@example.nl', klant: {} });
    expect(env.PORTAL_DB.data.orders).toHaveLength(1);
    expect(a.orderId).toBe(b.orderId);
  });

  it('weigert wanneer er al een actief abonnement voor hetzelfde product is', async () => {
    const env = { PORTAL_DB: fakeDb() };
    env.PORTAL_DB.data.customers.push({ id: 'cust_1', bedrijf: 'Jansen' });
    env.PORTAL_DB.data.users.push({
      id: 'usr_1', customer_id: 'cust_1', email: 'jan@example.nl', naam: 'Jan', role: 'eigenaar',
    });
    env.PORTAL_DB.data.subscriptions.push({ customer_id: 'cust_1', product_key: 'emma-telefoon', status: 'active' });
    await expect(
      mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'jan@example.nl', klant: {} }),
    ).rejects.toThrow(/al een actief abonnement/i);
  });

  // ── Review-fix 1: expliciete staff-guard ──────────────────────────────────
  it('weigert medewerkersaccounts (role=staff) vóór elke schrijfactie', async () => {
    const env = { PORTAL_DB: fakeDb() };
    env.PORTAL_DB.data.users.push({
      id: 'usr_staff', customer_id: null, email: 'staff@aanloopai.nl', naam: 'Emma', role: 'staff',
    });
    await expect(
      mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'staff@aanloopai.nl', klant: {} }),
    ).rejects.toThrow(/medewerkersaccount/i);
    expect(env.PORTAL_DB.data.customers).toHaveLength(0);
    expect(env.PORTAL_DB.data.orders).toHaveLength(0);
  });

  // ── Review-fix 2: half-klant-preventie via batch ──────────────────────────
  it('laat geen wees-customer achter als de user-insert in de batch faalt', async () => {
    const env = { PORTAL_DB: fakeDb({ failInsert: 'users' }) };
    await expect(
      mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'nieuw@example.nl', klant: {} }),
    ).rejects.toThrow(/account aanmaken/i);
    expect(env.PORTAL_DB.data.customers).toHaveLength(0);
    expect(env.PORTAL_DB.data.users).toHaveLength(0);
  });

  it('houdt het account overeind wanneer alleen de order-insert ná een geslaagd account faalt', async () => {
    const env = { PORTAL_DB: fakeDb({ failInsert: 'service_orders' }) };
    await expect(
      mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'nieuw2@example.nl', klant: {} }),
    ).rejects.toThrow(/order-insert/i);
    expect(env.PORTAL_DB.data.customers).toHaveLength(1);
    expect(env.PORTAL_DB.data.users).toHaveLength(1);
    expect(env.PORTAL_DB.data.orders).toHaveLength(0);
  });
});

// ── D1-dubbel + request-helpers voor handleVoorstelVerify-tests ────────────
const SITE = 'https://aanloopai.nl';
const SECRET = 'test-secret-voorstel-verify';
const GELDIG_TOKEN = 'b'.repeat(64);

function makeVerifyDb(opts = {}) {
  const state = {
    claims: (opts.claims || []).map((c) => ({ ...c })),
    voorstellen: (opts.voorstellen || []).map((v) => ({ ...v })),
    intakeRequests: (opts.intakeRequests || []).map((i) => ({ ...i })),
    users: (opts.users || []).map((u) => ({ ...u })),
    customers: (opts.customers || []).map((c) => ({ ...c })),
    orders: (opts.orders || []).map((o) => ({ ...o })),
    subscriptions: (opts.subscriptions || []).map((s) => ({ ...s })),
  };

  function stmt(sql, args) {
    return {
      async first() {
        if (sql.startsWith('SELECT voorstel_id, email, expires_at, used FROM voorstel_claims')) {
          const c = state.claims.find((row) => row.token_hash === args[0]);
          return c ? { ...c } : null;
        }
        if (sql.startsWith('SELECT id, intake_id, product_key, tier_naam FROM voorstellen')) {
          const v = state.voorstellen.find((row) => row.id === args[0]);
          return v ? { ...v } : null;
        }
        if (sql.startsWith('SELECT customer_json, answers_json FROM intake_requests')) {
          const i = state.intakeRequests.find((row) => row.id === args[0]);
          return i ? { ...i } : null;
        }
        if (sql.startsWith('SELECT id, customer_id, naam, role FROM users WHERE email')) {
          const u = state.users.find((row) => row.email === args[0]);
          return u ? { ...u } : null;
        }
        if (sql.startsWith('SELECT id FROM subscriptions')) {
          const s = state.subscriptions.find((row) => row.customer_id === args[0] && row.product_key === args[1]);
          return s ? { id: s.id } : null;
        }
        if (sql.startsWith('SELECT id FROM service_orders WHERE voorstel_id')) {
          const o = state.orders.find((row) => row.voorstel_id === args[0]);
          return o ? { id: o.id } : null;
        }
        throw new Error(`makeVerifyDb: geen .first() canned voor: ${sql}`);
      },
      async run() {
        if (sql.startsWith('UPDATE voorstel_claims SET used = 1')) {
          const c = state.claims.find((row) => row.token_hash === args[0] && row.used === 0);
          if (!c) return { meta: { changes: 0 } };
          c.used = 1;
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith('INSERT INTO customers')) {
          state.customers.push({
            id: args[0], bedrijf: args[1], telefoon: args[2], factuur_email: args[3], created_at: args[4],
          });
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith('INSERT INTO users')) {
          state.users.push({
            id: args[0], customer_id: args[1], email: args[2], naam: args[3], role: args[4], created_at: args[5],
          });
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith('INSERT OR IGNORE INTO service_orders')) {
          if (!state.orders.some((row) => row.voorstel_id === args[6])) {
            state.orders.push({
              id: args[0], customer_id: args[1], user_id: args[2], product_key: args[3], tier: args[4], voorstel_id: args[6], status: 'concept',
            });
          }
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("UPDATE voorstellen SET status = 'omgezet'")) {
          const v = state.voorstellen.find((row) => row.id === args[0]);
          if (v) v.status = 'omgezet';
          return { meta: { changes: v ? 1 : 0 } };
        }
        if (sql.startsWith('UPDATE users SET last_login')) {
          const u = state.users.find((row) => row.id === args[1]);
          if (u) u.last_login = args[0];
          return { meta: { changes: u ? 1 : 0 } };
        }
        throw new Error(`makeVerifyDb: geen .run() canned voor: ${sql}`);
      },
    };
  }

  return {
    state,
    prepare(sql) {
      return { bind: (...args) => stmt(sql, args) };
    },
    async batch(stmts) {
      const snapCustomers = [...state.customers];
      const snapUsers = [...state.users];
      try {
        const results = [];
        for (const s of stmts) results.push(await s.run());
        return results;
      } catch (err) {
        state.customers.length = 0; state.customers.push(...snapCustomers);
        state.users.length = 0; state.users.push(...snapUsers);
        throw err;
      }
    },
  };
}

function getRequest(t) {
  return {
    method: 'GET',
    url: `${SITE}/api/voorstel/verify?t=${t}`,
    headers: { get: () => null },
  };
}
function postRequest({ t, origin = SITE } = {}) {
  return {
    method: 'POST',
    url: `${SITE}/api/voorstel/verify`,
    headers: { get: (name) => (name === 'Origin' ? origin : null) },
    async formData() { return { get: (k) => (k === 't' ? t : null) }; },
  };
}

const KLANT_EMAIL = 'klant@example.nl';

async function buildEnv({
  claimUsed = 0, expiresAt = Date.now() + 100000, users = [], subscriptions = [],
} = {}) {
  const tokenHash = await sha256Hex(GELDIG_TOKEN);
  const voorstel = {
    id: 'vst_1', intake_id: 'intake_1', product_key: 'emma-telefoon', tier_naam: 'Starter', status: 'open',
  };
  const intake = {
    id: 'intake_1', customer_json: JSON.stringify({ email: KLANT_EMAIL, name: 'Jan Jansen' }), answers_json: '{}',
  };
  const db = makeVerifyDb({
    claims: [{
      token_hash: tokenHash, voorstel_id: voorstel.id, email: KLANT_EMAIL, expires_at: expiresAt, used: claimUsed,
    }],
    voorstellen: [voorstel],
    intakeRequests: [intake],
    users,
    subscriptions,
  });
  return { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET };
}

describe('handleVoorstelVerify', () => {
  // ── Review-fix 4: testdekking op het endpoint zelf ────────────────────────

  it('weigert een POST zonder Origin-header, zonder het claim-token te verbruiken', async () => {
    const env = await buildEnv();
    const res = await handleVoorstelVerify(postRequest({ t: GELDIG_TOKEN, origin: null }), env);
    expect(res.status).toBe(400);
    expect(res.headers.get('Set-Cookie')).toBeNull();
    expect(env.PORTAL_DB.state.claims[0].used).toBe(0);
  });

  it('weigert een POST met een verkeerde Origin, zonder het claim-token te verbruiken', async () => {
    const env = await buildEnv();
    const res = await handleVoorstelVerify(postRequest({ t: GELDIG_TOKEN, origin: 'https://evil.example' }), env);
    expect(res.status).toBe(400);
    expect(res.headers.get('Set-Cookie')).toBeNull();
    expect(env.PORTAL_DB.state.claims[0].used).toBe(0);
  });

  it('een GET raakt de database nooit aan en mint geen sessie', async () => {
    // Gooit zodra hij wordt aangesproken — bewijst dat de GET-tak echt geen
    // enkele query of batch doet, in plaats van "toevallig" geen fout te zien.
    const throwingDb = {
      prepare() { throw new Error('DB mag niet worden aangeraakt bij een GET'); },
      batch() { throw new Error('DB mag niet worden aangeraakt bij een GET'); },
    };
    const env = { PORTAL_DB: throwingDb, PORTAL_SESSION_SECRET: SECRET };
    const res = await handleVoorstelVerify(getRequest(GELDIG_TOKEN), env);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('method="POST"');
    expect(res.headers.get('Set-Cookie')).toBeNull();
  });

  it('twee gelijktijdige POSTs met hetzelfde token leveren precies één sessie en één order', async () => {
    const env = await buildEnv();
    const [resA, resB] = await Promise.all([
      handleVoorstelVerify(postRequest({ t: GELDIG_TOKEN }), env),
      handleVoorstelVerify(postRequest({ t: GELDIG_TOKEN }), env),
    ]);
    const cookies = [resA, resB].map((r) => r.headers.get('Set-Cookie')).filter(Boolean);
    expect(cookies).toHaveLength(1);
    expect([resA.status, resB.status].sort()).toEqual([302, 400]);
    expect(env.PORTAL_DB.state.orders).toHaveLength(1);
    expect(env.PORTAL_DB.state.users).toHaveLength(1);
  });

  it('een al gebruikt claim-token levert een foutpagina, geen cookie, en wijst naar inloggen', async () => {
    const env = await buildEnv({ claimUsed: 1 });
    const res = await handleVoorstelVerify(postRequest({ t: GELDIG_TOKEN }), env);
    expect(res.status).toBe(400);
    expect(res.headers.get('Set-Cookie')).toBeNull();
    const body = await res.text();
    expect(body).toContain('/portal/login');
  });

  it('een verlopen claim-token levert een foutpagina, geen cookie', async () => {
    const env = await buildEnv({ expiresAt: Date.now() - 1000 });
    const res = await handleVoorstelVerify(postRequest({ t: GELDIG_TOKEN }), env);
    expect(res.status).toBe(400);
    expect(res.headers.get('Set-Cookie')).toBeNull();
  });

  it('happy path: zet een sessiecookie en verwijst door naar de checkout van de nieuwe order', async () => {
    const env = await buildEnv();
    const res = await handleVoorstelVerify(postRequest({ t: GELDIG_TOKEN }), env);
    expect(res.status).toBe(302);
    const cookie = res.headers.get('Set-Cookie');
    expect(cookie).toMatch(/aanloop_portal_session=/);
    const location = res.headers.get('Location');
    expect(location).toMatch(/^https:\/\/aanloopai\.nl\/portal\/checkout\?order=ord_.+&autostart=1$/);
    const orderId = new URL(location).searchParams.get('order');
    expect(env.PORTAL_DB.state.orders.map((o) => o.id)).toContain(orderId);
    // De sessie is echt geldig en hoort bij de zojuist aangemaakte gebruiker.
    const token = cookie.split(';')[0].split('=')[1];
    const session = await verifySession(token, SECRET);
    expect(session.uid).toBe(env.PORTAL_DB.state.users[0].id);
  });

  // ── Review-fix 1 + 3: staff-guard en vervolglink op het endpoint ──────────

  it('staff-account: geen sessie, geen order, geen customer, wijst naar portal/login', async () => {
    const env = await buildEnv({
      users: [{
        id: 'usr_staff', customer_id: null, email: KLANT_EMAIL, naam: 'Emma', role: 'staff',
      }],
    });
    const res = await handleVoorstelVerify(postRequest({ t: GELDIG_TOKEN }), env);
    expect(res.status).toBe(400);
    expect(res.headers.get('Set-Cookie')).toBeNull();
    expect(env.PORTAL_DB.state.customers).toHaveLength(0);
    expect(env.PORTAL_DB.state.orders).toHaveLength(0);
    const body = await res.text();
    expect(body).toContain('/portal/login');
    expect(body.toLowerCase()).not.toContain('u heeft dit product al lopen');
  });

  it('bestaande klant met actief abonnement: geen tweede order, wijst naar portal/login', async () => {
    const env = await buildEnv({
      users: [{
        id: 'usr_1', customer_id: 'cust_1', email: KLANT_EMAIL, naam: 'Jan', role: 'eigenaar',
      }],
      subscriptions: [{
        id: 'sub_1', customer_id: 'cust_1', product_key: 'emma-telefoon', status: 'active',
      }],
    });
    const res = await handleVoorstelVerify(postRequest({ t: GELDIG_TOKEN }), env);
    expect(res.status).toBe(400);
    expect(res.headers.get('Set-Cookie')).toBeNull();
    expect(env.PORTAL_DB.state.orders).toHaveLength(0);
    const body = await res.text();
    expect(body).toContain('/portal/login');
  });

  // ── Review-fix 3: overige foutpagina's wijzen naar /start/, niet /portal/login ──

  it('een ongeldig tokenformaat (GET) wijst naar een nieuw voorstel, niet naar inloggen', async () => {
    const throwingDb = { prepare() { throw new Error('mag niet worden aangeraakt'); } };
    const env = { PORTAL_DB: throwingDb, PORTAL_SESSION_SECRET: SECRET };
    const res = await handleVoorstelVerify(getRequest('niet-hex'), env);
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain('/start/');
    expect(body).not.toContain('/portal/login');
  });

  it('een onbekend claim-token wijst naar een nieuw voorstel, niet naar inloggen', async () => {
    const env = await buildEnv();
    const anderToken = 'c'.repeat(64);
    const res = await handleVoorstelVerify(postRequest({ t: anderToken }), env);
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain('/start/');
    expect(body).not.toContain('/portal/login');
  });
});

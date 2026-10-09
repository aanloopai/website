// Shared test helpers for the klantenportaal route tests (overeenkomst + aanleveren).
// D1 is emulated with a real in-memory SQLite (node:sqlite) using the real
// migration 0024, wrapped in the D1 prepare/bind/first/all/run surface.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createSession, SESSION_COOKIE } from '../src/lib/auth.js';

export const SECRET = 'test-session-secret';
export const SITE_ORIGIN = 'https://aanloopai.nl';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

export function makeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE customers (id TEXT PRIMARY KEY, email TEXT, naam TEXT, bedrijf TEXT, plan TEXT, created_at TEXT,
             kvk TEXT, btw_id TEXT, adres TEXT, postcode TEXT, stad TEXT, telefoon TEXT);
           CREATE TABLE users (id TEXT PRIMARY KEY, customer_id TEXT, email TEXT, naam TEXT, role TEXT);`);
  db.exec(readFileSync(new URL('../migrations/0024_overeenkomsten.sql', import.meta.url), 'utf8'));
  db.exec(readFileSync(new URL('../migrations/0026_signature_acceptance.sql', import.meta.url), 'utf8'));
  return {
    raw: db,
    prepare(sql) {
      const stmt = (args) => ({
        bind: (...a) => stmt(a),
        first: async () => db.prepare(sql).get(...args) ?? null,
        all: async () => ({ results: db.prepare(sql).all(...args) }),
        run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
      });
      return stmt([]);
    },
    async batch(stmts) { const out = []; for (const st of stmts) out.push(await st.run()); return out; },
  };
}

export function makeKv() {
  const store = new Map();
  return {
    store,
    async get(key, type) {
      const e = store.get(key);
      if (!e) return null;
      if (type === 'arrayBuffer') return e.value;
      return typeof e.value === 'string' ? e.value : new TextDecoder().decode(e.value);
    },
    async put(key, value, opts) { store.set(key, { value, metadata: opts?.metadata }); },
    async delete(key) { store.delete(key); },
  };
}

export async function authedRequest(path, { userId, method = 'GET', json, form, origin = SITE_ORIGIN } = {}) {
  const headers = {};
  if (origin) headers.Origin = origin;
  if (userId) headers.Cookie = `${SESSION_COOKIE}=${await createSession(userId, SECRET)}`;
  let body;
  if (json !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(json); }
  if (form) body = form;
  return new Request(`${SITE_ORIGIN}${path}`, { method, headers, body });
}

// Seeds two customers + users: cus_1 (eigenaar usr_1, kijker usr_2, bewerker usr_3), cus_2 (usr_9).
export function seedCustomers(d1) {
  const q = d1.raw;
  q.prepare(`INSERT INTO customers (id, email, naam, bedrijf, kvk, btw_id, adres, postcode, stad)
             VALUES ('cus_1','a@klant.nl','Ron','Foralle BV','12345678','NL123456789B01','Straat 1','1000AA','Naarden')`).run();
  q.prepare(`INSERT INTO customers (id, email, naam, bedrijf) VALUES ('cus_2','b@ander.nl','Ander','Ander BV')`).run();
  for (const [id, cid, email, role] of [
    ['usr_1', 'cus_1', 'ron@klant.nl', 'eigenaar'], ['usr_2', 'cus_1', 'kijk@klant.nl', 'kijker'],
    ['usr_3', 'cus_1', 'bew@klant.nl', 'bewerker'], ['usr_9', 'cus_2', 'x@ander.nl', 'eigenaar'],
  ]) q.prepare('INSERT INTO users (id, customer_id, email, naam, role) VALUES (?,?,?,?,?)').run(id, cid, email, id, role);
}

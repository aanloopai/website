// POST /api/admin/customers — `send_mail:false` onderdrukt de welkomstmail
// (leadpartner-pad: de intake-uitnodiging is dan de enige systeemmail).
// Default gedrag (send_mail weggelaten of true) blijft de welkomstmail —
// andere flows veranderen niet. Klant + eigenaar worden in beide gevallen
// aangemaakt.
import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { handleAdminApi } from '../src/lib/admin-routes.js';
import { createSession, SESSION_COOKIE } from '../src/lib/auth.js';

const SITE_ORIGIN = 'https://aanloopai.nl';
const SECRET = 'test-session-secret';
const staff = { id: 'usr_s', customer_id: null, email: 'staff@example.com', naam: 'S', role: 'staff' };

function makeDb() {
  const state = { customers: [], users: [] };
  return {
    state,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.includes('FROM users WHERE id = ?')) return args[0] === staff.id ? staff : null;
              if (sql.includes('FROM users WHERE email = ?')) return state.users.find((u) => u.email === args[0]) || null;
              return null;
            },
            async run() {
              if (sql.startsWith('INSERT INTO customers')) state.customers.push({ id: args[0], bedrijf: args[1] });
              if (sql.startsWith('INSERT INTO users')) state.users.push({ id: args[0], customer_id: args[1], email: args[2], role: args[4] });
              return { meta: { changes: 1 } };
            },
            async all() { return { results: [] }; },
          };
        },
      };
    },
  };
}

async function create(db, body) {
  const token = await createSession(staff.id, SECRET);
  const req = new Request(`${SITE_ORIGIN}/api/admin/customers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: SITE_ORIGIN, Cookie: `${SESSION_COOKIE}=${token}` },
    body: JSON.stringify(body),
  });
  return handleAdminApi(req, { PORTAL_DB: db, PORTAL_SESSION_SECRET: SECRET, BREVO_API_KEY: 'k' });
}

describe('POST /api/admin/customers — welkomstmail', () => {
  const origFetch = globalThis.fetch;
  let mails;
  beforeEach(() => {
    mails = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      mails.push({ url: String(url), body: JSON.parse(init.body) });
      return { ok: true, status: 200, text: async () => '' };
    });
  });
  afterEach(() => { globalThis.fetch = origFetch; });

  const body = { bedrijf: 'Cy FlexService', eigenaar_naam: 'Test Eigenaar', eigenaar_email: 'test@example.com' };

  it('default (send_mail weggelaten): klant + eigenaar aangemaakt én welkomstmail verstuurd', async () => {
    const db = makeDb();
    const res = await create(db, body);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.mailed).toBe(true);
    expect(db.state.customers).toHaveLength(1);
    expect(db.state.users).toMatchObject([{ customer_id: j.customer_id, email: 'test@example.com', role: 'eigenaar' }]);
    expect(mails).toHaveLength(1);
    expect(mails[0].body.subject).toBe('Welkom bij het Aanloop AI klantportaal');
    expect(mails[0].body.to[0].email).toBe('test@example.com');
  });

  it('send_mail:true expliciet: identiek aan default', async () => {
    const res = await create(makeDb(), { ...body, send_mail: true });
    expect((await res.json()).mailed).toBe(true);
    expect(mails).toHaveLength(1);
  });

  it('send_mail:false: klant + eigenaar aangemaakt, GEEN mail', async () => {
    const db = makeDb();
    const res = await create(db, { ...body, send_mail: false });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.mailed).toBe(false);
    expect(db.state.customers).toHaveLength(1);
    expect(db.state.users).toHaveLength(1);
    expect(mails).toHaveLength(0);
  });

  it('send_mail als string "false" telt NIET als false (alleen boolean) — geen stille uitschakeling', async () => {
    await create(makeDb(), { ...body, send_mail: 'false' });
    expect(mails).toHaveLength(1);
  });
});

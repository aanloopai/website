// LEAD-1 lead-ledger: HMAC ingest, idempotency, PII drop, own-form insert, wiring.
// D1 = real in-memory SQLite with the real migration 0028.
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { ledgerIngest, recordOwnLead, listLedger, ledgerRead, markLedgerAnswered } from '../src/lib/lead-ledger.js';
import { hmacHex } from '../src/lib/visibility-core.js';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
const SECRET_FTH = 'fth-test-secret';
const SECRET_KIB = 'kib-test-secret';

function makeDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0028_leads_all.sql', import.meta.url), 'utf8'));
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
  };
}

const nowS = () => Math.floor(Date.now() / 1000);
const payload = (over = {}) => ({
  lead_id: 'L-1', site: 'fth', form: 'contact', landing: '/prijzen/', referrer_host: 'google.com',
  utm_source: 'g', utm_medium: 'organic', utm_campaign: '', ts: new Date().toISOString(), status: 'received', ...over,
});

async function signed(body, { site = 'fth', secret = SECRET_FTH, ts = nowS(), raw } = {}) {
  const text = raw ?? JSON.stringify(body);
  const sig = await hmacHex(secret, `${ts}.${text}`);
  return new Request('https://aanloopai.nl/api/leads/ingest', {
    method: 'POST', body: text,
    headers: { 'content-type': 'application/json', 'x-ledger-site': site, 'x-ledger-ts': String(ts), 'x-ledger-sig': sig },
  });
}

let env;
beforeEach(() => { env = { PORTAL_DB: makeDb(), LEDGER_SECRET_FTH: SECRET_FTH, LEDGER_SECRET_KIB: SECRET_KIB }; });
const rows = () => env.PORTAL_DB.raw.prepare('SELECT * FROM leads_all').all();

describe('ledgerIngest', () => {
  it('valid signature -> 200 dup:false and row stored', async () => {
    const res = await ledgerIngest(await signed(payload()), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, dup: false });
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toMatchObject({ site: 'fth', lead_id: 'L-1', form: 'contact', landing: '/prijzen/', status: 'received' });
    expect(rows()[0].answered_at).toBeNull();
  });

  it('repeat (site, lead_id) -> 200 dup:true, still one row', async () => {
    await ledgerIngest(await signed(payload()), env);
    const res = await ledgerIngest(await signed(payload({ form: 'other' })), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, dup: true });
    expect(rows()).toHaveLength(1);
  });

  it('same lead_id on another site is not a duplicate', async () => {
    await ledgerIngest(await signed(payload()), env);
    const res = await ledgerIngest(await signed(payload({ site: 'kib' }), { site: 'kib', secret: SECRET_KIB }), env);
    expect((await res.json()).dup).toBe(false);
    expect(rows()).toHaveLength(2);
  });

  it('bad signature -> 401', async () => {
    const res = await ledgerIngest(await signed(payload(), { secret: 'wrong' }), env);
    expect(res.status).toBe(401);
    expect(rows()).toHaveLength(0);
  });

  it('missing signature header -> 401', async () => {
    const req = new Request('https://aanloopai.nl/api/leads/ingest', {
      method: 'POST', body: JSON.stringify(payload()), headers: { 'x-ledger-site': 'fth', 'x-ledger-ts': String(nowS()) },
    });
    expect((await ledgerIngest(req, env)).status).toBe(401);
  });

  it('stale timestamp (valid sig, 301 s old) -> 401; 299 s old still ok', async () => {
    expect((await ledgerIngest(await signed(payload(), { ts: nowS() - 301 }), env)).status).toBe(401);
    expect((await ledgerIngest(await signed(payload({ lead_id: 'L-2' }), { ts: nowS() - 299 }), env)).status).toBe(200);
  });

  it('unknown site or site without secret -> 401', async () => {
    expect((await ledgerIngest(await signed(payload({ site: 'nope' }), { site: 'nope' }), env)).status).toBe(401);
    expect((await ledgerIngest(await signed(payload({ site: 'alfa' }), { site: 'alfa', secret: 'x' }), env)).status).toBe(401);
  });

  it('a site cannot sign with another site secret -> 401', async () => {
    const res = await ledgerIngest(await signed(payload({ site: 'kib' }), { site: 'kib', secret: SECRET_FTH }), env);
    expect(res.status).toBe(401);
  });

  it('body site differs from header -> 400', async () => {
    const res = await ledgerIngest(await signed(payload({ site: 'kib' })), env);
    expect(res.status).toBe(400);
  });

  it('bad JSON / missing lead_id -> 400', async () => {
    expect((await ledgerIngest(await signed(null, { raw: '{not json' }), env)).status).toBe(400);
    expect((await ledgerIngest(await signed(payload({ lead_id: '' })), env)).status).toBe(400);
    expect((await ledgerIngest(await signed(null, { raw: '[1]' }), env)).status).toBe(400);
  });

  it('no PORTAL_DB -> 503', async () => {
    const res = await ledgerIngest(await signed(payload()), { LEDGER_SECRET_FTH: SECRET_FTH });
    expect(res.status).toBe(503);
  });

  it('non-POST -> 405', async () => {
    const res = await ledgerIngest(new Request('https://aanloopai.nl/api/leads/ingest'), env);
    expect(res.status).toBe(405);
  });

  it('stores NO PII: email/phone/name/message are dropped, strings clamped to 200', async () => {
    const body = payload({
      email: 'jan@example.nl', telefoon: '0612345678', phone: '0612345678', naam: 'Jan Jansen',
      message: 'geheime vraag', ip: '1.2.3.4', landing: '/' + 'x'.repeat(500),
    });
    const res = await ledgerIngest(await signed(body), env);
    expect(res.status).toBe(200);
    const dump = JSON.stringify(rows());
    for (const pii of ['jan@example.nl', '0612345678', 'Jan Jansen', 'geheime vraag', '1.2.3.4']) {
      expect(dump).not.toContain(pii);
    }
    expect(rows()[0].landing.length).toBe(200);
    expect(Object.keys(rows()[0]).sort()).toEqual([
      'answered_at', 'form', 'id', 'landing', 'lead_id', 'received_at', 'referrer_host',
      'site', 'status', 'ts', 'utm_campaign', 'utm_medium', 'utm_source',
    ]);
  });
});

describe('recordOwnLead / listLedger', () => {
  it('inserts site=aanloop, is idempotent, and never throws without DB or table', async () => {
    await recordOwnLead(env, { leadId: 'lead_abc', form: 'contact', landing: '/contact/', referrer: 'https://www.google.com/x', utm: {} });
    await recordOwnLead(env, { leadId: 'lead_abc', form: 'contact', landing: '/contact/' });
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toMatchObject({ site: 'aanloop', lead_id: 'lead_abc', referrer_host: 'www.google.com' });
    await expect(recordOwnLead({}, { leadId: 'x' })).resolves.toBeUndefined();
    const broken = { PORTAL_DB: { prepare() { throw new Error('no such table: leads_all'); } } };
    await expect(recordOwnLead(broken, { leadId: 'x', form: 'c' })).resolves.toBeUndefined();
  });

  it('listLedger filters by site and exposes no PII columns', async () => {
    await ledgerIngest(await signed(payload()), env);
    await recordOwnLead(env, { leadId: 'a1', form: 'contact', landing: '/' });
    const all = await (await listLedger(env, new URL('https://aanloopai.nl/api/admin/ledger'))).json();
    expect(all.leads).toHaveLength(2);
    const fth = await (await listLedger(env, new URL('https://aanloopai.nl/api/admin/ledger?site=fth'))).json();
    expect(fth.leads.map((l) => l.site)).toEqual(['fth']);
  });
});

describe('wiring', () => {
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  it('worker routes /api/leads/ingest before the admin/session routes and records own leads', () => {
    const w = read('src/worker.js');
    expect(w).toMatch(/pathname === '\/api\/leads\/ingest'[\s\S]{0,80}ledgerIngest\(request, env\)/);
    expect(w).toContain('recordOwnLead(env');
  });
  it('admin API exposes /api/admin/ledger behind the staff session', () => {
    expect(read('src/lib/admin-routes.js')).toContain("path === '/api/admin/ledger'");
  });
});

describe('LEAD-2 ledgerRead (Bearer)', () => {
  const TOKEN = 'read-token-test';
  const req = (qs = '', auth = `Bearer ${TOKEN}`) => new Request(`https://aanloopai.nl/api/leads/ledger${qs}`, {
    headers: auth ? { authorization: auth } : {},
  });
  const call = (r, e = { ...env, LEDGER_READ_TOKEN: TOKEN }) => ledgerRead(r, e, new URL(r.url));
  const seed = (id, ageH, extra = '') => env.PORTAL_DB.raw.prepare(
    'INSERT INTO leads_all (site, lead_id, form, landing, utm_source, ts, status, received_at) VALUES (?,?,?,?,?,?,?,?)',
  ).run('fth', id, 'contact', '/x/', 'g', 't', 'received', Date.now() - ageH * 3600 * 1000);

  it('401 without token, wrong token, wrong scheme, or env unset', async () => {
    for (const r of [req('', null), req('', 'Bearer nope'), req('', TOKEN)]) {
      const res = await call(r);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ ok: false, error: 'unauthorized' });
    }
    expect((await call(req(), { ...env })).status).toBe(401);
    expect((await call(req('', 'Bearer '), { ...env, LEDGER_READ_TOKEN: '' })).status).toBe(401);
  });

  it('503 without PORTAL_DB (valid token)', async () => {
    expect((await call(req(), { LEDGER_READ_TOKEN: TOKEN })).status).toBe(503);
  });

  it('200 shape, newest first, PII-free columns only', async () => {
    seed('old', 2); seed('new', 1);
    const res = await call(req());
    expect(res.status).toBe(200);
    const d = await res.json();
    expect(d.ok).toBe(true);
    expect(d.leads.map((l) => l.lead_id)).toEqual(['new', 'old']);
    expect(Object.keys(d.leads[0]).sort()).toEqual(
      ['answered_at', 'form', 'landing', 'lead_id', 'received_at', 'site', 'status', 'ts', 'utm_source']);
  });

  it('hours: default 168, clamped to 1..720', async () => {
    seed('h2', 2); seed('d3', 72); seed('d10', 240); seed('d40', 960);
    const ids = async (qs) => (await (await call(req(qs))).json()).leads.map((l) => l.lead_id).sort();
    expect(await ids('')).toEqual(['d3', 'h2']);
    expect(await ids('?hours=0')).toEqual(['d3', 'h2']);      // invalid -> default
    expect(await ids('?hours=-5')).toEqual(['d3', 'h2']);
    expect(await ids('?hours=abc')).toEqual(['d3', 'h2']);
    expect(await ids('?hours=1')).toEqual([]);                  // min 1h
    expect(await ids('?hours=24')).toEqual(['h2']);
    expect(await ids('?hours=99999')).toEqual(['d10', 'd3', 'h2']); // clamp 720h = 30d
  });

  it('non-GET -> 405 before anything else', async () => {
    const r = new Request('https://aanloopai.nl/api/leads/ledger', { method: 'POST' });
    expect((await call(r)).status).toBe(405);
  });
});

describe('LEAD-2 markLedgerAnswered', () => {
  const post = (b) => markLedgerAnswered(new Request('https://aanloopai.nl/api/admin/ledger/answered', {
    method: 'POST', body: typeof b === 'string' ? b : JSON.stringify(b),
  }), env);

  it('sets answered_at once; repeat is idempotent (updated:0, timestamp kept)', async () => {
    await ledgerIngest(await signed(payload()), env);
    const r1 = await (await post({ site: 'fth', lead_id: 'L-1' })).json();
    expect(r1).toEqual({ ok: true, updated: 1 });
    const t1 = rows()[0].answered_at;
    expect(t1).toBeGreaterThan(0);
    const r2 = await (await post({ site: 'fth', lead_id: 'L-1' })).json();
    expect(r2).toEqual({ ok: true, updated: 0 });
    expect(rows()[0].answered_at).toBe(t1);
  });

  it('unknown lead -> updated:0; other site/lead untouched', async () => {
    await ledgerIngest(await signed(payload()), env);
    expect(await (await post({ site: 'kib', lead_id: 'L-1' })).json()).toEqual({ ok: true, updated: 0 });
    expect(rows()[0].answered_at).toBeNull();
  });

  it('validates site, lead_id, body', async () => {
    expect((await post({ site: 'evil', lead_id: 'a' })).status).toBe(400);
    expect((await post({ site: 'fth', lead_id: '' })).status).toBe(400);
    expect((await post({ site: 'fth', lead_id: 'x'.repeat(201) })).status).toBe(400);
    expect((await post('not json')).status).toBe(400);
  });
});

describe('LEAD-2 wiring', () => {
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  it('worker routes /api/leads/ledger to ledgerRead; admin answered route is POST behind session', () => {
    expect(read('src/worker.js')).toMatch(/pathname === '\/api\/leads\/ledger'[\s\S]{0,80}ledgerRead\(request, env, url\)/);
    expect(read('src/lib/admin-routes.js')).toContain("path === '/api/admin/ledger/answered' && method === 'POST'");
  });
});

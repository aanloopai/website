// Discovery — "Keukenzaak - Foralle": Ron vult zijn eigen document in.
// Guards: (1) template is uitsluitend Nederlands en vraagt nooit om een
// wachtwoord, (2) seed: tweede document onder Ron, zonder TR "Bölüm notları",
// interview-document blijft, (3) klant-toegang: link → cookie → alleen eigen
// document lezen/schrijven, intrekken sluit de deur, (4) pagina is noindex en
// staat niet in de sitemap.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORALLE_TEMPLATE, FORALLE_SEED, CLIENT_TEMPLATE_NAMES } from '../src/lib/discovery-seed-foralle.js';
import { KEUKEN_SEED } from '../src/lib/discovery-seed-keuken.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function allTexts() {
  const out = [FORALLE_TEMPLATE.name, FORALLE_TEMPLATE.description];
  for (const s of FORALLE_TEMPLATE.sections) {
    out.push(s.title, s.guidance);
    for (const q of s.questions) out.push(q.label, q.guidance, ...q.sub_items);
  }
  return out.filter(Boolean);
}

describe('Foralle-template — alleen Nederlands', () => {
  it('heet exact "Keukenzaak - Foralle" en is een klant-template', () => {
    expect(FORALLE_TEMPLATE.name).toBe('Keukenzaak - Foralle');
    expect(CLIENT_TEMPLATE_NAMES).toContain(FORALLE_TEMPLATE.name);
    expect(FORALLE_SEED.client.name).toBe(KEUKEN_SEED.client.name);
  });

  it('geen Turkse tekens of Turkse woorden', () => {
    for (const txt of allTexts()) {
      expect(txt, txt).not.toMatch(/[ğĞışŞİ]/);
      expect(txt, txt).not.toMatch(/\b(ve|bir|mı|mi|müşteri|soru|bölüm|notları)\b/i);
    }
  });

  it('vraagt nooit om een wachtwoord (alleen waarschuwing het niet te doen)', () => {
    const qs = FORALLE_TEMPLATE.sections.flatMap((s) => s.questions);
    for (const q of qs) expect(q.label, q.label).not.toMatch(/wachtwoord|password|inlog/i);
    const warn = FORALLE_TEMPLATE.sections.find((s) => /wachtwoord/i.test(s.guidance));
    expect(warn.guidance).toMatch(/nooit/i);
  });

  it('alleen vraagtypes die de klantpagina kan tonen', () => {
    for (const q of FORALLE_TEMPLATE.sections.flatMap((s) => s.questions)) {
      expect(['text', 'textarea', 'checklist']).toContain(q.type);
      if (q.type === 'checklist') expect(q.sub_items.length).toBeGreaterThan(1);
    }
  });
});

let sqlite = null;
try { sqlite = await import('node:sqlite'); } catch { sqlite = null; }

function makeD1() {
  const raw = new sqlite.DatabaseSync(':memory:');
  for (const f of ['0018_discovery.sql', '0022_discovery_access.sql']) {
    raw.exec(fs.readFileSync(path.join(__dirname, '../migrations', f), 'utf8'));
  }
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => {
      const r = raw.prepare(sql).run(...args);
      return { meta: { last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes) } };
    },
    first: async () => raw.prepare(sql).get(...args) || null,
    all: async () => ({ results: raw.prepare(sql).all(...args) }),
  });
  return { prepare: (sql) => stmt(sql), batch: async (list) => { const out = []; for (const s of list) out.push(await s.run()); return out; }, raw };
}

const ORIGIN = 'https://aanloopai.nl';
function req(pathname, { method = 'GET', body, cookie } = {}) {
  const headers = { Origin: ORIGIN, 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  return new Request(ORIGIN + pathname, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

describe.skipIf(!sqlite)('Foralle — seed + klant-toegang op SQLite', async () => {
  const { discoveryOverview, discoveryDocDetail } = await import('../src/lib/discovery.js');
  const { handleKlantApi, discoveryAccess, KLANT_COOKIE } = await import('../src/lib/discovery-klant.js');

  async function setup() {
    const env = { PORTAL_DB: makeD1(), PORTAL_SESSION_SECRET: 'test-secret-xyz' };
    const ov = await (await discoveryOverview(env)).json();
    const ron = ov.clients.find((c) => c.name === 'Ron (keukenzaak)');
    const foralle = ron.docs.find((d) => d.title === 'Keukenzaak - Foralle');
    const interview = ron.docs.find((d) => d.title === 'Keukenzaak — website & leads discovery');
    return { env, ron, foralle, interview };
  }

  async function login(env, docId) {
    const res = await discoveryAccess(req('/api/admin/discovery/access', { method: 'POST', body: { doc_id: docId } }), env, new URL(ORIGIN));
    const j = await res.json();
    const token = j.url.split('#t=')[1];
    const lr = await handleKlantApi(req('/api/discovery-klant/login', { method: 'POST', body: { token } }), env);
    return { url: j.url, token, status: lr.status, cookie: (lr.headers.get('Set-Cookie') || '').split(';')[0] };
  }

  it('Ron heeft twee documenten: interview + Foralle; Foralle zonder TR-notities', async () => {
    const { env, ron, foralle, interview } = await setup();
    expect(ron.docs.length).toBe(2);
    expect(interview).toBeTruthy();
    const det = await (await discoveryDocDetail(env, new URL(`${ORIGIN}/?id=${foralle.id}`))).json();
    const labels = det.sections.flatMap((s) => s.questions).map((q) => q.label);
    expect(labels).not.toContain('Bölüm notları');
    expect(labels.length).toBe(FORALLE_TEMPLATE.sections.reduce((n, s) => n + s.questions.length, 0));
  });

  it('link → cookie → klant ziet alleen zijn eigen document', async () => {
    const { env, foralle } = await setup();
    const { url, status, cookie } = await login(env, foralle.id);
    expect(url).toMatch(/^https:\/\/aanloopai\.nl\/portal\/vragenlijst\/#t=[0-9a-f]{64}$/);
    expect(status).toBe(200);
    expect(cookie.startsWith(`${KLANT_COOKIE}=`)).toBe(true);
    // het token zelf staat niet in de DB
    const token = url.split('#t=')[1];
    expect(env.PORTAL_DB.raw.prepare('SELECT COUNT(*) AS n FROM disc_access WHERE token_hash = ?').get(token).n).toBe(0);
    const doc = await (await handleKlantApi(req('/api/discovery-klant/doc', { cookie }), env)).json();
    expect(doc.doc.title).toBe('Keukenzaak - Foralle');
    expect(doc.doc.client_id).toBeUndefined();
  });

  it('antwoord opslaan werkt voor eigen vraag; vraag uit interview-document → 404', async () => {
    const { env, foralle, interview } = await setup();
    const { cookie } = await login(env, foralle.id);
    const doc = await (await handleKlantApi(req('/api/discovery-klant/doc', { cookie }), env)).json();
    const q = doc.sections[0].questions[0];
    const ok = await handleKlantApi(req('/api/discovery-klant/answer', { method: 'POST', cookie, body: { question_id: q.id, value: 'Foralle Keukens B.V.', base_updated_at: null } }), env);
    expect(ok.status).toBe(200);
    expect((await ok.json()).answered).toBe(1);
    const other = await (await discoveryDocDetail(env, new URL(`${ORIGIN}/?id=${interview.id}`))).json();
    const foreignQ = other.sections[0].questions[0].id;
    const bad = await handleKlantApi(req('/api/discovery-klant/answer', { method: 'POST', cookie, body: { question_id: foreignQ, value: 'x' } }), env);
    expect(bad.status).toBe(404);
    // admin ziet het antwoord
    const adm = await (await discoveryDocDetail(env, new URL(`${ORIGIN}/?id=${foralle.id}`))).json();
    expect(adm.sections[0].questions[0].value).toBe('Foralle Keukens B.V.');
  });

  it('zonder cookie / vervalste cookie / ongeldig token / portal-sessie → 401; vreemde origin → 403', async () => {
    const { env } = await setup();
    expect((await handleKlantApi(req('/api/discovery-klant/doc'), env)).status).toBe(401);
    expect((await handleKlantApi(req('/api/discovery-klant/doc', { cookie: `${KLANT_COOKIE}=abc.def0` }), env)).status).toBe(401);
    expect((await handleKlantApi(req('/api/discovery-klant/login', { method: 'POST', body: { token: 'a'.repeat(64) } }), env)).status).toBe(401);
    const { createSession } = await import('../src/lib/auth.js');
    const fake = await createSession('usr_abc', env.PORTAL_SESSION_SECRET);
    expect((await handleKlantApi(req('/api/discovery-klant/doc', { cookie: `${KLANT_COOKIE}=${fake}` }), env)).status).toBe(401);
    const evil = new Request(`${ORIGIN}/api/discovery-klant/login`, { method: 'POST', headers: { Origin: 'https://evil.example' }, body: '{}' });
    expect((await handleKlantApi(evil, env)).status).toBe(403);
  });

  it('nieuwe link maakt de oude ongeldig; intrekken sluit ook de actieve sessie', async () => {
    const { env, foralle } = await setup();
    const first = await login(env, foralle.id);
    const second = await login(env, foralle.id);
    expect((await handleKlantApi(req('/api/discovery-klant/doc', { cookie: first.cookie }), env)).status).toBe(401);
    expect((await handleKlantApi(req('/api/discovery-klant/doc', { cookie: second.cookie }), env)).status).toBe(200);
    const relog = await handleKlantApi(req('/api/discovery-klant/login', { method: 'POST', body: { token: first.token } }), env);
    expect(relog.status).toBe(401);
    await discoveryAccess(req('/api/admin/discovery/access', { method: 'DELETE', body: { doc_id: foralle.id } }), env, new URL(ORIGIN));
    expect((await handleKlantApi(req('/api/discovery-klant/doc', { cookie: second.cookie }), env)).status).toBe(401);
    const st = await (await discoveryAccess(req(`/api/admin/discovery/access?doc_id=${foralle.id}`), env, new URL(`${ORIGIN}/?doc_id=${foralle.id}`))).json();
    expect(st.active).toBeNull();
  });
});

describe('klantpagina', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/pages/portal/vragenlijst.astro'), 'utf8');
  it('noindex + no-referrer, token uit adresbalk verwijderd, lang=nl', () => {
    expect(src).toMatch(/noindex, nofollow/);
    expect(src).toMatch(/no-referrer/);
    expect(src).toMatch(/history\.replaceState/);
    expect(src).toMatch(/lang="nl"/);
  });
  it('sitemap sluit /portal/ uit', () => {
    const sm = fs.readFileSync(path.join(__dirname, '../scripts/build-sitemap.cjs'), 'utf8');
    expect(sm).toMatch(/SITEMAP_EXCLUDE_PREFIXES = \[[^\]]*'\/portal\/'/);
  });
});

// Discovery — "Keukenzaak - Foralle": één pot. Ron vult zelf de R01–R91-vragen
// van zijn eigen document in; gesprek en klant schrijven naar dezelfde velden.
// Guards: (1) één document, oude losse Foralle-vragenlijst samengevoegd
// (onbeantwoord weg, beantwoord bewaard als "(oud)"), (2) login met
// gebruikersnaam + wachtwoord (PBKDF2, nooit plaintext) én link,
// (3) klant ziet alleen NL field-vragen — nooit TR-label, interne notitie,
// status/bron of interne blokken, (4) klant-antwoord behoudt interne notitie,
// (5) alleen eigen document, intrekken sluit de deur, (6) wachtwoord staat
// nergens in de repo (repo is public).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEUKEN_SEED } from '../src/lib/discovery-seed-keuken.js';
import { klantTitle, klantLabel, mergeKlantValue, hashPassword, verifyPassword } from '../src/lib/discovery-klant.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('één pot — pure functies', () => {
  it('documentnaam is "Keukenzaak - Foralle"', () => {
    expect(KEUKEN_SEED.doc_title).toBe('Keukenzaak - Foralle');
  });

  it('interne haakjes verdwijnen uit titels en labels', () => {
    expect(klantTitle('10. Ontwerptool (fase 2: alleen begrijpen, niets beloven)')).toBe('10. Ontwerptool');
    expect(klantTitle('5. Eerdere partijen (laten vertellen)')).toBe('5. Eerdere partijen');
    expect(klantLabel('Beschikbaarheid voor content/feedback? (M: eigen buitenlandperiode hier melden)')).toBe('Beschikbaarheid voor content/feedback?');
    expect(klantLabel('Rechtsvorm (eenmanszaak / VOF / BV) — wie tekent?')).toBe('Rechtsvorm (eenmanszaak / VOF / BV) — wie tekent?');
  });

  it('klantwaarde: interne notitie blijft, status beantwoord, bron klant', () => {
    const merged = mergeKlantValue({ note: 'intern', status: 'nog_aanleveren', bron: '' }, { v: 'Foralle', t: '', note: 'hack', status: 'n.v.t.' });
    expect(merged).toEqual({ note: 'intern', status: 'beantwoord', bron: 'klant', v: 'Foralle', t: '' });
    expect(mergeKlantValue({ v: 'x', status: 'beantwoord', bron: 'gesprek' }, { v: '', t: '' }).status).toBeUndefined();
    expect(mergeKlantValue({ status: 'n.v.t.' }, { v: '', t: '' }).status).toBe('n.v.t.');
    expect(mergeKlantValue({ bron: 'gesprek' }, { v: 'y' }).bron).toBe('gesprek');
  });

  it('wachtwoord-hash: PBKDF2, geen plaintext, verifieert', async () => {
    const h = await hashPassword('test-wachtwoord-1');
    expect(h).toMatch(/^pbkdf2\$100000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(h).not.toContain('test-wachtwoord-1');
    expect(await verifyPassword('test-wachtwoord-1', h)).toBe(true);
    expect(await verifyPassword('test-wachtwoord-2', h)).toBe(false);
    expect(await verifyPassword('x', 'garbage')).toBe(false);
  });
});

let sqlite = null;
try { sqlite = await import('node:sqlite'); } catch { sqlite = null; }

function makeD1() {
  const raw = new sqlite.DatabaseSync(':memory:');
  for (const f of ['0018_discovery.sql', '0022_discovery_access.sql', '0023_discovery_access_login.sql']) {
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
const PW = 'test-geheim-99';
function req(pathname, { method = 'GET', body, cookie } = {}) {
  const headers = { Origin: ORIGIN, 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  return new Request(ORIGIN + pathname, { method, headers, body: body ? JSON.stringify(body) : undefined });
}
const cookieOf = (res) => (res.headers.get('Set-Cookie') || '').split(';')[0];

describe.skipIf(!sqlite)('één pot + klant-login op SQLite', async () => {
  const { discoveryOverview, discoveryDocDetail, discoverySaveAnswer, mergeForalleOnePot } = await import('../src/lib/discovery.js');
  const { handleKlantApi, discoveryAccess, KLANT_COOKIE } = await import('../src/lib/discovery-klant.js');

  async function setup() {
    const env = { PORTAL_DB: makeD1(), PORTAL_SESSION_SECRET: 'test-secret-xyz' };
    const ov = await (await discoveryOverview(env)).json();
    const ron = ov.clients.find((c) => c.name === 'Ron (keukenzaak)');
    return { env, ron, doc: ron.docs[0] };
  }
  const admin = (env, method, body, qs = '') =>
    discoveryAccess(req(`/api/admin/discovery/access${qs}`, { method, body }), env, new URL(`${ORIGIN}/${qs}`));
  async function pwLogin(env, docId, username = 'ron', password = PW) {
    await admin(env, 'POST', { doc_id: docId, username, password });
    const res = await handleKlantApi(req('/api/discovery-klant/login', { method: 'POST', body: { username, password } }), env);
    return { status: res.status, cookie: cookieOf(res) };
  }

  it('Ron heeft precies één document: "Keukenzaak - Foralle" met R01–R91', async () => {
    const { env, ron, doc } = await setup();
    expect(ron.docs.length).toBe(1);
    expect(doc.title).toBe('Keukenzaak - Foralle');
    const det = await (await discoveryDocDetail(env, new URL(`${ORIGIN}/?id=${doc.id}`))).json();
    expect(det.sections.flatMap((s) => s.questions).filter((q) => q.type === 'field').length).toBe(91);
  });

  it('migratie: oude losse Foralle-lijst weg (onbeantwoord) of bewaard (beantwoord); doc hernoemd', async () => {
    const env = { PORTAL_DB: makeD1(), PORTAL_SESSION_SECRET: 's' };
    const raw = env.PORTAL_DB.raw;
    await discoveryOverview(env);
    // Simuleer de stand van PR #177 in productie.
    raw.prepare("UPDATE disc_docs SET title = 'Keukenzaak — website & leads discovery'").run();
    raw.prepare("DELETE FROM disc_meta WHERE key LIKE 'merge_foralle_onepot%'").run();
    const t = raw.prepare("INSERT INTO disc_templates (name, description) VALUES ('Keukenzaak - Foralle', 'oud')").run();
    const ron = raw.prepare("SELECT id FROM disc_clients WHERE name = 'Ron (keukenzaak)'").get();
    const mk = (title) => {
      const d = raw.prepare('INSERT INTO disc_docs (client_id, title, template_id) VALUES (?, ?, ?)').run(ron.id, title, t.lastInsertRowid);
      const s = raw.prepare('INSERT INTO disc_doc_sections (doc_id, title, sort) VALUES (?, ?, 0)').run(d.lastInsertRowid, 'S');
      const q = raw.prepare("INSERT INTO disc_doc_questions (doc_section_id, sort, type, label) VALUES (?, 0, 'text', 'Q')").run(s.lastInsertRowid);
      return { docId: Number(d.lastInsertRowid), qId: Number(q.lastInsertRowid) };
    };
    const empty = mk('Keukenzaak - Foralle');
    const filled = mk('Keukenzaak - Foralle');
    raw.prepare("INSERT INTO disc_answers (doc_question_id, value, answered) VALUES (?, '\"x\"', 1)").run(filled.qId);
    raw.prepare("INSERT INTO disc_access (doc_id, token_hash) VALUES (?, 'h1')").run(filled.docId);

    await mergeForalleOnePot(env.PORTAL_DB);
    expect(raw.prepare('SELECT COUNT(*) AS n FROM disc_docs WHERE id = ?').get(empty.docId).n).toBe(0);
    expect(raw.prepare('SELECT title FROM disc_docs WHERE id = ?').get(filled.docId).title).toMatch(/\(oud/);
    expect(raw.prepare('SELECT revoked_at FROM disc_access WHERE doc_id = ?').get(filled.docId).revoked_at).toBeTruthy();
    expect(raw.prepare("SELECT COUNT(*) AS n FROM disc_templates WHERE name = 'Keukenzaak - Foralle'").get().n).toBe(0);
    const titles = raw.prepare('SELECT title FROM disc_docs WHERE client_id = ? AND template_id IS NOT NULL').all(ron.id).map((r) => r.title);
    expect(titles).toEqual(['Keukenzaak - Foralle']);
    // idempotent
    await mergeForalleOnePot(env.PORTAL_DB);
    expect(raw.prepare('SELECT COUNT(*) AS n FROM disc_docs WHERE id = ?').get(filled.docId).n).toBe(1);
  });

  it('login met gebruikersnaam + wachtwoord; hash in DB, geen plaintext', async () => {
    const { env, doc } = await setup();
    const { status, cookie } = await pwLogin(env, doc.id);
    expect(status).toBe(200);
    expect(cookie.startsWith(`${KLANT_COOKIE}=`)).toBe(true);
    const row = env.PORTAL_DB.raw.prepare("SELECT username, pw_hash FROM disc_access WHERE kind = 'login'").get();
    expect(row.username).toBe('ron');
    expect(row.pw_hash).not.toContain(PW);
    // hoofdletters/spaties in gebruikersnaam maken niet uit
    const r2 = await handleKlantApi(req('/api/discovery-klant/login', { method: 'POST', body: { username: ' Ron ', password: PW } }), env);
    expect(r2.status).toBe(200);
    const bad = await handleKlantApi(req('/api/discovery-klant/login', { method: 'POST', body: { username: 'ron', password: 'fout-fout' } }), env);
    expect(bad.status).toBe(401);
    const nouser = await handleKlantApi(req('/api/discovery-klant/login', { method: 'POST', body: { username: 'piet', password: PW } }), env);
    expect(nouser.status).toBe(401);
    const st = await (await admin(env, 'GET', undefined, `?doc_id=${doc.id}`)).json();
    expect(st.login.username).toBe('ron');
    expect(JSON.stringify(st)).not.toMatch(/pbkdf2/);
  });

  it('klant ziet alleen NL field-vragen, geen interne velden of blokken', async () => {
    const { env, doc } = await setup();
    const det = await (await discoveryDocDetail(env, new URL(`${ORIGIN}/?id=${doc.id}`))).json();
    const r01 = det.sections[0].questions[0];
    await discoverySaveAnswer(new Request(ORIGIN, { method: 'POST', body: JSON.stringify({
      question_id: r01.id, value: { v: 'Foralle', note: 'GEHEIM-INTERN', status: 'beantwoord', bron: 'gesprek' }, base_updated_at: null,
    }) }), env);
    const { cookie } = await pwLogin(env, doc.id);
    const body = await (await handleKlantApi(req('/api/discovery-klant/doc', { cookie }), env)).text();
    const data = JSON.parse(body);
    expect(data.doc.title).toBe('Keukenzaak - Foralle');
    expect(data.sections.length).toBe(11);
    expect(data.sections.flatMap((s) => s.questions).length).toBe(91);
    expect(data.sections[0].questions[0].value).toEqual({ v: 'Foralle', t: '' });
    for (const bad of ['GEHEIM-INTERN', 'label_tr', 'Resmi şirket', 'Bölüm notları', 'Observaties showroom', 'Gemaakte afspraken', 'Prijsindicatie gegeven', 'Volgende stap', "Risico's / aandachtspunten", '"note"', '"bron"', '"status"', 'niets beloven', '(M:']) {
      expect(body, bad).not.toContain(bad);
    }
    expect(body).not.toMatch(/[ğışŞİ]/);
  });

  it('klant-antwoord landt in hetzelfde veld en behoudt interne notitie', async () => {
    const { env, doc } = await setup();
    const det = await (await discoveryDocDetail(env, new URL(`${ORIGIN}/?id=${doc.id}`))).json();
    const r02 = det.sections[0].questions[1];
    await discoverySaveAnswer(new Request(ORIGIN, { method: 'POST', body: JSON.stringify({
      question_id: r02.id, value: { v: null, note: 'vragen naar BV', status: 'nog_aanleveren' }, base_updated_at: null,
    }) }), env);
    const { cookie } = await pwLogin(env, doc.id);
    const kdoc = await (await handleKlantApi(req('/api/discovery-klant/doc', { cookie }), env)).json();
    const kq = kdoc.sections[0].questions[1];
    const res = await handleKlantApi(req('/api/discovery-klant/answer', { method: 'POST', cookie, body: { question_id: kq.id, value: { v: 'BV', t: 'Ron tekent' }, base_updated_at: kq.updated_at } }), env);
    expect(res.status).toBe(200);
    const after = await (await discoveryDocDetail(env, new URL(`${ORIGIN}/?id=${doc.id}`))).json();
    expect(after.sections[0].questions[1].value).toEqual({ v: 'BV', t: 'Ron tekent', note: 'vragen naar BV', status: 'beantwoord', bron: 'klant' });
    expect(after.sections[0].questions[1].answered).toBe(1);
  });

  it('klant kan niet schrijven naar interne blokken of andere documenten', async () => {
    const { env, doc } = await setup();
    const det = await (await discoveryDocDetail(env, new URL(`${ORIGIN}/?id=${doc.id}`))).json();
    const intern = det.sections.find((s) => /Risico/.test(s.title)).questions[0].id;
    const notes = det.sections[0].questions.find((q) => q.type !== 'field').id;
    const sole = (await (await discoveryOverview(env)).json()).clients.find((c) => c.name === 'SoleHome').docs[0];
    const soleQ = (await (await discoveryDocDetail(env, new URL(`${ORIGIN}/?id=${sole.id}`))).json()).sections[0].questions[0].id;
    const { cookie } = await pwLogin(env, doc.id);
    for (const qid of [intern, notes, soleQ]) {
      const r = await handleKlantApi(req('/api/discovery-klant/answer', { method: 'POST', cookie, body: { question_id: qid, value: { v: 'x' } } }), env);
      expect(r.status, String(qid)).toBe(404);
    }
  });

  it('zonder/vervalste cookie of portal-sessie → 401; vreemde origin → 403; zwakke invoer geweigerd', async () => {
    const { env, doc } = await setup();
    expect((await handleKlantApi(req('/api/discovery-klant/doc'), env)).status).toBe(401);
    expect((await handleKlantApi(req('/api/discovery-klant/doc', { cookie: `${KLANT_COOKIE}=abc.def0` }), env)).status).toBe(401);
    const { createSession } = await import('../src/lib/auth.js');
    const fake = await createSession('usr_abc', env.PORTAL_SESSION_SECRET);
    expect((await handleKlantApi(req('/api/discovery-klant/doc', { cookie: `${KLANT_COOKIE}=${fake}` }), env)).status).toBe(401);
    const evil = new Request(`${ORIGIN}/api/discovery-klant/login`, { method: 'POST', headers: { Origin: 'https://evil.example' }, body: '{}' });
    expect((await handleKlantApi(evil, env)).status).toBe(403);
    expect((await admin(env, 'POST', { doc_id: doc.id, username: 'ron', password: 'kort' })).status).toBe(400);
    expect((await admin(env, 'POST', { doc_id: doc.id, username: 'r', password: PW })).status).toBe(400);
  });

  it('nieuw wachtwoord maakt het oude + sessie ongeldig; link werkt naast login; alles intrekken sluit beide', async () => {
    const { env, doc } = await setup();
    const first = await pwLogin(env, doc.id, 'ron', PW);
    const second = await pwLogin(env, doc.id, 'ron', 'nieuw-geheim-1');
    expect((await handleKlantApi(req('/api/discovery-klant/doc', { cookie: first.cookie }), env)).status).toBe(401);
    expect((await handleKlantApi(req('/api/discovery-klant/doc', { cookie: second.cookie }), env)).status).toBe(200);
    const old = await handleKlantApi(req('/api/discovery-klant/login', { method: 'POST', body: { username: 'ron', password: PW } }), env);
    expect(old.status).toBe(401);
    const link = await (await admin(env, 'POST', { doc_id: doc.id })).json();
    expect(link.url).toMatch(/^https:\/\/aanloopai\.nl\/portal\/vragenlijst\/#t=[0-9a-f]{64}$/);
    const lr = await handleKlantApi(req('/api/discovery-klant/login', { method: 'POST', body: { token: link.url.split('#t=')[1] } }), env);
    expect(lr.status).toBe(200);
    // login blijft geldig naast de link
    expect((await handleKlantApi(req('/api/discovery-klant/doc', { cookie: second.cookie }), env)).status).toBe(200);
    await admin(env, 'DELETE', { doc_id: doc.id });
    expect((await handleKlantApi(req('/api/discovery-klant/doc', { cookie: second.cookie }), env)).status).toBe(401);
    expect((await handleKlantApi(req('/api/discovery-klant/doc', { cookie: cookieOf(lr) }), env)).status).toBe(401);
  });
});

describe('klantpagina + repo', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/pages/portal/vragenlijst.astro'), 'utf8');
  it('noindex + no-referrer, inlogformulier, token uit adresbalk, lang=nl', () => {
    expect(src).toMatch(/noindex, nofollow/);
    expect(src).toMatch(/no-referrer/);
    expect(src).toMatch(/Gebruikersnaam/);
    expect(src).toMatch(/type="password"/);
    expect(src).toMatch(/history\.replaceState/);
    expect(src).toMatch(/lang="nl"/);
  });
  it('sitemap sluit /portal/ uit', () => {
    const sm = fs.readFileSync(path.join(__dirname, '../scripts/build-sitemap.cjs'), 'utf8');
    expect(sm).toMatch(/SITEMAP_EXCLUDE_PREFIXES = \[[^\]]*'\/portal\/'/);
  });
  it('het klantwachtwoord staat nergens in src/ of migrations/ (repo is public)', () => {
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
    const files = [...walk(path.join(__dirname, '../src')), ...walk(path.join(__dirname, '../migrations'))];
    const needle = ['ron', '1234', '!!'].join('');
    for (const f of files) expect(fs.readFileSync(f, 'utf8').includes(needle), f).toBe(false);
  });
});

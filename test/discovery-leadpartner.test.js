// Discovery Hub — leadpartner-intake (Erik, Keukenstunter Amsterdam Westpoort).
// Guards: (1) soru seti sabit (P01–P40, ★-sayısı, NL+TR), (2) repo PUBLIC →
// seed'de kişisel veri YOK (telefon/e-posta/straatadres), (3) seed gerçek
// SQLite'ta: Ron + SoleHome bozulmaz, ön-doldurma yalnız yeni dokümana,
// idempotent, cevaplı doküman snapshot, (4) intern bloklar partnera görünmez,
// partner düzenleyince bron 'mail' korunur.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEADPARTNER_TEMPLATE, LEADPARTNER_SEED, LEADPARTNER_PREFILL } from '../src/lib/discovery-seed-leadpartner.js';
import { KEUKEN_SEED } from '../src/lib/discovery-seed-keuken.js';
import { ANSWER_TYPES, PRIORITIES } from '../src/lib/discovery-fields.js';
import { mergeKlantValue } from '../src/lib/discovery-klant.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.join(__dirname, '../src/lib/discovery-seed-leadpartner.js');

const fieldQs = LEADPARTNER_TEMPLATE.sections.flatMap((s) => s.questions.filter((q) => q.type === 'field'));

describe('leadpartner-seed — spec-integriteit', () => {
  it('heeft precies P01…P40, oplopend en uniek', () => {
    expect(fieldQs.map((q) => q.config.qid))
      .toEqual(Array.from({ length: 40 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`));
  });

  it('★ = 21; geen ✉ (partner vult alles zelf in)', () => {
    expect(fieldQs.filter((q) => q.config.prio === 'star').length).toBe(21);
    expect(fieldQs.filter((q) => q.config.prio === 'later').length).toBe(0);
  });

  it('elke vraag heeft NL + TR, geldige prio en antwoordtype; keuze/multi hebben keuzes', () => {
    for (const q of fieldQs) {
      expect(q.label.trim(), q.config.qid).not.toBe('');
      expect(q.config.label_tr.trim(), q.config.qid).not.toBe('');
      expect(PRIORITIES).toContain(q.config.prio);
      expect(ANSWER_TYPES).toContain(q.config.answer_type);
      if (['keuze', 'multi'].includes(q.config.answer_type)) expect(q.config.choices.length, q.config.qid).toBeGreaterThan(1);
    }
  });

  it('7 vraagsecties + 4 interne blokken; intern = geen field-vragen; deadline-veld bestaat', () => {
    expect(LEADPARTNER_TEMPLATE.sections.length).toBe(11);
    const intern = LEADPARTNER_TEMPLATE.sections.slice(7);
    for (const s of intern) expect(s.questions.some((q) => q.type === 'field'), s.title).toBe(false);
    const roles = LEADPARTNER_TEMPLATE.sections.flatMap((s) => s.questions).filter((q) => q.config && q.config.role === 'deadline');
    expect(roles.length).toBe(1);
  });

  it('prefill verwijst alleen naar bestaande qids, met bron mail', () => {
    const ids = new Set(fieldQs.map((q) => q.config.qid));
    for (const [qid, v] of Object.entries(LEADPARTNER_PREFILL)) {
      expect(ids.has(qid), qid).toBe(true);
      expect(v.bron).toBe('mail');
    }
    // Kişi/künye soruları (P01–P05, P33, P34) ASLA seed'den doldurulmaz.
    for (const qid of ['P01', 'P02', 'P03', 'P04', 'P05', 'P33', 'P34']) expect(LEADPARTNER_PREFILL[qid]).toBeUndefined();
  });

  it('keukeninbeeld.nl belooft geen bedrijfsnaamvermelding', () => {
    const txt = fieldQs.map((q) => q.label).join('\n');
    expect(txt).not.toMatch(/vermeld(ing)? (als partner|op keukeninbeeld)/i);
  });
});

describe('leadpartner-seed — repo is public: geen persoonsgegevens in de bron', () => {
  const src = fs.readFileSync(SEED_PATH, 'utf8');
  it('geen telefoonnummers', () => {
    expect(src).not.toMatch(/\b0[1-9][0-9][\s-]?[0-9]{6,7}\b/);
    expect(src).not.toMatch(/\+31/);
  });
  it('geen e-mailadressen', () => {
    expect(src).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });
  it('geen straatadres / KvK', () => {
    expect(src).not.toMatch(/\b[1-9][0-9]{3}\s?[A-Z]{2}\b/); // NL postcode+letters
    expect(src).not.toMatch(/Sierenborch/i);
    expect(src).not.toMatch(/\bKvK[-\s]?(nummer)?:?\s*[0-9]{8}\b/);
  });
});

// ── seed tegen echte SQLite (D1-compatibele shim, zelfde als keuken-test) ───
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

describe.skipIf(!sqlite)('leadpartner-seed op SQLite', async () => {
  const { discoveryOverview, discoveryDocDetail, discoverySaveAnswer, ensureExtraSeed } = await import('../src/lib/discovery.js');
  const CLIENT = LEADPARTNER_SEED.client.name;
  const overview = async (env) => (await discoveryOverview(env)).json();
  const detail = async (env, id) => (await discoveryDocDetail(env, new URL(`https://x/?id=${id}`))).json();
  const fieldsOf = (det) => det.sections.flatMap((s) => s.questions).filter((q) => q.type === 'field');

  it('maakt template + klant Erik + één document; Ron en SoleHome blijven staan', async () => {
    const env = { PORTAL_DB: makeD1() };
    const ov = await overview(env);
    const erik = ov.clients.find((c) => c.name === CLIENT);
    expect(erik.docs.length).toBe(1);
    expect(erik.docs[0].title).toBe(LEADPARTNER_SEED.doc_title);
    expect(ov.clients.find((c) => c.name === KEUKEN_SEED.client.name).docs.length).toBe(1);
    expect(ov.clients.find((c) => c.name === 'SoleHome').docs.length).toBe(1);
    const det = await detail(env, erik.docs[0].id);
    expect(fieldsOf(det).length).toBe(40);
  });

  it('prefill: bekende mail-antwoorden staan erin met bron mail; persoonsvelden leeg', async () => {
    const env = { PORTAL_DB: makeD1() };
    const ov = await overview(env);
    const det = await detail(env, ov.clients.find((c) => c.name === CLIENT).docs[0].id);
    const byQid = Object.fromEntries(fieldsOf(det).map((q) => [q.config.qid, q]));
    expect(byQid.P09.value.v).toMatch(/Amsterdam, Haarlem, Zaandam, Hoofddorp, Badhoevedorp, Almere/);
    expect(byQid.P09.value.bron).toBe('mail');
    expect(byQid.P10.value.v).toMatch(/concept/);
    expect(byQid.P14.value.v).toEqual(['complete keuken', 'aanrechtblad vervangen']);
    expect(byQid.P16.value.v).toMatch(/2\.000/);
    for (const qid of ['P01', 'P03', 'P04', 'P05']) expect(byQid[qid].value == null || !byQid[qid].value.v, qid).toBe(true);
    const n = env.PORTAL_DB.raw.prepare(
      `SELECT COUNT(*) AS n FROM disc_answers a JOIN disc_doc_questions q ON a.doc_question_id = q.id
       JOIN disc_doc_sections s ON q.doc_section_id = s.id WHERE s.doc_id = ? AND a.answered = 1`,
    ).get(det.doc.id).n;
    expect(n).toBe(Object.keys(LEADPARTNER_PREFILL).length);
  });

  it('idempotent: tweede aanroep maakt niets dubbel', async () => {
    const env = { PORTAL_DB: makeD1() };
    await overview(env);
    const ov = await overview(env);
    expect(ov.clients.filter((c) => c.name === CLIENT).length).toBe(1);
    expect(env.PORTAL_DB.raw.prepare('SELECT COUNT(*) AS n FROM disc_templates WHERE name = ?').get(LEADPARTNER_TEMPLATE.name).n).toBe(1);
    expect(env.PORTAL_DB.raw.prepare('SELECT COUNT(*) AS n FROM disc_docs WHERE title = ?').get(LEADPARTNER_SEED.doc_title).n).toBe(1);
  });

  it('versie-upgrade laat het (voor-ingevulde + bewerkte) document staan; prefill niet opnieuw', async () => {
    const env = { PORTAL_DB: makeD1() };
    const ov = await overview(env);
    const docId = ov.clients.find((c) => c.name === CLIENT).docs[0].id;
    const det = await detail(env, docId);
    const p01 = fieldsOf(det).find((q) => q.config.qid === 'P01');
    const req = new Request('https://x', { method: 'POST', body: JSON.stringify({ question_id: p01.id, value: { v: 'Keukenstunter BV' }, base_updated_at: null }) });
    expect((await (await discoverySaveAnswer(req, env)).json()).answered).toBe(1);
    await ensureExtraSeed(env.PORTAL_DB, { ...LEADPARTNER_SEED, version: LEADPARTNER_SEED.version + 1 });
    const ov2 = await overview(env);
    expect(ov2.clients.find((c) => c.name === CLIENT).docs.map((d) => d.id)).toEqual([docId]);
    const det2 = await detail(env, docId);
    expect(fieldsOf(det2).find((q) => q.config.qid === 'P01').value.v).toBe('Keukenstunter BV');
  });
});

describe('partnerweergave', () => {
  it('partner bewerkt een voor-ingevuld antwoord: waarde wijzigt, bron mail blijft, intern note blijft', () => {
    const merged = mergeKlantValue(LEADPARTNER_PREFILL.P09, { v: 'Amsterdam, Haarlem, Zaandam', t: '' });
    expect(merged.v).toBe('Amsterdam, Haarlem, Zaandam');
    expect(merged.bron).toBe('mail');
    expect(merged.note).toBe(LEADPARTNER_PREFILL.P09.note);
    expect(merged.status).toBe('beantwoord');
  });
});

// Discovery Hub — keukenzaak-formulier (Ron, via Ömer / Kitchen To You).
// Guards: (1) soru seti spec'le birebir (R01–R91, ★/✉ sayıları, NL+TR),
// (2) field-mantığı (status/answered, aanleverlijst, mail, Markdown — intern
// not dışarı sızmaz), (3) seed gerçek SQLite üzerinde: SoleHome'u bozmaz,
// idempotent, eşzamanlı ilk çağrıda çift kayıt yok, cevaplı doküman korunur,
// (4) sayfa field-UI'ını taşıyor.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEUKEN_TEMPLATE, KEUKEN_SEED } from '../src/lib/discovery-seed-keuken.js';
import {
  fieldStatus, fieldAnswered, collectAanleverlijst, buildAanleverMail,
  buildMarkdown, starOpen, defaultAanhef, roleValue, ANSWER_TYPES, PRIORITIES,
} from '../src/lib/discovery-fields.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fieldQs = KEUKEN_TEMPLATE.sections.flatMap((s) => s.questions.filter((q) => q.type === 'field'));

describe('keukenzaak-seed — spec-integriteit', () => {
  it('heeft precies R01…R91, oplopend en uniek', () => {
    const ids = fieldQs.map((q) => q.config.qid);
    expect(ids).toEqual(Array.from({ length: 91 }, (_, i) => `R${String(i + 1).padStart(2, '0')}`));
  });

  it('★ = 32 en ✉ = 10 (zoals in de spec)', () => {
    expect(fieldQs.filter((q) => q.config.prio === 'star').length).toBe(32);
    expect(fieldQs.filter((q) => q.config.prio === 'later').map((q) => q.config.qid))
      .toEqual(['R06', 'R07', 'R08', 'R34', 'R35', 'R36', 'R37', 'R38', 'R39', 'R45']);
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

  it('Observatie-knop alleen in sectie 1–2', () => {
    const obs = fieldQs.filter((q) => q.config.observable).map((q) => q.config.qid);
    expect(obs[0]).toBe('R01');
    expect(obs[obs.length - 1]).toBe('R18');
    expect(obs.length).toBe(18);
  });

  it('11 vraagsecties + 5 vaste blokken; deadline-veld bestaat', () => {
    expect(KEUKEN_TEMPLATE.sections.length).toBe(16);
    const roles = KEUKEN_TEMPLATE.sections.flatMap((s) => s.questions).filter((q) => q.config && q.config.role === 'deadline');
    expect(roles.length).toBe(1);
  });
});

function sec(questions) {
  return [{ id: 1, title: 'T', questions }];
}
function fq(id, qid, prio, value, extra = {}) {
  return { id, type: 'field', label: `vraag ${qid}`, config: { qid, prio, answer_type: 'tekst', ...extra }, value };
}

describe('field-logica', () => {
  it('status: leeg = open, waarde = beantwoord, expliciete status wint', () => {
    expect(fieldStatus(null)).toBe('open');
    expect(fieldStatus({ v: 'x' })).toBe('beantwoord');
    expect(fieldStatus({ v: '', note: 'alleen notitie' })).toBe('open');
    expect(fieldStatus({ v: 'x', status: 'nog_aanleveren' })).toBe('nog_aanleveren');
    expect(fieldAnswered({ v: '', status: 'n.v.t.' })).toBe(1);
    expect(fieldAnswered({ v: [], status: 'open' })).toBe(0);
    expect(fieldAnswered({ v: ['3D'] })).toBe(1);
  });

  it('aanleverlijst = open + nog_aanleveren, elke prioriteit', () => {
    const s = sec([
      fq(1, 'R01', 'star', null),
      fq(2, 'R02', 'star', { v: 'BV' }),
      fq(3, 'R06', 'later', { v: '', status: 'nog_aanleveren' }),
      fq(4, 'R09', 'star', { v: 'dealer', status: 'nog_aanleveren' }),
      fq(5, 'R13', 'normaal', { status: 'n.v.t.' }),
    ]);
    expect(collectAanleverlijst(s).map((x) => x.qid)).toEqual(['R01', 'R06', 'R09']);
    expect(starOpen(s).map((q) => q.config.qid)).toEqual(['R01']);
  });

  it('mail volgt het template: aanhef, genummerde lijst, deadline, ondertekening', () => {
    const { subject, body } = buildAanleverMail({
      aanhef: 'Beste Ron', deadline: 'vrijdag 9 oktober',
      items: [{ label: 'Logo (vector)' }, { label: "Foto's" }],
    });
    expect(subject).toBe('Vervolg op ons gesprek — nog een paar gegevens');
    expect(body.startsWith('Beste Ron,\n\nBedankt voor het gesprek vandaag in de showroom.')).toBe(true);
    expect(body).toContain("1. Logo (vector)\n2. Foto's");
    expect(body).toContain('Graag uiterlijk vrijdag 9 oktober.');
    expect(body.endsWith('Mustafa Dogan\nAanloopAI / Alfa Reclame\n06 24741597')).toBe(true);
    expect(body).not.toMatch(/^>/m); // geen quoted original
  });

  it('aanhef uit klantnaam; deadline uit role-veld', () => {
    expect(defaultAanhef('Ron (keukenzaak)')).toBe('Beste Ron');
    const s = sec([{ id: 9, type: 'text', label: 'Deadline', config: { role: 'deadline' }, value: '9 okt' }]);
    expect(roleValue(s, 'deadline')).toBe('9 okt');
  });

  it('Markdown: alleen beantwoorde vragen + export-blokken; interne notities lekken niet', () => {
    const s = [
      { id: 1, title: '1. Bedrijf', questions: [
        fq(1, 'R01', 'star', { v: 'Keuken BV', note: 'GEHEIM-TR-NOT' }),
        fq(2, 'R02', 'star', null),
        fq(3, 'R16', 'normaal', { v: 'ja', t: 'via Santander' }, { answer_type: 'ja_nee' }),
        { id: 4, type: 'textarea', label: 'Bölüm notları', value: 'INTERN-SECTIENOTITIE' },
      ] },
      { id: 2, title: '13. Gemaakte afspraken', questions: [
        { id: 5, type: 'checklist', label: 'Afspraken', sub_items: ['Website akkoord', 'Ömer besproken'], config: { export: true }, value: [true, false] },
      ] },
      { id: 3, title: "16. Risico's (intern)", questions: [
        { id: 6, type: 'textarea', label: "Risico's", value: 'INTERN-RISICO' },
      ] },
    ];
    const md = buildMarkdown({ doc: { client_name: 'Ron (keukenzaak)', title: 'Keukenzaak' }, sections: s, today: '2026-10-06' });
    expect(md).toContain('**R01**');
    expect(md).toContain('Keuken BV');
    expect(md).toContain('Ja — via Santander');
    expect(md).not.toContain('**R02**');
    expect(md).toContain('- [x] Website akkoord');
    expect(md).toContain('- [ ] Ömer besproken');
    expect(md).not.toMatch(/GEHEIM-TR-NOT|INTERN-SECTIENOTITIE|INTERN-RISICO/);
  });
});

// ── seed tegen echte SQLite (D1-compatibele shim) ─────────────────────────
let sqlite = null;
try { sqlite = await import('node:sqlite'); } catch { sqlite = null; }

function makeD1() {
  const raw = new sqlite.DatabaseSync(':memory:');
  // discovery.js cachet "schema klaar" per isolate; elke verse test-DB krijgt
  // daarom het kanonieke migratiebestand.
  raw.exec(fs.readFileSync(path.join(__dirname, '../migrations/0018_discovery.sql'), 'utf8'));
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

describe.skipIf(!sqlite)('keukenzaak-seed op SQLite', async () => {
  const { discoveryOverview, discoveryDocDetail, discoverySaveAnswer, ensureExtraSeed } = await import('../src/lib/discovery.js');

  async function overview(env) { return (await discoveryOverview(env)).json(); }

  it('maakt template + klant Ron + één document, naast SoleHome', async () => {
    const env = { PORTAL_DB: makeD1() };
    const ov = await overview(env);
    const ron = ov.clients.find((c) => c.name === 'Ron (keukenzaak)');
    const sole = ov.clients.find((c) => c.name === 'SoleHome');
    expect(ron.docs.length).toBe(1);
    expect(sole.docs.length).toBe(1);
    expect(ron.contact).toBe('via Ömer / Kitchen To You');
    const det = await (await discoveryDocDetail(env, new URL(`https://x/?id=${ron.docs[0].id}`))).json();
    const fields = det.sections.flatMap((s) => s.questions).filter((q) => q.type === 'field');
    expect(fields.length).toBe(91);
    expect(fields[0].config.label_tr).toMatch(/Resmi şirket adı/);
  });

  it('idempotent: tweede aanroep maakt niets dubbel', async () => {
    const env = { PORTAL_DB: makeD1() };
    await overview(env);
    const ov = await overview(env);
    expect(ov.clients.filter((c) => c.name === 'Ron (keukenzaak)').length).toBe(1);
    const n = env.PORTAL_DB.raw.prepare("SELECT COUNT(*) AS n FROM disc_templates WHERE name = ?").get(KEUKEN_TEMPLATE.name).n;
    expect(n).toBe(1);
  });

  it('gelijktijdige eerste seeds (overview + templates parallel) geven geen dubbele rijen', async () => {
    const db = makeD1();
    const env = { PORTAL_DB: db };
    await overview(env); // schema + SoleHome
    db.raw.prepare('DELETE FROM disc_meta WHERE key LIKE ?').run(`${KEUKEN_SEED.key}%`);
    db.raw.prepare('DELETE FROM disc_docs').run();
    db.raw.prepare("DELETE FROM disc_clients WHERE name = 'Ron (keukenzaak)'").run();
    await Promise.all([ensureExtraSeed(db, KEUKEN_SEED), ensureExtraSeed(db, KEUKEN_SEED)]);
    expect(db.raw.prepare("SELECT COUNT(*) AS n FROM disc_clients WHERE name = 'Ron (keukenzaak)'").get().n).toBe(1);
    expect(db.raw.prepare('SELECT COUNT(*) AS n FROM disc_docs').get().n).toBe(1);
  });

  it('versie-upgrade laat een beantwoord document staan (snapshot)', async () => {
    const env = { PORTAL_DB: makeD1() };
    const ov = await overview(env);
    const docId = ov.clients.find((c) => c.name === 'Ron (keukenzaak)').docs[0].id;
    const det = await (await discoveryDocDetail(env, new URL(`https://x/?id=${docId}`))).json();
    const r01 = det.sections[0].questions[0];
    const req = new Request('https://x', { method: 'POST', body: JSON.stringify({ question_id: r01.id, value: { v: 'Keuken BV' }, base_updated_at: null }) });
    const saved = await (await discoverySaveAnswer(req, env)).json();
    expect(saved.answered).toBe(1);
    await ensureExtraSeed(env.PORTAL_DB, { ...KEUKEN_SEED, version: KEUKEN_SEED.version + 1 });
    const ov2 = await overview(env);
    expect(ov2.clients.find((c) => c.name === 'Ron (keukenzaak)').docs.map((d) => d.id)).toEqual([docId]);
  });
});

describe('admin/discovery-doc.astro — field-UI', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/pages/admin/discovery-doc.astro'), 'utf8');
  it('importeert de gedeelde field-logica (geen kopie)', () => {
    expect(src).toMatch(/from '\.\.\/\.\.\/lib\/discovery-fields\.js'/);
  });
  it('heeft ★-teller, aanleverlijst, export, taaltoggle en Observatie-knop', () => {
    for (const s of ['★ nog open', 'Genereer aanleverlijst', 'Export .md', 'NL+TR', 'Observatie', 'data-fnotebtn']) {
      expect(src).toContain(s);
    }
  });
});

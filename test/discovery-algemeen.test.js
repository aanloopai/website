// Discovery Hub — algemeen şablon (Franko 500 AB). Guards: (1) soru seti sabit
// (G01–G48, NL+TR, geldige tipler), (2) sektörden bağımsız (keuken-özel madde
// yok), (3) repo PUBLIC → seed'de kişisel veri YOK, (4) seed gerçek SQLite'ta:
// eigen klant + document, prefill yok, diğer seed'ler bozulmaz, idempotent.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALGEMEEN_TEMPLATE, ALGEMEEN_SEED_FRANKO } from '../src/lib/discovery-seed-algemeen.js';
import { KEUKEN_SEED } from '../src/lib/discovery-seed-keuken.js';
import { LEADPARTNER_SEED, LEADPARTNER_SEED_VIOLA } from '../src/lib/discovery-seed-leadpartner.js';
import { ANSWER_TYPES, PRIORITIES } from '../src/lib/discovery-fields.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.join(__dirname, '../src/lib/discovery-seed-algemeen.js');
const fieldQs = ALGEMEEN_TEMPLATE.sections.flatMap((s) => s.questions.filter((q) => q.type === 'field'));

describe('algemeen-seed — spec-integriteit', () => {
  it('heeft precies G01…G48, oplopend en uniek', () => {
    expect(fieldQs.map((q) => q.config.qid))
      .toEqual(Array.from({ length: 48 }, (_, i) => `G${String(i + 1).padStart(2, '0')}`));
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

  it('10 vraagsecties + 4 interne blokken; intern = geen field-vragen; één deadline-veld', () => {
    expect(ALGEMEEN_TEMPLATE.sections.length).toBe(14);
    for (const s of ALGEMEEN_TEMPLATE.sections.slice(10)) expect(s.questions.some((q) => q.type === 'field'), s.title).toBe(false);
    const roles = ALGEMEEN_TEMPLATE.sections.flatMap((s) => s.questions).filter((q) => q.config && q.config.role === 'deadline');
    expect(roles.length).toBe(1);
  });

  it('sectoronafhankelijk: geen keuken/showroom/montage/ontwerptool-vragen', () => {
    const txt = fieldQs.map((q) => q.label).join('\n');
    expect(txt).not.toMatch(/keuken|showroom|montage|ontwerptool/i);
  });

  it('eigen template-naam (botst niet met keuken/leadpartner)', () => {
    expect(ALGEMEEN_TEMPLATE.name).not.toBe(KEUKEN_SEED.template.name);
    expect(ALGEMEEN_TEMPLATE.name).not.toBe(LEADPARTNER_SEED.template.name);
  });
});

describe('algemeen-seed — repo is public: geen persoonsgegevens in de bron', () => {
  const src = fs.readFileSync(SEED_PATH, 'utf8');
  it('geen telefoonnummers', () => {
    expect(src).not.toMatch(/\+\d{2}\s?\d/);
    expect(src).not.toMatch(/\b0[1-9][0-9][\s-]?[0-9]{6,7}\b/);
    expect(src).not.toMatch(/\b07\d{8}\b/);
  });
  it('geen e-mailadressen', () => {
    expect(src).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });
  it('geen achternaam van de contactpersoon', () => {
    expect(src).not.toMatch(/Shabo/i);
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

describe.skipIf(!sqlite)('algemeen-seed op SQLite', async () => {
  const { discoveryOverview, discoveryDocDetail } = await import('../src/lib/discovery.js');
  const CLIENT = ALGEMEEN_SEED_FRANKO.client.name;
  const overview = async (env) => (await discoveryOverview(env)).json();
  const detail = async (env, id) => (await discoveryDocDetail(env, new URL(`https://x/?id=${id}`))).json();
  const fieldsOf = (det) => det.sections.flatMap((s) => s.questions).filter((q) => q.type === 'field');

  it('maakt klant Franko + één document met 48 lege vragen; andere seeds blijven één document', async () => {
    const env = { PORTAL_DB: makeD1() };
    const ov = await overview(env);
    const franko = ov.clients.find((c) => c.name === CLIENT);
    expect(franko.docs.length).toBe(1);
    expect(franko.docs[0].title).toBe('Website & leads - Franko 500 AB');
    for (const name of [KEUKEN_SEED.client.name, LEADPARTNER_SEED.client.name, LEADPARTNER_SEED_VIOLA.client.name, 'SoleHome']) {
      expect(ov.clients.find((c) => c.name === name).docs.length, name).toBe(1);
    }
    const det = await detail(env, franko.docs[0].id);
    const fields = fieldsOf(det);
    expect(fields.length).toBe(48);
    for (const q of fields) expect(q.value == null || !q.value.v, q.config.qid).toBe(true);
  });

  it('idempotent: tweede aanroep maakt niets dubbel', async () => {
    const env = { PORTAL_DB: makeD1() };
    await overview(env);
    const ov = await overview(env);
    expect(ov.clients.filter((c) => c.name === CLIENT).length).toBe(1);
    expect(env.PORTAL_DB.raw.prepare('SELECT COUNT(*) AS n FROM disc_templates WHERE name = ?').get(ALGEMEEN_TEMPLATE.name).n).toBe(1);
    expect(env.PORTAL_DB.raw.prepare('SELECT COUNT(*) AS n FROM disc_docs WHERE title = ?').get(ALGEMEEN_SEED_FRANKO.doc_title).n).toBe(1);
  });
});

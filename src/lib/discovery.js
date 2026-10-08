// Discovery Hub — müşteri keşif/intake görüşmeleri (/api/admin/discovery/*).
// Şablon = blueprint, doküman = snapshot: şablon müşteriye atanırken tüm yapısı
// dokümana KOPYALANIR; şablonu sonradan düzenlemek mevcut dokümanları bozmaz.
// Şema + seed idempotent olarak ilk çağrıda kurulur (migrations/0018 kanonik).
// Güvenlik: bu araç asla müşteri şifresi saklamaz — erişim tablosu davet/yetki
// takibi içindir.
import { jsonResponse, errorResponse } from './google-auth.js';
import { SEED_TEMPLATE, SEED_CLIENTS, SEED_VERSION } from './discovery-seed.js';
import { KEUKEN_SEED } from './discovery-seed-keuken.js';
import { LEADPARTNER_SEED } from './discovery-seed-leadpartner.js';
import { fieldAnswered } from './discovery-fields.js';

// Ek şablon+müşteri seed'leri (SoleHome seed'inden bağımsız sürümlenir).
const EXTRA_SEEDS = [KEUKEN_SEED, LEADPARTNER_SEED];

const SECTION_NOTES_LABEL = 'Bölüm notları';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS disc_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, contact TEXT,
    notes TEXT, archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS disc_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
    description TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS disc_template_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT, template_id INTEGER NOT NULL,
    title TEXT NOT NULL, guidance TEXT, sort INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS idx_disc_tsec_tpl ON disc_template_sections(template_id, sort)`,
  `CREATE TABLE IF NOT EXISTS disc_template_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, section_id INTEGER NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0, type TEXT NOT NULL, label TEXT NOT NULL,
    sub_items TEXT, guidance TEXT, config TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_disc_tq_sec ON disc_template_questions(section_id, sort)`,
  `CREATE TABLE IF NOT EXISTS disc_docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL,
    title TEXT NOT NULL, template_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS idx_disc_docs_client ON disc_docs(client_id)`,
  `CREATE TABLE IF NOT EXISTS disc_doc_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT, doc_id INTEGER NOT NULL,
    title TEXT NOT NULL, guidance TEXT, sort INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS idx_disc_dsec_doc ON disc_doc_sections(doc_id, sort)`,
  `CREATE TABLE IF NOT EXISTS disc_doc_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, doc_section_id INTEGER NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0, type TEXT NOT NULL, label TEXT NOT NULL,
    sub_items TEXT, guidance TEXT, config TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_disc_dq_sec ON disc_doc_questions(doc_section_id, sort)`,
  `CREATE TABLE IF NOT EXISTS disc_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, doc_question_id INTEGER NOT NULL UNIQUE,
    value TEXT, answered INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS disc_meta (
    key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  // Müşteri erişimi (discovery-klant.js) — migrations/0022 + 0023 kanonik.
  `CREATE TABLE IF NOT EXISTS disc_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT, doc_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TEXT, last_seen_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_disc_access_doc ON disc_access(doc_id)`,
];

// Sonradan eklenen kolonlar: mevcut tabloda ALTER, varsa "duplicate column"
// hatası yutulur (D1'de ADD COLUMN IF NOT EXISTS yok).
const COLUMN_ADDS = [
  "ALTER TABLE disc_access ADD COLUMN kind TEXT NOT NULL DEFAULT 'link'",
  'ALTER TABLE disc_access ADD COLUMN username TEXT',
  'ALTER TABLE disc_access ADD COLUMN pw_hash TEXT',
];

// Eski ayrı "Keukenzaak - Foralle" soru seti (PR #177) — tek potaya
// birleştirildi: Ron artık R01–R91 dokümanının kendisini doldurur.
const LEGACY_FORALLE_TEMPLATE = 'Keukenzaak - Foralle';
const ONE_POT_KEY = 'merge_foralle_onepot';

let schemaReady = false;

async function getMeta(db, key) {
  const row = await db.prepare('SELECT value FROM disc_meta WHERE key = ?').bind(key).first();
  return row ? row.value : null;
}

async function setMeta(db, key, value) {
  await db.prepare('INSERT INTO disc_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, String(value)).run();
}

export async function ensureSchemaAndSeed(db) {
  if (!schemaReady) {
    await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
    for (const sql of COLUMN_ADDS) {
      try { await db.prepare(sql).run(); } catch (err) {
        if (!/duplicate column/i.test(String(err && err.message))) throw err;
      }
    }
    schemaReady = true;
  }
  const tpl = await db.prepare('SELECT COUNT(*) AS n FROM disc_templates').first();
  if (!tpl.n) {
    await seedTemplate(db);
    await setMeta(db, 'seed_version', SEED_VERSION);
  }
  const cl = await db.prepare('SELECT COUNT(*) AS n FROM disc_clients').first();
  if (!cl.n) await seedClients(db);
  const ver = parseInt((await getMeta(db, 'seed_version')) || '1', 10);
  if (ver < SEED_VERSION) {
    await upgradeSeed(db, ver);
    await setMeta(db, 'seed_version', SEED_VERSION);
  }
  for (const seed of EXTRA_SEEDS) await ensureExtraSeed(db, seed);
  await mergeForalleOnePot(db);
}

// Tek seferlik: eski ayrı Foralle şablonu kalkar; cevapsız Foralle dokümanı
// silinir, cevaplı olan "(oud)" adıyla korunur (veri silinmez); o dokümanların
// erişimleri kapatılır; Ron'un R01–R91 dokümanının adı "Keukenzaak - Foralle".
export async function mergeForalleOnePot(db) {
  if (await getMeta(db, ONE_POT_KEY)) return;
  const lock = await db.prepare('INSERT OR IGNORE INTO disc_meta (key, value) VALUES (?, ?)')
    .bind(`${ONE_POT_KEY}:lock`, new Date().toISOString()).run();
  if (!lock.meta || !lock.meta.changes) return;
  try {
    const legacy = await db.prepare('SELECT id FROM disc_templates WHERE name = ?').bind(LEGACY_FORALLE_TEMPLATE).first();
    if (legacy) {
      const docs = (await db.prepare('SELECT id FROM disc_docs WHERE template_id = ?').bind(legacy.id).all()).results || [];
      const now = new Date().toISOString();
      for (const doc of docs) {
        await db.prepare('UPDATE disc_access SET revoked_at = ? WHERE doc_id = ? AND revoked_at IS NULL').bind(now, doc.id).run();
        const answered = (await db.prepare(
          `SELECT COUNT(*) AS n FROM disc_answers a
           JOIN disc_doc_questions q ON a.doc_question_id = q.id
           JOIN disc_doc_sections s ON q.doc_section_id = s.id
           WHERE s.doc_id = ? AND a.answered = 1`,
        ).bind(doc.id).first()).n;
        if (answered) {
          await db.prepare('UPDATE disc_docs SET title = ?, template_id = NULL WHERE id = ?')
            .bind('Keukenzaak - Foralle (oud, apart formulier)', doc.id).run();
        } else {
          await deleteDoc(db, doc.id);
        }
      }
      await db.prepare(
        'DELETE FROM disc_template_questions WHERE section_id IN (SELECT id FROM disc_template_sections WHERE template_id = ?)',
      ).bind(legacy.id).run();
      await db.prepare('DELETE FROM disc_template_sections WHERE template_id = ?').bind(legacy.id).run();
      await db.prepare('DELETE FROM disc_templates WHERE id = ?').bind(legacy.id).run();
    }
    const tpl = await db.prepare('SELECT id FROM disc_templates WHERE name = ?').bind(KEUKEN_SEED.template.name).first();
    const client = await db.prepare('SELECT id FROM disc_clients WHERE name = ?').bind(KEUKEN_SEED.client.name).first();
    if (tpl && client) {
      await db.prepare('UPDATE disc_docs SET title = ? WHERE client_id = ? AND template_id = ?')
        .bind(KEUKEN_SEED.doc_title, client.id, tpl.id).run();
    }
    await setMeta(db, ONE_POT_KEY, '1');
  } catch (err) {
    await db.prepare('DELETE FROM disc_meta WHERE key = ?').bind(`${ONE_POT_KEY}:lock`).run();
    throw err;
  }
}

// Ek seed: şablonu (isimle) kurar/günceller, müşteriyi (isimle) bulur ya da
// açar, o müşteriye bu şablondan bir doküman garanti eder. Snapshot ilkesi:
// cevap girilmiş dokümana dokunulmaz; cevapsız doküman yeni içerikle yeniden
// kurulur. Eşzamanlı ilk çağrılar (overview + templates paralel gelir) için
// sürüm başına kilit satırı: INSERT OR IGNORE, yalnız kazanan seed'ler.
export async function ensureExtraSeed(db, seed) {
  const ver = parseInt((await getMeta(db, seed.key)) || '0', 10);
  if (ver >= seed.version) return;
  const lockKey = `${seed.key}:lock:${seed.version}`;
  const lock = await db.prepare('INSERT OR IGNORE INTO disc_meta (key, value) VALUES (?, ?)')
    .bind(lockKey, new Date().toISOString()).run();
  if (!lock.meta || !lock.meta.changes) return;
  try {
    const tplDef = seed.template;
    let tpl = await db.prepare('SELECT id FROM disc_templates WHERE name = ?').bind(tplDef.name).first();
    let tplId;
    if (tpl) {
      tplId = tpl.id;
      await db.prepare('UPDATE disc_templates SET description = ? WHERE id = ?').bind(tplDef.description, tplId).run();
      await db.prepare(
        'DELETE FROM disc_template_questions WHERE section_id IN (SELECT id FROM disc_template_sections WHERE template_id = ?)',
      ).bind(tplId).run();
      await db.prepare('DELETE FROM disc_template_sections WHERE template_id = ?').bind(tplId).run();
    } else {
      const t = await db.prepare('INSERT INTO disc_templates (name, description) VALUES (?, ?)')
        .bind(tplDef.name, tplDef.description).run();
      tplId = t.meta.last_row_id;
    }
    await insertTemplateContent(db, tplId, tplDef);

    let client = await db.prepare('SELECT id FROM disc_clients WHERE name = ?').bind(seed.client.name).first();
    if (!client) {
      const r = await db.prepare('INSERT INTO disc_clients (name, contact, notes) VALUES (?, ?, ?)')
        .bind(seed.client.name, seed.client.contact || null, seed.client.notes || null).run();
      client = { id: r.meta.last_row_id };
    }
    const docs = (await db.prepare('SELECT id FROM disc_docs WHERE client_id = ? AND template_id = ? ORDER BY id')
      .bind(client.id, tplId).all()).results || [];
    let keep = 0;
    for (const doc of docs) {
      const answered = (await db.prepare(
        `SELECT COUNT(*) AS n FROM disc_answers a
         JOIN disc_doc_questions q ON a.doc_question_id = q.id
         JOIN disc_doc_sections s ON q.doc_section_id = s.id
         WHERE s.doc_id = ?`,
      ).bind(doc.id).first()).n;
      if (answered) keep++;
      else await deleteDoc(db, doc.id);
    }
    if (!keep) {
      const docId = await instantiateDoc(db, client.id, tplId, seed.doc_title || tplDef.name);
      await applyPrefill(db, docId, seed.prefill);
    }
    await setMeta(db, seed.key, seed.version);
  } catch (err) {
    await db.prepare('DELETE FROM disc_meta WHERE key = ?').bind(lockKey).run();
    throw err;
  }
}

async function seedTemplate(db) {
  const t = await db.prepare('INSERT INTO disc_templates (name, description) VALUES (?, ?)')
    .bind(SEED_TEMPLATE.name, SEED_TEMPLATE.description).run();
  const templateId = t.meta.last_row_id;
  await insertTemplateContent(db, templateId, SEED_TEMPLATE);
  return templateId;
}

async function insertTemplateContent(db, templateId, template) {
  for (let si = 0; si < template.sections.length; si++) {
    const sec = template.sections[si];
    const s = await db.prepare('INSERT INTO disc_template_sections (template_id, title, guidance, sort) VALUES (?, ?, ?, ?)')
      .bind(templateId, sec.title, sec.guidance || '', si).run();
    const sectionId = s.meta.last_row_id;
    const stmts = sec.questions.map((q, qi) =>
      db.prepare('INSERT INTO disc_template_questions (section_id, sort, type, label, sub_items, guidance, config) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(sectionId, qi, q.type, q.label, JSON.stringify(q.sub_items || []), q.guidance || '', q.config ? JSON.stringify(q.config) : null));
    if (stmts.length) await db.batch(stmts);
  }
}

// Seed şablonunu yeni SEED_VERSION içeriğiyle değiştirir. Doküman = snapshot:
// cevap girilmiş dokümanlara DOKUNULMAZ (kopya da açılmaz — eski sürümlerin
// '(güncel sorular)' kopyası çoğaltma hatası üretiyordu); hiç cevap girilmemiş
// dokümanlar yeni sorularla yeniden oluşturulur. fromVer < 5 ise tek seferlik
// temizlik: müşteri başına seed-şablonu dokümanı TEKE düşürülür (öncelik
// güncel soru setli olan; eşitse en yeni).
async function upgradeSeed(db, fromVer) {
  const tpl = await db.prepare('SELECT id FROM disc_templates WHERE name = ?').bind(SEED_TEMPLATE.name).first();
  if (!tpl) {
    await seedTemplate(db);
    return;
  }
  await db.prepare('UPDATE disc_templates SET description = ? WHERE id = ?').bind(SEED_TEMPLATE.description, tpl.id).run();
  await db.prepare(
    'DELETE FROM disc_template_questions WHERE section_id IN (SELECT id FROM disc_template_sections WHERE template_id = ?)',
  ).bind(tpl.id).run();
  await db.prepare('DELETE FROM disc_template_sections WHERE template_id = ?').bind(tpl.id).run();
  await insertTemplateContent(db, tpl.id, SEED_TEMPLATE);

  // Güncel şablonun doküman-soru sayısı (bölüm notları dahil) — "güncel soru
  // setli mi" kontrolü bu sayıyla yapılır.
  const tq = await db.prepare(
    'SELECT COUNT(*) AS n FROM disc_template_questions q JOIN disc_template_sections s ON q.section_id = s.id WHERE s.template_id = ?',
  ).bind(tpl.id).first();
  const ts = await db.prepare('SELECT COUNT(*) AS n FROM disc_template_sections WHERE template_id = ?').bind(tpl.id).first();
  const expectedQ = tq.n + ts.n;

  const docs = (await db.prepare('SELECT id, client_id, title FROM disc_docs WHERE template_id = ?').bind(tpl.id).all()).results || [];
  for (const doc of docs) {
    doc.answered = (await db.prepare(
      `SELECT COUNT(*) AS n FROM disc_answers a
       JOIN disc_doc_questions q ON a.doc_question_id = q.id
       JOIN disc_doc_sections s ON q.doc_section_id = s.id
       WHERE s.doc_id = ? AND a.answered = 1`,
    ).bind(doc.id).first()).n;
    doc.qcount = (await db.prepare(
      'SELECT COUNT(*) AS n FROM disc_doc_questions q JOIN disc_doc_sections s ON q.doc_section_id = s.id WHERE s.doc_id = ?',
    ).bind(doc.id).first()).n;
  }

  let survivors = docs;
  if (fromVer < 5) {
    survivors = [];
    const byClient = {};
    for (const d of docs) (byClient[d.client_id] = byClient[d.client_id] || []).push(d);
    for (const clientId of Object.keys(byClient)) {
      const list = byClient[clientId].sort((a, b) =>
        ((b.qcount === expectedQ) - (a.qcount === expectedQ)) || (b.answered - a.answered) || (b.id - a.id));
      const keeper = list[0];
      for (const d of list.slice(1)) await deleteDoc(db, d.id);
      if (keeper.title !== SEED_TEMPLATE.name) {
        await db.prepare('UPDATE disc_docs SET title = ? WHERE id = ?').bind(SEED_TEMPLATE.name, keeper.id).run();
      }
      survivors.push(keeper);
    }
  }

  for (const doc of survivors) {
    if (doc.answered === 0) {
      const clientId = doc.client_id;
      await deleteDoc(db, doc.id);
      await instantiateDoc(db, clientId, tpl.id, SEED_TEMPLATE.name);
    }
    // cevaplı doküman: snapshot ilkesi — olduğu gibi kalır
  }
}

async function deleteDoc(db, docId) {
  await db.prepare(
    `DELETE FROM disc_answers WHERE doc_question_id IN (
       SELECT q.id FROM disc_doc_questions q JOIN disc_doc_sections s ON q.doc_section_id = s.id WHERE s.doc_id = ?)`,
  ).bind(docId).run();
  await db.prepare('DELETE FROM disc_doc_questions WHERE doc_section_id IN (SELECT id FROM disc_doc_sections WHERE doc_id = ?)').bind(docId).run();
  await db.prepare('DELETE FROM disc_doc_sections WHERE doc_id = ?').bind(docId).run();
  await db.prepare('DELETE FROM disc_docs WHERE id = ?').bind(docId).run();
}

async function seedClients(db) {
  const tpl = await db.prepare('SELECT id, name FROM disc_templates ORDER BY id LIMIT 1').first();
  for (const c of SEED_CLIENTS) {
    const r = await db.prepare('INSERT INTO disc_clients (name) VALUES (?)').bind(c.name).run();
    if (c.with_doc && tpl) await instantiateDoc(db, r.meta.last_row_id, tpl.id, tpl.name);
  }
}

// Şablonun tam yapısını dokümana kopyalar; her bölümün sonuna serbest
// "Bölüm notları" alanı ekler.
// Seed'den bilinen cevaplar (ör. mailden) YENİ dokümana yazılır: {qid: value}.
// Yalnız field-sorular; bilinmeyen qid sessizce atlanır. Cevaplı doküman
// snapshot'tır — oraya hiç uygulanmaz (çağıran yalnız yeni dokümanda çağırır).
export async function applyPrefill(db, docId, prefill) {
  const entries = Object.entries(prefill || {});
  if (!entries.length) return;
  const rows = (await db.prepare(
    `SELECT q.id, q.config FROM disc_doc_questions q JOIN disc_doc_sections s ON s.id = q.doc_section_id
     WHERE s.doc_id = ? AND q.type = 'field'`,
  ).bind(docId).all()).results || [];
  const byQid = new Map();
  for (const r of rows) {
    try { const qid = JSON.parse(r.config || '{}').qid; if (qid) byQid.set(qid, r.id); } catch { /* skip */ }
  }
  for (const [qid, value] of entries) {
    const id = byQid.get(qid);
    if (id) await saveAnswer(db, { question_id: id, value, base_updated_at: null });
  }
}
async function instantiateDoc(db, clientId, templateId, title) {
  const d = await db.prepare('INSERT INTO disc_docs (client_id, title, template_id) VALUES (?, ?, ?)')
    .bind(clientId, title, templateId).run();
  const docId = d.meta.last_row_id;
  const sections = (await db.prepare('SELECT * FROM disc_template_sections WHERE template_id = ? ORDER BY sort').bind(templateId).all()).results || [];
  for (const sec of sections) {
    const s = await db.prepare('INSERT INTO disc_doc_sections (doc_id, title, guidance, sort) VALUES (?, ?, ?, ?)')
      .bind(docId, sec.title, sec.guidance || '', sec.sort).run();
    const docSectionId = s.meta.last_row_id;
    const questions = (await db.prepare('SELECT * FROM disc_template_questions WHERE section_id = ? ORDER BY sort').bind(sec.id).all()).results || [];
    const stmts = questions.map((q) =>
      db.prepare('INSERT INTO disc_doc_questions (doc_section_id, sort, type, label, sub_items, guidance, config) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(docSectionId, q.sort, q.type, q.label, q.sub_items, q.guidance, q.config));
    stmts.push(
      db.prepare('INSERT INTO disc_doc_questions (doc_section_id, sort, type, label, sub_items, guidance, config) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(docSectionId, questions.length, 'textarea', SECTION_NOTES_LABEL, '[]', 'Bu bölümle ilgili serbest notlar.', null));
    await db.batch(stmts);
  }
  return docId;
}

// Bir cevabın "cevaplanmış" sayılıp sayılmadığı — ilerleme yüzdesi bunun
// üzerinden hesaplanır. Boş metin / hiç tik yok / tüm hücreler boş = 0.
export function computeAnswered(type, value) {
  if (value == null) return 0;
  if (type === 'field') return fieldAnswered(value);
  if (type === 'text' || type === 'textarea') {
    // v2 biçimi: {main, subs:[]} — alt sorular ayrı kutucuklarda. Eski düz
    // string cevaplar da geçerli kalır.
    if (typeof value === 'object' && !Array.isArray(value)) {
      if (String(value.main || '').trim()) return 1;
      return Array.isArray(value.subs) && value.subs.some((s) => String(s || '').trim()) ? 1 : 0;
    }
    return String(value).trim() ? 1 : 0;
  }
  if (type === 'checkbox') return value === true ? 1 : 0;
  if (type === 'checklist') return Array.isArray(value) && value.some((v) => v === true) ? 1 : 0;
  if (type === 'table') {
    if (!Array.isArray(value)) return 0;
    return value.some((row) => Array.isArray(row) && row.some((cell) =>
      cell === true || (typeof cell === 'string' && cell.trim() !== ''))) ? 1 : 0;
  }
  return 0;
}

// ── handlers ────────────────────────────────────────────────────────────────

export async function discoveryOverview(env) {
  const db = env.PORTAL_DB;
  await ensureSchemaAndSeed(db);
  const clients = (await db.prepare('SELECT * FROM disc_clients ORDER BY archived, name COLLATE NOCASE').all()).results || [];
  const docs = (await db.prepare(
    `SELECT d.id, d.client_id, d.title, d.created_at,
       (SELECT COUNT(*) FROM disc_doc_questions q JOIN disc_doc_sections s ON q.doc_section_id = s.id WHERE s.doc_id = d.id) AS total,
       (SELECT COUNT(*) FROM disc_answers a JOIN disc_doc_questions q2 ON a.doc_question_id = q2.id
          JOIN disc_doc_sections s2 ON q2.doc_section_id = s2.id WHERE s2.doc_id = d.id AND a.answered = 1) AS answered
     FROM disc_docs d ORDER BY d.created_at DESC`,
  ).all()).results || [];
  const byClient = {};
  for (const d of docs) (byClient[d.client_id] = byClient[d.client_id] || []).push(d);
  return jsonResponse({
    ok: true,
    clients: clients.map((c) => ({ ...c, docs: byClient[c.id] || [] })),
  });
}

export async function discoveryTemplates(env) {
  const db = env.PORTAL_DB;
  await ensureSchemaAndSeed(db);
  const templates = (await db.prepare('SELECT id, name, description FROM disc_templates ORDER BY name').all()).results || [];
  return jsonResponse({ ok: true, templates });
}

export async function discoveryCreateClient(request, env) {
  const db = env.PORTAL_DB;
  await ensureSchemaAndSeed(db);
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return errorResponse('Müşteri adı zorunlu', 400);
  const r = await db.prepare('INSERT INTO disc_clients (name, contact, notes) VALUES (?, ?, ?)')
    .bind(name, String(body.contact || '').trim() || null, String(body.notes || '').trim() || null).run();
  return jsonResponse({ ok: true, client_id: r.meta.last_row_id });
}

export async function discoveryUpdateClient(request, env) {
  const db = env.PORTAL_DB;
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!id) return errorResponse('id zorunlu', 400);
  if (typeof body.archived === 'number' || typeof body.archived === 'boolean') {
    await db.prepare('UPDATE disc_clients SET archived = ? WHERE id = ?').bind(body.archived ? 1 : 0, id).run();
  }
  return jsonResponse({ ok: true });
}

export async function discoveryCreateDoc(request, env) {
  const db = env.PORTAL_DB;
  await ensureSchemaAndSeed(db);
  const body = await request.json().catch(() => ({}));
  const clientId = Number(body.client_id);
  const templateId = Number(body.template_id);
  if (!clientId || !templateId) return errorResponse('client_id ve template_id zorunlu', 400);
  const client = await db.prepare('SELECT id FROM disc_clients WHERE id = ?').bind(clientId).first();
  if (!client) return errorResponse('Müşteri bulunamadı', 404);
  const tpl = await db.prepare('SELECT id, name FROM disc_templates WHERE id = ?').bind(templateId).first();
  if (!tpl) return errorResponse('Şablon bulunamadı', 404);
  const title = String(body.title || '').trim() || tpl.name;
  const docId = await instantiateDoc(db, clientId, templateId, title);
  return jsonResponse({ ok: true, doc_id: docId });
}

export async function discoveryDocDetail(env, url) {
  const db = env.PORTAL_DB;
  await ensureSchemaAndSeed(db);
  const id = Number(url.searchParams.get('id'));
  if (!id) return errorResponse('id zorunlu', 400);
  const data = await loadDocDetail(db, id);
  if (!data) return errorResponse('Doküman bulunamadı', 404);
  return jsonResponse({ ok: true, ...data });
}

// Doküman + bölümler + sorular + cevaplar. Yoksa null. Admin ve müşteri
// (discovery-klant.js) aynı okuyucuyu kullanır.
export async function loadDocDetail(db, id) {
  const doc = await db.prepare(
    'SELECT d.*, c.name AS client_name FROM disc_docs d JOIN disc_clients c ON c.id = d.client_id WHERE d.id = ?',
  ).bind(id).first();
  if (!doc) return null;
  const sections = (await db.prepare('SELECT * FROM disc_doc_sections WHERE doc_id = ? ORDER BY sort').bind(id).all()).results || [];
  const questions = (await db.prepare(
    `SELECT q.*, a.value AS answer_value, a.answered, a.updated_at AS answer_updated_at
     FROM disc_doc_questions q
     JOIN disc_doc_sections s ON s.id = q.doc_section_id
     LEFT JOIN disc_answers a ON a.doc_question_id = q.id
     WHERE s.doc_id = ? ORDER BY q.doc_section_id, q.sort`,
  ).bind(id).all()).results || [];
  const bySection = {};
  for (const q of questions) {
    (bySection[q.doc_section_id] = bySection[q.doc_section_id] || []).push({
      id: q.id,
      sort: q.sort,
      type: q.type,
      label: q.label,
      sub_items: JSON.parse(q.sub_items || '[]'),
      guidance: q.guidance || '',
      config: q.config ? JSON.parse(q.config) : null,
      value: q.answer_value != null ? JSON.parse(q.answer_value) : null,
      answered: q.answered || 0,
      updated_at: q.answer_updated_at || null,
    });
  }
  return {
    doc: { id: doc.id, title: doc.title, client_id: doc.client_id, client_name: doc.client_name, created_at: doc.created_at },
    sections: sections.map((s) => ({ id: s.id, title: s.title, guidance: s.guidance || '', questions: bySection[s.id] || [] })),
  };
}

// Tek cevabı kaydeder. Çakışma koruması: istemci yüklediği updated_at'i
// (base_updated_at) gönderir; sunucudaki değer farklıysa yazma reddedilir —
// "başka cihazda güncellendi, sayfayı yenile". Websocket/CRDT yok, bu yeter.
export async function discoverySaveAnswer(request, env) {
  const body = await request.json().catch(() => ({}));
  const r = await saveAnswer(env.PORTAL_DB, body);
  if (r.error === 'missing') return errorResponse('question_id zorunlu', 400);
  if (r.error === 'notfound') return errorResponse('Soru bulunamadı', 404);
  if (r.error === 'conflict') return errorResponse('Bu cevap başka bir cihazda güncellendi — sayfayı yenile', 409);
  return jsonResponse({ ok: true, updated_at: r.updated_at, answered: r.answered });
}

// Ortak kayıt çekirdeği. opts.docId verilirse soru O dokümana ait olmalı
// (müşteri erişimi başka dokümana yazamaz). Dönüş: {updated_at, answered}
// ya da {error: 'missing'|'notfound'|'conflict'|'toolarge'}.
export async function saveAnswer(db, body, opts = {}) {
  const qid = Number(body.question_id);
  if (!qid) return { error: 'missing' };
  const q = opts.docId
    ? await db.prepare(
      `SELECT q.id, q.type FROM disc_doc_questions q JOIN disc_doc_sections s ON s.id = q.doc_section_id
       WHERE q.id = ? AND s.doc_id = ?`,
    ).bind(qid, opts.docId).first()
    : await db.prepare('SELECT id, type FROM disc_doc_questions WHERE id = ?').bind(qid).first();
  if (!q) return { error: 'notfound' };
  const value = body.value === undefined ? null : body.value;
  const json = JSON.stringify(value);
  if (opts.maxBytes && json.length > opts.maxBytes) return { error: 'toolarge' };
  const existing = await db.prepare('SELECT updated_at FROM disc_answers WHERE doc_question_id = ?').bind(qid).first();
  const base = body.base_updated_at || null;
  if (existing && existing.updated_at !== base) return { error: 'conflict' };
  const answered = computeAnswered(q.type, value);
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO disc_answers (doc_question_id, value, answered, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(doc_question_id) DO UPDATE SET value = excluded.value, answered = excluded.answered, updated_at = excluded.updated_at`,
  ).bind(qid, json, answered, now).run();
  return { updated_at: now, answered };
}

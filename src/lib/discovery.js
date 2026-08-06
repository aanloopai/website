// Discovery Hub — müşteri keşif/intake görüşmeleri (/api/admin/discovery/*).
// Şablon = blueprint, doküman = snapshot: şablon müşteriye atanırken tüm yapısı
// dokümana KOPYALANIR; şablonu sonradan düzenlemek mevcut dokümanları bozmaz.
// Şema + seed idempotent olarak ilk çağrıda kurulur (migrations/0018 kanonik).
// Güvenlik: bu araç asla müşteri şifresi saklamaz — erişim tablosu davet/yetki
// takibi içindir.
import { jsonResponse, errorResponse } from './google-auth.js';
import { SEED_TEMPLATE, SEED_CLIENTS } from './discovery-seed.js';

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
];

let schemaReady = false;

async function ensureSchemaAndSeed(db) {
  if (!schemaReady) {
    await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
    schemaReady = true;
  }
  const tpl = await db.prepare('SELECT COUNT(*) AS n FROM disc_templates').first();
  if (!tpl.n) await seedTemplate(db);
  const cl = await db.prepare('SELECT COUNT(*) AS n FROM disc_clients').first();
  if (!cl.n) await seedClients(db);
}

async function seedTemplate(db) {
  const t = await db.prepare('INSERT INTO disc_templates (name, description) VALUES (?, ?)')
    .bind(SEED_TEMPLATE.name, SEED_TEMPLATE.description).run();
  const templateId = t.meta.last_row_id;
  for (let si = 0; si < SEED_TEMPLATE.sections.length; si++) {
    const sec = SEED_TEMPLATE.sections[si];
    const s = await db.prepare('INSERT INTO disc_template_sections (template_id, title, guidance, sort) VALUES (?, ?, ?, ?)')
      .bind(templateId, sec.title, sec.guidance || '', si).run();
    const sectionId = s.meta.last_row_id;
    const stmts = sec.questions.map((q, qi) =>
      db.prepare('INSERT INTO disc_template_questions (section_id, sort, type, label, sub_items, guidance, config) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(sectionId, qi, q.type, q.label, JSON.stringify(q.sub_items || []), q.guidance || '', q.config ? JSON.stringify(q.config) : null));
    if (stmts.length) await db.batch(stmts);
  }
  return templateId;
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
function computeAnswered(type, value) {
  if (value == null) return 0;
  if (type === 'text' || type === 'textarea') return String(value).trim() ? 1 : 0;
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
  const doc = await db.prepare(
    'SELECT d.*, c.name AS client_name FROM disc_docs d JOIN disc_clients c ON c.id = d.client_id WHERE d.id = ?',
  ).bind(id).first();
  if (!doc) return errorResponse('Doküman bulunamadı', 404);
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
  return jsonResponse({
    ok: true,
    doc: { id: doc.id, title: doc.title, client_id: doc.client_id, client_name: doc.client_name, created_at: doc.created_at },
    sections: sections.map((s) => ({ id: s.id, title: s.title, guidance: s.guidance || '', questions: bySection[s.id] || [] })),
  });
}

// Tek cevabı kaydeder. Çakışma koruması: istemci yüklediği updated_at'i
// (base_updated_at) gönderir; sunucudaki değer farklıysa yazma reddedilir —
// "başka cihazda güncellendi, sayfayı yenile". Websocket/CRDT yok, bu yeter.
export async function discoverySaveAnswer(request, env) {
  const db = env.PORTAL_DB;
  const body = await request.json().catch(() => ({}));
  const qid = Number(body.question_id);
  if (!qid) return errorResponse('question_id zorunlu', 400);
  const q = await db.prepare('SELECT id, type FROM disc_doc_questions WHERE id = ?').bind(qid).first();
  if (!q) return errorResponse('Soru bulunamadı', 404);
  const existing = await db.prepare('SELECT updated_at FROM disc_answers WHERE doc_question_id = ?').bind(qid).first();
  const base = body.base_updated_at || null;
  if (existing && existing.updated_at !== base) {
    return errorResponse('Bu cevap başka bir cihazda güncellendi — sayfayı yenile', 409);
  }
  const value = body.value === undefined ? null : body.value;
  const answered = computeAnswered(q.type, value);
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO disc_answers (doc_question_id, value, answered, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(doc_question_id) DO UPDATE SET value = excluded.value, answered = excluded.answered, updated_at = excluded.updated_at`,
  ).bind(qid, JSON.stringify(value), answered, now).run();
  return jsonResponse({ ok: true, updated_at: now, answered });
}

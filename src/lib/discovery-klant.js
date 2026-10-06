// Discovery Hub — müşteri girişi: müşteri (ör. Ron) kendi dokümanını kendisi
// doldurur, YALNIZ o dokümanı görür.
//
// Akış: admin dokümanda "Klant-toegang" → kişisel link üretilir
//   https://aanloopai.nl/portal/vragenlijst/#t=<token>
// Token URL fragment'inde: sunucu log'una / Referer'a girmez. Sayfa token'ı
// POST /api/discovery-klant/login ile HttpOnly cookie'ye çevirir ve
// fragment'i siler. Link tekrar kullanılabilir (= Ron'un girişi); admin
// "Nieuwe link" ile döndürür (eski link ölür) ya da "Intrekken" ile kapatır.
//
// Güvenlik: token D1'de yalnız SHA-256 hash olarak; cookie HMAC-imzalı
// (PORTAL_SESSION_SECRET), her istekte erişim satırı revoked mı diye bakılır;
// cevap kaydı yalnız erişimin bağlı olduğu dokümanın sorularına yazar.
import { jsonResponse, errorResponse } from './google-auth.js';
import {
  sha256Hex, randomToken, createSession, verifySession, readCookie,
} from './auth.js';
import { rateLimit } from './rate-limit.js';
import { ensureSchemaAndSeed, loadDocDetail, saveAnswer } from './discovery.js';

export const KLANT_COOKIE = 'aanloop_vragenlijst';
const SITE_ORIGIN = 'https://aanloopai.nl';
export const KLANT_PAGE_PATH = '/portal/vragenlijst/';
const MAX_ANSWER_BYTES = 20000;

const ACCESS_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS disc_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT, doc_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TEXT, last_seen_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_disc_access_doc ON disc_access(doc_id)`,
];

let accessReady = false;
async function ensureAccessSchema(db) {
  if (accessReady) return;
  await db.batch(ACCESS_SCHEMA.map((sql) => db.prepare(sql)));
  accessReady = true;
}

// Cookie: auth.js oturum biçimi; uid = 'disc:<access id>' — portal
// kullanıcı id'leriyle ('usr_…') çakışmaz, ayrı cookie adıyla da ayrışır.
function klantCookie(token) {
  return `${KLANT_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`;
}
function clearKlantCookie() {
  return `${KLANT_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function withCookie(response, cookie) {
  response.headers.append('Set-Cookie', cookie);
  return response;
}

// Geçerli erişim satırı {id, doc_id} ya da null.
export async function getKlantAccess(request, env) {
  if (!env.PORTAL_SESSION_SECRET || !env.PORTAL_DB) return null;
  const session = await verifySession(readCookie(request, KLANT_COOKIE), env.PORTAL_SESSION_SECRET);
  if (!session || typeof session.uid !== 'string' || !session.uid.startsWith('disc:')) return null;
  const aid = Number(session.uid.slice(5));
  if (!aid) return null;
  await ensureAccessSchema(env.PORTAL_DB);
  return env.PORTAL_DB
    .prepare('SELECT id, doc_id FROM disc_access WHERE id = ? AND revoked_at IS NULL')
    .bind(aid).first();
}

// ── müşteri API (/api/discovery-klant/*) ────────────────────────────────────

export async function handleKlantApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (method !== 'GET') {
    const origin = request.headers.get('Origin');
    if (origin && origin !== SITE_ORIGIN) return errorResponse('Verboden (origin)', 403);
  }
  if (!env.PORTAL_DB || !env.PORTAL_SESSION_SECRET) return errorResponse('Niet beschikbaar', 503);
  try {
    if (path === '/api/discovery-klant/login' && method === 'POST') return await klantLogin(request, env);
    if (path === '/api/discovery-klant/logout' && method === 'POST') {
      return withCookie(jsonResponse({ ok: true }), clearKlantCookie());
    }
    const access = await getKlantAccess(request, env);
    if (!access) return errorResponse('Niet ingelogd', 401);
    if (path === '/api/discovery-klant/doc' && method === 'GET') return await klantDoc(env, access);
    if (path === '/api/discovery-klant/answer' && method === 'POST') return await klantAnswer(request, env, access);
    return errorResponse('Niet gevonden', 404);
  } catch (err) {
    console.error('discovery-klant error', err);
    return errorResponse('Er ging iets mis', 500);
  }
}

async function klantLogin(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rl = await rateLimit(env.GOOGLE_TOKENS, `rl:disc-login:${ip}`, 20, 900);
  if (!rl.allowed) return errorResponse('Te veel pogingen — probeer het over een kwartier opnieuw', 429);
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || '');
  if (!/^[0-9a-f]{64}$/.test(token)) return errorResponse('Deze link is ongeldig', 401);
  const db = env.PORTAL_DB;
  await ensureAccessSchema(db);
  const row = await db.prepare('SELECT id FROM disc_access WHERE token_hash = ? AND revoked_at IS NULL')
    .bind(await sha256Hex(token)).first();
  if (!row) return errorResponse('Deze link is ongeldig of verlopen — vraag een nieuwe aan', 401);
  await db.prepare('UPDATE disc_access SET last_seen_at = ? WHERE id = ?').bind(new Date().toISOString(), row.id).run();
  const session = await createSession(`disc:${row.id}`, env.PORTAL_SESSION_SECRET);
  return withCookie(jsonResponse({ ok: true }), klantCookie(session));
}

async function klantDoc(env, access) {
  const db = env.PORTAL_DB;
  await ensureSchemaAndSeed(db);
  const data = await loadDocDetail(db, access.doc_id);
  if (!data) return errorResponse('Document niet gevonden', 404);
  // Müşteriye yalnız gerekeni ver: client_id / iç alanlar yok.
  return jsonResponse({
    ok: true,
    doc: { id: data.doc.id, title: data.doc.title },
    sections: data.sections.map((s) => ({
      id: s.id, title: s.title, guidance: s.guidance,
      questions: s.questions.map((q) => ({
        id: q.id, type: q.type, label: q.label, sub_items: q.sub_items, guidance: q.guidance,
        value: q.value, answered: q.answered, updated_at: q.updated_at,
      })),
    })),
  });
}

async function klantAnswer(request, env, access) {
  const body = await request.json().catch(() => ({}));
  const r = await saveAnswer(env.PORTAL_DB, body, { docId: access.doc_id, maxBytes: MAX_ANSWER_BYTES });
  if (r.error === 'missing') return errorResponse('question_id ontbreekt', 400);
  if (r.error === 'notfound') return errorResponse('Vraag niet gevonden', 404);
  if (r.error === 'toolarge') return errorResponse('Antwoord is te lang', 413);
  if (r.error === 'conflict') return errorResponse('Dit antwoord is ergens anders gewijzigd — ververs de pagina', 409);
  await env.PORTAL_DB.prepare('UPDATE disc_access SET last_seen_at = ? WHERE id = ?')
    .bind(r.updated_at, access.id).run();
  return jsonResponse({ ok: true, updated_at: r.updated_at, answered: r.answered });
}

// ── admin (/api/admin/discovery/access) — staff-oturumu admin-routes'ta ────

export async function discoveryAccess(request, env, url) {
  const db = env.PORTAL_DB;
  await ensureAccessSchema(db);
  const method = request.method;
  if (method === 'GET') {
    const docId = Number(url.searchParams.get('doc_id'));
    if (!docId) return errorResponse('doc_id zorunlu', 400);
    const row = await db.prepare(
      'SELECT id, created_at, last_seen_at FROM disc_access WHERE doc_id = ? AND revoked_at IS NULL ORDER BY id DESC LIMIT 1',
    ).bind(docId).first();
    return jsonResponse({ ok: true, active: row || null });
  }
  const body = await request.json().catch(() => ({}));
  const docId = Number(body.doc_id);
  if (!docId) return errorResponse('doc_id zorunlu', 400);
  const doc = await db.prepare('SELECT id FROM disc_docs WHERE id = ?').bind(docId).first();
  if (!doc) return errorResponse('Doküman bulunamadı', 404);
  const now = new Date().toISOString();
  // Her iki eylem de önceki linkleri kapatır: doküman başına tek aktif link.
  await db.prepare('UPDATE disc_access SET revoked_at = ? WHERE doc_id = ? AND revoked_at IS NULL').bind(now, docId).run();
  if (method === 'DELETE') return jsonResponse({ ok: true, revoked: true });
  if (method !== 'POST') return errorResponse('Method not allowed', 405);
  const token = randomToken();
  await db.prepare('INSERT INTO disc_access (doc_id, token_hash, created_at) VALUES (?, ?, ?)')
    .bind(docId, await sha256Hex(token), now).run();
  // Ham token yalnız bu cevapta döner; D1'de saklanmaz.
  return jsonResponse({ ok: true, url: `${SITE_ORIGIN}${KLANT_PAGE_PATH}#t=${token}` });
}

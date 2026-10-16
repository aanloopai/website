// Discovery Hub — müşteri girişi: müşteri (ör. Ron) KENDİ dokümanını kendisi
// doldurur ve YALNIZ onu görür. Görüşme ile müşteri cevapları tek potada:
// müşteri aynı R-sorularına (field tipi) yazar, admin aynı dokümanda görür.
//
// İki giriş yolu (ikisi de admin dokümanında "Müşteri girişi"nden yönetilir):
//   kind='login' : kullanıcı adı + şifre → /portal/vragenlijst/ formu.
//                  Şifre PBKDF2-SHA256 hash olarak D1'de; koda/git'e GİRMEZ
//                  (repo public).
//   kind='link'  : kişisel link /portal/vragenlijst/#t=<token> (token yalnız
//                  SHA-256 hash olarak; fragment sunucu log'una girmez).
// Her ikisi de HMAC-imzalı HttpOnly cookie üretir; her istekte erişim satırı
// revoked mı diye bakılır. Müşteri yalnız field sorularını görür/yazar;
// intern alanlar (TR etiket, not, durum, kaynak, sabit iç bloklar) ASLA dönmez.
import { jsonResponse, errorResponse } from './google-auth.js';
import {
  sha256Hex, randomToken, createSession, verifySession, readCookie,
} from './auth.js';
import { rateLimit } from './rate-limit.js';
import { ensureSchemaAndSeed, loadDocDetail, saveAnswer } from './discovery.js';
import { fieldHasValue } from './discovery-fields.js';

export const KLANT_COOKIE = 'aanloop_vragenlijst';
const SITE_ORIGIN = 'https://aanloopai.nl';
export const KLANT_PAGE_PATH = '/portal/vragenlijst/';
const MAX_ANSWER_BYTES = 20000;
const PBKDF2_ITER = 100000; // Workers WebCrypto üst sınırı
const USERNAME_RE = /^[a-z0-9._-]{3,40}$/;
const PW_MIN = 8;
const PW_MAX = 200;

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (h) => Uint8Array.from((h.match(/.{2}/g) || []).map((x) => parseInt(x, 16)));

async function pbkdf2(password, salt, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITER}$${hex(salt)}$${await pbkdf2(password, salt, PBKDF2_ITER)}`;
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iter = parseInt(parts[1], 10);
  if (!iter || iter > PBKDF2_ITER) return false;
  return safeEqual(await pbkdf2(password, unhex(parts[2]), iter), parts[3]);
}

// Bilinmeyen kullanıcı adında da aynı maliyette PBKDF2 koşar (zamanlama ile
// kullanıcı adı tahmini olmasın).
const DUMMY_HASH = `pbkdf2$${PBKDF2_ITER}$00000000000000000000000000000000$${'0'.repeat(64)}`;

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

// Geçerli erişim satırı {id, doc_id} ya da null. Cookie uid = 'disc:<id>'
// — portal kullanıcı id'leriyle ('usr_…') çakışmaz.
export async function getKlantAccess(request, env) {
  if (!env.PORTAL_SESSION_SECRET || !env.PORTAL_DB) return null;
  const session = await verifySession(readCookie(request, KLANT_COOKIE), env.PORTAL_SESSION_SECRET);
  if (!session || typeof session.uid !== 'string' || !session.uid.startsWith('disc:')) return null;
  const aid = Number(session.uid.slice(5));
  if (!aid) return null;
  await ensureSchemaAndSeed(env.PORTAL_DB);
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
  const db = env.PORTAL_DB;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rl = await rateLimit(env.GOOGLE_TOKENS, `rl:disc-login:${ip}`, 20, 900);
  if (!rl.allowed) return errorResponse('Te veel pogingen — probeer het over een kwartier opnieuw', 429);
  const body = await request.json().catch(() => ({}));
  await ensureSchemaAndSeed(db);

  let row = null;
  if (body.token !== undefined) {
    const token = String(body.token || '');
    if (!/^[0-9a-f]{64}$/.test(token)) return errorResponse('Deze link is ongeldig', 401);
    row = await db.prepare("SELECT id FROM disc_access WHERE token_hash = ? AND kind = 'link' AND revoked_at IS NULL")
      .bind(await sha256Hex(token)).first();
    if (!row) return errorResponse('Deze link is ongeldig of verlopen — vraag een nieuwe aan', 401);
  } else {
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    const userRl = await rateLimit(env.GOOGLE_TOKENS, `rl:disc-login-user:${username}`, 10, 900);
    if (!userRl.allowed) return errorResponse('Te veel pogingen — probeer het over een kwartier opnieuw', 429);
    const cand = USERNAME_RE.test(username) && password.length <= PW_MAX
      ? await db.prepare("SELECT id, pw_hash FROM disc_access WHERE kind = 'login' AND username = ? AND revoked_at IS NULL ORDER BY id DESC LIMIT 1")
        .bind(username).first()
      : null;
    const ok = await verifyPassword(password, cand ? cand.pw_hash : DUMMY_HASH);
    if (!cand || !ok) return errorResponse('Gebruikersnaam of wachtwoord klopt niet', 401);
    row = cand;
  }
  await db.prepare('UPDATE disc_access SET last_seen_at = ? WHERE id = ?').bind(new Date().toISOString(), row.id).run();
  const session = await createSession(`disc:${row.id}`, env.PORTAL_SESSION_SECRET);
  return withCookie(jsonResponse({ ok: true }), klantCookie(session));
}

// Görüşmeciye yönelik parantez notları müşteriye gösterilmez:
// "10. Ontwerptool (fase 2: …)" → "10. Ontwerptool"; "(M: …)" etiketten silinir.
export function klantTitle(title) {
  return String(title || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
}
export function klantLabel(label) {
  return String(label || '').replace(/\s*\(M:[^)]*\)/g, '').trim();
}

async function klantDoc(env, access) {
  const db = env.PORTAL_DB;
  const data = await loadDocDetail(db, access.doc_id);
  if (!data) return errorResponse('Document niet gevonden', 404);
  const sections = data.sections
    .map((s) => ({ s, qs: s.questions.filter((q) => q.type === 'field') }))
    .filter(({ qs }) => qs.length)
    .map(({ s, qs }) => ({
      id: s.id,
      title: klantTitle(s.title),
      questions: qs.map((q) => {
        const c = q.config || {};
        const v = q.value && typeof q.value === 'object' ? q.value : {};
        return {
          id: q.id,
          label: klantLabel(q.label),
          answer_type: c.answer_type || 'tekst',
          choices: c.choices || [],
          value: { v: v.v === undefined ? null : v.v, t: v.t || '' },
          updated_at: q.updated_at,
        };
      }),
    }));
  return jsonResponse({ ok: true, doc: { id: data.doc.id, title: data.doc.title }, sections });
}

// Müşteri yalnız {v, t} gönderir; intern not/kaynak korunur, durum cevaba göre.
export function mergeKlantValue(existing, incoming) {
  const base = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {};
  const inc = incoming && typeof incoming === 'object' ? incoming : {};
  const next = { ...base, v: inc.v === undefined ? null : inc.v, t: typeof inc.t === 'string' ? inc.t : '' };
  if (fieldHasValue(next)) {
    next.status = 'beantwoord';
    if (!base.bron) next.bron = 'klant';
  } else if (base.status === 'beantwoord') {
    delete next.status;
  }
  return next;
}

async function klantAnswer(request, env, access) {
  const db = env.PORTAL_DB;
  const body = await request.json().catch(() => ({}));
  const qid = Number(body.question_id);
  if (!qid) return errorResponse('question_id ontbreekt', 400);
  const q = await db.prepare(
    `SELECT q.id, q.type, a.value AS value FROM disc_doc_questions q
     JOIN disc_doc_sections s ON s.id = q.doc_section_id
     LEFT JOIN disc_answers a ON a.doc_question_id = q.id
     WHERE q.id = ? AND s.doc_id = ? AND q.type = 'field'`,
  ).bind(qid, access.doc_id).first();
  if (!q) return errorResponse('Vraag niet gevonden', 404);
  let existing = null;
  try { existing = q.value != null ? JSON.parse(q.value) : null; } catch { existing = null; }
  const value = mergeKlantValue(existing, body.value);
  const r = await saveAnswer(db, { question_id: qid, value, base_updated_at: body.base_updated_at },
    { docId: access.doc_id, maxBytes: MAX_ANSWER_BYTES });
  if (r.error === 'toolarge') return errorResponse('Antwoord is te lang', 413);
  if (r.error === 'conflict') return errorResponse('Dit antwoord is ergens anders gewijzigd — ververs de pagina', 409);
  if (r.error) return errorResponse('Vraag niet gevonden', 404);
  await db.prepare('UPDATE disc_access SET last_seen_at = ? WHERE id = ?').bind(r.updated_at, access.id).run();
  return jsonResponse({ ok: true, updated_at: r.updated_at, answered: r.answered });
}

// ── admin (/api/admin/discovery/access) — staff-oturumu admin-routes'ta ────
//   GET    ?doc_id            → {link, login} aktif satırlar (şifre/hash dönmez)
//   POST   {doc_id}           → yeni link (eski link + oturumları ölür)
//   POST   {doc_id, username, password} → giriş bilgisi ayarla/değiştir
//   DELETE {doc_id, kind?}    → kapat (kind yoksa hepsi)

export async function discoveryAccess(request, env, url) {
  const db = env.PORTAL_DB;
  await ensureSchemaAndSeed(db);
  const method = request.method;
  if (method === 'GET') {
    const docId = Number(url.searchParams.get('doc_id'));
    if (!docId) return errorResponse('doc_id zorunlu', 400);
    const active = (kind) => db.prepare(
      'SELECT id, username, created_at, last_seen_at FROM disc_access WHERE doc_id = ? AND kind = ? AND revoked_at IS NULL ORDER BY id DESC LIMIT 1',
    ).bind(docId, kind).first();
    return jsonResponse({ ok: true, link: await active('link'), login: await active('login') });
  }
  const body = await request.json().catch(() => ({}));
  const docId = Number(body.doc_id);
  if (!docId) return errorResponse('doc_id zorunlu', 400);
  const doc = await db.prepare('SELECT id FROM disc_docs WHERE id = ?').bind(docId).first();
  if (!doc) return errorResponse('Doküman bulunamadı', 404);
  const now = new Date().toISOString();
  const revoke = (kind) => (kind
    ? db.prepare('UPDATE disc_access SET revoked_at = ? WHERE doc_id = ? AND kind = ? AND revoked_at IS NULL').bind(now, docId, kind).run()
    : db.prepare('UPDATE disc_access SET revoked_at = ? WHERE doc_id = ? AND revoked_at IS NULL').bind(now, docId).run());

  if (method === 'DELETE') {
    const kind = body.kind === 'link' || body.kind === 'login' ? body.kind : null;
    await revoke(kind);
    return jsonResponse({ ok: true, revoked: kind || 'all' });
  }
  if (method !== 'POST') return errorResponse('Method not allowed', 405);

  if (body.username !== undefined || body.password !== undefined) {
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!USERNAME_RE.test(username)) return errorResponse('Kullanıcı adı: 3–40 karakter, a-z 0-9 . _ -', 400);
    if (password.length < PW_MIN || password.length > PW_MAX) return errorResponse(`Şifre en az ${PW_MIN} karakter`, 400);
    const taken = await db.prepare(
      "SELECT doc_id FROM disc_access WHERE kind = 'login' AND username = ? AND revoked_at IS NULL AND doc_id != ?",
    ).bind(username, docId).first();
    if (taken) return errorResponse('Bu kullanıcı adı başka bir dokümanda kullanılıyor', 409);
    await revoke('login');
    await db.prepare(
      "INSERT INTO disc_access (doc_id, token_hash, created_at, kind, username, pw_hash) VALUES (?, ?, ?, 'login', ?, ?)",
    ).bind(docId, await sha256Hex(randomToken()), now, username, await hashPassword(password)).run();
    return jsonResponse({ ok: true, username, login_url: `${SITE_ORIGIN}${KLANT_PAGE_PATH}` });
  }

  await revoke('link');
  const token = randomToken();
  await db.prepare("INSERT INTO disc_access (doc_id, token_hash, created_at, kind) VALUES (?, ?, ?, 'link')")
    .bind(docId, await sha256Hex(token), now).run();
  // Ham token yalnız bu cevapta döner; D1'de saklanmaz.
  return jsonResponse({ ok: true, url: `${SITE_ORIGIN}${KLANT_PAGE_PATH}#t=${token}` });
}

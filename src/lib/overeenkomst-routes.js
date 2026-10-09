// Klantenportaal — overeenkomst-API voor klanten (/api/portal/overeenkomst*).
// Wired into handlePortalApi (portal-routes.js) after the session gate; `user`
// is the session row { id, customer_id, email, naam, role }. Every query is
// scoped by user.customer_id.
import { jsonResponse, errorResponse } from './google-auth.js';
import { randomId, sha256Hex } from './auth.js';
import { rateLimit } from './rate-limit.js';
import { notifyTelegram } from './notify.js';
import { sendMail } from './portal-routes.js';
import { escapeHtml } from './escape.js';
import { renderHtml } from './markdown-lite.js';
import {
  TEMPLATE_SLUGS, CONSENT_LABELS, AUTHORIZED_LABEL, renderTemplate, buildVars,
  minReadSeconds, computeEvidenceSha256, formatAmsterdam, writeAudit, ensurePortaalSchema,
} from './overeenkomst-core.js';
import { buildAgreementPdf } from './agreement-pdf.js';

const STAFF_MAIL = 'm.dogan@aanloopai.nl';
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_VERIFIED_VALID_MS = 30 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const MAX_SIGNATURE_BYTES = 300 * 1024;
const OPEN_STATUSES = ['sent', 'in_progress'];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// ── helpers ────────────────────────────────────────────────────────────────
function canWrite(role) { return role === 'eigenaar' || role === 'bewerker'; }
function readOnly() { return errorResponse('Alleen-lezen account', 403); }
function clientIp(request) { return request.headers.get('CF-Connecting-IP') || null; }
function clientUa(request) { return (request.headers.get('User-Agent') || '').slice(0, 300) || null; }
async function readJson(request) {
  try { const b = await request.json(); return b && typeof b === 'object' ? b : null; } catch { return null; }
}
function str(v, max = 200) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }

export function normalizeKvk(raw) { return String(raw ?? '').replace(/\s+/g, ''); }
export function normalizeBtw(raw) { return String(raw ?? '').replace(/[\s.]+/g, '').toUpperCase(); }
export function validKvk(v) { return /^\d{8}$/.test(v); }
export function validBtw(v) { return /^NL\d{9}B\d{2}$/.test(v); }
function bedrijfCompleet(c) {
  return !!c && validKvk(normalizeKvk(c.kvk)) && validBtw(normalizeBtw(c.btw_id));
}

function bytesToBase64(bytes) {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}
function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function sha256Bytes(bytes) {
  const d = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function safeFileId(id) { return String(id).replace(/[^A-Za-z0-9_-]/g, '_'); }

async function loadCustomer(env, customerId) {
  return env.PORTAL_DB
    .prepare('SELECT id, bedrijf, kvk, btw_id, adres, postcode, stad, telefoon FROM customers WHERE id = ?')
    .bind(customerId).first();
}

// Agreement visible to the customer: own, not draft/cancelled.
async function loadAgreement(env, user, id) {
  if (!id) return null;
  const a = await env.PORTAL_DB
    .prepare('SELECT * FROM agreements WHERE id = ? AND customer_id = ?')
    .bind(id, user.customer_id).first();
  if (!a || a.status === 'draft' || a.status === 'cancelled') return null;
  return a;
}

async function loadDocuments(env, agreementId) {
  const res = await env.PORTAL_DB
    .prepare('SELECT * FROM agreement_documents WHERE agreement_id = ? ORDER BY order_index')
    .bind(agreementId).all();
  return res.results || [];
}

// Latest non-superseded consent per document (any user of the customer).
async function loadActiveConsents(env, agreementId) {
  const res = await env.PORTAL_DB
    .prepare(`SELECT c.* FROM agr_consents c JOIN agreement_documents d ON d.id = c.agreement_document_id
              WHERE d.agreement_id = ? AND c.superseded = 0 ORDER BY c.created_at, c.id`)
    .bind(agreementId).all();
  const byDoc = new Map();
  for (const c of res.results || []) byDoc.set(c.agreement_document_id, c);
  return byDoc;
}

async function consentEverCount(env, agreementId) {
  const row = await env.PORTAL_DB
    .prepare(`SELECT COUNT(*) AS n FROM agr_consents c JOIN agreement_documents d ON d.id = c.agreement_document_id
              WHERE d.agreement_id = ?`)
    .bind(agreementId).first();
  return Number(row?.n || 0);
}

async function otpVerifiedAt(env, agreementId, userId) {
  const row = await env.PORTAL_DB
    .prepare(`SELECT verified_at FROM agr_otp WHERE agreement_id = ? AND user_id = ? AND verified_at IS NOT NULL
              ORDER BY verified_at DESC LIMIT 1`)
    .bind(agreementId, userId).first();
  if (!row || Date.now() - row.verified_at > OTP_VERIFIED_VALID_MS) return null;
  return row.verified_at;
}

function varsFor(agreement, customer) {
  return buildVars(agreement, customer);
}

// Rule 8: re-render the (still unfrozen) documents from their template.
async function rerenderDocuments(env, agreement, customer, docs) {
  const vars = varsFor(agreement, customer);
  const out = [];
  for (const d of docs) {
    const tpl = await env.PORTAL_DB
      .prepare('SELECT body_markdown FROM agr_templates WHERE id = ?').bind(d.template_id).first();
    if (!tpl) { out.push(d); continue; }
    const md = renderTemplate(tpl.body_markdown, vars);
    const sha = await sha256Hex(md);
    if (sha !== d.content_sha256) {
      await env.PORTAL_DB
        .prepare('UPDATE agreement_documents SET rendered_markdown = ?, content_sha256 = ? WHERE id = ?')
        .bind(md, sha, d.id).run();
      out.push({ ...d, rendered_markdown: md, content_sha256: sha });
    } else out.push(d);
  }
  return out;
}

// ── dispatcher ─────────────────────────────────────────────────────────────
export async function handleOvereenkomstApi(request, env, user, url) {
  if (env.PORTAL_DB) await ensurePortaalSchema(env);
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method;
  const sub = path.slice('/api/portal/overeenkomst'.length); // '' | '/lijst' | ...

  if (!env.PORTAL_DB) return errorResponse('Er ging iets mis', 500);

  if (sub === '' && method === 'GET') return detail(env, user, url);
  if (sub === '/lijst' && method === 'GET') return lijst(env, user);
  if (sub === '/pdf' && method === 'GET') return pdfDownload(env, user, url);

  const mutations = {
    '/bedrijfsgegevens': bedrijfsgegevens,
    '/open': openDocument,
    '/consent': storeConsent,
    '/otp/sturen': otpSturen,
    '/otp/verifieer': otpVerifieer,
    '/ondertekenen': ondertekenen,
  };
  if (mutations[sub] && method === 'POST') return mutations[sub](request, env, user);
  return errorResponse('Niet gevonden', 404);
}

// ── GET /lijst ─────────────────────────────────────────────────────────────
async function lijst(env, user) {
  const res = await env.PORTAL_DB
    .prepare(`SELECT id, title, status, created_at, sent_at, signed_at FROM agreements
              WHERE customer_id = ? AND status != 'draft' ORDER BY created_at DESC`)
    .bind(user.customer_id).all();
  const customer = await loadCustomer(env, user.customer_id);
  return jsonResponse({ ok: true, agreements: res.results || [], bedrijf_compleet: bedrijfCompleet(customer) });
}

// ── GET ?id= ───────────────────────────────────────────────────────────────
async function detail(env, user, url) {
  const agreement = await loadAgreement(env, user, url.searchParams.get('id'));
  if (!agreement) return errorResponse('Overeenkomst niet gevonden', 404);
  const customer = await loadCustomer(env, user.customer_id);
  let docs = await loadDocuments(env, agreement.id);
  if (agreement.status !== 'signed' && (await consentEverCount(env, agreement.id)) === 0) {
    docs = await rerenderDocuments(env, agreement, customer, docs);
  }
  const consents = await loadActiveConsents(env, agreement.id);
  const sig = await env.PORTAL_DB
    .prepare('SELECT typed_name, signed_at FROM agr_signatures WHERE agreement_id = ?')
    .bind(agreement.id).first();
  const verified = await otpVerifiedAt(env, agreement.id, user.id);

  return jsonResponse({
    ok: true,
    agreement: {
      id: agreement.id, title: agreement.title, status: agreement.status,
      signed_at: agreement.signed_at || null, has_pdf: !!agreement.pdf_key,
    },
    customer: {
      bedrijf: customer?.bedrijf || '', kvk: customer?.kvk || '', btw_id: customer?.btw_id || '',
      adres: customer?.adres || '', postcode: customer?.postcode || '', stad: customer?.stad || '',
    },
    bedrijf_compleet: bedrijfCompleet(customer),
    documents: docs.map((d) => {
      const c = consents.get(d.id);
      return {
        id: d.id,
        order_index: d.order_index,
        slug: d.template_slug,
        title: d.title,
        version: d.template_version,
        html: renderHtml(d.rendered_markdown),
        sha12: String(d.content_sha256).slice(0, 12),
        min_read_sec: minReadSeconds(d.rendered_markdown),
        consent: c ? { checkbox_at: c.checkbox_at, time_on_document_sec: c.time_on_document_sec } : null,
        label: CONSENT_LABELS[d.template_slug] || '',
      };
    }),
    signature: sig ? { typed_name: sig.typed_name, signed_at: sig.signed_at } : null,
    otp_verified: !!verified,
    authorized_label: AUTHORIZED_LABEL(customer?.bedrijf || ''),
  });
}

// ── POST /bedrijfsgegevens ─────────────────────────────────────────────────
async function bedrijfsgegevens(request, env, user) {
  if (!canWrite(user.role)) return readOnly();
  const body = await readJson(request);
  if (!body) return errorResponse('Ongeldige aanvraag', 400);
  const kvk = normalizeKvk(body.kvk);
  const btw = normalizeBtw(body.btw_id);
  if (!validKvk(kvk)) return errorResponse('Een KvK-nummer bestaat uit 8 cijfers.', 400);
  if (!validBtw(btw)) return errorResponse('Een btw-nummer ziet eruit als NL123456789B01.', 400);
  await env.PORTAL_DB.prepare('UPDATE customers SET kvk = ?, btw_id = ? WHERE id = ?')
    .bind(kvk, btw, user.customer_id).run();
  await writeAudit(env.PORTAL_DB, {
    customer_id: user.customer_id, actor: user.id, action: 'bedrijfsgegevens_aangevuld',
    meta: { kvk, btw_id: btw }, ip: clientIp(request),
  });
  return jsonResponse({ ok: true, kvk, btw_id: btw });
}

// Document that belongs to an open agreement of this customer.
async function loadOwnDocument(env, user, documentId) {
  if (!documentId) return null;
  const row = await env.PORTAL_DB
    .prepare(`SELECT d.*, a.status AS agreement_status, a.customer_id AS agreement_customer_id
              FROM agreement_documents d JOIN agreements a ON a.id = d.agreement_id
              WHERE d.id = ? AND a.customer_id = ?`)
    .bind(documentId, user.customer_id).first();
  if (!row || row.agreement_status === 'draft' || row.agreement_status === 'cancelled') return null;
  return row;
}

// ── POST /open ─────────────────────────────────────────────────────────────
async function openDocument(request, env, user) {
  if (!canWrite(user.role)) return readOnly();
  const body = await readJson(request);
  const doc = await loadOwnDocument(env, user, str(body?.document_id));
  if (!doc) return errorResponse('Document niet gevonden', 404);
  if (!OPEN_STATUSES.includes(doc.agreement_status)) return errorResponse('Overeenkomst is al ondertekend', 409);
  await env.PORTAL_DB
    .prepare('INSERT OR IGNORE INTO agr_doc_opens (agreement_document_id, user_id, opened_at) VALUES (?, ?, ?)')
    .bind(doc.id, user.id, Date.now()).run();
  const row = await env.PORTAL_DB
    .prepare('SELECT opened_at FROM agr_doc_opens WHERE agreement_document_id = ? AND user_id = ?')
    .bind(doc.id, user.id).first();
  return jsonResponse({ ok: true, opened_at: row.opened_at });
}

// ── POST /consent ──────────────────────────────────────────────────────────
async function storeConsent(request, env, user) {
  if (!canWrite(user.role)) return readOnly();
  const body = await readJson(request);
  if (!body) return errorResponse('Ongeldige aanvraag', 400);
  const doc = await loadOwnDocument(env, user, str(body.document_id));
  if (!doc) return errorResponse('Document niet gevonden', 404);
  if (!OPEN_STATUSES.includes(doc.agreement_status)) return errorResponse('Overeenkomst is al ondertekend', 409);

  const opened = await env.PORTAL_DB
    .prepare('SELECT opened_at FROM agr_doc_opens WHERE agreement_document_id = ? AND user_id = ?')
    .bind(doc.id, user.id).first();
  if (!opened) return errorResponse('Document is nog niet geopend', 400);

  const now = Date.now();
  const minSec = minReadSeconds(doc.rendered_markdown);
  const timeSec = Math.floor(Number(body.time_on_document_sec));
  const scrolledAt = Math.floor(Number(body.scrolled_to_end_at));
  const tooEarly = errorResponse('Lees het document volledig voordat je akkoord gaat.', 400);
  if (!Number.isFinite(timeSec) || timeSec < minSec) return tooEarly;
  if (!Number.isFinite(scrolledAt) || scrolledAt <= 0) return tooEarly;
  if (now - opened.opened_at < minSec * 1000) return tooEarly;

  const ip = clientIp(request);
  const prev = await env.PORTAL_DB
    .prepare('SELECT id FROM agr_consents WHERE agreement_document_id = ? AND user_id = ? AND superseded = 0')
    .bind(doc.id, user.id).all();
  if ((prev.results || []).length) {
    await env.PORTAL_DB
      .prepare('UPDATE agr_consents SET superseded = 1 WHERE agreement_document_id = ? AND user_id = ? AND superseded = 0')
      .bind(doc.id, user.id).run();
    await writeAudit(env.PORTAL_DB, {
      customer_id: user.customer_id, actor: user.id, action: 'consent_vervangen',
      meta: { document_id: doc.id, vervangen: prev.results.map((r) => r.id) }, ip,
    });
  }
  const id = randomId('cns');
  await env.PORTAL_DB
    .prepare(`INSERT INTO agr_consents (id, agreement_document_id, user_id, scrolled_to_end_at, time_on_document_sec,
              checkbox_at, ip, user_agent, created_at, superseded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`)
    .bind(id, doc.id, user.id, scrolledAt, timeSec, now, ip, clientUa(request), now).run();
  if (doc.agreement_status === 'sent') {
    await env.PORTAL_DB
      .prepare("UPDATE agreements SET status = 'in_progress' WHERE id = ? AND status = 'sent'")
      .bind(doc.agreement_id).run();
  }
  await writeAudit(env.PORTAL_DB, {
    customer_id: user.customer_id, actor: user.id, action: 'consent',
    meta: { agreement_id: doc.agreement_id, document_id: doc.id, slug: doc.template_slug, sha12: doc.content_sha256.slice(0, 12), time_on_document_sec: timeSec },
    ip,
  });
  return jsonResponse({ ok: true, consent: { checkbox_at: now, time_on_document_sec: timeSec } });
}

// All documents consented + company data complete → may proceed to OTP/sign.
async function signingPrerequisites(env, user, agreement) {
  const docs = await loadDocuments(env, agreement.id);
  const consents = await loadActiveConsents(env, agreement.id);
  if (docs.length < TEMPLATE_SLUGS.length || !docs.every((d) => consents.has(d.id))) {
    return { error: errorResponse('Bevestig eerst alle drie de documenten.', 400) };
  }
  const customer = await loadCustomer(env, user.customer_id);
  if (!bedrijfCompleet(customer)) return { error: errorResponse('Vul eerst je bedrijfsgegevens aan.', 400) };
  return { docs, consents, customer };
}

// ── POST /otp/sturen ───────────────────────────────────────────────────────
async function otpSturen(request, env, user) {
  if (user.role !== 'eigenaar') return errorResponse('Alleen de eigenaar van het account kan ondertekenen', 403);
  const body = await readJson(request);
  const agreement = await loadAgreement(env, user, str(body?.agreement_id));
  if (!agreement) return errorResponse('Overeenkomst niet gevonden', 404);
  if (!OPEN_STATUSES.includes(agreement.status)) return errorResponse('Overeenkomst is al ondertekend', 409);
  const pre = await signingPrerequisites(env, user, agreement);
  if (pre.error) return pre.error;

  const rl = await rateLimit(env.GOOGLE_TOKENS, `portal:rl:otp:${user.id}`, 5, 15 * 60);
  if (!rl.allowed) return errorResponse('Te veel aanvragen. Probeer het over een kwartier opnieuw.', 429);

  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
  const id = randomId('otp');
  const now = Date.now();
  await env.PORTAL_DB
    .prepare('INSERT INTO agr_otp (id, agreement_id, user_id, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)')
    .bind(id, agreement.id, user.id, await sha256Hex(`${id}:${code}`), now + OTP_TTL_MS, now).run();
  try {
    await sendMail(env, user.email, user.naam, 'Je verificatiecode voor Mijn AanloopAI',
      `<p>Je verificatiecode is <strong style="font-size:22px;letter-spacing:3px">${escapeHtml(code)}</strong>.</p>`
      + '<p>Geldig 10 minuten. Deel deze code met niemand.</p>');
  } catch (err) {
    console.error('[overeenkomst] OTP-mail mislukt:', err.message || err);
    return errorResponse('De code kon niet worden verstuurd. Probeer het zo opnieuw.', 502);
  }
  await writeAudit(env.PORTAL_DB, {
    customer_id: user.customer_id, actor: user.id, action: 'otp_verstuurd',
    meta: { agreement_id: agreement.id }, ip: clientIp(request),
  });
  return jsonResponse({ ok: true });
}

// ── POST /otp/verifieer ────────────────────────────────────────────────────
async function otpVerifieer(request, env, user) {
  if (user.role !== 'eigenaar') return errorResponse('Alleen de eigenaar van het account kan ondertekenen', 403);
  const body = await readJson(request);
  const agreement = await loadAgreement(env, user, str(body?.agreement_id));
  if (!agreement) return errorResponse('Overeenkomst niet gevonden', 404);
  const code = str(body?.code, 12);
  if (!/^\d{6}$/.test(code)) return errorResponse('Voer de code van 6 cijfers in.', 400);

  const row = await env.PORTAL_DB
    .prepare(`SELECT * FROM agr_otp WHERE agreement_id = ? AND user_id = ? AND expires_at > ?
              ORDER BY created_at DESC, id DESC LIMIT 1`)
    .bind(agreement.id, user.id, Date.now()).first();
  if (!row) return errorResponse('Geen geldige code. Vraag een nieuwe code aan.', 400);
  if (row.verified_at) return jsonResponse({ ok: true, verified: true });
  if (row.attempts >= OTP_MAX_ATTEMPTS) return errorResponse('Te veel pogingen. Vraag een nieuwe code aan.', 429);

  await env.PORTAL_DB.prepare('UPDATE agr_otp SET attempts = attempts + 1 WHERE id = ?').bind(row.id).run();
  const ok = constantTimeEqual(await sha256Hex(`${row.id}:${code}`), row.code_hash);
  if (!ok) return errorResponse('Onjuiste code.', 400);
  await env.PORTAL_DB.prepare('UPDATE agr_otp SET verified_at = ? WHERE id = ?').bind(Date.now(), row.id).run();
  await writeAudit(env.PORTAL_DB, {
    customer_id: user.customer_id, actor: user.id, action: 'otp_geverifieerd',
    meta: { agreement_id: agreement.id }, ip: clientIp(request),
  });
  return jsonResponse({ ok: true, verified: true });
}

// ── POST /ondertekenen ─────────────────────────────────────────────────────
function decodeSignaturePng(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  // Cheap size guard before decoding (base64 expands by 4/3).
  if (m[1].length > Math.ceil(MAX_SIGNATURE_BYTES / 3) * 4 + 4) return { tooBig: true };
  let bytes;
  try { bytes = base64ToBytes(m[1]); } catch { return null; }
  if (bytes.length > MAX_SIGNATURE_BYTES) return { tooBig: true };
  if (bytes.length < PNG_MAGIC.length || !PNG_MAGIC.every((b, i) => bytes[i] === b)) return null;
  return { bytes };
}

async function loadAanloopSignature(env) {
  try {
    const row = await env.PORTAL_DB
      .prepare("SELECT value_b64 FROM portal_assets WHERE key = 'handtekening-aanloopai'").bind().first();
    return row?.value_b64 ? base64ToBytes(row.value_b64) : null;
  } catch (err) {
    console.error('[overeenkomst] handtekening-asset niet leesbaar:', err.message || err);
    return null;
  }
}

function pdfDocsPayload(docs) {
  return docs.map((d) => ({
    title: d.title, template_version: d.template_version,
    rendered_markdown: d.rendered_markdown, content_sha256: d.content_sha256,
  }));
}

async function ondertekenen(request, env, user) {
  if (user.role !== 'eigenaar') return errorResponse('Alleen de eigenaar van het account kan ondertekenen', 403);
  const body = await readJson(request);
  if (!body) return errorResponse('Ongeldige aanvraag', 400);
  const agreement = await loadAgreement(env, user, str(body.agreement_id));
  if (!agreement) return errorResponse('Overeenkomst niet gevonden', 404);
  if (!OPEN_STATUSES.includes(agreement.status)) return errorResponse('Overeenkomst is al ondertekend', 409);

  const pre = await signingPrerequisites(env, user, agreement);
  if (pre.error) return pre.error;
  const { docs, consents, customer } = pre;

  const typedName = str(body.typed_name, 120);
  if (typedName.length < 4) return errorResponse('Typ je volledige naam (minimaal 4 tekens).', 400);
  if (body.bevoegd !== true) return errorResponse('Bevestig dat je bevoegd bent om te ondertekenen.', 400);
  const png = decodeSignaturePng(body.signature_png);
  if (png?.tooBig) return errorResponse('De handtekening is te groot.', 413);
  if (!png) return errorResponse('Zet eerst je handtekening.', 400);
  const verifiedAt = await otpVerifiedAt(env, agreement.id, user.id);
  if (!verifiedAt) return errorResponse('Bevestig eerst de verificatiecode.', 400);
  if (!env.PORTAL_FILES) return errorResponse('Er ging iets mis', 500);

  const ip = clientIp(request);
  const ua = clientUa(request);
  const signedAt = Date.now();
  const sigId = randomId('sig');
  const sigKey = `portal:sig:${sigId}`;
  const evidence = await computeEvidenceSha256({
    contentHashes: docs.map((d) => d.content_sha256), typedName, signedAtMs: signedAt,
  });

  // The UNIQUE(agreement_id) constraint is the double-sign guard: claim first.
  try {
    await env.PORTAL_DB
      .prepare(`INSERT INTO agr_signatures (id, agreement_id, user_id, typed_name, signature_key, otp_verified_at,
                signed_at, ip, user_agent, evidence_sha256) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(sigId, agreement.id, user.id, typedName, sigKey, verifiedAt, signedAt, ip, ua, evidence).run();
  } catch (err) {
    console.error('[overeenkomst] handtekening opslaan mislukt:', err.message || err);
    return errorResponse('Overeenkomst is al ondertekend', 409);
  }

  let pdfBytes;
  const pdfKey = `portal:pdf:${agreement.id}`;
  try {
    await env.PORTAL_FILES.put(sigKey, png.bytes.buffer.slice(png.bytes.byteOffset, png.bytes.byteOffset + png.bytes.byteLength), {
      metadata: { mime: 'image/png', name: 'handtekening.png', size: png.bytes.length, customer_id: user.customer_id },
    });
    pdfBytes = await buildAgreementPdf({
      agreement, customer, documents: pdfDocsPayload(docs),
      signature: { typed_name: typedName, pngBytes: png.bytes, signed_at: signedAt, ip, user_agent: ua },
      consents: docs.map((d) => {
        const c = consents.get(d.id);
        return {
          document_title: d.title, template_version: d.template_version, content_sha256: d.content_sha256,
          scrolled_to_end_at: c.scrolled_to_end_at, time_on_document_sec: c.time_on_document_sec, checkbox_at: c.checkbox_at,
        };
      }),
      otpVerifiedAt: verifiedAt,
      aanloopSignaturePngBytes: await loadAanloopSignature(env),
      concept: false,
    });
    await env.PORTAL_FILES.put(pdfKey, pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength), {
      metadata: { mime: 'application/pdf', name: `overeenkomst-${safeFileId(agreement.id)}.pdf`, size: pdfBytes.length, customer_id: user.customer_id },
    });
  } catch (err) {
    // Roll back our own just-claimed signature row so the customer can retry.
    console.error('[overeenkomst] PDF/KV mislukt, handtekening teruggedraaid:', err.message || err);
    try { await env.PORTAL_DB.prepare('DELETE FROM agr_signatures WHERE id = ?').bind(sigId).run(); } catch { /* best effort */ }
    try { await env.PORTAL_FILES.delete(sigKey); } catch { /* best effort */ }
    return errorResponse('Ondertekenen is niet gelukt. Probeer het opnieuw.', 500);
  }

  const pdfSha = await sha256Bytes(pdfBytes);
  await env.PORTAL_DB
    .prepare(`UPDATE agreements SET status = 'signed', signed_at = ?, pdf_key = ?, pdf_sha256 = ?, evidence_sha256 = ?
              WHERE id = ?`)
    .bind(signedAt, pdfKey, pdfSha, evidence, agreement.id).run();
  await writeAudit(env.PORTAL_DB, {
    customer_id: user.customer_id, actor: user.id, action: 'ondertekend',
    meta: { agreement_id: agreement.id, evidence_sha256: evidence, pdf_sha256: pdfSha, typed_name: typedName }, ip,
  });

  // Mails + Telegram: failures are logged, never fatal (signature is stored).
  const attachments = [{ name: `overeenkomst-${safeFileId(agreement.id)}.pdf`, contentBase64: bytesToBase64(pdfBytes) }];
  const when = formatAmsterdam(signedAt);
  const bedrijf = customer?.bedrijf || '';
  try {
    await sendMail(env, user.email, user.naam, 'Je overeenkomst met AanloopAI is ondertekend',
      `<p>Beste ${escapeHtml(user.naam || typedName)},</p>`
      + `<p>De overeenkomst is op ${escapeHtml(when)} digitaal ondertekend. In de bijlage vind je de volledige overeenkomst met ondertekeningsbewijs.</p>`
      + '<p>Je kunt nu de gevraagde bestanden aanleveren in Mijn AanloopAI.</p>', attachments);
  } catch (err) { console.error('[overeenkomst] bevestigingsmail klant mislukt:', err.message || err); }
  try {
    await sendMail(env, STAFF_MAIL, 'Mustafa Dogan', `[Portaal] Overeenkomst ondertekend: ${bedrijf}`,
      `<p>${escapeHtml(bedrijf)} heeft de overeenkomst ondertekend (${escapeHtml(when)}).</p>`
      + `<p>Ondertekenaar: ${escapeHtml(typedName)}<br>Referentie: ${escapeHtml(agreement.id)}</p>`, attachments);
  } catch (err) { console.error('[overeenkomst] melding naar M mislukt:', err.message || err); }
  await notifyTelegram(env, `Overeenkomst ondertekend: ${bedrijf} (${typedName}, ${agreement.id})`);

  return jsonResponse({
    ok: true, signed_at: signedAt,
    pdf_url: `/api/portal/overeenkomst/pdf?id=${encodeURIComponent(agreement.id)}`,
  });
}

// ── GET /pdf?id= ───────────────────────────────────────────────────────────
async function pdfDownload(env, user, url) {
  const agreement = await loadAgreement(env, user, url.searchParams.get('id'));
  if (!agreement) return errorResponse('Overeenkomst niet gevonden', 404);
  const headers = {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="overeenkomst-${safeFileId(agreement.id)}.pdf"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  if (agreement.status === 'signed' && agreement.pdf_key && env.PORTAL_FILES) {
    const buf = await env.PORTAL_FILES.get(agreement.pdf_key, 'arrayBuffer');
    if (buf) return new Response(buf, { status: 200, headers });
  }
  // Not signed (or PDF missing): concept copy from the stored documents.
  const customer = await loadCustomer(env, user.customer_id);
  const docs = await loadDocuments(env, agreement.id);
  const bytes = await buildAgreementPdf({
    agreement, customer, documents: pdfDocsPayload(docs), signature: null, consents: [],
    otpVerifiedAt: null, aanloopSignaturePngBytes: null, concept: true,
  });
  return new Response(bytes, { status: 200, headers });
}

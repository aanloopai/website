// Klantenportaal — overeenkomst-API voor klanten (/api/portal/overeenkomst*).
// Wired into handlePortalApi (portal-routes.js) after the session gate; `user`
// is the session row { id, customer_id, email, naam, role }. Every query is
// scoped by user.customer_id.
import { jsonResponse, errorResponse } from './google-auth.js';
import { randomId, sha256Hex } from './auth.js';
import { notifyTelegram } from './notify.js';
import { sendMail } from './portal-routes.js';
import { escapeHtml } from './escape.js';
import { renderHtml } from './markdown-lite.js';
import {
  TEMPLATE_SLUGS, CONSENT_LABELS, AUTHORIZED_LABEL, ACCEPTANCE_LABEL, decodeSignaturePng, renderTemplate, buildVars,
  minReadSeconds, computeEvidenceSha256, formatAmsterdam, writeAudit, ensurePortaalSchema,
  computeTotals, AMOUNTS_LABEL,
} from './overeenkomst-core.js';
import { buildAgreementPdf } from './agreement-pdf.js';

const STAFF_MAIL = 'm.dogan@aanloopai.nl';
// agr_signatures.otp_verified_at is NOT NULL in the live schema (SQLite cannot relax it), so we write 0.
// 0 = "geen verificatiecode (uitgeschakeld 2026-10-09)". The agr_otp table stays in the schema, empty.
const OTP_NOT_USED = 0;
const ORPHAN_SIGNATURE_MS = 60 * 1000;
const OPEN_STATUSES = ['sent', 'in_progress'];

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
// KvK is required; the btw number is optional.
function bedrijfCompleet(c) {
  return !!c && validKvk(normalizeKvk(c.kvk));
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

// Same, but only the given user's own consents (signer must consent personally).
async function loadUserConsents(env, agreementId, userId) {
  const res = await env.PORTAL_DB
    .prepare(`SELECT c.* FROM agr_consents c JOIN agreement_documents d ON d.id = c.agreement_document_id
              WHERE d.agreement_id = ? AND c.user_id = ? AND c.superseded = 0 ORDER BY c.created_at, c.id`)
    .bind(agreementId, userId).all();
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
    '/opties': opties,
    '/open': openDocument,
    '/consent': storeConsent,
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
  if (user.role !== 'kijker' && agreement.status !== 'signed' && (await consentEverCount(env, agreement.id)) === 0) {
    docs = await rerenderDocuments(env, agreement, customer, docs);
  }
  return jsonResponse(await buildDetailPayload(env, user, agreement, customer, docs));
}

// The exact customer GET payload. Pure reads (also used by the admin preview,
// which passes the agreement + the eigenaar as `user` and never re-renders).
export async function buildDetailPayload(env, user, agreement, customer, docs, { previewDraft = false } = {}) {
  const consents = user?.id ? await loadUserConsents(env, agreement.id, user.id) : new Map();
  const sig = await env.PORTAL_DB
    .prepare('SELECT typed_name, signed_at FROM agr_signatures WHERE agreement_id = ?')
    .bind(agreement.id).first();
  const totalen = computeTotals(varsFor(agreement, customer));
  const openStatuses = previewDraft ? ['draft', ...OPEN_STATUSES] : OPEN_STATUSES;
  const wijzigbaar = canWrite(user?.role) && openStatuses.includes(agreement.status)
    && (await consentEverCount(env, agreement.id)) === 0;

  return {
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
    authorized_label: AUTHORIZED_LABEL(customer?.bedrijf || ''),
    acceptance_label: ACCEPTANCE_LABEL,
    totalen,
    amounts_label: AMOUNTS_LABEL(totalen),
    opties: { optie_3d: { gekozen: totalen.optie_3d.gekozen, prijs: totalen.optie_3d.prijs, wijzigbaar } },
  };
}

// ── POST /opties ───────────────────────────────────────────────────────────
async function opties(request, env, user) {
  if (!canWrite(user.role)) return readOnly();
  const body = await readJson(request);
  if (!body) return errorResponse('Ongeldige aanvraag', 400);
  const agreement = await loadAgreement(env, user, str(body.agreement_id));
  if (!agreement) return errorResponse('Overeenkomst niet gevonden', 404);
  if (typeof body.optie_3d_gekozen !== 'boolean') return errorResponse('Ongeldige aanvraag', 400);
  const frozen = () => errorResponse('Opties zijn bevroren na de eerste akkoordverklaring.', 409);
  if (!OPEN_STATUSES.includes(agreement.status) || (await consentEverCount(env, agreement.id)) > 0) return frozen();

  let base = {};
  try { base = JSON.parse(agreement.variables_json || '{}') || {}; } catch { base = {}; }
  const value = body.optie_3d_gekozen ? 'ja' : 'nee';
  const nextJson = JSON.stringify({ ...base, optie_3d_gekozen: value });
  // Guarded UPDATE: loses cleanly against a consent stored in the meantime.
  const res = await env.PORTAL_DB
    .prepare(`UPDATE agreements SET variables_json = ?
              WHERE id = ? AND status IN ('sent', 'in_progress')
              AND NOT EXISTS (SELECT 1 FROM agr_consents c JOIN agreement_documents d ON d.id = c.agreement_document_id
                              WHERE d.agreement_id = agreements.id)`)
    .bind(nextJson, agreement.id).run();
  if (res?.meta?.changes !== 1) return frozen();

  const customer = await loadCustomer(env, user.customer_id);
  await rerenderDocuments(env, { ...agreement, variables_json: nextJson }, customer, await loadDocuments(env, agreement.id));
  await writeAudit(env.PORTAL_DB, {
    customer_id: user.customer_id, actor: user.id, action: 'optie_gewijzigd',
    meta: { agreement_id: agreement.id, optie_3d_gekozen: value }, ip: clientIp(request),
  });
  return jsonResponse({ ok: true, optie_3d_gekozen: body.optie_3d_gekozen });
}

// ── POST /bedrijfsgegevens ─────────────────────────────────────────────────
async function bedrijfsgegevens(request, env, user) {
  if (!canWrite(user.role)) return readOnly();
  const body = await readJson(request);
  if (!body) return errorResponse('Ongeldige aanvraag', 400);
  const kvk = normalizeKvk(body.kvk);
  const btw = normalizeBtw(body.btw_id);
  if (!validKvk(kvk)) return errorResponse('Een KvK-nummer bestaat uit 8 cijfers.', 400);
  if (btw && !validBtw(btw)) return errorResponse('Een btw-nummer ziet eruit als NL123456789B01.', 400);
  const locked = await env.PORTAL_DB
    .prepare(`SELECT COUNT(*) AS n FROM agr_consents c JOIN agreement_documents d ON d.id = c.agreement_document_id
              JOIN agreements a ON a.id = d.agreement_id
              WHERE a.customer_id = ? AND c.superseded = 0`)
    .bind(user.customer_id).first();
  if (Number(locked?.n || 0) > 0) {
    return errorResponse('Bedrijfsgegevens kunnen niet meer worden gewijzigd nadat je akkoord hebt gegeven. Neem contact op met AanloopAI.', 409);
  }
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

  const customer = await loadCustomer(env, user.customer_id);
  if (!String(customer?.kvk ?? '').trim()) {
    return errorResponse('Vul eerst de bedrijfsgegevens aan', 400);
  }

  const now = Date.now();
  const minSec = minReadSeconds(doc.rendered_markdown);
  const scrolledAt = Math.floor(Number(body.scrolled_to_end_at));
  const tooEarly = errorResponse('Lees het document volledig voordat je akkoord gaat.', 400);
  if (!Number.isFinite(scrolledAt) || scrolledAt < opened.opened_at || scrolledAt > now + 5000) return tooEarly;
  // Client-claimed time can never exceed what the server measured (+2s slack).
  const timeSec = Math.min(Math.floor(Number(body.time_on_document_sec)), Math.floor((now - opened.opened_at) / 1000) + 2);
  if (!Number.isFinite(timeSec) || timeSec < minSec) return tooEarly;
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

// All documents consented + company data complete → may proceed to sign.
async function signingPrerequisites(env, user, agreement) {
  const docs = await loadDocuments(env, agreement.id);
  const consents = await loadUserConsents(env, agreement.id, user.id);
  if (docs.length < TEMPLATE_SLUGS.length || !docs.every((d) => consents.has(d.id))) {
    return { error: errorResponse('Bevestig eerst alle drie de documenten.', 400) };
  }
  const customer = await loadCustomer(env, user.customer_id);
  if (!bedrijfCompleet(customer)) return { error: errorResponse('Vul eerst je bedrijfsgegevens aan.', 400) };
  return { docs, consents, customer };
}

// ── POST /ondertekenen ─────────────────────────────────────────────────────
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

async function dropSignature(env, id, key) {
  try { await env.PORTAL_DB.prepare('DELETE FROM agr_signatures WHERE id = ?').bind(id).run(); } catch { /* best effort */ }
  try { if (key) await env.PORTAL_FILES.delete(key); } catch { /* best effort */ }
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
  if (body.alles_aanvaard !== true) return errorResponse('Aanvaard eerst alle voorwaarden.', 400);
  if (body.bedragen_akkoord !== true) return errorResponse('Bevestig eerst de bedragen.', 400);
  let pngBytes;
  try { pngBytes = decodeSignaturePng(body.signature_png); } catch (err) {
    return err.code === 'too_big' ? errorResponse('De handtekening is te groot.', 413) : errorResponse('Ongeldige handtekening', 400);
  }
  const png = { bytes: pngBytes };
  if (!env.PORTAL_FILES) return errorResponse('Er ging iets mis', 500);

  const ip = clientIp(request);
  const ua = clientUa(request);
  const signedAt = Date.now();
  const acceptedAllAt = signedAt;
  const amountsAcceptedAt = signedAt;
  const totalen = computeTotals(varsFor(agreement, customer));
  const sigId = randomId('sig');
  const sigKey = `portal:sig:${sigId}`;
  const evidence = await computeEvidenceSha256({
    agreementId: agreement.id, userId: user.id, contentHashes: docs.map((d) => d.content_sha256),
    typedName, signedAtMs: signedAt, signatureSha256: await sha256Bytes(png.bytes),
    otpVerifiedAt: null, consentCheckboxAts: docs.map((d) => consents.get(d.id).checkbox_at), acceptedAllAt, amountsAcceptedAt,
  });

  // The UNIQUE(agreement_id) constraint is the double-sign guard: claim first.
  const insertSig = () => env.PORTAL_DB
    .prepare(`INSERT INTO agr_signatures (id, agreement_id, user_id, typed_name, signature_key, otp_verified_at,
              signed_at, ip, user_agent, evidence_sha256, accepted_all_at, amounts_accepted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(sigId, agreement.id, user.id, typedName, sigKey, OTP_NOT_USED, signedAt, ip, ua, evidence, acceptedAllAt, amountsAcceptedAt).run();
  try {
    await insertSig();
  } catch (err) {
    console.error('[overeenkomst] handtekening opslaan mislukt:', err.message || err);
    // An orphan row (earlier attempt died after the claim) must not lock the customer out forever.
    const existing = await env.PORTAL_DB
      .prepare(`SELECT s.id, s.signature_key, s.signed_at, a.status, a.pdf_key FROM agr_signatures s
                JOIN agreements a ON a.id = s.agreement_id WHERE s.agreement_id = ?`)
      .bind(agreement.id).first();
    // The age guard keeps us from deleting the claim of a sign request that is still in flight.
    const orphan = existing && (existing.status !== 'signed' || !existing.pdf_key)
      && Date.now() - existing.signed_at > ORPHAN_SIGNATURE_MS;
    if (!orphan) return errorResponse('Overeenkomst is al ondertekend', 409);
    await dropSignature(env, existing.id, existing.signature_key);
    try { await insertSig(); } catch { return errorResponse('Overeenkomst is al ondertekend', 409); }
  }

  let pdfBytes;
  const pdfKey = `portal:pdf:${agreement.id}`;
  try {
    await env.PORTAL_FILES.put(sigKey, png.bytes.buffer.slice(png.bytes.byteOffset, png.bytes.byteOffset + png.bytes.byteLength), {
      metadata: { mime: 'image/png', name: 'handtekening.png', size: png.bytes.length, customer_id: user.customer_id },
    });
    pdfBytes = await buildAgreementPdf({
      // Same hash as stored in agreements/agr_signatures — never let the PDF
      // builder fall back to its own computation (different inputs → mismatch).
      agreement: { ...agreement, evidence_sha256: evidence },
      customer, documents: pdfDocsPayload(docs),
      signature: { typed_name: typedName, pngBytes: png.bytes, signed_at: signedAt, ip, user_agent: ua, accepted_all_at: acceptedAllAt, acceptance_label: ACCEPTANCE_LABEL,
        amounts_accepted_at: amountsAcceptedAt, amounts_label: AMOUNTS_LABEL(totalen), totalen,
      },
      consents: docs.map((d) => {
        const c = consents.get(d.id);
        return {
          document_title: d.title, template_version: d.template_version, content_sha256: d.content_sha256,
          scrolled_to_end_at: c.scrolled_to_end_at, time_on_document_sec: c.time_on_document_sec, checkbox_at: c.checkbox_at,
        };
      }),
      otpVerifiedAt: null,
      aanloopSignaturePngBytes: await loadAanloopSignature(env),
      concept: false,
    });
    await env.PORTAL_FILES.put(pdfKey, pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength), {
      metadata: { mime: 'application/pdf', name: `overeenkomst-${safeFileId(agreement.id)}.pdf`, size: pdfBytes.length, customer_id: user.customer_id },
    });
  } catch (err) {
    // Roll back our own just-claimed signature row so the customer can retry.
    console.error('[overeenkomst] PDF/KV mislukt, handtekening teruggedraaid:', err.message || err);
    await dropSignature(env, sigId, sigKey);
    return errorResponse('Ondertekenen is niet gelukt. Probeer het opnieuw.', 500);
  }

  const pdfSha = await sha256Bytes(pdfBytes);
  // One batch: status flip + audit row. The audit insert only fires when the UPDATE changed a row.
  const batchRes = await env.PORTAL_DB.batch([
    env.PORTAL_DB
      .prepare(`UPDATE agreements SET status = 'signed', signed_at = ?, pdf_key = ?, pdf_sha256 = ?, evidence_sha256 = ?
                WHERE id = ? AND status IN ('sent', 'in_progress')`)
      .bind(signedAt, pdfKey, pdfSha, evidence, agreement.id),
    env.PORTAL_DB
      .prepare(`INSERT INTO portal_audit_log (id, customer_id, actor, action, meta_json, ip, created_at)
                SELECT ?, ?, ?, ?, ?, ?, ? WHERE changes() = 1`)
      .bind(randomId('aud'), user.customer_id, user.id, 'ondertekend',
        JSON.stringify({ agreement_id: agreement.id, evidence_sha256: evidence, pdf_sha256: pdfSha, typed_name: typedName }),
        ip, Date.now()),
  ]);
  if (batchRes?.[0]?.meta?.changes !== 1) {
    // Lost a race (e.g. admin cancelled meanwhile): undo our claim and artifacts.
    await dropSignature(env, sigId, sigKey);
    try { await env.PORTAL_FILES.delete(pdfKey); } catch { /* best effort */ }
    return errorResponse('Overeenkomst kan niet meer ondertekend worden', 409);
  }

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
  if (agreement.status === 'signed') return errorResponse('PDF niet gevonden', 404);
  // Not signed (or PDF missing): concept copy from the stored documents.
  const customer = await loadCustomer(env, user.customer_id);
  const docs = await loadDocuments(env, agreement.id);
  const bytes = await buildAgreementPdf({
    agreement, customer, documents: pdfDocsPayload(docs), signature: null, consents: [],
    otpVerifiedAt: null, aanloopSignaturePngBytes: null, concept: true,
  });
  return new Response(bytes, { status: 200, headers });
}

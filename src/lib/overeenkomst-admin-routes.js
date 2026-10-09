// Admin API for overeenkomsten, aanleverlijst, sjablonen and the portal audit
// log. Wired into handleAdminApi (staff gate already passed) for paths under
// /api/admin/overeenkomst, /api/admin/aanlever, /api/admin/portal-audit and
// /api/admin/sjablonen. Customer data is always scoped by id.
import { jsonResponse, errorResponse } from './google-auth.js';
import { randomId } from './auth.js';
import { escapeHtml } from './escape.js';
import { rateLimit } from './rate-limit.js';
import { sendMail } from './portal-routes.js';
import { renderHtml } from './markdown-lite.js';
import {
  TEMPLATE_SLUGS, renderTemplate, buildVars, minReadSeconds, sha256Hex,
  DEFAULT_UPLOAD_ITEMS, writeAudit, ensurePortaalSchema,
} from './overeenkomst-core.js';
import { buildAgreementPdf } from './agreement-pdf.js';

const SITE_ORIGIN = 'https://aanloopai.nl';
const MAX_FILE_MIB = 25;
const ITEM_TYPES = ['file', 'text', 'boolean'];
const ITEM_STATUSES = ['open', 'received', 'nvt'];

// Every variable the admin form shows (SPEC §6). Order = form order.
export const AGREEMENT_VARIABLE_KEYS = [
  'klant_bedrijfsnaam', 'klant_rechtsvorm', 'klant_kvk', 'klant_btw',
  'klant_adres', 'klant_postcode', 'klant_plaats',
  'klant_contact_naam', 'klant_contact_email', 'klant_contact_tel',
  'klant_dagelijks_contact', 'project_naam', 'project_domein',
  'prijs_website', 'prijs_optie_3d', 'optie_3d_gekozen',
  'prijs_beheer_maand', 'prijs_lead', 'lead_bundel_aantal', 'lead_bundel_prijs',
  'lead_regio', 'lead_cap_per_dag', 'betaling_fasen', 'betaaltermijn_dagen',
];

const str = (v) => (v == null ? '' : String(v)).trim();
const readBody = async (request) => (await request.json().catch(() => null)) || {};
const actorOf = (user) => `staff:${user.email || user.id}`;
const ipOf = (request) => request.headers?.get?.('CF-Connecting-IP') || null;

function mailButton(href, label) {
  return `<p style="margin:28px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#4f46e5;color:#fff;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:600">${escapeHtml(label)}</a></p>`;
}

async function getCustomer(env, id) {
  if (!id) return null;
  return env.PORTAL_DB
    .prepare('SELECT id, bedrijf, kvk, btw_id, adres, postcode, stad, telefoon FROM customers WHERE id = ?')
    .bind(id).first();
}

async function getAgreement(env, id) {
  if (!id) return null;
  return env.PORTAL_DB.prepare('SELECT * FROM agreements WHERE id = ?').bind(id).first();
}

async function eigenaarUsers(env, customerId) {
  const r = await env.PORTAL_DB
    .prepare("SELECT id, email, naam FROM users WHERE customer_id = ? AND role = 'eigenaar' ORDER BY created_at ASC")
    .bind(customerId).all();
  return r?.results || [];
}

async function consentCount(env, agreementId) {
  const row = await env.PORTAL_DB
    .prepare('SELECT COUNT(*) AS n FROM agr_consents WHERE agreement_document_id IN (SELECT id FROM agreement_documents WHERE agreement_id = ?)')
    .bind(agreementId).first();
  return Number(row?.n || 0);
}

function prefillVariables(customer, owner) {
  const v = Object.fromEntries(AGREEMENT_VARIABLE_KEYS.map((k) => [k, '']));
  v.klant_bedrijfsnaam = str(customer.bedrijf);
  v.klant_kvk = str(customer.kvk);
  v.klant_btw = str(customer.btw_id);
  v.klant_adres = str(customer.adres);
  v.klant_postcode = str(customer.postcode);
  v.klant_plaats = str(customer.stad);
  v.klant_contact_tel = str(customer.telefoon);
  if (owner) {
    v.klant_contact_naam = str(owner.naam);
    v.klant_contact_email = str(owner.email);
  }
  return v;
}

// Only known keys survive; values are coerced to trimmed strings.
function mergeVariables(base, incoming) {
  const out = { ...base };
  if (incoming && typeof incoming === 'object') {
    for (const k of AGREEMENT_VARIABLE_KEYS) {
      if (incoming[k] !== undefined) out[k] = str(incoming[k]);
    }
  }
  return out;
}

function parseVars(json) {
  try { return JSON.parse(json || '{}') || {}; } catch { return {}; }
}

async function renderOne(body, agreement, customer) {
  const rendered = renderTemplate(body, buildVars(agreement, customer));
  return { rendered, sha: await sha256Hex(rendered) };
}

async function latestTemplate(env, slug) {
  return env.PORTAL_DB
    .prepare('SELECT id, slug, version, title, body_markdown FROM agr_templates WHERE slug = ? ORDER BY created_at DESC, version DESC LIMIT 1')
    .bind(slug).first();
}

async function loadTemplates(env, templateIds) {
  const out = [];
  if (Array.isArray(templateIds) && templateIds.length) {
    for (const id of templateIds) {
      const t = await env.PORTAL_DB
        .prepare('SELECT id, slug, version, title, body_markdown FROM agr_templates WHERE id = ?')
        .bind(str(id)).first();
      if (!t) return { error: `Sjabloon niet gevonden: ${str(id)}` };
      out.push(t);
    }
    const slugs = out.map((t) => t.slug);
    const ok = TEMPLATE_SLUGS.length === slugs.length && TEMPLATE_SLUGS.every((s) => slugs.includes(s));
    if (!ok) return { error: 'Kies precies één sjabloon per type (overeenkomst, algemene voorwaarden, privacy)' };
  } else {
    for (const slug of TEMPLATE_SLUGS) {
      const t = await latestTemplate(env, slug);
      if (!t) return { error: `Geen sjabloon gevonden voor ${slug}` };
      out.push(t);
    }
  }
  out.sort((a, b) => TEMPLATE_SLUGS.indexOf(a.slug) - TEMPLATE_SLUGS.indexOf(b.slug));
  return { templates: out };
}

// ── sjablonen ───────────────────────────────────────────────────────────────
async function listSjablonen(env) {
  const r = await env.PORTAL_DB
    .prepare('SELECT id, slug, version, title, effective_from, created_at, LENGTH(body_markdown) AS chars FROM agr_templates ORDER BY created_at DESC, version DESC')
    .all();
  return jsonResponse({ ok: true, templates: r?.results || [] });
}

async function sjabloonItem(env, url) {
  const row = await env.PORTAL_DB
    .prepare('SELECT id, slug, version, title, body_markdown, effective_from, created_at FROM agr_templates WHERE id = ?')
    .bind(str(url.searchParams.get('id'))).first();
  if (!row) return errorResponse('Sjabloon niet gevonden', 404);
  return jsonResponse({ ok: true, template: row });
}

async function createSjabloon(request, env, user) {
  const b = await readBody(request);
  const slug = str(b.slug);
  const version = str(b.version);
  const title = str(b.title);
  const body = typeof b.body_markdown === 'string' ? b.body_markdown : '';
  if (!TEMPLATE_SLUGS.includes(slug)) return errorResponse('Onbekend sjabloontype', 400);
  if (!/^\d+\.\d+$/.test(version)) return errorResponse('Versie moet de vorm 1.1 hebben', 400);
  if (!title) return errorResponse('Titel is verplicht', 400);
  if (!body.trim() || body.length > 500000) return errorResponse('Tekst ontbreekt of is te lang', 400);
  const dup = await env.PORTAL_DB
    .prepare('SELECT id FROM agr_templates WHERE slug = ? AND version = ?').bind(slug, version).first();
  if (dup) return errorResponse('Deze versie bestaat al', 409);
  const id = randomId('tpl');
  const now = Date.now();
  await env.PORTAL_DB
    .prepare('INSERT INTO agr_templates (id, slug, version, title, body_markdown, effective_from, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, slug, version, title, body, now, now).run();
  await writeAudit(env.PORTAL_DB, {
    customer_id: null, actor: actorOf(user), action: 'sjabloon_aangemaakt', meta: { id, slug, version }, ip: ipOf(request),
  });
  return jsonResponse({ ok: true, id });
}

// ── overeenkomsten ──────────────────────────────────────────────────────────
async function lijst(env, url) {
  const customerId = str(url.searchParams.get('customer_id'));
  if (!customerId) return errorResponse('Klant-id is verplicht', 400);
  const r = await env.PORTAL_DB.prepare(
    `SELECT a.id, a.title, a.status, a.created_at, a.sent_at, a.signed_at, a.evidence_sha256,
       (SELECT COUNT(*) FROM agreement_documents d WHERE d.agreement_id = a.id) AS doc_count,
       (SELECT COUNT(*) FROM agr_consents c WHERE c.superseded = 0 AND c.agreement_document_id IN
          (SELECT id FROM agreement_documents WHERE agreement_id = a.id)) AS consent_count,
       (SELECT typed_name FROM agr_signatures s WHERE s.agreement_id = a.id) AS signed_by
     FROM agreements a WHERE a.customer_id = ? ORDER BY a.created_at DESC`,
  ).bind(customerId).all();
  return jsonResponse({ ok: true, agreements: r?.results || [], variable_keys: AGREEMENT_VARIABLE_KEYS });
}

async function createAgreement(request, env, user) {
  const b = await readBody(request);
  const customer = await getCustomer(env, str(b.customer_id));
  if (!customer) return errorResponse('Klant niet gevonden', 404);
  const title = str(b.title);
  if (!title) return errorResponse('Titel is verplicht', 400);
  const loaded = await loadTemplates(env, b.template_ids);
  if (loaded.error) return errorResponse(loaded.error, 400);

  const owners = await eigenaarUsers(env, customer.id);
  const variables = mergeVariables(prefillVariables(customer, owners[0]), b.variables_json);
  const id = randomId('agr');
  const now = Date.now();
  const agreement = { id, variables_json: JSON.stringify(variables) };

  const stmts = [env.PORTAL_DB
    .prepare('INSERT INTO agreements (id, customer_id, title, status, variables_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, customer.id, title, 'draft', agreement.variables_json, user.id, now)];
  let idx = 0;
  for (const t of loaded.templates) {
    idx += 1;
    const { rendered, sha } = await renderOne(t.body_markdown, agreement, customer);
    stmts.push(env.PORTAL_DB
      .prepare('INSERT INTO agreement_documents (id, agreement_id, template_id, template_slug, template_version, order_index, title, rendered_markdown, content_sha256) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(randomId('agd'), id, t.id, t.slug, t.version, idx, t.title, rendered, sha));
  }
  await env.PORTAL_DB.batch(stmts);
  await writeAudit(env.PORTAL_DB, {
    customer_id: customer.id, actor: actorOf(user), action: 'overeenkomst_aangemaakt',
    meta: { agreement_id: id, templates: loaded.templates.map((t) => `${t.slug}@${t.version}`) }, ip: ipOf(request),
  });
  return jsonResponse({ ok: true, id, variables_json: variables });
}

async function patchAgreement(request, env, user) {
  const b = await readBody(request);
  const agreement = await getAgreement(env, str(b.id));
  if (!agreement) return errorResponse('Overeenkomst niet gevonden', 404);
  if (!['draft', 'sent', 'in_progress'].includes(agreement.status)) {
    return errorResponse('Deze overeenkomst kan niet meer worden aangepast', 409);
  }
  if ((await consentCount(env, agreement.id)) > 0) {
    return errorResponse('Er is al akkoord gegeven; de overeenkomst is bevroren en kan niet meer worden aangepast', 409);
  }
  const customer = await getCustomer(env, agreement.customer_id);
  if (!customer) return errorResponse('Klant niet gevonden', 404);

  const title = b.title !== undefined ? str(b.title) : agreement.title;
  if (!title) return errorResponse('Titel is verplicht', 400);
  const variables = b.variables_json !== undefined
    ? mergeVariables(parseVars(agreement.variables_json), b.variables_json)
    : parseVars(agreement.variables_json);
  const next = { ...agreement, title, variables_json: JSON.stringify(variables) };

  const docs = (await env.PORTAL_DB
    .prepare('SELECT d.id, t.body_markdown FROM agreement_documents d JOIN agr_templates t ON t.id = d.template_id WHERE d.agreement_id = ? ORDER BY d.order_index')
    .bind(agreement.id).all())?.results || [];
  const stmts = [env.PORTAL_DB
    .prepare('UPDATE agreements SET title = ?, variables_json = ? WHERE id = ?')
    .bind(title, next.variables_json, agreement.id)];
  for (const d of docs) {
    const { rendered, sha } = await renderOne(d.body_markdown, next, customer);
    stmts.push(env.PORTAL_DB
      .prepare('UPDATE agreement_documents SET rendered_markdown = ?, content_sha256 = ? WHERE id = ?')
      .bind(rendered, sha, d.id));
  }
  await env.PORTAL_DB.batch(stmts);
  await writeAudit(env.PORTAL_DB, {
    customer_id: customer.id, actor: actorOf(user), action: 'overeenkomst_gewijzigd',
    meta: { agreement_id: agreement.id }, ip: ipOf(request),
  });
  return jsonResponse({ ok: true });
}

async function agreementDetail(env, url) {
  const agreement = await getAgreement(env, str(url.searchParams.get('id')));
  if (!agreement) return errorResponse('Overeenkomst niet gevonden', 404);
  const customer = await getCustomer(env, agreement.customer_id);
  const docs = (await env.PORTAL_DB
    .prepare('SELECT id, order_index, template_slug, template_version, title, rendered_markdown, content_sha256 FROM agreement_documents WHERE agreement_id = ? ORDER BY order_index')
    .bind(agreement.id).all())?.results || [];
  const consents = (await env.PORTAL_DB
    .prepare(`SELECT c.agreement_document_id, c.checkbox_at, c.time_on_document_sec, c.ip
              FROM agr_consents c WHERE c.superseded = 0 AND c.agreement_document_id IN
                (SELECT id FROM agreement_documents WHERE agreement_id = ?) ORDER BY c.checkbox_at`)
    .bind(agreement.id).all())?.results || [];
  const otp = await env.PORTAL_DB
    .prepare('SELECT verified_at FROM agr_otp WHERE agreement_id = ? AND verified_at IS NOT NULL ORDER BY verified_at DESC LIMIT 1')
    .bind(agreement.id).first();
  const signature = await env.PORTAL_DB
    .prepare('SELECT typed_name, otp_verified_at, signed_at, ip, user_agent, evidence_sha256 FROM agr_signatures WHERE agreement_id = ?')
    .bind(agreement.id).first();
  const audit = (await env.PORTAL_DB
    .prepare('SELECT id, actor, action, meta_json, ip, created_at FROM portal_audit_log WHERE customer_id = ? ORDER BY created_at DESC LIMIT 100')
    .bind(agreement.customer_id).all())?.results || [];

  const timeline = [];
  if (agreement.sent_at) timeline.push({ stap: 'Verstuurd', at: agreement.sent_at, ip: null });
  for (const d of docs) {
    const c = consents.find((x) => x.agreement_document_id === d.id);
    if (c) timeline.push({ stap: `Akkoord: ${d.title}`, at: c.checkbox_at, ip: c.ip || null });
  }
  if (otp?.verified_at) timeline.push({ stap: 'Code geverifieerd', at: otp.verified_at, ip: null });
  if (signature) timeline.push({ stap: 'Ondertekend', at: signature.signed_at, ip: signature.ip || null });

  return jsonResponse({
    ok: true,
    agreement: {
      id: agreement.id, customer_id: agreement.customer_id, title: agreement.title, status: agreement.status,
      variables_json: parseVars(agreement.variables_json), created_at: agreement.created_at,
      sent_at: agreement.sent_at, signed_at: agreement.signed_at, has_pdf: !!agreement.pdf_key,
      pdf_sha256: agreement.pdf_sha256 || null,
    },
    customer,
    documents: docs.map((d) => ({
      id: d.id, title: d.title, version: d.template_version, slug: d.template_slug,
      sha12: String(d.content_sha256 || '').slice(0, 12),
      min_read_sec: minReadSeconds(d.rendered_markdown),
      html: renderHtml(d.rendered_markdown),
    })),
    timeline,
    signature: signature ? { typed_name: signature.typed_name, signed_at: signature.signed_at, ip: signature.ip } : null,
    evidence_sha256: agreement.evidence_sha256 || null,
    variable_keys: AGREEMENT_VARIABLE_KEYS,
    audit,
  });
}

async function versturen(request, env, user) {
  const b = await readBody(request);
  const agreement = await getAgreement(env, str(b.id));
  if (!agreement) return errorResponse('Overeenkomst niet gevonden', 404);
  if (!['draft', 'sent', 'in_progress'].includes(agreement.status)) {
    return errorResponse('Deze overeenkomst kan niet worden verstuurd', 409);
  }
  const docCount = await env.PORTAL_DB
    .prepare('SELECT COUNT(*) AS n FROM agreement_documents WHERE agreement_id = ?').bind(agreement.id).first();
  if (Number(docCount?.n || 0) < TEMPLATE_SLUGS.length) return errorResponse('De overeenkomst bevat nog niet alle documenten', 409);
  const owners = await eigenaarUsers(env, agreement.customer_id);
  if (!owners.length) return errorResponse('Klant heeft nog geen eigenaar-account', 409);

  const vars = parseVars(agreement.variables_json);
  const link = `${SITE_ORIGIN}/portal/login?next=/portal/overeenkomst/?id=${agreement.id}`;
  let mailed = 0;
  let lastErr = null;
  for (const o of owners) {
    const voornaam = escapeHtml((str(o.naam).split(' ')[0]) || 'daar');
    const project = escapeHtml(str(vars.project_naam) || agreement.title);
    try {
      await sendMail(env, o.email, o.naam, 'Je AanloopAI-portaal staat klaar',
        `<p>Beste ${voornaam},</p>
<p>In Mijn AanloopAI vind je de overeenkomst voor ${project}. Lees de documenten, onderteken digitaal en lever daarna de gevraagde bestanden aan.</p>
${mailButton(link, 'Inloggen')}
<p style="font-size:13px;color:#64748b">Je ontvangt na het klikken een inloglink per e-mail (24 uur geldig).</p>`);
      mailed += 1;
    } catch (err) {
      lastErr = err;
      console.error('[overeenkomst-admin] versturen mail failed:', err?.message || err);
    }
  }
  if (!mailed) return errorResponse('De e-mail kon niet worden verstuurd', 502);

  if (agreement.status === 'draft') {
    await env.PORTAL_DB
      .prepare("UPDATE agreements SET status = 'sent', sent_at = ? WHERE id = ? AND status = 'draft'")
      .bind(Date.now(), agreement.id).run();
  }
  await writeAudit(env.PORTAL_DB, {
    customer_id: agreement.customer_id, actor: actorOf(user), action: 'overeenkomst_verstuurd',
    meta: { agreement_id: agreement.id, mailed, failed: owners.length - mailed, error: lastErr ? String(lastErr.message || lastErr).slice(0, 100) : undefined },
    ip: ipOf(request),
  });
  return jsonResponse({ ok: true, mailed });
}

async function annuleren(request, env, user) {
  const b = await readBody(request);
  const agreement = await getAgreement(env, str(b.id));
  if (!agreement) return errorResponse('Overeenkomst niet gevonden', 404);
  if (agreement.status === 'signed') return errorResponse('Een ondertekende overeenkomst kan niet worden geannuleerd', 409);
  if (agreement.status === 'cancelled') return jsonResponse({ ok: true });
  await env.PORTAL_DB.prepare("UPDATE agreements SET status = 'cancelled' WHERE id = ? AND status != 'signed'").bind(agreement.id).run();
  await writeAudit(env.PORTAL_DB, {
    customer_id: agreement.customer_id, actor: actorOf(user), action: 'overeenkomst_geannuleerd',
    meta: { agreement_id: agreement.id, vorige_status: agreement.status }, ip: ipOf(request),
  });
  return jsonResponse({ ok: true });
}

function pdfResponse(bytes, id) {
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="overeenkomst-${id}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

async function agreementPdf(env, url) {
  const agreement = await getAgreement(env, str(url.searchParams.get('id')));
  if (!agreement) return errorResponse('Overeenkomst niet gevonden', 404);
  if (agreement.status === 'signed') {
    const stored = agreement.pdf_key && env.PORTAL_FILES ? await env.PORTAL_FILES.get(agreement.pdf_key, 'arrayBuffer') : null;
    if (!stored) return errorResponse('PDF niet gevonden', 404);
    return pdfResponse(stored, agreement.id);
  }
  const customer = await getCustomer(env, agreement.customer_id);
  const docs = (await env.PORTAL_DB
    .prepare('SELECT title, template_version, rendered_markdown, content_sha256 FROM agreement_documents WHERE agreement_id = ? ORDER BY order_index')
    .bind(agreement.id).all())?.results || [];
  const bytes = await buildAgreementPdf({
    agreement, customer,
    documents: docs.map((d) => ({
      title: d.title, template_version: d.template_version, rendered_markdown: d.rendered_markdown, content_sha256: d.content_sha256,
    })),
    signature: null, consents: [], otpVerifiedAt: null, aanloopSignaturePngBytes: null, concept: true,
  });
  return pdfResponse(bytes, agreement.id);
}

// ── aanleverlijst ───────────────────────────────────────────────────────────
async function itemsWithUploads(env, customerId) {
  const items = (await env.PORTAL_DB
    .prepare('SELECT * FROM upload_items WHERE customer_id = ? ORDER BY order_index')
    .bind(customerId).all())?.results || [];
  const uploads = (await env.PORTAL_DB
    .prepare('SELECT id, upload_item_id, original_name, mime, size_bytes, text_value, created_at FROM uploads WHERE customer_id = ? ORDER BY created_at')
    .bind(customerId).all())?.results || [];
  return items.map((it) => ({ ...it, uploads: uploads.filter((u) => u.upload_item_id === it.id) }));
}

async function aanleverLijst(env, url) {
  const customerId = str(url.searchParams.get('customer_id'));
  if (!customerId) return errorResponse('Klant-id is verplicht', 400);
  const items = await itemsWithUploads(env, customerId);
  const done = items.filter((i) => i.status === 'received' || i.status === 'nvt' || i.uploads.length > 0).length;
  return jsonResponse({ ok: true, items, progress: { done, total: items.length } });
}

async function aanleverSeed(request, env, user) {
  const b = await readBody(request);
  const customer = await getCustomer(env, str(b.customer_id));
  if (!customer) return errorResponse('Klant niet gevonden', 404);
  const existing = await env.PORTAL_DB
    .prepare('SELECT COUNT(*) AS n FROM upload_items WHERE customer_id = ?').bind(customer.id).first();
  if (Number(existing?.n || 0) > 0) return errorResponse('Deze klant heeft al een aanleverlijst', 409);
  const defaults = DEFAULT_UPLOAD_ITEMS(str(b.project_domein) || 'het domein');
  const now = Date.now();
  const stmts = defaults.map((it, i) => env.PORTAL_DB
    .prepare('INSERT INTO upload_items (id, customer_id, label, description, type, required, accepted_ext, max_mb, multi, max_files, order_index, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(randomId('upi'), customer.id, it.label, it.description || null, it.type, it.required ? 1 : 0,
      it.accepted_ext || null, Math.min(Number(it.max_mb) || MAX_FILE_MIB, MAX_FILE_MIB), it.multi ? 1 : 0,
      Number(it.max_files) || 1, i + 1, 'open', now));
  await env.PORTAL_DB.batch(stmts);
  await writeAudit(env.PORTAL_DB, {
    customer_id: customer.id, actor: actorOf(user), action: 'aanleverlijst_aangemaakt',
    meta: { items: defaults.length }, ip: ipOf(request),
  });
  return jsonResponse({ ok: true, count: defaults.length });
}

// Validates + normalizes item fields shared by add and patch. Returns {fields} or {error}.
function itemFields(b, partial) {
  const f = {};
  if (!partial || b.label !== undefined) {
    f.label = str(b.label);
    if (!f.label || f.label.length > 300) return { error: 'Label is verplicht (max 300 tekens)' };
  }
  if (!partial || b.description !== undefined) f.description = str(b.description).slice(0, 2000) || null;
  if (!partial || b.type !== undefined) {
    f.type = str(b.type);
    if (!ITEM_TYPES.includes(f.type)) return { error: 'Type moet bestand, tekst of ja/nee zijn' };
  }
  if (!partial || b.required !== undefined) f.required = b.required === false || b.required === 0 || b.required === '0' ? 0 : 1;
  if (!partial || b.accepted_ext !== undefined) {
    const exts = str(b.accepted_ext).toLowerCase().split(/[\s,;]+/).map((e) => e.replace(/^\./, '')).filter(Boolean);
    if (exts.some((e) => !/^[a-z0-9]{1,8}$/.test(e))) return { error: 'Ongeldige bestandsextensie' };
    f.accepted_ext = exts.length ? exts.join(',') : null;
  }
  if (!partial || b.max_mb !== undefined) {
    const mb = b.max_mb === undefined || b.max_mb === '' ? MAX_FILE_MIB : Number(b.max_mb);
    if (!Number.isFinite(mb) || mb < 1) return { error: 'Ongeldige maximale bestandsgrootte' };
    f.max_mb = Math.min(Math.floor(mb), MAX_FILE_MIB);
  }
  if (!partial || b.multi !== undefined) f.multi = b.multi === true || b.multi === 1 || b.multi === '1' ? 1 : 0;
  if (!partial || b.max_files !== undefined) {
    const n = b.max_files === undefined || b.max_files === '' ? 1 : Number(b.max_files);
    if (!Number.isFinite(n) || n < 1 || n > 100) return { error: 'Ongeldig maximum aantal bestanden' };
    f.max_files = Math.floor(n);
  }
  if (partial && b.status !== undefined) {
    f.status = str(b.status);
    if (!ITEM_STATUSES.includes(f.status)) return { error: 'Ongeldige status' };
  }
  return { fields: f };
}

async function aanleverItemAdd(request, env, user) {
  const b = await readBody(request);
  const customer = await getCustomer(env, str(b.customer_id));
  if (!customer) return errorResponse('Klant niet gevonden', 404);
  const { fields: f, error } = itemFields(b, false);
  if (error) return errorResponse(error, 400);
  const maxRow = await env.PORTAL_DB
    .prepare('SELECT MAX(order_index) AS m FROM upload_items WHERE customer_id = ?').bind(customer.id).first();
  const id = randomId('upi');
  await env.PORTAL_DB
    .prepare('INSERT INTO upload_items (id, customer_id, label, description, type, required, accepted_ext, max_mb, multi, max_files, order_index, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, customer.id, f.label, f.description, f.type, f.required, f.accepted_ext, f.max_mb, f.multi, f.max_files,
      Number(maxRow?.m || 0) + 1, 'open', Date.now()).run();
  await writeAudit(env.PORTAL_DB, {
    customer_id: customer.id, actor: actorOf(user), action: 'aanlever_item_toegevoegd', meta: { id, label: f.label }, ip: ipOf(request),
  });
  return jsonResponse({ ok: true, id });
}

async function aanleverItemPatch(request, env, user) {
  const b = await readBody(request);
  const item = await env.PORTAL_DB.prepare('SELECT * FROM upload_items WHERE id = ?').bind(str(b.id)).first();
  if (!item) return errorResponse('Item niet gevonden', 404);
  const { fields: f, error } = itemFields(b, true);
  if (error) return errorResponse(error, 400);
  const cols = Object.keys(f);
  if (!cols.length) return errorResponse('Niets om te wijzigen', 400);
  await env.PORTAL_DB
    .prepare(`UPDATE upload_items SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
    .bind(...cols.map((c) => f[c]), item.id).run();
  await writeAudit(env.PORTAL_DB, {
    customer_id: item.customer_id, actor: actorOf(user), action: 'aanlever_item_gewijzigd',
    meta: { id: item.id, velden: cols }, ip: ipOf(request),
  });
  return jsonResponse({ ok: true });
}

async function aanleverItemDelete(request, env, user, url) {
  const item = await env.PORTAL_DB
    .prepare('SELECT id, customer_id, label FROM upload_items WHERE id = ?').bind(str(url.searchParams.get('id'))).first();
  if (!item) return errorResponse('Item niet gevonden', 404);
  const n = await env.PORTAL_DB
    .prepare('SELECT COUNT(*) AS n FROM uploads WHERE upload_item_id = ?').bind(item.id).first();
  if (Number(n?.n || 0) > 0) {
    return errorResponse('Dit item heeft al aangeleverde bestanden. Zet de status op n.v.t. in plaats van het te verwijderen', 409);
  }
  await env.PORTAL_DB.prepare('DELETE FROM upload_items WHERE id = ?').bind(item.id).run();
  await writeAudit(env.PORTAL_DB, {
    customer_id: item.customer_id, actor: actorOf(user), action: 'aanlever_item_verwijderd',
    meta: { id: item.id, label: item.label }, ip: ipOf(request),
  });
  return jsonResponse({ ok: true });
}

async function aanleverBestand(env, url) {
  const up = await env.PORTAL_DB
    .prepare('SELECT id, file_key, original_name, mime FROM uploads WHERE id = ?').bind(str(url.searchParams.get('id'))).first();
  if (!up || !up.file_key || !env.PORTAL_FILES) return errorResponse('Bestand niet gevonden', 404);
  const stored = await env.PORTAL_FILES.getWithMetadata(up.file_key, 'arrayBuffer');
  if (!stored?.value) return errorResponse('Bestand niet gevonden', 404);
  const name = str(up.original_name || stored.metadata?.name || 'bestand').replace(/["\r\n\\]/g, '_');
  return new Response(stored.value, {
    status: 200,
    headers: {
      'Content-Type': up.mime || stored.metadata?.mime || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function aanleverHerinnering(request, env, user) {
  const b = await readBody(request);
  const customer = await getCustomer(env, str(b.customer_id));
  if (!customer) return errorResponse('Klant niet gevonden', 404);
  const open = await env.PORTAL_DB
    .prepare("SELECT COUNT(*) AS n FROM upload_items WHERE customer_id = ? AND status = 'open'").bind(customer.id).first();
  const n = Number(open?.n || 0);
  if (n < 1) return errorResponse('Er staan geen items open', 409);
  const owners = await eigenaarUsers(env, customer.id);
  if (!owners.length) return errorResponse('Klant heeft nog geen eigenaar-account', 409);
  const rl = await rateLimit(env.GOOGLE_TOKENS, `portal:rl:herinnering:${customer.id}`, 3, 24 * 3600);
  if (!rl.allowed) return errorResponse('Er is vandaag al meerdere keren een herinnering gestuurd', 429);

  const link = `${SITE_ORIGIN}/portal/aanleveren/`;
  let mailed = 0;
  for (const o of owners) {
    try {
      await sendMail(env, o.email, o.naam, 'Herinnering: je aanleverlijst bij AanloopAI',
        `<p>Beste ${escapeHtml(str(o.naam).split(' ')[0] || 'daar')},</p>
<p>Er staan nog ${n} items open in je aanleverlijst.</p>
${mailButton(link, 'Naar de aanleverlijst')}`);
      mailed += 1;
    } catch (err) {
      console.error('[overeenkomst-admin] herinnering mail failed:', err?.message || err);
    }
  }
  if (!mailed) return errorResponse('De e-mail kon niet worden verstuurd', 502);
  await writeAudit(env.PORTAL_DB, {
    customer_id: customer.id, actor: actorOf(user), action: 'aanlever_herinnering', meta: { open: n, mailed }, ip: ipOf(request),
  });
  return jsonResponse({ ok: true, open: n, mailed });
}

async function portalAudit(env, url) {
  const customerId = str(url.searchParams.get('customer_id'));
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 1), 500);
  const r = customerId
    ? await env.PORTAL_DB
      .prepare('SELECT id, customer_id, actor, action, meta_json, ip, created_at FROM portal_audit_log WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?')
      .bind(customerId, limit).all()
    : await env.PORTAL_DB
      .prepare('SELECT id, customer_id, actor, action, meta_json, ip, created_at FROM portal_audit_log ORDER BY created_at DESC LIMIT ?')
      .bind(limit).all();
  return jsonResponse({ ok: true, rows: r?.results || [] });
}

// ── AanloopAI signature PNG (kept in D1 portal_assets, never in the public repo) ──
const SIG_KEY = 'handtekening-aanloopai';
const SIG_MAX_BYTES = 200 * 1024;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

function bytesToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function handtekeningUpload(request, env, user) {
  let form;
  try { form = await request.formData(); } catch { return errorResponse('Ongeldig formulier', 400); }
  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function') return errorResponse('Kies een PNG-bestand', 400);
  if (file.size > SIG_MAX_BYTES) return errorResponse('Bestand is te groot (maximaal 200 KB)', 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > SIG_MAX_BYTES) return errorResponse('Bestand is te groot (maximaal 200 KB)', 400);
  if (bytes.length < PNG_MAGIC.length || !PNG_MAGIC.every((b, i) => bytes[i] === b)) {
    return errorResponse('Alleen PNG-bestanden zijn toegestaan', 400);
  }
  const now = Date.now();
  await env.PORTAL_DB
    .prepare('INSERT OR REPLACE INTO portal_assets (key, value_b64, mime, created_at) VALUES (?, ?, ?, ?)')
    .bind(SIG_KEY, bytesToBase64(bytes), 'image/png', now).run();
  await writeAudit(env.PORTAL_DB, {
    customer_id: null, actor: actorOf(user), action: 'handtekening_geupload', meta: { bytes: bytes.length }, ip: ipOf(request),
  });
  return jsonResponse({ ok: true, aanwezig: true, created_at: now });
}

async function handtekeningStatus(env) {
  const row = await env.PORTAL_DB.prepare('SELECT created_at FROM portal_assets WHERE key = ?').bind(SIG_KEY).first();
  return jsonResponse({ ok: true, aanwezig: !!row, created_at: row ? row.created_at : null });
}

async function handtekeningAfbeelding(env) {
  const row = await env.PORTAL_DB.prepare('SELECT value_b64, mime FROM portal_assets WHERE key = ?').bind(SIG_KEY).first();
  if (!row || !row.value_b64) return errorResponse('Geen handtekening aanwezig', 404);
  const bin = atob(row.value_b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, {
    status: 200,
    headers: { 'Content-Type': row.mime || 'image/png', 'Cache-Control': 'private, no-store' },
  });
}

// ── dispatcher ──────────────────────────────────────────────────────────────
export async function handleOvereenkomstAdminApi(request, env, user, url) {
  if (!user || user.role !== 'staff') return errorResponse('Geen toegang', 403);
  await ensurePortaalSchema(env);
  const path = url.pathname;
  const m = request.method;

  if (path === '/api/admin/sjablonen' && m === 'GET') return listSjablonen(env);
  if (path === '/api/admin/sjablonen' && m === 'POST') return createSjabloon(request, env, user);
  if (path === '/api/admin/sjablonen/item' && m === 'GET') return sjabloonItem(env, url);
  if (path === '/api/admin/sjablonen/handtekening' && m === 'POST') return handtekeningUpload(request, env, user);
  if (path === '/api/admin/sjablonen/handtekening' && m === 'GET') return handtekeningStatus(env);
  if (path === '/api/admin/sjablonen/handtekening/afbeelding' && m === 'GET') return handtekeningAfbeelding(env);

  if (path === '/api/admin/overeenkomst/lijst' && m === 'GET') return lijst(env, url);
  if (path === '/api/admin/overeenkomst') {
    if (m === 'POST') return createAgreement(request, env, user);
    if (m === 'PATCH') return patchAgreement(request, env, user);
    if (m === 'GET') return agreementDetail(env, url);
  }
  if (path === '/api/admin/overeenkomst/versturen' && m === 'POST') return versturen(request, env, user);
  if (path === '/api/admin/overeenkomst/annuleren' && m === 'POST') return annuleren(request, env, user);
  if (path === '/api/admin/overeenkomst/pdf' && m === 'GET') return agreementPdf(env, url);

  if (path === '/api/admin/aanlever' && m === 'GET') return aanleverLijst(env, url);
  if (path === '/api/admin/aanlever/seed' && m === 'POST') return aanleverSeed(request, env, user);
  if (path === '/api/admin/aanlever/item') {
    if (m === 'POST') return aanleverItemAdd(request, env, user);
    if (m === 'PATCH') return aanleverItemPatch(request, env, user);
    if (m === 'DELETE') return aanleverItemDelete(request, env, user, url);
  }
  if (path === '/api/admin/aanlever/bestand' && m === 'GET') return aanleverBestand(env, url);
  if (path === '/api/admin/aanlever/herinnering' && m === 'POST') return aanleverHerinnering(request, env, user);

  if (path === '/api/admin/portal-audit' && m === 'GET') return portalAudit(env, url);
  return errorResponse('Niet gevonden', 404);
}

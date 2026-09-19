// Demo-intake (2026-09-19): na een demo-aanvraag weten we WIE, maar niet WAT.
//
// Aanleiding: lead_mu898y0gtymris (nexxt sites) vulde /demo-aanvragen/ in,
// liet "uitdaging" leeg en mailde daarna "ik heb mijn account aangemaakt maar
// kan nergens inloggen". Er ís geen account: een demo is een gesprek. De
// autoresponder zei dat niet, en vroeg ook niet wélke dienst of verwachting.
//
// Wat dit doet:
//  1. Elke demo-aanvraag krijgt één mail: "geen login nodig" + persoonlijke
//     link naar /demo/intake/?t=… (HMAC-token op lead-id, 30 dagen geldig,
//     géén DB-token nodig — zelfde aanpak als de consent-token in worker.js).
//  2. /demo/intake/ stelt vijf korte vragen (dienst, doel, huidige situatie,
//     demo-vorm, moment). Antwoorden → tabel lead_intake, lead-status →
//     in_behandeling, Telegram + staffmail met de samenvatting, bevestiging
//     naar de klant met de link naar /demo-inplannen/.
//  3. Staff kan de mail (opnieuw) sturen vanuit /admin/aanvragen
//     (POST /api/admin/lead-intake-invite) — ook voor leads van vóór deze
//     feature.
//
// Schema wordt bij eerste gebruik aangemaakt (CREATE TABLE IF NOT EXISTS,
// zoals visibility.js/discovery.js): er is geen lokale wrangler-auth om
// migraties remote toe te passen. migrations/0021_lead_intake.sql is de
// referentiekopie.
import { escapeHtml } from './escape.js';
import { notifyTelegram, alertStaff } from './notify.js';

export const SITE_ORIGIN = 'https://aanloopai.nl';
export const INTAKE_PATH = '/demo/intake/';
export const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_PURPOSE = 'demo-intake';
const MAX_TEXT = 1500;

// Vragen. `name` is de sleutel in answers_json; `options` zijn de enige
// geldige waarden voor select/multiselect (server-side afgedwongen).
export const DEMO_INTAKE_SCHEMA = [
  {
    name: 'dienst', type: 'multiselect', required: true,
    label: 'Waar wilt u de demo over zien?',
    hint: 'Meerdere antwoorden mogelijk.',
    options: [
      'Emma — AI-telefonist / chat-assistent die aanvragen en afspraken afhandelt',
      'Leads — nieuwe klanten of aanvragen in mijn branche',
      'Website of online zichtbaarheid (SEO, Google-vindbaarheid)',
      'Automatisering van administratie of terugkerend werk',
      'Weet ik nog niet — adviseer mij',
    ],
  },
  {
    name: 'doel', type: 'textarea', required: true,
    label: 'Wat wilt u dat er anders gaat na de demo?',
    hint: 'Bijv. "we missen telefoontjes buiten kantooruren" of "we willen meer aanvragen uit Rotterdam".',
  },
  {
    name: 'huidig', type: 'textarea', required: false,
    label: 'Hoe gaat dat nu?',
    hint: 'Wie pakt aanvragen of telefoontjes nu op, en waar loopt het vast?',
  },
  {
    name: 'vorm', type: 'select', required: true,
    label: 'Welke vorm van demo past het best?',
    options: [
      'Live demo van 30 minuten (videobellen), afgestemd op mijn situatie',
      'Zelf uitproberen met een proefomgeving',
      'Eerst een prijsindicatie, daarna beslissen over een demo',
    ],
  },
  {
    name: 'moment', type: 'text', required: false,
    label: 'Wanneer schikt het u?',
    hint: 'Bijv. "dinsdag- of donderdagochtend" — wij plannen dan het moment in.',
  },
];

// ── token (HMAC-SHA256 over base64url-payload, zelfde vorm als consent-token)
const enc = new TextEncoder();
function b64urlEncode(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(s + '='.repeat((4 - (s.length % 4)) % 4))));
}
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
function bytesToHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function signIntakeToken(leadId, secret, now = Date.now()) {
  const body = b64urlEncode(JSON.stringify({ lead: leadId, purpose: TOKEN_PURPOSE, exp: now + TOKEN_TTL_MS }));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body));
  return `${body}.${bytesToHex(sig)}`;
}

// → { leadId } of null (ongeldig, verlopen, verkeerd doel). Constant-time verify.
export async function verifyIntakeToken(token, secret, now = Date.now()) {
  if (!token || typeof token !== 'string' || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sigHex] = parts;
  if (!body || !/^[0-9a-f]{64}$/.test(sigHex)) return null;
  const sig = Uint8Array.from(sigHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), sig, enc.encode(body));
  if (!ok) return null;
  let payload;
  try { payload = JSON.parse(b64urlDecode(body)); } catch { return null; }
  if (payload?.purpose !== TOKEN_PURPOSE || typeof payload.lead !== 'string' || !payload.lead || !payload.exp) return null;
  if (now > payload.exp) return null;
  return { leadId: payload.lead };
}

export function intakeLink(token, origin = SITE_ORIGIN) {
  return `${origin}${INTAKE_PATH}?t=${encodeURIComponent(token)}`;
}

// ── schema (runtime, idempotent) ───────────────────────────────────────────
const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS lead_intake (
    lead_id      TEXT PRIMARY KEY,
    mail_at      INTEGER,
    mail_count   INTEGER NOT NULL DEFAULT 0,
    answered_at  INTEGER,
    answers_json TEXT
  )`,
];
let schemaReady = false;
export async function ensureIntakeSchema(env) {
  if (schemaReady || !env?.PORTAL_DB) return;
  for (const sql of SCHEMA_SQL) await env.PORTAL_DB.prepare(sql).run();
  schemaReady = true;
}
export function _resetSchemaFlagForTests() { schemaReady = false; }

// ── mail: uitnodiging ──────────────────────────────────────────────────────
export const INVITE_SUBJECT = 'Uw demo-aanvraag is ontvangen — nog 2 minuten van u nodig';

// Inner-HTML (de aanroeper zet er de mail-layout omheen). Zegt expliciet dat
// er géén account of login is: dát was de verwarring die dit veroorzaakte.
export function buildIntakeInviteHtml(firstName, link) {
  const safeLink = escapeHtml(link);
  return `<p>Hallo ${escapeHtml(firstName || 'daar')},</p>
    <p>Bedankt voor uw demo-aanvraag bij Aanloop AI. Uw gegevens zijn goed ontvangen.</p>
    <p><strong>Goed om te weten: u hoeft nergens in te loggen en er is geen account of wachtwoord.</strong> Een demo bij ons is een persoonlijk gesprek van 30 minuten waarin we live laten zien wat AI voor úw bedrijf doet — geen standaardpresentatie.</p>
    <p>Om die demo goed voor te bereiden hebben we nog vijf korte vragen (2 minuten): welke dienst u wilt zien, wat u ermee wilt bereiken en welke vorm van demo u past.</p>
    <p style="margin:28px 0"><a href="${safeLink}" style="display:inline-block;background:#4f46e5;color:#fff;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:600">Vragen beantwoorden (2 min)</a></p>
    <p style="font-size:13px;color:#64748b">Werkt de knop niet? Kopieer deze link naar uw browser:<br><span style="word-break:break-all">${safeLink}</span></p>
    <p>Liever direct bellen of een moment kiezen? Antwoord op deze mail of bel <a href="tel:+31624741597">+31 6 24 74 15 97</a>. Na uw antwoorden nemen wij binnen 1 werkdag contact op om de demo in te plannen.</p>
    <p>Met vriendelijke groet,<br>Het team van Aanloop AI</p>`;
}

// Stuurt de uitnodiging en registreert dat in lead_intake. `sendMailFn` is
// (env, to, naam, subject, innerHtml) — worker.js en admin-routes.js hebben
// elk hun eigen Brevo-wrapper; die geven ze hier door. Gooit bij mailfout.
export async function sendIntakeInvite(env, lead, sendMailFn, { origin = SITE_ORIGIN } = {}) {
  if (!env.PORTAL_SESSION_SECRET) throw new Error('PORTAL_SESSION_SECRET niet geconfigureerd');
  const token = await signIntakeToken(lead.id, env.PORTAL_SESSION_SECRET);
  const link = intakeLink(token, origin);
  const firstName = (lead.naam || '').split(' ')[0] || 'daar';
  await sendMailFn(env, lead.email, lead.naam || lead.email, INVITE_SUBJECT, buildIntakeInviteHtml(firstName, link));
  await ensureIntakeSchema(env);
  await env.PORTAL_DB.prepare(
    `INSERT INTO lead_intake (lead_id, mail_at, mail_count) VALUES (?, ?, 1)
     ON CONFLICT(lead_id) DO UPDATE SET mail_at = excluded.mail_at, mail_count = mail_count + 1`,
  ).bind(lead.id, Date.now()).run();
  return link;
}

// ── antwoorden valideren ───────────────────────────────────────────────────
// → { ok: true, answers } of { ok: false, error }. Onbekende sleutels vallen
// weg; select/multiselect alleen uit `options`; vrije tekst afgekapt.
export function validateIntakeAnswers(input) {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Geen antwoorden ontvangen.' };
  const answers = {};
  for (const q of DEMO_INTAKE_SCHEMA) {
    let v = input[q.name];
    if (q.type === 'multiselect') {
      const arr = Array.isArray(v) ? v : (typeof v === 'string' && v ? [v] : []);
      const clean = [...new Set(arr.map((x) => String(x)))].filter((x) => q.options.includes(x));
      if (q.required && !clean.length) return { ok: false, error: `Kies minimaal één antwoord bij "${q.label}".` };
      if (clean.length) answers[q.name] = clean;
      continue;
    }
    v = v == null ? '' : String(v).trim();
    if (q.type === 'select') {
      if (v && !q.options.includes(v)) return { ok: false, error: `Ongeldige keuze bij "${q.label}".` };
    } else {
      v = v.slice(0, MAX_TEXT);
    }
    if (q.required && !v) return { ok: false, error: `Vul "${q.label}" in.` };
    if (v) answers[q.name] = v;
  }
  return { ok: true, answers };
}

// Korte samenvatting voor Telegram/staffmail/admin: label: antwoord per vraag.
export function summarizeIntake(answers = {}) {
  const lines = [];
  for (const q of DEMO_INTAKE_SCHEMA) {
    const v = answers[q.name];
    if (v == null || (Array.isArray(v) && !v.length) || v === '') continue;
    const text = Array.isArray(v) ? v.map((x) => x.split(' — ')[0]).join(', ') : String(v);
    lines.push(`${q.label.replace(/\?$/, '')}: ${text.slice(0, 300)}`);
  }
  return lines;
}

export function formatIntakeTelegram(lead, answers) {
  return [
    `✅ Demo-intake beantwoord — ${lead.naam || '-'} <${lead.email}>`,
    lead.bedrijf ? `Bedrijf: ${lead.bedrijf}` : null,
    lead.telefoon ? `Tel: ${lead.telefoon}` : null,
    ...summarizeIntake(answers),
    `→ aanloopai.nl/admin/aanvragen (lead ${lead.id})`,
  ].filter(Boolean).join('\n');
}

function buildIntakeThanksHtml(firstName, answers) {
  const rows = summarizeIntake(answers).map((l) => `<li>${escapeHtml(l)}</li>`).join('');
  return `<p>Hallo ${escapeHtml(firstName || 'daar')},</p>
    <p>Bedankt, uw antwoorden zijn binnen. Wij nemen binnen 1 werkdag contact op om de demo in te plannen en bereiden hem voor op basis van wat u aangaf:</p>
    <ul style="color:#334155;font-size:14px;line-height:1.6">${rows}</ul>
    <p>Wilt u zelf alvast een moment kiezen? Dat kan via <a href="${SITE_ORIGIN}/demo-inplannen/">aanloopai.nl/demo-inplannen</a>.</p>
    <p>Met vriendelijke groet,<br>Het team van Aanloop AI</p>`;
}

// ── HTTP: GET /api/demo-intake?t=…  |  POST /api/demo-intake {t, answers}
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

async function loadLead(env, leadId) {
  await ensureIntakeSchema(env);
  return env.PORTAL_DB.prepare(
    `SELECT l.id, l.email, l.naam, l.bedrijf, l.telefoon, l.form_type, l.status, i.answered_at
       FROM inbound_leads l LEFT JOIN lead_intake i ON i.lead_id = l.id WHERE l.id = ?`,
  ).bind(leadId).first();
}

export async function handleDemoIntake(request, env, { sendMailFn } = {}) {
  if (!env.PORTAL_DB || !env.PORTAL_SESSION_SECRET) return json({ ok: false, error: 'Niet geconfigureerd' }, 503);
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const v = await verifyIntakeToken(url.searchParams.get('t'), env.PORTAL_SESSION_SECRET);
    if (!v) return json({ ok: false, error: 'Deze link is ongeldig of verlopen. Vraag een nieuwe aan via hello@aanloopai.nl.' }, 400);
    const lead = await loadLead(env, v.leadId);
    if (!lead) return json({ ok: false, error: 'Aanvraag niet gevonden.' }, 404);
    return json({
      ok: true,
      lead: { voornaam: (lead.naam || '').split(' ')[0] || '', bedrijf: lead.bedrijf || '', answered: !!lead.answered_at },
      schema: DEMO_INTAKE_SCHEMA,
    });
  }

  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
  const origin = request.headers.get('Origin');
  if (origin && origin !== SITE_ORIGIN) return json({ ok: false, error: 'Verboden (origin)' }, 403);
  const body = await request.json().catch(() => null);
  const v = await verifyIntakeToken(body?.t, env.PORTAL_SESSION_SECRET);
  if (!v) return json({ ok: false, error: 'Deze link is ongeldig of verlopen.' }, 400);
  const check = validateIntakeAnswers(body?.answers);
  if (!check.ok) return json({ ok: false, error: check.error }, 400);
  const lead = await loadLead(env, v.leadId);
  if (!lead) return json({ ok: false, error: 'Aanvraag niet gevonden.' }, 404);

  // Systeem van record eerst; alles daarna is best-effort melding.
  const now = Date.now();
  await env.PORTAL_DB.prepare(
    `INSERT INTO lead_intake (lead_id, answered_at, answers_json) VALUES (?, ?, ?)
     ON CONFLICT(lead_id) DO UPDATE SET answered_at = excluded.answered_at, answers_json = excluded.answers_json`,
  ).bind(lead.id, now, JSON.stringify(check.answers)).run();
  if (lead.status === 'nieuw') {
    await env.PORTAL_DB.prepare("UPDATE inbound_leads SET status = 'in_behandeling' WHERE id = ? AND status = 'nieuw'").bind(lead.id).run();
  }

  await notifyTelegram(env, formatIntakeTelegram(lead, check.answers));
  await alertStaff(env, `Demo-intake beantwoord — ${lead.bedrijf || lead.naam || lead.email}`,
    `${lead.naam || '-'} <${lead.email}>${lead.telefoon ? ` · ${lead.telefoon}` : ''}\n\n${summarizeIntake(check.answers).join('\n')}\n\n→ ${SITE_ORIGIN}/admin/aanvragen (lead ${lead.id})`);
  if (sendMailFn) {
    try {
      const firstName = (lead.naam || '').split(' ')[0] || 'daar';
      await sendMailFn(env, lead.email, lead.naam || lead.email, 'Uw antwoorden zijn binnen — wij plannen de demo in', buildIntakeThanksHtml(firstName, check.answers));
    } catch (err) {
      console.error('[demo-intake] bevestigingsmail mislukt (antwoorden zijn bewaard):', err?.message || err);
    }
  }
  return json({ ok: true, message: 'Bedankt, uw antwoorden zijn ontvangen.' });
}

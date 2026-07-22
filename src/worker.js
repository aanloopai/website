// Cloudflare Worker entry point for aanloopai.nl
// Handles /api/submit (Brevo email) and falls through to static assets
//
// Required env var (Cloudflare Workers → Settings → Variables):
//   BREVO_API_KEY = xkeysib-...
// Optional env var (enables lead-capture into a Brevo marketing list):
//   BREVO_LIST_ID = <numeric Brevo list id>
//   Custom Brevo contact attributes must exist: BEDRIJF, SECTOR, TELEFOON,
//   FUNCTIE, SOURCE, OPT_IN_DATE (date), MARKETING_CONSENT (boolean).
// Required binding (wrangler.toml [assets] block):
//   binding = "ASSETS"
//
// Native Google Calendar booking — additional bindings required:
//   KV namespace GOOGLE_TOKENS, env GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET /
//   GOOGLE_OAUTH_INIT_KEY (+ optional BOOKING_CALENDAR_ID)

import {
  handleAvailability,
  handleBook,
  handleGoogleInitiate,
  handleGoogleCallback,
} from './lib/calendar-routes.js';
import {
  handleAuthRequest,
  handleAuthPasswordLogin,
  handleAuthVerify,
  handleAuthLogout,
  handleInviteAccept,
  handlePortalApi,
} from './lib/portal-routes.js';
import { handleAdminApi } from './lib/admin-routes.js';
import { handleMollieWebhook, reconcilePayments, billMonthlySubscriptions } from './lib/mollie.js';
import { handleMcp } from './lib/mcp.js';
import { rateLimit } from './lib/rate-limit.js';
import { escapeHtml } from './lib/escape.js';
import { alertStaff } from './lib/notify.js';
import { countVandaagProspects, prospectsNeedingFollowupDraft, generateFollowupDraft, outreachImport } from './lib/outreach.js';
import { isWerkdag } from './lib/crm.js';
import { aiSignalScan } from './lib/ai-crm.js';
import { maakVoorstel, leesVoorstelViaToken } from './lib/voorstel-store.js';
import { handleVoorstelClaim } from './lib/voorstel-claim.js';

const NOTIFICATION_EMAIL = 'hello@aanloopai.nl';
const SENDER_EMAIL = 'hello@aanloopai.nl';
const SENDER_NAME = 'Aanloop AI';
// Same value as SITE_ORIGIN in portal-routes.js — kept as a separate constant
// here so worker.js stays self-contained (no cross-file import for a single string).
const SITE_ORIGIN = 'https://aanloopai.nl';

const AUTORESPONSE_TEMPLATES = {
  demo: {
    subject: 'Bedankt voor uw demo-aanvraag — Aanloop AI',
    intro: 'Bedankt voor uw demo-aanvraag bij Aanloop AI.',
    body: 'We hebben uw gegevens goed ontvangen en plannen binnen 1 werkdag een 30-minuten demo in waarin we live laten zien hoe AI agents werken voor uw situatie.',
  },
  aanvraag: {
    subject: 'Bedankt voor uw aanvraag — Aanloop AI',
    intro: 'Bedankt voor uw aanvraag bij Aanloop AI.',
    body: 'We nemen binnen 1 werkdag contact met u op om uw aanvraag verder te bespreken en een onboarding-traject in te plannen.',
  },
  scan: {
    subject: 'Bedankt voor uw AI-scan aanvraag — Aanloop AI',
    intro: 'Bedankt voor uw aanvraag voor een gratis AI-scan bij Aanloop AI.',
    body: 'We nemen binnen 1 werkdag contact met u op om een 30-minuten remote sessie in te plannen. Hierin analyseren we uw bedrijfsprocessen en laten we zien waar AI concrete besparingen oplevert — met indicatieve cijfers voor uw situatie.',
  },
  contact: {
    subject: 'Bedankt voor uw bericht — Aanloop AI',
    intro: 'Bedankt voor uw bericht bij Aanloop AI.',
    body: 'We hebben uw bericht goed ontvangen en nemen zo snel mogelijk contact met u op.',
  },
  newsletter: {
    subject: 'Welkom bij de Aanloop AI nieuwsbrief',
    intro: 'Bedankt voor uw aanmelding voor onze nieuwsbrief.',
    body: 'U ontvangt maandelijks een mail met praktische AI-tips, sector-cases en nieuwe gidsen uit onze kennisbank. Geen spam — altijd direct afmeldbaar via de link onderaan elke mail.',
  },
  roi_calculator: {
    subject: 'Uw ROI-rapport — Aanloop AI',
    intro: 'Bedankt voor het gebruik van onze ROI-calculator.',
    body: 'Hieronder vindt u uw persoonlijke ROI-berekening. We nemen binnen 14 dagen vrijblijvend contact op om te kijken of een gratis 30-min AI-scan zinvol is voor uw situatie.',
  },
  ai_readiness_scan: {
    subject: 'Uw AI-Readiness rapport — Aanloop AI',
    intro: 'Bedankt voor het invullen van onze AI-Readiness Scan.',
    body: 'Hieronder vindt u uw persoonlijke AI-Readiness rapport met score, tier-classificatie en concrete aanbevelingen. We nemen binnen 14 dagen vrijblijvend contact op om te kijken of een gratis 30-min strategiegesprek zinvol is voor uw situatie.',
  },
  survey_ai_adoption: {
    subject: 'Bedankt voor uw deelname — AI-adoptie onderzoek MKB Nederland 2026',
    intro: 'Bedankt voor uw deelname aan ons AI-adoptie onderzoek 2026.',
    body: 'Uw antwoorden zijn goed ontvangen. Binnen 2 werkdagen ontvangt u een persoonlijke benchmark-score van uw AI-volwassenheid versus uw sector. Het volledige onderzoeksrapport publiceren we in september 2026 — u ontvangt automatisch de pre-publicatie versie. Mocht u een gratis 30-min strategiegesprek hebben aangevinkt, dan plant onze CEO Mustafa Agah Dogan dit binnen 1 werkweek met u in.',
  },
};

const ROI_REPORT_KEYS = [
  ['sector', 'Sector'],
  ['calls_per_day', 'Inkomende calls per dag'],
  ['missed_percentage', 'Gemiste / slecht-afgehandeld'],
  ['client_value', 'Gemiddelde klantwaarde'],
  ['manual_hours_per_week', 'Handmatig werk'],
  ['hourly_rate', 'Uurtarief medewerkers'],
];

const ROI_RESULT_KEYS = [
  ['annual_saving', 'Geschatte jaarlijkse besparing'],
  ['recommended_tier', 'Aanbevolen Aanloop AI pakket'],
  ['payback_months', 'Terugverdientijd'],
  ['fte_equivalent', 'FTE-equivalent bespaard'],
  ['extra_appointments_per_month', 'Extra afspraken/maand'],
  ['net_roi_year1', 'Netto ROI jaar 1'],
];

// AI-Readiness Scan — antwoord-keys voor email-rapport
const SCAN_ANSWER_KEYS = [
  ['scan_sector', 'Sector'],
  ['scan_company_size', 'Bedrijfsgrootte'],
  ['scan_tools', 'Huidige tools'],
  ['scan_pains', 'Pijnpunten'],
  ['scan_phone_volume', 'Telefoon-volume per dag'],
  ['scan_manual_hours', 'Handmatige uren per week'],
  ['scan_budget', 'Maandelijks AI-budget'],
  ['scan_urgency', 'Urgentie'],
  ['scan_avg', 'AVG / GDPR-status'],
  ['scan_ai_exp', 'Eerdere AI-ervaring'],
  ['scan_data_quality', 'Datakwaliteit'],
];

const FOOTER_HTML = `
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
<p style="font-size:12px;color:#64748b;line-height:1.5">
  <strong>Aanloop AI</strong> — AI-oplossingen voor het Nederlandse MKB<br>
  <a href="mailto:hello@aanloopai.nl" style="color:#4f46e5">hello@aanloopai.nl</a> ·
  <a href="https://aanloopai.nl" style="color:#4f46e5">aanloopai.nl</a> ·
  KvK 88606902
</p>`;

// Applied to /api/submit, /api/geo-scan, /api/calendar/*, /api/auth/request —
// all same-origin form/fetch POSTs from aanloopai.nl itself, so cross-origin
// access is never legitimately needed here. Was '*' (wildcard) — narrowed to
// the site origin so a third-party page cannot POST to these endpoints from
// script and read the response (H1/H2/H3 hardening).
const CORS_HEADERS = {
  'access-control-allow-origin': SITE_ORIGIN,
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

// Cookie-authenticated endpoints — origin locked to aanloopai.nl + credentialed.
const PORTAL_CORS_HEADERS = {
  'access-control-allow-origin': 'https://aanloopai.nl',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-credentials': 'true',
  vary: 'Origin',
};

// Security headers — applied to all asset responses.
// Mirrors public/_headers, which Cloudflare Workers-with-Assets does not honor for HTML routes.
// Source-of-truth lives here in the Worker; _headers is kept for Pages-style fallback only.
const CSP_POLICY = "default-src 'self' blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://www.googletagmanager.com https://www.google-analytics.com https://unpkg.com https://cdn.jsdelivr.net https://elevenlabs.io https://*.elevenlabs.io https://www.clarity.ms; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://api.web3forms.com https://*.elevenlabs.io wss://*.elevenlabs.io https://*.livekit.cloud wss://*.livekit.cloud https://www.clarity.ms; media-src 'self' blob: data: https://*.elevenlabs.io; worker-src 'self' blob: https://unpkg.com https://*.elevenlabs.io; child-src 'self' blob: https://*.elevenlabs.io; frame-ancestors 'none'; frame-src https://*.elevenlabs.io;";

const SECURITY_HEADERS = {
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(self), geolocation=(self)',
  'content-security-policy': CSP_POLICY,
};

function cacheControlFor(pathname) {
  if (pathname.startsWith('/_astro/') || pathname.startsWith('/brand/') || pathname.startsWith('/fonts/')) {
    return 'public, max-age=31536000, immutable';
  }
  if (pathname === '/sitemap.xml' || pathname === '/image-sitemap.xml' || pathname === '/llms.txt' || pathname === '/llms-full.txt') {
    return 'public, max-age=300, s-maxage=3600';
  }
  if (pathname === '/robots.txt') {
    return 'public, max-age=3600, s-maxage=86400';
  }
  if (pathname === '/humans.txt') {
    return 'public, max-age=86400';
  }
  return 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';
}

function applySecurityHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    headers.set(k, v);
  }
  headers.set('cache-control', cacheControlFor(pathname));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Caps against pathological/abusive submissions (huge field count or huge
// field values) inflating the outgoing notification email (L7 hardening).
const MAX_NOTIFICATION_FIELDS = 40;
const MAX_FIELD_VALUE_LENGTH = 2000;

function buildNotificationHtml(formType, fields, userEmail, userName) {
  const skipKeys = ['type', 'form_type', 'access_key', 'subject', 'from_name', 'replyto', 'redirect', 'source', 'botcheck'];
  const rows = Object.entries(fields)
    .filter(([k, v]) => v && !skipKeys.includes(k))
    .slice(0, MAX_NOTIFICATION_FIELDS)
    .map(([k, v]) => `<tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;width:180px">${escapeHtml(k.toString().slice(0, MAX_FIELD_VALUE_LENGTH))}</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${escapeHtml(v.toString().slice(0, MAX_FIELD_VALUE_LENGTH))}</td></tr>`)
    .join('');
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
    <h1 style="font-size:20px;margin:0 0 16px">Nieuwe ${escapeHtml(formType)} via aanloopai.nl</h1>
    <p style="color:#475569">Van: <strong>${escapeHtml(userName)}</strong> &lt;${escapeHtml(userEmail)}&gt;</p>
    <table style="border-collapse:collapse;width:100%;margin-top:16px;font-size:14px">${rows}</table>
    ${FOOTER_HTML}
  </body></html>`;
}

function buildAutoresponseHtml(template, userName) {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
    <p>Hallo ${escapeHtml(userName)},</p>
    <p>${escapeHtml(template.intro)}</p>
    <p>${escapeHtml(template.body)}</p>
    <p>Met vriendelijke groet,<br>Het team van Aanloop AI</p>
    ${FOOTER_HTML}
  </body></html>`;
}

function buildRoiReportRows(fields, keyPairs) {
  return keyPairs
    .filter(([k]) => fields[k])
    .map(([k, label]) => `<tr><td style="padding:10px 14px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;width:55%">${escapeHtml(label)}</td><td style="padding:10px 14px;border:1px solid #e2e8f0;text-align:right;font-weight:600;color:#0f172a">${escapeHtml(fields[k])}</td></tr>`)
    .join('');
}

function buildRoiAutoresponseHtml(template, userName, fields) {
  const inputRows = buildRoiReportRows(fields, ROI_REPORT_KEYS);
  const resultRows = buildRoiReportRows(fields, ROI_RESULT_KEYS);
  const headlineSaving = escapeHtml(fields.annual_saving || '—');
  const headlineTier = escapeHtml(fields.recommended_tier || 'Op aanvraag');

  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
    <p style="margin:0 0 16px">Hallo ${escapeHtml(userName)},</p>
    <p style="margin:0 0 16px">${escapeHtml(template.intro)}</p>

    <div style="background:#0f172a;color:#fff;padding:24px;border-radius:16px;margin:24px 0">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin:0 0 6px">Geschatte jaarlijkse besparing</p>
      <p style="font-size:36px;font-weight:700;margin:0;color:#fff">${headlineSaving}</p>
      <p style="font-size:12px;color:#94a3b8;margin:8px 0 0">Bij ${headlineTier}</p>
    </div>

    <h2 style="font-size:14px;color:#0f172a;margin:24px 0 8px">Uw resultaten</h2>
    <table style="border-collapse:collapse;width:100%;font-size:13px">${resultRows}</table>

    <h2 style="font-size:14px;color:#0f172a;margin:24px 0 8px">Uw invoer</h2>
    <table style="border-collapse:collapse;width:100%;font-size:13px">${inputRows}</table>

    <p style="margin:24px 0 16px;color:#475569;font-size:14px;line-height:1.6">${escapeHtml(template.body)}</p>

    <p style="margin:24px 0">
      <a href="https://aanloopai.nl/gratis-ai-scan/" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Gratis AI Scan aanvragen →</a>
    </p>

    <p style="font-size:12px;color:#64748b;margin:16px 0">Berekeningen zijn schattingen op basis van sector-benchmarks en gemiddelden. Werkelijke resultaten kunnen afwijken — een gratis AI-scan levert een nauwkeurige op-maat berekening.</p>

    <p style="margin:24px 0 0">Met vriendelijke groet,<br>Het team van Aanloop AI</p>
    ${FOOTER_HTML}
  </body></html>`;
}

function buildScanAutoresponseHtml(template, userName, fields) {
  const answerRows = SCAN_ANSWER_KEYS
    .filter(([k]) => fields[k])
    .map(([k, label]) => `<tr><td style="padding:10px 14px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;width:45%">${escapeHtml(label)}</td><td style="padding:10px 14px;border:1px solid #e2e8f0;color:#0f172a">${escapeHtml(fields[k])}</td></tr>`)
    .join('');
  const score = escapeHtml(fields.scan_score || '—');
  const tier = escapeHtml(fields.scan_tier || '—');
  const headline = escapeHtml(fields.scan_headline || '—');
  const actionsList = (fields.scan_actions || '').split('|').map(s => s.trim()).filter(Boolean);
  const actionsHtml = actionsList.length
    ? actionsList.map((a, i) => `<li style="margin:8px 0;padding-left:8px"><strong style="color:#4f46e5">${i + 1}.</strong> ${escapeHtml(a)}</li>`).join('')
    : '<li>Geen specifieke acties.</li>';
  const sectorAdv = fields.scan_sector_advice && fields.scan_sector_advice !== '—'
    ? `<p style="margin:16px 0;padding:12px 16px;background:#eef2ff;border-left:3px solid #4f46e5;border-radius:6px;font-size:13px;color:#475569"><strong style="color:#0f172a">Voor uw sector:</strong> ${escapeHtml(fields.scan_sector_advice)}.</p>`
    : '';

  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
    <p style="margin:0 0 16px">Hallo ${escapeHtml(userName)},</p>
    <p style="margin:0 0 16px">${escapeHtml(template.intro)}</p>

    <div style="background:#0f172a;color:#fff;padding:24px;border-radius:16px;margin:24px 0">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;margin:0 0 6px">Uw AI-Readiness Score</p>
      <p style="font-size:42px;font-weight:700;margin:0;color:#fff;line-height:1">${score}</p>
      <p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#34d399;margin:12px 0 4px;font-weight:600">${tier} tier</p>
      <p style="font-size:16px;font-weight:600;color:#fff;margin:0">${headline}</p>
    </div>

    <h2 style="font-size:14px;color:#0f172a;margin:24px 0 12px;text-transform:uppercase;letter-spacing:1px">Aanbevolen volgende stappen</h2>
    <ol style="padding-left:20px;margin:0;font-size:14px;color:#334155;line-height:1.6">${actionsHtml}</ol>
    ${sectorAdv}

    <h2 style="font-size:14px;color:#0f172a;margin:32px 0 8px;text-transform:uppercase;letter-spacing:1px">Uw antwoorden</h2>
    <table style="border-collapse:collapse;width:100%;font-size:13px">${answerRows}</table>

    <p style="margin:24px 0 16px;color:#475569;font-size:14px;line-height:1.6">${escapeHtml(template.body)}</p>

    <p style="margin:24px 0">
      <a href="https://aanloopai.nl/contact/" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Plan een 30-min strategiegesprek →</a>
    </p>

    <p style="font-size:12px;color:#64748b;margin:16px 0">De score is gebaseerd op gewogen criteria die in de MKB-praktijk effectief bleken. Voor een nauwkeurige op-maat analyse adviseren we onze 30-min videocall AI-scan.</p>

    <p style="margin:24px 0 0">Met vriendelijke groet,<br>Het team van Aanloop AI</p>
    ${FOOTER_HTML}
  </body></html>`;
}

// --- /api/intake: pre-sale intake wizard (aanloopai.nl/start) ---------------
// Stores every submission durably in D1 first, then best-effort forwards to
// Hetzner/fleetclaw (INTAKE_WEBHOOK_URL, HMAC-signed). A forward failure never
// blocks the success response to the browser — the row already exists in D1
// with forwarded=0. See migrations/0014_intake_requests.sql.
const INTAKE_ALLOWED_SERVICES = new Set(['agenda-assistant', 'voice-agent', 'whatsapp-bot', 'ai-scan-consult']);
const INTAKE_MAX_ANSWERS_JSON_LENGTH = 8000;

// Generic HMAC-SHA256 hex signer — intentionally separate from
// signConsentToken/verifyConsentToken above (those sign a specific
// {email,purpose,exp} shape for the double opt-in flow). This one signs an
// arbitrary raw string (the outgoing webhook body) so Hetzner can verify the
// X-Intake-Signature header against the exact bytes it received.
async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function handleIntake(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (request.method !== 'POST') return jsonResponse({ success: false, message: 'Use POST' }, 405);

  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  const intakeRl = await rateLimit(env.GOOGLE_TOKENS, `rl:intake:${clientIp}`, 5, 600);
  if (!intakeRl.allowed) {
    return jsonResponse({ success: false, message: 'Te veel aanvragen vanaf dit IP-adres. Probeer het over enkele minuten opnieuw.' }, 429);
  }

  if (!env.PORTAL_DB) {
    return jsonResponse({ success: false, message: 'Database niet geconfigureerd' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, message: 'Ongeldige JSON' }, 400);
  }

  const serviceId = String((body && body.service_id) || '').trim();
  if (!INTAKE_ALLOWED_SERVICES.has(serviceId)) {
    return jsonResponse({ success: false, message: 'Ongeldige dienst geselecteerd.' }, 400);
  }

  const customerIn = (body && typeof body.customer === 'object' && body.customer) || {};
  const email = String(customerIn.email || '').trim();
  if (!isValidEmail(email)) {
    return jsonResponse({ success: false, message: 'Ongeldig e-mailadres.' }, 400);
  }
  const name = String(customerIn.name || '').trim().slice(0, 200);
  if (!name) {
    return jsonResponse({ success: false, message: 'Naam is verplicht.' }, 400);
  }
  const company = String(customerIn.company || '').trim().slice(0, 200);
  const phone = String(customerIn.phone || '').trim().slice(0, 40);
  const lang = (String(customerIn.lang || 'nl').trim().slice(0, 5) || 'nl');

  // Server-side consent gate — a client-declared `true` is still required
  // input validation (same posture as the checkbox on every other form in
  // this file), not a substitute for it being present at all.
  if (body?.consent !== true) {
    return jsonResponse({ success: false, message: 'Toestemming voor gegevensverwerking is verplicht.' }, 400);
  }

  const answersIn = (body && typeof body.answers === 'object' && body.answers) || {};
  const answersJson = JSON.stringify(answersIn);
  if (answersJson.length > INTAKE_MAX_ANSWERS_JSON_LENGTH) {
    return jsonResponse({ success: false, message: 'Uw antwoorden zijn te lang. Kort ze in en probeer het opnieuw.' }, 413);
  }
  const customer = { email, name, company, phone, lang };
  const customerJson = JSON.stringify(customer);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    await env.PORTAL_DB.prepare(
      `INSERT INTO intake_requests (id, service_id, customer_json, answers_json, consent, forwarded, created_at) VALUES (?, ?, ?, ?, 1, 0, ?)`
    ).bind(id, serviceId, customerJson, answersJson, createdAt).run();
  } catch (err) {
    console.error('[/api/intake] D1 insert failed:', err.message || err);
    return jsonResponse({ success: false, message: 'Opslaan van uw aanvraag is mislukt — probeer het opnieuw.' }, 500);
  }

  // Best-effort forward. Never blocks the success response below — the row is
  // already durable in D1 (forwarded=0 on any failure here, incl. missing env).
  if (env.INTAKE_WEBHOOK_URL && env.INTAKE_WEBHOOK_SECRET) {
    try {
      const forwardPayload = JSON.stringify({
        service_id: serviceId,
        customer,
        answers: answersIn,
        source: 'aanloopai.nl/start',
        consent: true,
        ts: createdAt,
      });
      const signature = await hmacSha256Hex(env.INTAKE_WEBHOOK_SECRET, forwardPayload);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      let res;
      try {
        res = await fetch(env.INTAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-intake-signature': `sha256=${signature}` },
          body: forwardPayload,
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(t);
      }
      if (res.ok) {
        await env.PORTAL_DB.prepare(`UPDATE intake_requests SET forwarded = 1 WHERE id = ?`).bind(id).run();
      } else {
        console.error(`[/api/intake] webhook forward non-2xx (row kept forwarded=0, id=${id}):`, res.status);
      }
    } catch (err) {
      console.error(`[/api/intake] webhook forward failed — non-fatal, row kept forwarded=0 for later retry (id=${id}):`, err.message || err);
    }
  } else {
    console.log('[/api/intake] INTAKE_WEBHOOK_URL/INTAKE_WEBHOOK_SECRET not configured — forward skipped (local/dev), row kept forwarded=0');
  }

  // Verkoopbare dienst → direct een voorstel genereren en de bezoeker
  // doorsturen. Mislukt dat, dan valt de flow terug op het oude bedankscherm:
  // de intake is al durable opgeslagen, dus er gaat nooit een lead verloren.
  let voorstelToken = null;
  try {
    const voorstel = await maakVoorstel(env, { intakeId: id, serviceId, customer, answers: answersIn });
    voorstelToken = voorstel?.token || null;
  } catch (err) {
    console.error('[/api/intake] voorstel genereren mislukt (intake blijft bewaard):', err?.message || err);
  }

  return jsonResponse({ success: true, message: 'Aanvraag ontvangen', voorstel_token: voorstelToken });
}

async function sendBrevoEmail(apiKey, payload, label) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Brevo ${label} HTTP ${res.status}: ${text.substring(0, 400)}`);
  }
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

// --- Lead-capture into Brevo CRM -------------------------------------------
// Form fields that signal privacy-policy agreement (lead may be stored &
// followed up about their own request) vs. explicit marketing opt-in
// (contact may be added to the ongoing newsletter list).
const PRIVACY_CONSENT_FIELDS = ['privacy', 'akkoord', 'akkoord_privacy', 'consent', 'toestemming'];
const MARKETING_CONSENT_FIELDS = ['akkoord_marketing', 'marketing_consent', 'nieuwsbrief'];

function isTruthy(v) {
  if (v == null) return false;
  const s = String(v).toLowerCase().trim();
  return s !== '' && s !== 'false' && s !== '0' && s !== 'off' && s !== 'no' && s !== 'nee';
}

// Idempotent upsert — updateEnabled lets the same email be re-submitted
// without a 400. Brevo returns 201 (create) or 204 (update, empty body).
async function brevoUpsertContact(apiKey, contact) {
  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify({ ...contact, updateEnabled: true }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Brevo contact HTTP ${res.status}: ${text.substring(0, 400)}`);
  }
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

// Same regex as isValidEmail() in portal-routes.js / calendar-routes.js.
// Duplicated (not imported) to keep worker.js self-contained — a later task
// consolidates all three into one shared helper.
function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// --- Double opt-in: signed marketing-consent confirmation token -----------
// H3 fix: a self-declared POST boolean (akkoord_marketing / nieuwsbrief) is
// attacker-controlled and is not, by itself, valid AVG/GDPR consent to add a
// third party's email address to a marketing list. Before enrollment we now
// require proof-of-inbox-access: a signed, expiring link the recipient must
// click. Token shape: base64url(JSON payload).hex(HMAC-SHA256 signature) —
// same construction as createSession/verifySession in src/lib/auth.js, but
// reimplemented locally (not imported) because the payload here is
// email+purpose+nurture-flag rather than a portal user id, and worker.js is
// kept self-contained for the lead-capture path. Signed with the same secret
// (env.PORTAL_SESSION_SECRET) since it is already a Worker-wide HMAC secret.
const CONSENT_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const consentEncoder = new TextEncoder();

function consentB64urlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function consentB64urlDecode(str) {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}
function consentBytesToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function consentHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', consentEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  );
}

// Signs { email, purpose: 'marketing-consent', nurture, exp }. `nurture`
// carries whether the nurture/drip list should also be granted on confirm
// (mirrors the formType !== 'newsletter' rule the old code applied inline).
async function signConsentToken(email, nurture, secret) {
  const payload = JSON.stringify({
    email,
    purpose: 'marketing-consent',
    nurture: !!nurture,
    exp: Date.now() + CONSENT_TOKEN_TTL_MS,
  });
  const body = consentB64urlEncode(payload);
  const key = await consentHmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, consentEncoder.encode(body));
  return `${body}.${consentBytesToHex(sig)}`;
}

// Verify + decode a consent token. Returns { email, nurture } or null on any
// invalid signature, malformed payload, wrong purpose, expiry, or malformed
// email. crypto.subtle.verify is constant-time (no timing side-channel).
async function verifyConsentToken(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sigHex] = parts;
  if (!body || !sigHex || !/^[0-9a-f]+$/.test(sigHex) || sigHex.length % 2 !== 0) return null;
  const key = await consentHmacKey(secret);
  const sigBytes = Uint8Array.from(sigHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, consentEncoder.encode(body));
  if (!valid) return null;
  let payload;
  try { payload = JSON.parse(consentB64urlDecode(body)); } catch { return null; }
  if (!payload?.email || payload.purpose !== 'marketing-consent' || !payload?.exp) return null;
  if (Date.now() > payload.exp) return null;
  if (!isValidEmail(payload.email)) return null;
  return { email: payload.email, nurture: !!payload.nurture };
}

// Dutch double opt-in confirmation email — separate from the transactional
// autoresponse, sent only when marketing consent was indicated.
function buildConsentConfirmHtml(userName, confirmUrl) {
  const safeUrl = escapeHtml(confirmUrl);
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
    <p>Hallo ${escapeHtml(userName)},</p>
    <p>Bevestig je inschrijving voor de nieuwsbrief van Aanloop AI door op onderstaande knop te klikken. Dit is een extra controle zodat alleen jij — en niemand anders — dit e-mailadres aanmeldt.</p>
    <p style="margin:24px 0">
      <a href="${safeUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Bevestig inschrijving →</a>
    </p>
    <p style="font-size:13px;color:#64748b">Werkt de knop niet? Kopieer deze link naar je browser:<br><span style="word-break:break-all">${safeUrl}</span></p>
    <p style="font-size:12px;color:#64748b">Deze link is 7 dagen geldig. Heb je dit niet zelf aangevraagd? Dan kun je deze e-mail negeren — zonder bevestiging wordt niemand aangemeld.</p>
    <p>Met vriendelijke groet,<br>Het team van Aanloop AI</p>
    ${FOOTER_HTML}
  </body></html>`;
}

// Small standalone Dutch HTML page for the /api/consent/confirm landing —
// intentionally not the full site shell (no build-time asset access here).
function consentPageHtml(title, message, ok) {
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} — Aanloop AI</title></head>
  <body style="font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;padding:24px;color:#0f172a;text-align:center">
    <h1 style="font-size:22px;margin:0 0 12px;color:${ok ? '#16a34a' : '#dc2626'}">${escapeHtml(title)}</h1>
    <p style="color:#475569;font-size:15px;line-height:1.6">${escapeHtml(message)}</p>
    <p style="margin-top:32px"><a href="${SITE_ORIGIN}" style="color:#4f46e5;text-decoration:none;font-weight:600">← Terug naar aanloopai.nl</a></p>
  </body></html>`;
}

// Persist an inbound submission before anything else can fail. Mail is a
// notification channel; this row is the system of record. Returns the lead id,
// or null if D1 is unreachable (in which case we fall back to mail-only and say
// so loudly — losing the lead silently is the one outcome that is not allowed).
async function storeInboundLead(env, { formType, fields, userEmail, fullName, clientIp }) {
  if (!env.PORTAL_DB) {
    console.error('[/api/submit] PORTAL_DB not bound — lead cannot be persisted');
    return null;
  }
  const id = `lead_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const payload = { ...fields };
  delete payload.botcheck;
  // Cap every free-text field: the form is public, and D1 row size is finite.
  const cap = (v, max) => (v == null ? null : String(v).trim().slice(0, max) || null);
  try {
    await env.PORTAL_DB.prepare(
      `INSERT INTO inbound_leads (id, created_at, form_type, email, naam, bedrijf, telefoon, bericht, fields_json, status, mail_status, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'nieuw', 'pending', ?)`,
    ).bind(
      id,
      Date.now(),
      cap(formType, 60),
      cap(userEmail, 200),
      cap(fullName, 200),
      cap(fields.bedrijf || fields.bedrijfsnaam || fields.company, 200),
      cap(fields.telefoon || fields.phone, 60),
      cap(fields.bericht || fields.message || fields.vraag, 4000),
      JSON.stringify(payload).slice(0, 8000),
      cap(clientIp, 60),
    ).run();
    return id;
  } catch (err) {
    console.error('[/api/submit] lead insert failed:', err.message || err);
    return null;
  }
}

async function markLeadMail(env, leadId, status, error) {
  if (!leadId || !env.PORTAL_DB) return;
  try {
    await env.PORTAL_DB.prepare('UPDATE inbound_leads SET mail_status = ?, mail_error = ? WHERE id = ?')
      .bind(status, error ? String(error).slice(0, 400) : null, leadId).run();
  } catch (err) {
    console.error('[/api/submit] lead mail-status update failed:', err.message || err);
  }
}

async function handleSubmit(request, env) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ success: false, message: 'Invalid form data' }, 400);
  }

  if (formData.get('botcheck')) {
    return jsonResponse({ success: true });
  }

  // Spam / abuse throttle — see src/lib/rate-limit.js for the KV mechanics and
  // its known non-atomicity caveat (acceptable here: this guards a public form
  // endpoint, not an auth boundary).
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  const submitRl = await rateLimit(env.GOOGLE_TOKENS, `rl:submit:${clientIp}`, 5, 600);
  if (!submitRl.allowed) {
    return jsonResponse({ success: false, message: 'Te veel aanvragen vanaf dit IP-adres. Probeer het over enkele minuten opnieuw.' }, 429);
  }

  const fields = Object.fromEntries(formData.entries());
  const formType = (fields.form_type || fields.type || 'contact').toString().toLowerCase();
  const template = AUTORESPONSE_TEMPLATES[formType] || AUTORESPONSE_TEMPLATES.contact;

  const userEmail = (fields.email || '').toString().trim();
  const firstName = (fields.voornaam || fields.naam || fields.name || '').toString().split(' ')[0] || 'daar';
  const fullName = (fields.voornaam ? `${fields.voornaam} ${fields.achternaam || ''}`.trim() : (fields.naam || fields.name || userEmail)) || userEmail;

  if (!isValidEmail(userEmail)) {
    return jsonResponse({ success: false, message: 'Invalid email address' }, 400);
  }

  const subject = (fields.subject || `Nieuw ${formType} via aanloopai.nl — ${fields.bedrijf || fullName}`).toString();

  // System of record first — everything below this line is best-effort delivery.
  const leadId = await storeInboundLead(env, { formType, fields, userEmail, fullName, clientIp });

  if (!env.BREVO_API_KEY) {
    console.error('[/api/submit] BREVO_API_KEY not configured — lead stored, no mail sent');
    await markLeadMail(env, leadId, 'mislukt', 'BREVO_API_KEY not configured');
    await alertStaff(env, `Nieuwe ${formType}-aanvraag — mail niet verstuurd`,
      `${fullName} <${userEmail}> heeft het formulier "${formType}" ingevuld.\n`
      + `BREVO_API_KEY is niet geconfigureerd, dus er is geen e-mail verstuurd.\n`
      + `De aanvraag staat wel in /admin/aanvragen (lead ${leadId || 'NIET OPGESLAGEN'}).`);
    // The visitor's request IS captured, so this is not their failure to retry.
    return jsonResponse({ success: leadId !== null, message: leadId ? 'Verzonden' : 'Opslaan mislukt' }, leadId ? 200 : 500);
  }

  try {
    await sendBrevoEmail(env.BREVO_API_KEY, {
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: NOTIFICATION_EMAIL, name: 'Aanloop AI' }],
      replyTo: { email: userEmail, name: fullName },
      subject,
      htmlContent: buildNotificationHtml(formType, fields, userEmail, fullName),
    }, 'notification');

    let autoresponseHtml;
    if (formType === 'roi_calculator') {
      autoresponseHtml = buildRoiAutoresponseHtml(template, firstName, fields);
    } else if (formType === 'ai_readiness_scan') {
      autoresponseHtml = buildScanAutoresponseHtml(template, firstName, fields);
    } else {
      autoresponseHtml = buildAutoresponseHtml(template, firstName);
    }

    await sendBrevoEmail(env.BREVO_API_KEY, {
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: userEmail, name: fullName }],
      replyTo: { email: NOTIFICATION_EMAIL, name: 'Aanloop AI' },
      subject: template.subject,
      htmlContent: autoresponseHtml,
    }, 'autoresponse');

    // Lead-capture → Brevo CRM. Best-effort: a failure here is logged but
    // never blocks the user response (the emails already succeeded).
    try {
      const hasPrivacyConsent =
        formType === 'newsletter' ||
        PRIVACY_CONSENT_FIELDS.some((k) => isTruthy(fields[k]));
      const hasMarketingConsent =
        formType === 'newsletter' ||
        MARKETING_CONSENT_FIELDS.some((k) => isTruthy(fields[k]));
      // H3 fix (AVG/GDPR double opt-in — was KNOWN GAP): hasMarketingConsent
      // above is still derived from a self-declared, attacker-controllable
      // POST boolean, so it is NOT used to add the contact to a marketing
      // list here. It only decides whether we send a separate double
      // opt-in confirmation email. The contact is added to
      // BREVO_LIST_ID / BREVO_NURTURE_LIST_ID only after the recipient
      // clicks the signed, expiring link in that email and
      // GET /api/consent/confirm verifies it (signConsentToken /
      // verifyConsentToken + handleConsentConfirm, defined above / below).

      if (hasPrivacyConsent) {
        const attributes = {
          FIRSTNAME: firstName === 'daar' ? '' : firstName,
          LASTNAME: (fields.achternaam || '').toString().trim(),
          BEDRIJF: (fields.bedrijf || fields.bedrijfsnaam || fields.company || '').toString().trim(),
          SECTOR: (fields.sector || fields.scan_sector || '').toString().trim(),
          TELEFOON: (fields.telefoon || fields.phone || '').toString().trim(),
          FUNCTIE: (fields.functie || '').toString().trim(),
          SOURCE: formType,
          NURTURE: formType === 'ai_readiness_scan' ? 'ai_scan'
            : formType === 'roi_calculator' ? 'roi'
            : (formType === 'demo' || formType === 'aanvraag') ? formType
            : 'lead',
          OPT_IN_DATE: new Date().toISOString().slice(0, 10),
          // Pending until the double opt-in link is clicked — see comment above.
          MARKETING_CONSENT: false,
        };
        // Drop empty values so a re-submit never overwrites existing data with blanks.
        for (const k of Object.keys(attributes)) {
          if (attributes[k] === '') delete attributes[k];
        }
        // Base upsert: transactional relationship only (lets us follow up on
        // THIS submission) — deliberately no listIds here. Marketing/nurture
        // list membership is granted only via /api/consent/confirm below.
        await brevoUpsertContact(env.BREVO_API_KEY, { email: userEmail, attributes });

        if (hasMarketingConsent) {
          if (env.PORTAL_SESSION_SECRET) {
            // Nurture-drip list is only ever paired with non-newsletter
            // lead forms, mirroring the old inline formType check.
            const nurture = formType !== 'newsletter';
            const token = await signConsentToken(userEmail, nurture, env.PORTAL_SESSION_SECRET);
            const confirmUrl = `${SITE_ORIGIN}/api/consent/confirm?token=${encodeURIComponent(token)}`;
            await sendBrevoEmail(env.BREVO_API_KEY, {
              sender: { name: SENDER_NAME, email: SENDER_EMAIL },
              to: [{ email: userEmail, name: fullName }],
              replyTo: { email: NOTIFICATION_EMAIL, name: 'Aanloop AI' },
              subject: 'Bevestig je inschrijving voor de nieuwsbrief — Aanloop AI',
              htmlContent: buildConsentConfirmHtml(firstName, confirmUrl),
            }, 'consent-confirm');
          } else {
            console.error('[/api/submit] PORTAL_SESSION_SECRET not configured — cannot send double opt-in confirmation email, marketing-list enrollment skipped');
          }
        }
      }
    } catch (contactErr) {
      console.error('[/api/submit] Brevo contact upsert failed (non-fatal):', contactErr.message || contactErr);
    }

    await markLeadMail(env, leadId, 'verzonden', null);
    return jsonResponse({ success: true, message: 'Verzonden' });
  } catch (err) {
    const message = err.message || 'Brevo send failed';
    console.error('[/api/submit] Brevo error:', message);
    await markLeadMail(env, leadId, 'mislukt', message);

    if (leadId) {
      // The lead is safe in D1. Telling the visitor "er ging iets mis, probeer
      // opnieuw" would be a lie that makes them submit twice (or walk away) —
      // their request HAS arrived. Staff get the alert instead, out of band,
      // because the mail channel is precisely what just broke.
      await alertStaff(env, `Mail MISLUKT voor nieuwe ${formType}-aanvraag`,
        `${fullName} <${userEmail}> heeft het formulier "${formType}" ingevuld.\n`
        + `De Brevo-mail is mislukt: ${message}\n\n`
        + `De aanvraag staat in /admin/aanvragen (lead ${leadId}). Neem handmatig contact op.`);
      return jsonResponse({ success: true, message: 'Verzonden' });
    }

    // No lead row AND no mail — nothing captured it. This one the visitor must
    // know about, so they can try again or call us.
    return jsonResponse({
      success: false,
      message,
      hint: 'Common causes: 1) Invalid BREVO_API_KEY 2) hello@aanloopai.nl not verified as sender in Brevo 3) Free plan credits exhausted',
    }, 502);
  }
}

// GET /api/consent/confirm?token=... — double opt-in landing page. Verifies
// the signed token (see signConsentToken/verifyConsentToken above), then
// idempotently upserts the contact onto the marketing/nurture Brevo list(s).
// Re-confirming an already-confirmed email is harmless (brevoUpsertContact
// is an update-or-create with updateEnabled: true).
async function handleConsentConfirm(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';

  if (!env.PORTAL_SESSION_SECRET) {
    return new Response(consentPageHtml('Niet beschikbaar', 'Bevestigen van je inschrijving is momenteel niet beschikbaar. Probeer het later opnieuw.', false), {
      status: 500,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  // Defense-in-depth against automated abuse of this public link, matching
  // the rate-limit posture applied to every other public endpoint in this
  // file. The token itself is HMAC-signed (infeasible to guess/brute-force),
  // so this is a courtesy cap, not the primary protection.
  const confirmIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  const confirmRl = await rateLimit(env.GOOGLE_TOKENS, `rl:consent:${confirmIp}`, 20, 3600);
  if (!confirmRl.allowed) {
    return new Response(consentPageHtml('Te veel pogingen', 'Te veel bevestigingspogingen vanaf dit IP-adres. Probeer het later opnieuw.', false), {
      status: 429,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const claim = await verifyConsentToken(token, env.PORTAL_SESSION_SECRET);
  if (!claim) {
    return new Response(consentPageHtml('Link ongeldig of verlopen', 'Deze bevestigingslink is ongeldig of verlopen. Meld je opnieuw aan voor de nieuwsbrief om een nieuwe link te ontvangen.', false), {
      status: 400,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  if (!env.BREVO_API_KEY) {
    return new Response(consentPageHtml('Niet beschikbaar', 'Je bevestiging kon niet worden verwerkt. Probeer het later opnieuw of neem contact op.', false), {
      status: 500,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  try {
    const listId = parseInt(env.BREVO_LIST_ID, 10);
    const nurtureListId = parseInt(env.BREVO_NURTURE_LIST_ID, 10);
    const lists = [];
    if (Number.isFinite(listId)) lists.push(listId);
    if (claim.nurture && Number.isFinite(nurtureListId)) lists.push(nurtureListId);

    const contact = {
      email: claim.email,
      attributes: {
        MARKETING_CONSENT: true,
        OPT_IN_DATE: new Date().toISOString().slice(0, 10),
      },
    };
    if (lists.length) contact.listIds = lists;

    await brevoUpsertContact(env.BREVO_API_KEY, contact);
  } catch (err) {
    console.error('[/api/consent/confirm] Brevo upsert failed:', err.message || err);
    return new Response(consentPageHtml('Er ging iets mis', 'Je bevestiging kon niet worden verwerkt. Probeer het later opnieuw of neem contact op via hello@aanloopai.nl.', false), {
      status: 502,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(consentPageHtml('Inschrijving bevestigd', 'Bedankt! Je inschrijving voor de nieuwsbrief is bevestigd. Je ontvangt voortaan updates van Aanloop AI in je inbox.', true), {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

// --- GEO Quick Scan: lightweight AI-vindbaarheid check of a public URL ---
// SSRF-guarded: only public http(s) hosts, no loopback/private ranges.
//
// NOTE (M1): true DNS-rebinding — where a hostname resolves to a private/
// loopback IP only at fetch-time, after this hostname-string check already
// passed — cannot be fully closed from inside the Cloudflare Workers runtime,
// because `fetch()` here has no API to resolve DNS ourselves and pin/verify
// the IP before connecting. The CF runtime itself already prevents Workers
// from reaching the edge's own loopback/metadata addresses at the network
// layer. What this function + the redirect-revalidation in geoFetchText()
// below cover is: literal-IP SSRF, encoding/case tricks, and redirect-based
// bypass (a public URL 30x-ing to an internal target).
function isPublicHttpUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  // Bracketed IPv6 hostnames from new URL() include the brackets, e.g. "[::1]" — strip them before matching.
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.')) return null;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return null;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return null;
  // CGNAT (RFC 6598) — 100.64.0.0/10.
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return null;
  // IANA-reserved "this host on this network" block — 192.0.0.0/24.
  if (/^192\.0\.0\./.test(h)) return null;
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return null;
  return u;
}

// Max redirect hops we manually follow before aborting — bounded so a
// malicious/misconfigured target can't chain redirects indefinitely.
const GEO_FETCH_MAX_REDIRECTS = 3;

async function geoFetchText(target, ms = 8000, maxBytes = 600000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    let currentUrl = target;
    for (let hop = 0; ; hop++) {
      const res = await fetch(currentUrl, { signal: ctrl.signal, redirect: 'manual', headers: { 'user-agent': 'AanloopAI-GEO-Scan/1.0 (+https://aanloopai.nl/ai-vindbaarheid/)' } });
      const isRedirect = res.status >= 300 && res.status < 400;
      if (!isRedirect) {
        const buf = await res.arrayBuffer();
        return { ok: res.ok, status: res.status, text: new TextDecoder().decode(buf.slice(0, maxBytes)) };
      }
      const location = res.headers.get('location');
      if (!location || hop >= GEO_FETCH_MAX_REDIRECTS) {
        return { ok: false, status: 0, text: '' };
      }
      // Resolve Location against the current URL (handles relative redirects), then
      // re-validate the resolved target — this is what stops a public URL from
      // redirecting into a loopback/private/link-local address (M1 hardening).
      let resolved;
      try { resolved = new URL(location, currentUrl); } catch { return { ok: false, status: 0, text: '' }; }
      const revalidated = isPublicHttpUrl(resolved.toString());
      if (!revalidated) return { ok: false, status: 0, text: '' };
      currentUrl = revalidated.toString();
    }
  } catch {
    return { ok: false, status: 0, text: '' };
  } finally { clearTimeout(t); }
}

async function handleGeoScan(request, env) {
  if (request.method !== 'POST') return jsonResponse({ success: false, message: 'Use POST' }, 405);
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ success: false, message: 'Invalid JSON' }, 400); }
  const u = isPublicHttpUrl(String((body && body.url) || '').trim());
  if (!u) return jsonResponse({ success: false, message: 'Voer een geldige publieke website-URL in (https://...).' }, 400);
  if (/(^|\.)aanloopai\.nl$/i.test(u.hostname)) {
    return jsonResponse({ success: false, message: 'Voer de website van jouw eigen bedrijf in — niet aanloopai.nl. We checken jouw AI-vindbaarheid.' }, 400);
  }
  const origin = `${u.protocol}//${u.host}`;
  const [home, llms, robots] = await Promise.all([
    geoFetchText(origin + '/'),
    geoFetchText(origin + '/llms.txt'),
    geoFetchText(origin + '/robots.txt'),
  ]);
  const html = home.text;
  const hasJsonLd = /application\/ld\+json/i.test(html);
  const hasSameAs = /"sameAs"/i.test(html);
  const hasEntity = /"@type"\s*:\s*"(Person|Organization|LocalBusiness)"/i.test(html);
  const hasTitle = /<title[^>]*>[^<]{3,}<\/title>/i.test(html);
  const hasMetaDesc = /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i.test(html);
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const hasLlms = llms.ok && llms.text.trim().length > 50;
  const blocksAi = /(gptbot|claudebot|perplexitybot|google-extended|oai-searchbot)[\s\S]{0,200}?disallow:\s*\//i.test(robots.text);
  const aiAccess = robots.ok ? !blocksAi : true;
  const checks = [
    { label: 'llms.txt aanwezig', ok: hasLlms, w: 20, detail: hasLlms ? 'Gevonden — AI-assistenten kunnen je content begrijpen.' : 'Ontbreekt — voeg een llms.txt toe zodat AI je site snapt.' },
    { label: 'Schema.org (JSON-LD)', ok: hasJsonLd, w: 22, detail: hasJsonLd ? 'Gestructureerde data aanwezig.' : 'Geen JSON-LD gevonden — AI mist context over je bedrijf.' },
    { label: 'Organization / sameAs entiteit', ok: hasSameAs || hasEntity, w: 15, detail: (hasSameAs || hasEntity) ? 'Entiteit-markup aanwezig.' : 'Geen Organization/sameAs — AI herkent je niet als entiteit.' },
    { label: 'AI-bot toegang (robots.txt)', ok: aiAccess, w: 20, detail: aiAccess ? 'AI-crawlers mogen je site lezen.' : 'robots.txt blokkeert AI-crawlers — onzichtbaar voor AI.' },
    { label: 'Title + meta description', ok: hasTitle && hasMetaDesc, w: 13, detail: (hasTitle && hasMetaDesc) ? 'Aanwezig.' : 'Title of meta-description ontbreekt of te kort.' },
    { label: 'Mobiel geoptimaliseerd', ok: hasViewport, w: 10, detail: hasViewport ? 'Viewport ingesteld.' : 'Geen viewport-meta gevonden.' },
  ];
  let score = 0;
  for (const c of checks) if (c.ok) score += c.w;
  if (!home.ok) score = Math.min(score, 10);
  const grade = score >= 80 ? 'Sterk' : score >= 55 ? 'Redelijk' : score >= 30 ? 'Zwak' : 'Kritiek';
  return jsonResponse({ success: true, url: origin, reachable: home.ok, score, grade, checks: checks.map(({ label, ok, detail }) => ({ label, ok, detail })) });
}

// Outreach follow-up reminder — fires once inside the 06:00-06:15 UTC cron
// window (same */15 cron as the rest of scheduled()). Best-effort: any
// failure (missing secrets, D1/Telegram error) is swallowed here so it never
// takes down reconcilePayments/billMonthlySubscriptions in the same tick.
// Dedup via GOOGLE_TOKENS KV (shared with the rest of the app) — a 2-day TTL
// key per calendar day guards against the cron firing more than once in the
// 06:00-06:15 window (every 15 min = at most one hit, but this is also a
// safety net against a Cloudflare cron double-fire).
async function notifyOutreachFollowups(env) {
  try {
    if (!env.PORTAL_DB || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
    const now = new Date();
    if (now.getUTCHours() !== 6 || now.getUTCMinutes() >= 15) return;

    // Blackout: geen weekend/NL-feestdag-drafting of -notificatie. Er is 's
    // ochtends niemand om follow-ups te versturen of te evalueren op een
    // niet-werkdag, dus de hele ochtend-batch (import/draft/Telegram) slaat
    // dan over.
    const dateKey = now.toISOString().slice(0, 10);
    if (!isWerkdag(dateKey)) return;

    const n = await countVandaagProspects(env);
    if (n <= 0) return;

    if (env.GOOGLE_TOKENS) {
      const dedupKey = `outreach:notified:${dateKey}`;
      if (await env.GOOGLE_TOKENS.get(dedupKey)) return;
      await env.GOOGLE_TOKENS.put(dedupKey, '1', { expirationTtl: 172800 });
    }

    // Nieuwe prospects importeren vóór de follow-up-taslak-batch, zodat vers
    // geïmporteerde bedrijven dezelfde ochtend nog meegenomen worden. Best-
    // effort: outreachImport dedupt zelf (site+bedrijfsnaam) — 1 mislukte
    // import (bv. KEUKENINBEELD_TOKEN ontbreekt) mag de rest van de
    // notificatie/taslak-batch niet blokkeren.
    try {
      await outreachImport(null, env);
    } catch (err) {
      console.error('[scheduled] outreach import mislukt:', err.message || err);
    }

    // Concept follow-up-mails vast klaarzetten zodat de mens 's ochtends alleen
    // hoeft te evalueren/versturen i.p.v. vanaf nul te schrijven. Best-effort
    // per prospect — 1 mislukte Gemini-call mag de rest van de batch niet
    // blokkeren. Zonder GEMINI_API_KEY slaan we dit deel over en blijft het
    // Telegram-bericht ongewijzigd.
    let conceptCount = null;
    if (env.GEMINI_API_KEY) {
      conceptCount = 0;
      try {
        const prospects = await prospectsNeedingFollowupDraft(env);
        for (const prospect of prospects) {
          try {
            await generateFollowupDraft(env, prospect);
            conceptCount++;
          } catch (err) {
            console.error('[scheduled] followup-taslak mislukt voor prospect', prospect.id, ':', err.message || err);
          }
        }
      } catch (err) {
        console.error('[scheduled] followup-taslak query mislukt:', err.message || err);
      }
    }

    // Emma signaal-scan: max 5 prospects per ochtend op nieuwe signalen
    // (vacature, uitbreiding, nieuws) — best-effort, mag de rest van de
    // ochtend-batch (Telegram-notificatie hieronder) niet blokkeren.
    try {
      await aiSignalScan(env);
    } catch (err) {
      console.error('[scheduled] aiSignalScan mislukt:', err.message || err);
    }

    const text = conceptCount === null
      ? `📋 Outreach: ${n} follow-up(s) vandaag — aanloopai.nl/admin/outreach`
      : `📋 Outreach: ${n} follow-up(s) vandaag, ${conceptCount} concept(en) klaargezet — aanloopai.nl/admin/outreach`;

    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
      }),
    });
  } catch (err) {
    console.error('[scheduled] outreach follow-up notify failed:', err.message || err);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Diagnostic endpoint — lists which env vars ARE visible to the worker (no values, just presence)
    if (url.pathname === '/api/health') {
      // Public unauthenticated endpoint — must not leak environment details.
      return jsonResponse({ status: 'ok', deployed_at: new Date().toISOString() });
    }

    if (url.pathname === '/api/geo-scan') {
      if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
      const geoIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const geoRl = await rateLimit(env.GOOGLE_TOKENS, `rl:geoscan:${geoIp}`, 10, 3600);
      if (!geoRl.allowed) {
        return jsonResponse({ success: false, message: 'Te veel scans vanaf dit IP-adres. Probeer het over een uur opnieuw.' }, 429);
      }
      return handleGeoScan(request, env);
    }

    if (url.pathname === '/api/submit') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: CORS_HEADERS });
      }
      if (request.method === 'POST') {
        return handleSubmit(request, env);
      }
      return jsonResponse({ success: false, message: 'Method not allowed. Use POST.' }, 405);
    }

    // Pre-sale intake wizard (aanloopai.nl/start) — see handleIntake above.
    if (url.pathname === '/api/intake') {
      return handleIntake(request, env);
    }

    // Publieke leesroute voor de voorstelpagina. Het token is de enige
    // autorisatie; onbekend en verlopen geven exact hetzelfde antwoord, zodat
    // niet te achterhalen is of een token ooit heeft bestaan.
    if (url.pathname === '/api/voorstel') {
      if (request.method !== 'GET') return jsonResponse({ ok: false }, 405);
      const voorstelIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const voorstelRl = await rateLimit(env.GOOGLE_TOKENS, `rl:voorstel:${voorstelIp}`, 30, 600);
      if (!voorstelRl.allowed) {
        return jsonResponse({ ok: false, message: 'Te veel verzoeken. Probeer het later opnieuw.' }, 429);
      }
      let voorstel;
      try {
        voorstel = env.PORTAL_DB
          ? await leesVoorstelViaToken(env, url.searchParams.get('t') || '')
          : null;
      } catch (err) {
        console.error('[/api/voorstel] D1 query mislukt:', err.message || err);
        return jsonResponse({ ok: false, message: 'Er ging iets mis. Probeer het over enkele minuten opnieuw.' }, 503);
      }
      if (!voorstel) return jsonResponse({ ok: false, message: 'Dit voorstel is niet (meer) beschikbaar.' }, 404);
      return jsonResponse({ ok: true, voorstel });
    }

    // "Ja, ik start" — verstuurt uitsluitend een verificatiemail. Zie
    // src/lib/voorstel-claim.js voor het beveiligingsprincipe.
    if (url.pathname === '/api/voorstel/claim') {
      return handleVoorstelClaim(request, env);
    }

    // Double opt-in landing page for the marketing-list confirmation email
    // sent from handleSubmit (H3 fix). No CORS needed — this is a top-level
    // browser navigation (the recipient clicking the link in their inbox),
    // not a same-origin fetch() call.
    if (url.pathname === '/api/consent/confirm') {
      return handleConsentConfirm(request, env);
    }

    // Native Google Calendar booking API (powers /demo-inplannen/)
    if (url.pathname === '/api/calendar/availability') {
      const availIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const availRl = await rateLimit(env.GOOGLE_TOKENS, `rl:avail:${availIp}`, 30, 3600);
      if (!availRl.allowed) {
        return jsonResponse({ success: false, message: 'Te veel verzoeken. Probeer het later opnieuw.' }, 429);
      }
      return handleAvailability(request, env);
    }
    if (url.pathname === '/api/calendar/book') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: CORS_HEADERS });
      }
      const bookIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const bookRl = await rateLimit(env.GOOGLE_TOKENS, `rl:book:${bookIp}`, 5, 3600);
      if (!bookRl.allowed) {
        return jsonResponse({ success: false, message: 'Te veel boekingspogingen vanaf dit IP-adres. Probeer het over een uur opnieuw.' }, 429);
      }
      return handleBook(request, env);
    }
    if (url.pathname === '/api/google/initiate') {
      return handleGoogleInitiate(request, env);
    }
    if (url.pathname === '/api/google/callback') {
      return handleGoogleCallback(request, env);
    }

    // Customer portal — passwordless magic-link auth
    if (url.pathname === '/api/auth/request') {
      if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
      return handleAuthRequest(request, env);
    }
    // STAFF-ONLY password login fallback — magic-link (above) remains the
    // only auth path for customer accounts; handleAuthPasswordLogin enforces
    // role === 'staff' server-side.
    if (url.pathname === '/api/auth/login') {
      if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
      return handleAuthPasswordLogin(request, env);
    }
    if (url.pathname === '/api/auth/verify') {
      return handleAuthVerify(request, env);
    }
    if (url.pathname === '/api/auth/logout') {
      return handleAuthLogout(request, env);
    }
    if (url.pathname === '/api/team-invite/accept') {
      return handleInviteAccept(request, env);
    }
    // Mollie payment webhook — server-to-server. No CORS, no OPTIONS — must not
    // be browser-accessible. Handler validates the URL secret token.
    if (url.pathname === '/api/webhooks/mollie') {
      return handleMollieWebhook(request, env);
    }
    // MCP server (F3.3) — server-to-server JSON-RPC, eigen Bearer-token-auth
    // (env.MCP_SECRET). Geen CORS/OPTIONS nodig, zelfde reden als de
    // Mollie-webhook hierboven.
    if (url.pathname === '/mcp') {
      return handleMcp(request, env);
    }
    // Customer portal API + admin panel API — origin locked to aanloopai.nl.
    if (url.pathname.startsWith('/api/portal/')) {
      if (request.method === 'OPTIONS') return new Response(null, { headers: PORTAL_CORS_HEADERS });
      return handlePortalApi(request, env);
    }
    if (url.pathname.startsWith('/api/admin/')) {
      if (request.method === 'OPTIONS') return new Response(null, { headers: PORTAL_CORS_HEADERS });
      return handleAdminApi(request, env);
    }

    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      return applySecurityHeaders(assetResponse, url.pathname);
    }
    return new Response('Not configured: ASSETS binding missing in wrangler.toml', { status: 500 });
  },

  // Cron — reconcile stale payments + send monthly iDEAL payment links
  // (configured in wrangler.toml [triggers]).
  async scheduled(event, env, ctx) {
    ctx.waitUntil(reconcilePayments(env));
    ctx.waitUntil(billMonthlySubscriptions(env));
    ctx.waitUntil(notifyOutreachFollowups(env));
  },
};
// Force redeploy after BREVO_API_KEY env var added (Sprint 38)

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
  handleAuthVerify,
  handleAuthLogout,
  handleInviteAccept,
  handlePortalApi,
} from './lib/portal-routes.js';
import { handleAdminApi } from './lib/admin-routes.js';
import { handleMollieWebhook, reconcilePayments, billMonthlySubscriptions } from './lib/mollie.js';

const NOTIFICATION_EMAIL = 'hello@aanloopai.nl';
const SENDER_EMAIL = 'hello@aanloopai.nl';
const SENDER_NAME = 'Aanloop AI';

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
  KvK 56312075
</p>`;

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
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

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildNotificationHtml(formType, fields, userEmail, userName) {
  const skipKeys = ['type', 'form_type', 'access_key', 'subject', 'from_name', 'replyto', 'redirect', 'source', 'botcheck'];
  const rows = Object.entries(fields)
    .filter(([k, v]) => v && !skipKeys.includes(k))
    .map(([k, v]) => `<tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;width:180px">${escapeHtml(k)}</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${escapeHtml(v)}</td></tr>`)
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

async function handleSubmit(request, env) {
  if (!env.BREVO_API_KEY) {
    return jsonResponse({
      success: false,
      message: 'BREVO_API_KEY env var not configured',
      hint: 'Set BREVO_API_KEY in Cloudflare Workers → Settings → Variables and Secrets, then redeploy',
    }, 500);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ success: false, message: 'Invalid form data' }, 400);
  }

  if (formData.get('botcheck')) {
    return jsonResponse({ success: true });
  }

  const fields = Object.fromEntries(formData.entries());
  const formType = (fields.form_type || fields.type || 'contact').toString().toLowerCase();
  const template = AUTORESPONSE_TEMPLATES[formType] || AUTORESPONSE_TEMPLATES.contact;

  const userEmail = (fields.email || '').toString().trim();
  const firstName = (fields.voornaam || fields.naam || fields.name || '').toString().split(' ')[0] || 'daar';
  const fullName = (fields.voornaam ? `${fields.voornaam} ${fields.achternaam || ''}`.trim() : (fields.naam || fields.name || userEmail)) || userEmail;

  if (!userEmail || !userEmail.includes('@')) {
    return jsonResponse({ success: false, message: 'Invalid email address' }, 400);
  }

  const subject = (fields.subject || `Nieuw ${formType} via aanloopai.nl — ${fields.bedrijf || fullName}`).toString();

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

      if (hasPrivacyConsent) {
        const attributes = {
          FIRSTNAME: firstName === 'daar' ? '' : firstName,
          LASTNAME: (fields.achternaam || '').toString().trim(),
          BEDRIJF: (fields.bedrijf || fields.bedrijfsnaam || fields.company || '').toString().trim(),
          SECTOR: (fields.sector || fields.scan_sector || '').toString().trim(),
          TELEFOON: (fields.telefoon || fields.phone || '').toString().trim(),
          FUNCTIE: (fields.functie || '').toString().trim(),
          SOURCE: formType,
          OPT_IN_DATE: new Date().toISOString().slice(0, 10),
          MARKETING_CONSENT: hasMarketingConsent,
        };
        // Drop empty values so a re-submit never overwrites existing data with blanks.
        for (const k of Object.keys(attributes)) {
          if (attributes[k] === '') delete attributes[k];
        }
        const contact = { email: userEmail, attributes };
        const listId = parseInt(env.BREVO_LIST_ID, 10);
        // Only add to the marketing list when explicit marketing consent is given.
        if (hasMarketingConsent && Number.isFinite(listId)) {
          contact.listIds = [listId];
        }
        await brevoUpsertContact(env.BREVO_API_KEY, contact);
      }
    } catch (contactErr) {
      console.error('[/api/submit] Brevo contact upsert failed (non-fatal):', contactErr.message || contactErr);
    }

    return jsonResponse({ success: true, message: 'Verzonden' });
  } catch (err) {
    console.error('[/api/submit] Brevo error:', err.message || err);
    return jsonResponse({
      success: false,
      message: err.message || 'Brevo send failed',
      hint: 'Common causes: 1) Invalid BREVO_API_KEY 2) hello@aanloopai.nl not verified as sender in Brevo 3) Free plan credits exhausted',
    }, 502);
  }
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
function isPublicHttpUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.')) return null;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return null;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return null;
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return null;
  return u;
}

async function geoFetchText(target, ms = 8000, maxBytes = 600000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(target, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'AanloopAI-GEO-Scan/1.0 (+https://aanloopai.nl/ai-vindbaarheid/)' } });
    const buf = await res.arrayBuffer();
    return { ok: res.ok, status: res.status, text: new TextDecoder().decode(buf.slice(0, maxBytes)) };
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

    // Native Google Calendar booking API (powers /demo-inplannen/)
    if (url.pathname === '/api/calendar/availability') {
      return handleAvailability(request, env);
    }
    if (url.pathname === '/api/calendar/book') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: CORS_HEADERS });
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
  },
};
// Force redeploy after BREVO_API_KEY env var added (Sprint 38)

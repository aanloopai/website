// Cloudflare Worker entry point for aanloopai.nl
// Handles /api/submit (Brevo email) and falls through to static assets
//
// Required env var (Cloudflare Workers → Settings → Variables):
//   BREVO_API_KEY = xkeysib-...
// Required binding (wrangler.toml [assets] block):
//   binding = "ASSETS"

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
  KvK 88606902
</p>`;

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

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

    <p style="font-size:12px;color:#64748b;margin:16px 0">Berekeningen zijn schattingen op basis van gemiddelden bij 80+ live MKB-implementaties. Werkelijke resultaten kunnen afwijken — een gratis AI-scan levert een nauwkeurige op-maat berekening.</p>

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

    <p style="font-size:12px;color:#64748b;margin:16px 0">De score is gebaseerd op gewogen criteria die we bij 80+ live MKB-implementaties effectief vonden. Voor een nauwkeurige op-maat analyse adviseren we onze 30-min videocall AI-scan.</p>

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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Diagnostic endpoint — lists which env vars ARE visible to the worker (no values, just presence)
    if (url.pathname === '/api/health') {
      const envKeys = Object.keys(env || {}).filter(k => k !== 'ASSETS').sort();
      return jsonResponse({
        status: 'ok',
        worker: 'aanloop-website',
        deployed_at: new Date().toISOString(),
        env_keys_present: envKeys,
        brevo_key_present: !!env.BREVO_API_KEY,
        brevo_key_length: env.BREVO_API_KEY ? env.BREVO_API_KEY.length : 0,
        assets_binding_present: !!env.ASSETS,
      });
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

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Not configured: ASSETS binding missing in wrangler.toml', { status: 500 });
  },
};
// Force redeploy after BREVO_API_KEY env var added (Sprint 38)

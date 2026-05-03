// Cloudflare Pages Function — handles form submissions via Brevo
// Endpoint: POST /api/submit
//
// Required env var (set in Cloudflare Pages dashboard → Settings → Environment variables):
//   BREVO_API_KEY = xkeysib-...
//
// The function sends 2 emails per submission:
//   1. Notification to hello@aanloopai.nl (with all form fields)
//   2. Autoresponse confirmation to the form-submitter

const NOTIFICATION_EMAIL = 'hello@aanloopai.nl';
const SENDER_EMAIL = 'hello@aanloopai.nl';
const SENDER_NAME = 'Aanloop AI';

// Type-specific autoresponse messages (matches form types we support)
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

const FOOTER_HTML = `
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
<p style="font-size:12px;color:#64748b;line-height:1.5">
  <strong>Aanloop AI</strong> — AI-oplossingen voor het Nederlandse MKB<br>
  <a href="mailto:hello@aanloopai.nl" style="color:#4f46e5">hello@aanloopai.nl</a> ·
  <a href="https://aanloopai.nl" style="color:#4f46e5">aanloopai.nl</a> ·
  KvK 88606902
</p>`;

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildNotificationHtml(formType, fields, userEmail, userName) {
  const rows = Object.entries(fields)
    .filter(([k, v]) => v && !['type', 'access_key', 'subject', 'from_name', 'replyto', 'redirect', 'source', 'botcheck'].includes(k))
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
    // Common Brevo errors:
    // 401 unauthorized -> invalid API key
    // 400 with "Sender ... is not verified" -> verify sender email in Brevo dashboard
    // 403 with credits -> account out of credits
    throw new Error(`Brevo ${label} HTTP ${res.status}: ${text.substring(0, 400)}`);
  }
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.BREVO_API_KEY) {
    return new Response(JSON.stringify({ success: false, message: 'BREVO_API_KEY env var not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'Invalid form data' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Honeypot
  if (formData.get('botcheck')) {
    return new Response(JSON.stringify({ success: true }), { headers: { 'content-type': 'application/json' } });
  }

  const fields = Object.fromEntries(formData.entries());

  const formType = (fields.form_type || fields.type || 'contact').toString().toLowerCase();
  const template = AUTORESPONSE_TEMPLATES[formType] || AUTORESPONSE_TEMPLATES.contact;

  const userEmail = (fields.email || '').toString().trim();
  const firstName = (fields.voornaam || fields.naam || '').toString().split(' ')[0] || 'daar';
  const fullName = (fields.voornaam ? `${fields.voornaam} ${fields.achternaam || ''}`.trim() : fields.naam || userEmail) || userEmail;

  if (!userEmail || !userEmail.includes('@')) {
    return new Response(JSON.stringify({ success: false, message: 'Invalid email' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const subject = (fields.subject || `Nieuw ${formType} via aanloopai.nl — ${fields.bedrijf || fullName}`).toString();

  try {
    // 1. Notification to Aanloop AI
    await sendBrevoEmail(env.BREVO_API_KEY, {
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: NOTIFICATION_EMAIL, name: 'Aanloop AI' }],
      replyTo: { email: userEmail, name: fullName },
      subject,
      htmlContent: buildNotificationHtml(formType, fields, userEmail, fullName),
    }, 'notification');

    // 2. Autoresponse to user
    const autoresponseHtml = formType === 'roi_calculator'
      ? buildRoiAutoresponseHtml(template, firstName, fields)
      : buildAutoresponseHtml(template, firstName);

    await sendBrevoEmail(env.BREVO_API_KEY, {
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: userEmail, name: fullName }],
      replyTo: { email: NOTIFICATION_EMAIL, name: 'Aanloop AI' },
      subject: template.subject,
      htmlContent: autoresponseHtml,
    }, 'autoresponse');

    return new Response(JSON.stringify({ success: true, message: 'Verzonden' }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    // Log full error to Cloudflare console (visible in Pages → Functions → Logs)
    console.error('[/api/submit] error:', err);
    return new Response(JSON.stringify({
      success: false,
      message: err.message || 'Brevo send failed',
      hint: 'Check: 1) BREVO_API_KEY env var set in Cloudflare Pages? 2) hello@aanloopai.nl verified as sender in Brevo dashboard? 3) Brevo account has credits?',
    }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}

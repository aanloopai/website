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
};

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

    await sendBrevoEmail(env.BREVO_API_KEY, {
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: userEmail, name: fullName }],
      replyTo: { email: NOTIFICATION_EMAIL, name: 'Aanloop AI' },
      subject: template.subject,
      htmlContent: buildAutoresponseHtml(template, firstName),
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

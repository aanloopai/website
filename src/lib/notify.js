// Staff alerting for the failure modes that are otherwise invisible.
//
// Every path that used to swallow an error now calls alertStaff(). Two
// independent channels on purpose: the mail channel goes through Brevo, so it
// is exactly the thing that is broken when a "mail failed" alert fires —
// Telegram is the out-of-band fallback that still lands in that case.
//
// alertStaff never throws: an alert failing must not take down the request it
// is reporting on. Both channels log their own failure.

const STAFF_EMAIL = 'hello@aanloopai.nl';
const SENDER = { name: 'Aanloop AI Portaal', email: 'hello@aanloopai.nl' };

async function alertByMail(env, subject, body) {
  if (!env.BREVO_API_KEY) return false;
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: SENDER,
      to: [{ email: STAFF_EMAIL, name: 'Aanloop AI' }],
      subject: `[Portaal] ${subject}`,
      textContent: body,
    }),
  });
  if (!res.ok) throw new Error(`Brevo alert HTTP ${res.status}`);
  return true;
}

async function alertByTelegram(env, subject, body) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: `⚠️ ${subject}\n\n${body}`,
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) throw new Error(`Telegram alert HTTP ${res.status}`);
  return true;
}

/**
 * Notify staff about something that needs a human. Best-effort on both
 * channels; the caller is never blocked and never sees a throw.
 *
 * @param {object} env  Worker env (BREVO_API_KEY / TELEGRAM_BOT_TOKEN+CHAT_ID)
 * @param {string} subject  Short, scannable.
 * @param {string} body  Plain text — what happened and what to do about it.
 * @returns {Promise<{mail: boolean, telegram: boolean}>} which channels landed
 */
export async function alertStaff(env, subject, body) {
  const out = { mail: false, telegram: false };
  const [mail, telegram] = await Promise.allSettled([
    alertByMail(env, subject, body),
    alertByTelegram(env, subject, body),
  ]);
  if (mail.status === 'fulfilled') out.mail = mail.value;
  else console.error('[alertStaff] mail channel failed:', mail.reason?.message || mail.reason);
  if (telegram.status === 'fulfilled') out.telegram = telegram.value;
  else console.error('[alertStaff] telegram channel failed:', telegram.reason?.message || telegram.reason);

  if (!out.mail && !out.telegram) {
    // Last resort: at least make it greppable in `wrangler tail`.
    console.error(`[alertStaff] NO CHANNEL REACHED — ${subject} :: ${body}`);
  }
  return out;
}

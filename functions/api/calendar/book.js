// POST /api/calendar/book {slot:{start,end}, name, email, phone, company?, message?}
// Creates Calendar event in admin's primary calendar with Google Meet link, sends Brevo confirmation.
import { getAccessToken, jsonResponse, errorResponse } from '../_lib/google-auth.js';

const EVENTS_BASE = 'https://www.googleapis.com/calendar/v3/calendars';
const BREVO_API = 'https://api.brevo.com/v3/smtp/email';
const TIMEZONE = 'Europe/Amsterdam';

function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
  try {
    const body = await request.json();
    const { slot, name, email, phone, company, message } = body || {};
    if (!slot?.start || !slot?.end) return errorResponse('Missing slot.start or slot.end', 400);
    if (!name || typeof name !== 'string' || name.trim().length < 2) return errorResponse('Invalid name', 400);
    if (!isValidEmail(email)) return errorResponse('Invalid email', 400);

    const slotStart = new Date(slot.start);
    const slotEnd = new Date(slot.end);
    if (isNaN(slotStart) || isNaN(slotEnd)) return errorResponse('Invalid slot dates', 400);
    if (slotStart.getTime() <= Date.now()) return errorResponse('Slot is in the past', 400);
    if (slotEnd.getTime() - slotStart.getTime() > 60 * 60_000) return errorResponse('Slot too long', 400);

    const accessToken = await getAccessToken(env);
    const calendarId = env.BOOKING_CALENDAR_ID || 'primary';

    const eventBody = {
      summary: `Aanloop AI strategiegesprek — ${name}`,
      description: [
        `Naam: ${name}`,
        `Email: ${email}`,
        `Telefoon: ${phone || '-'}`,
        `Bedrijf: ${company || '-'}`,
        '',
        'Bericht:',
        message || '(geen bericht)',
        '',
        '— Geboekt via aanloopai.nl/demo-inplannen/',
      ].join('\n'),
      start: { dateTime: slot.start, timeZone: TIMEZONE },
      end: { dateTime: slot.end, timeZone: TIMEZONE },
      attendees: [{ email }],
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const eventUrl = `${EVENTS_BASE}/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`;
    const r = await fetch(eventUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    });
    if (!r.ok) {
      const txt = await r.text();
      return errorResponse(`Event create failed: ${r.status} ${txt}`, 502);
    }
    const event = await r.json();
    const meetLink = event.hangoutLink || event.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri || null;

    if (env.BREVO_API_KEY) {
      const formattedDate = new Intl.DateTimeFormat('nl-NL', {
        timeZone: TIMEZONE, dateStyle: 'full', timeStyle: 'short',
      }).format(slotStart);
      try {
        await fetch(BREVO_API, {
          method: 'POST',
          headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: { name: 'Aanloop AI', email: 'hello@aanloopai.nl' },
            to: [{ email, name }],
            replyTo: { email: 'hello@aanloopai.nl', name: 'Aanloop AI' },
            subject: `Bevestiging: strategiegesprek Aanloop AI — ${formattedDate}`,
            htmlContent: [
              `<p>Hoi ${name.split(' ')[0]},</p>`,
              `<p>Je 30-min strategiegesprek met Aanloop AI staat ingepland op <strong>${formattedDate}</strong>.</p>`,
              meetLink ? `<p><strong>Google Meet link:</strong><br><a href="${meetLink}">${meetLink}</a></p>` : '',
              `<p>De Google Calendar uitnodiging is ook naar ${email} gestuurd, met daarin de Meet-link.</p>`,
              `<p>Bericht ontvangen:<br><em>${(message || '(geen bericht)').replace(/</g, '&lt;')}</em></p>`,
              `<p style="margin-top:2rem">Tot dan,<br>Mustafa Agah Dogan<br>Aanloop AI<br><a href="https://aanloopai.nl">aanloopai.nl</a></p>`,
            ].join(''),
          }),
        });
      } catch (_e) {
        // ignore — Google invite was already sent
      }
    }

    return jsonResponse({
      ok: true,
      eventId: event.id,
      meetLink,
      htmlLink: event.htmlLink,
    });
  } catch (err) {
    return errorResponse(err.message || 'Internal error', 500);
  }
}

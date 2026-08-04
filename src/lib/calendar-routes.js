// Native Google Calendar booking routes — wired into src/worker.js.
// Ported from the (dead) functions/api/* Pages-Functions tree; the project
// deploys as a Cloudflare Worker, so route logic must live in the Worker bundle.
import { getAccessToken, jsonResponse, errorResponse } from './google-auth.js';
import { escapeHtml } from './escape.js';

const TIMEZONE = 'Europe/Amsterdam';

// ─────────────────────────────────────────────────────────────────────────
// GET /api/calendar/availability?dates=YYYY-MM-DD,YYYY-MM-DD,...
// Returns 30-min slots within working hours that are not busy in admin's calendar.
// ─────────────────────────────────────────────────────────────────────────
const FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy';
const SLOT_MINUTES = 30;
const WORKING_HOURS = {
  // 0=Sun, 1=Mon, ..., 6=Sat
  1: { start: 10, end: 15 },
  2: { start: 10, end: 15 },
  3: { start: 10, end: 15 },
  4: { start: 10, end: 15 },
  5: { start: 10, end: 12 },
};

function generateSlots(dateStr) {
  const slots = [];
  const probe = new Date(`${dateStr}T12:00:00Z`);
  const dowStr = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'short' }).format(probe);
  const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dowMap[dowStr];
  const wh = WORKING_HOURS[dow];
  if (!wh) return slots;
  for (let h = wh.start; h < wh.end; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      const sample = new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);
      const nlHourStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIMEZONE, hour: '2-digit', hour12: false,
      }).format(sample);
      const nlHour = parseInt(nlHourStr, 10);
      // nlHour = h + tzOffset; to land slot at NL-local hour h, UTC = h - tzOffset.
      const tzOffset = nlHour - h;
      const realUtc = new Date(`${dateStr}T${String(h - tzOffset).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);
      const endUtc = new Date(realUtc.getTime() + SLOT_MINUTES * 60_000);
      slots.push({ start: realUtc.toISOString(), end: endUtc.toISOString() });
    }
  }
  return slots;
}

export async function handleAvailability(request, env) {
  try {
    const url = new URL(request.url);
    const datesParam = url.searchParams.get('dates');
    if (!datesParam) return errorResponse('Missing dates param (comma-separated YYYY-MM-DD)', 400);
    const dates = datesParam.split(',').filter(Boolean).slice(0, 14);
    if (dates.length === 0) return jsonResponse({ ok: true, slots: [] });

    const allSlots = [];
    for (const d of dates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
      allSlots.push(...generateSlots(d));
    }
    if (allSlots.length === 0) return jsonResponse({ ok: true, slots: [] });

    const accessToken = await getAccessToken(env);
    const calendarId = env.BOOKING_CALENDAR_ID || 'primary';
    const sortedSlots = [...allSlots].sort((a, b) => a.start.localeCompare(b.start));
    const minTime = sortedSlots[0].start;
    const maxTime = sortedSlots[sortedSlots.length - 1].end;

    const r = await fetch(FREEBUSY_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMin: minTime, timeMax: maxTime, timeZone: TIMEZONE, items: [{ id: calendarId }] }),
    });
    if (!r.ok) {
      const txt = await r.text();
      return errorResponse(`FreeBusy query failed: ${r.status} ${txt}`, 502);
    }
    const data = await r.json();
    const busy = data.calendars?.[calendarId]?.busy || [];

    const now = Date.now();
    const free = sortedSlots
      .filter((s) => new Date(s.start).getTime() > now + 30 * 60_000)
      .filter((s) => {
        const ss = new Date(s.start).getTime();
        const se = new Date(s.end).getTime();
        return !busy.some((b) => {
          const bs = new Date(b.start).getTime();
          const be = new Date(b.end).getTime();
          return ss < be && se > bs;
        });
      });

    return jsonResponse({ ok: true, timezone: TIMEZONE, slots: free });
  } catch (err) {
    return errorResponse(err.message || 'Internal error', 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// POST /api/calendar/book {slot:{start,end}, name, email, phone, company?, message?}
// Creates Calendar event with Google Meet link, sends Brevo confirmation.
// ─────────────────────────────────────────────────────────────────────────
const EVENTS_BASE = 'https://www.googleapis.com/calendar/v3/calendars';
const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Escapes user-controlled values before they are interpolated into
// HTML email bodies (Brevo). Covers all five HTML-significant chars.

export async function handleBook(request, env) {
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
    if (slotEnd.getTime() <= slotStart.getTime()) return errorResponse('Slot end must be after slot start', 400);
    if (slotEnd.getTime() - slotStart.getTime() > 60 * 60_000) return errorResponse('Slot too long', 400);

    // Reject off-grid / off-hours slots: the requested start must be one of the
    // canonical 30-min slots generateSlots() would produce for that NL-local day
    // (generateSlots returns [] for weekdays with no WORKING_HOURS entry, e.g. Sunday).
    const slotDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(slotStart);
    const canonicalSlots = generateSlots(slotDateStr);
    const isLegalSlot = canonicalSlots.some((s) => new Date(s.start).getTime() === slotStart.getTime());
    if (!isLegalSlot) return errorResponse('Tijdslot valt buiten de werkuren', 400);

    const accessToken = await getAccessToken(env);
    const calendarId = env.BOOKING_CALENDAR_ID || 'primary';

    // Re-validate availability at book time (closes most of the TOCTOU window
    // between the client fetching /availability and posting /book). This is
    // best-effort only — the Calendar API has no atomic reserve/lock primitive,
    // so two requests can still both pass this check in the same instant and
    // both create overlapping events. It reduces, but does not fully eliminate,
    // the double-booking race.
    const fbCheck = await fetch(FREEBUSY_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMin: slot.start, timeMax: slot.end, timeZone: TIMEZONE, items: [{ id: calendarId }] }),
    });
    if (!fbCheck.ok) {
      const txt = await fbCheck.text();
      return errorResponse(`FreeBusy check failed: ${fbCheck.status} ${txt}`, 502);
    }
    const fbData = await fbCheck.json();
    const busyRanges = fbData.calendars?.[calendarId]?.busy || [];
    const isBusy = busyRanges.some((b) => {
      const bs = new Date(b.start).getTime();
      const be = new Date(b.end).getTime();
      return slotStart.getTime() < be && slotEnd.getTime() > bs;
    });
    if (isBusy) return errorResponse('Tijdslot niet meer beschikbaar', 409);

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
              `<p>Hoi ${escapeHtml(name.split(' ')[0])},</p>`,
              `<p>Je 30-min strategiegesprek met Aanloop AI staat ingepland op <strong>${formattedDate}</strong>.</p>`,
              meetLink ? `<p><strong>Google Meet link:</strong><br><a href="${meetLink}">${meetLink}</a></p>` : '',
              `<p>De Google Calendar uitnodiging is ook naar ${escapeHtml(email)} gestuurd, met daarin de Meet-link.</p>`,
              `<p>Bericht ontvangen:<br><em>${escapeHtml(message || '(geen bericht)')}</em></p>`,
              `<p style="margin-top:2rem">Tot dan,<br>Aanloop AI<br><a href="https://aanloopai.nl">aanloopai.nl</a></p>`,
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

// ─────────────────────────────────────────────────────────────────────────
// GET /api/google/initiate?key=<GOOGLE_OAUTH_INIT_KEY>
// Step 1 of OAuth: redirect admin to Google consent screen. Admin-only.
// ─────────────────────────────────────────────────────────────────────────
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
];

export async function handleGoogleInitiate(request, env) {
  const url = new URL(request.url);
  const adminKey = url.searchParams.get('key');
  if (!env.GOOGLE_OAUTH_INIT_KEY || adminKey !== env.GOOGLE_OAUTH_INIT_KEY) {
    return new Response('Forbidden — admin key required', { status: 403 });
  }
  if (!env.GOOGLE_CLIENT_ID) {
    return new Response('Missing GOOGLE_CLIENT_ID env var', { status: 500 });
  }
  if (!env.GOOGLE_TOKENS) {
    return new Response('KV namespace GOOGLE_TOKENS not bound', { status: 500 });
  }
  const state = crypto.randomUUID();
  await env.GOOGLE_TOKENS.put(`oauth:state:${state}`, '1', { expirationTtl: 600 });
  const redirect = new URL(GOOGLE_AUTH_URL);
  redirect.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  redirect.searchParams.set('redirect_uri', `${url.origin}/api/google/callback`);
  redirect.searchParams.set('response_type', 'code');
  redirect.searchParams.set('scope', SCOPES.join(' '));
  redirect.searchParams.set('access_type', 'offline');
  redirect.searchParams.set('prompt', 'consent');
  redirect.searchParams.set('state', state);
  return Response.redirect(redirect.toString(), 302);
}

// ─────────────────────────────────────────────────────────────────────────
// GET /api/google/callback?code=...&state=...
// Step 2 of OAuth: exchange code for tokens, store refresh_token in KV.
// ─────────────────────────────────────────────────────────────────────────
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const KV_KEY = 'oauth:google:admin';

export async function handleGoogleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) return errorResponse(`OAuth declined: ${oauthError}`, 400);
  if (!code || !state) return errorResponse('Missing code or state', 400);
  if (!env.GOOGLE_TOKENS) return errorResponse('KV namespace GOOGLE_TOKENS not bound', 500);

  const stateValid = await env.GOOGLE_TOKENS.get(`oauth:state:${state}`);
  if (!stateValid) return errorResponse('Invalid or expired state', 400);
  await env.GOOGLE_TOKENS.delete(`oauth:state:${state}`);

  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!r.ok) {
    const txt = await r.text();
    return errorResponse(`Token exchange failed: ${r.status} ${txt}`, 500);
  }
  const tokens = await r.json();
  if (!tokens.refresh_token) {
    return errorResponse(
      'No refresh_token returned. Revoke prior consent at myaccount.google.com/permissions for this app and retry.',
      500,
    );
  }
  await env.GOOGLE_TOKENS.put(
    KV_KEY,
    JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      scope: tokens.scope,
      created_at: Date.now(),
    }),
  );
  const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>Aanloop AI Calendar gekoppeld</title></head>
<body style="font-family:system-ui,sans-serif;padding:2rem;max-width:640px;margin:0 auto;background:#0b1220;color:#e5e7eb">
  <h1 style="color:#60a5fa">Google Calendar gekoppeld</h1>
  <p>Refresh-token opgeslagen in Cloudflare KV. De boeking-API is nu actief.</p>
  <p style="margin-top:1.5rem"><a style="color:#93c5fd" href="/demo-inplannen/">Test de boekingspagina &rarr;</a></p>
  <p style="margin-top:2rem;color:#94a3b8;font-size:.875rem">Scope: ${tokens.scope}</p>
</body></html>`;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

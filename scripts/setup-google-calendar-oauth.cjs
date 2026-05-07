#!/usr/bin/env node
// Sessie-22 Google Calendar OAuth + booking integration scaffold.
// Single-tenant: 1 admin OAuth, refresh_token in Cloudflare KV, customers book in admin's calendar.
// Creates 5 Cloudflare Pages Functions + rewrites src/pages/demo-inplannen.astro.
// Idempotent — overwrites existing files (re-runs OK).

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FILES = {
  // ====================================================================
  // functions/api/_lib/google-auth.js — shared token-refresh helper
  // ====================================================================
  'functions/api/_lib/google-auth.js': `// Shared OAuth token-refresh helper for Google Calendar API.
// Single-tenant: admin's tokens stored in KV under key 'oauth:google:admin'.

const KV_KEY = 'oauth:google:admin';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const EXPIRY_BUFFER_MS = 60_000;

export async function getAccessToken(env) {
  if (!env.GOOGLE_TOKENS) {
    throw new Error('KV namespace GOOGLE_TOKENS not bound. Configure in Cloudflare Pages settings.');
  }
  const stored = await env.GOOGLE_TOKENS.get(KV_KEY, 'json');
  if (!stored) {
    throw new Error('No admin tokens. Visit /api/google/initiate?key=<GOOGLE_OAUTH_INIT_KEY> to authorize.');
  }
  if (Date.now() < stored.expires_at - EXPIRY_BUFFER_MS) {
    return stored.access_token;
  }
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: stored.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(\`Token refresh failed: \${r.status} \${txt}\`);
  }
  const fresh = await r.json();
  const updated = {
    ...stored,
    access_token: fresh.access_token,
    expires_at: Date.now() + fresh.expires_in * 1000,
  };
  await env.GOOGLE_TOKENS.put(KV_KEY, JSON.stringify(updated));
  return updated.access_token;
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ ok: false, error: message }, status);
}
`,

  // ====================================================================
  // functions/api/google/initiate.js — OAuth flow start (admin-only)
  // ====================================================================
  'functions/api/google/initiate.js': `// Step 1 of OAuth: redirect admin to Google consent screen.
// Use only by admin once. Protected by GOOGLE_OAUTH_INIT_KEY query param.

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
];

export async function onRequest({ request, env }) {
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
  await env.GOOGLE_TOKENS.put(\`oauth:state:\${state}\`, '1', { expirationTtl: 600 });
  const redirect = new URL(GOOGLE_AUTH_URL);
  redirect.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  redirect.searchParams.set('redirect_uri', \`\${url.origin}/api/google/callback\`);
  redirect.searchParams.set('response_type', 'code');
  redirect.searchParams.set('scope', SCOPES.join(' '));
  redirect.searchParams.set('access_type', 'offline');
  redirect.searchParams.set('prompt', 'consent');
  redirect.searchParams.set('state', state);
  return Response.redirect(redirect.toString(), 302);
}
`,

  // ====================================================================
  // functions/api/google/callback.js — OAuth callback
  // ====================================================================
  'functions/api/google/callback.js': `// Step 2 of OAuth: receive code, exchange for tokens, store refresh_token in KV.
import { errorResponse } from '../_lib/google-auth.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const KV_KEY = 'oauth:google:admin';

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) return errorResponse(\`OAuth declined: \${oauthError}\`, 400);
  if (!code || !state) return errorResponse('Missing code or state', 400);

  const stateValid = await env.GOOGLE_TOKENS.get(\`oauth:state:\${state}\`);
  if (!stateValid) return errorResponse('Invalid or expired state', 400);
  await env.GOOGLE_TOKENS.delete(\`oauth:state:\${state}\`);

  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: \`\${url.origin}/api/google/callback\`,
      grant_type: 'authorization_code',
    }),
  });
  if (!r.ok) {
    const txt = await r.text();
    return errorResponse(\`Token exchange failed: \${r.status} \${txt}\`, 500);
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
  const html = \`<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>Aanloop AI Calendar gekoppeld</title></head>
<body style="font-family:system-ui,sans-serif;padding:2rem;max-width:640px;margin:0 auto;background:#0b1220;color:#e5e7eb">
  <h1 style="color:#60a5fa">Google Calendar gekoppeld</h1>
  <p>Refresh-token opgeslagen in Cloudflare KV. De boeking-API is nu actief.</p>
  <p style="margin-top:1.5rem"><a style="color:#93c5fd" href="/demo-inplannen/">Test de boekingspagina &rarr;</a></p>
  <p style="margin-top:2rem;color:#94a3b8;font-size:.875rem">Scope: \${tokens.scope}</p>
</body></html>\`;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
`,

  // ====================================================================
  // functions/api/calendar/availability.js — free/busy query
  // ====================================================================
  'functions/api/calendar/availability.js': `// GET /api/calendar/availability?dates=YYYY-MM-DD,YYYY-MM-DD,...
// Returns 30-min slots within working hours that are not busy in admin's calendar.
import { getAccessToken, jsonResponse, errorResponse } from '../_lib/google-auth.js';

const FREEBUSY_URL = 'https://www.googleapis.com/calendar/v3/freeBusy';
const TIMEZONE = 'Europe/Amsterdam';
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
  const probe = new Date(\`\${dateStr}T12:00:00Z\`);
  const dowStr = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'short' }).format(probe);
  const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dowMap[dowStr];
  const wh = WORKING_HOURS[dow];
  if (!wh) return slots;
  for (let h = wh.start; h < wh.end; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      const sample = new Date(\`\${dateStr}T\${String(h).padStart(2, '0')}:\${String(m).padStart(2, '0')}:00Z\`);
      const nlHourStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIMEZONE, hour: '2-digit', hour12: false,
      }).format(sample);
      const nlHour = parseInt(nlHourStr, 10);
      const offsetHours = h - nlHour;
      const realUtc = new Date(\`\${dateStr}T\${String(h - offsetHours).padStart(2, '0')}:\${String(m).padStart(2, '0')}:00Z\`);
      const endUtc = new Date(realUtc.getTime() + SLOT_MINUTES * 60_000);
      slots.push({ start: realUtc.toISOString(), end: endUtc.toISOString() });
    }
  }
  return slots;
}

export async function onRequest({ request, env }) {
  try {
    const url = new URL(request.url);
    const datesParam = url.searchParams.get('dates');
    if (!datesParam) return errorResponse('Missing dates param (comma-separated YYYY-MM-DD)', 400);
    const dates = datesParam.split(',').filter(Boolean).slice(0, 14);
    if (dates.length === 0) return jsonResponse({ ok: true, slots: [] });

    const allSlots = [];
    for (const d of dates) {
      if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(d)) continue;
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
      headers: { Authorization: \`Bearer \${accessToken}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMin: minTime, timeMax: maxTime, timeZone: TIMEZONE, items: [{ id: calendarId }] }),
    });
    if (!r.ok) {
      const txt = await r.text();
      return errorResponse(\`FreeBusy query failed: \${r.status} \${txt}\`, 502);
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
`,

  // ====================================================================
  // functions/api/calendar/book.js — create event + Meet + Brevo email
  // ====================================================================
  'functions/api/calendar/book.js': `// POST /api/calendar/book {slot:{start,end}, name, email, phone, company?, message?}
// Creates Calendar event in admin's primary calendar with Google Meet link, sends Brevo confirmation.
import { getAccessToken, jsonResponse, errorResponse } from '../_lib/google-auth.js';

const EVENTS_BASE = 'https://www.googleapis.com/calendar/v3/calendars';
const BREVO_API = 'https://api.brevo.com/v3/smtp/email';
const TIMEZONE = 'Europe/Amsterdam';

function isValidEmail(s) {
  return typeof s === 'string' && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(s);
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
      summary: \`Aanloop AI strategiegesprek — \${name}\`,
      description: [
        \`Naam: \${name}\`,
        \`Email: \${email}\`,
        \`Telefoon: \${phone || '-'}\`,
        \`Bedrijf: \${company || '-'}\`,
        '',
        'Bericht:',
        message || '(geen bericht)',
        '',
        '— Geboekt via aanloopai.nl/demo-inplannen/',
      ].join('\\n'),
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

    const eventUrl = \`\${EVENTS_BASE}/\${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all\`;
    const r = await fetch(eventUrl, {
      method: 'POST',
      headers: { Authorization: \`Bearer \${accessToken}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    });
    if (!r.ok) {
      const txt = await r.text();
      return errorResponse(\`Event create failed: \${r.status} \${txt}\`, 502);
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
            subject: \`Bevestiging: strategiegesprek Aanloop AI — \${formattedDate}\`,
            htmlContent: [
              \`<p>Hoi \${name.split(' ')[0]},</p>\`,
              \`<p>Je 30-min strategiegesprek met Aanloop AI staat ingepland op <strong>\${formattedDate}</strong>.</p>\`,
              meetLink ? \`<p><strong>Google Meet link:</strong><br><a href="\${meetLink}">\${meetLink}</a></p>\` : '',
              \`<p>De Google Calendar uitnodiging is ook naar \${email} gestuurd, met daarin de Meet-link.</p>\`,
              \`<p>Bericht ontvangen:<br><em>\${(message || '(geen bericht)').replace(/</g, '&lt;')}</em></p>\`,
              \`<p style="margin-top:2rem">Tot dan,<br>Mustafa Agah Dogan<br>Aanloop AI<br><a href="https://aanloopai.nl">aanloopai.nl</a></p>\`,
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
`,

  // ====================================================================
  // src/pages/demo-inplannen.astro — REWRITE: custom Aanloop-branded UI
  // ====================================================================
  'src/pages/demo-inplannen.astro': `---
import BaseLayout from '../layouts/BaseLayout.astro';

const title = 'Plan een 30-min strategiegesprek — Aanloop AI';
const description = 'Boek direct een 30-min strategiegesprek met Mustafa Agah Dogan (founder Aanloop AI). Native Aanloop-booking met Google Calendar + Google Meet — geen iframe.';
---

<BaseLayout title={title} description={description}>
  <main class="bg-midnight text-pearl min-h-screen">
    <section class="mx-auto max-w-3xl px-6 py-16 lg:py-24">
      <h1 class="text-3xl lg:text-4xl font-bold mb-4">Plan een 30-min strategiegesprek</h1>
      <p class="text-lg text-pearl/80 mb-8">
        Geen sales-pitch. Een directe call met Mustafa Agah Dogan (founder Aanloop AI) over jouw situatie,
        AI-kansen voor je MKB, en of we passen.
      </p>

      <div id="booking-widget" class="border border-pearl/10 rounded-2xl p-6 bg-midnight/60">
        <div id="step-day" class="space-y-4">
          <h2 class="text-xl font-semibold">1. Kies een dag</h2>
          <div id="day-tabs" class="flex flex-wrap gap-2"></div>
          <div id="loading-msg" class="text-sm text-pearl/60 hidden">Beschikbaarheid laden...</div>
          <div id="error-msg" class="text-sm text-rose-300 hidden" role="alert"></div>
        </div>

        <div id="step-slot" class="space-y-4 mt-8 hidden">
          <h2 class="text-xl font-semibold">2. Kies een tijd</h2>
          <div id="slot-grid" class="grid grid-cols-2 sm:grid-cols-3 gap-2"></div>
          <p id="no-slots" class="text-sm text-pearl/60 hidden">Geen vrije slots op deze dag — kies een andere.</p>
        </div>

        <form id="step-form" class="space-y-4 mt-8 hidden" novalidate>
          <h2 class="text-xl font-semibold">3. Jouw gegevens</h2>
          <p class="text-sm text-pearl/70" id="selected-slot-label"></p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label class="block">
              <span class="text-sm font-medium">Naam *</span>
              <input name="name" required minlength="2" class="mt-1 w-full rounded-lg bg-midnight border border-pearl/20 px-3 py-2 text-pearl" />
            </label>
            <label class="block">
              <span class="text-sm font-medium">Email *</span>
              <input name="email" type="email" required class="mt-1 w-full rounded-lg bg-midnight border border-pearl/20 px-3 py-2 text-pearl" />
            </label>
            <label class="block">
              <span class="text-sm font-medium">Telefoon</span>
              <input name="phone" type="tel" inputmode="tel" class="mt-1 w-full rounded-lg bg-midnight border border-pearl/20 px-3 py-2 text-pearl" />
            </label>
            <label class="block">
              <span class="text-sm font-medium">Bedrijf</span>
              <input name="company" class="mt-1 w-full rounded-lg bg-midnight border border-pearl/20 px-3 py-2 text-pearl" />
            </label>
          </div>
          <label class="block">
            <span class="text-sm font-medium">Wat wil je bespreken? (optioneel)</span>
            <textarea name="message" rows="3" class="mt-1 w-full rounded-lg bg-midnight border border-pearl/20 px-3 py-2 text-pearl"></textarea>
          </label>
          <button type="submit" id="submit-btn" class="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-blue text-white font-semibold hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition">
            Bevestig boeking
          </button>
          <p id="submit-status" class="text-sm hidden" role="status"></p>
        </form>

        <div id="step-confirmed" class="hidden space-y-4 mt-8">
          <h2 class="text-xl font-semibold text-emerald-300">Boeking bevestigd</h2>
          <p class="text-sm text-pearl/80">Je ontvangt een Google Calendar uitnodiging + bevestigingsmail. De Google Meet link staat hieronder en in de uitnodiging.</p>
          <p id="meet-link-wrap" class="text-sm hidden">
            <a id="meet-link" href="#" class="text-brand-blue hover:underline" target="_blank" rel="noopener">Open Google Meet</a>
          </p>
        </div>
      </div>

      <p class="mt-8 text-xs text-pearl/50">
        Ma-do 10:00-15:00 / Vr 10:00-12:00 (Europe/Amsterdam). Booking systeem: Google Calendar + Meet.
      </p>
    </section>

    <script type="module">
      const TIMEZONE = 'Europe/Amsterdam';
      const dayTabs = document.getElementById('day-tabs');
      const slotGrid = document.getElementById('slot-grid');
      const loadingMsg = document.getElementById('loading-msg');
      const errorMsg = document.getElementById('error-msg');
      const stepSlot = document.getElementById('step-slot');
      const stepForm = document.getElementById('step-form');
      const noSlotsMsg = document.getElementById('no-slots');
      const selectedSlotLabel = document.getElementById('selected-slot-label');
      const stepConfirmed = document.getElementById('step-confirmed');
      const submitBtn = document.getElementById('submit-btn');
      const submitStatus = document.getElementById('submit-status');
      const meetLinkWrap = document.getElementById('meet-link-wrap');
      const meetLink = document.getElementById('meet-link');

      let allSlots = [];
      let selectedSlot = null;
      let activeDay = null;

      function fmtNL(date, opts) {
        return new Intl.DateTimeFormat('nl-NL', { timeZone: TIMEZONE, ...opts }).format(date);
      }

      function buildDays() {
        const days = [];
        for (let i = 0; i < 14; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const iso = d.toISOString().slice(0, 10);
          const dow = fmtNL(d, { weekday: 'short' });
          if (dow === 'za' || dow === 'zo') continue;
          days.push({ iso, label: \\\`\\\${dow} \\\${fmtNL(d, { day: 'numeric', month: 'short' })}\\\` });
          if (days.length >= 7) break;
        }
        return days;
      }

      function renderDayTabs(days) {
        dayTabs.innerHTML = '';
        for (const d of days) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.dataset.day = d.iso;
          btn.className = 'px-3 py-2 rounded-lg border border-pearl/20 hover:border-brand-blue text-sm transition';
          btn.textContent = d.label;
          btn.addEventListener('click', () => selectDay(d.iso, btn));
          dayTabs.appendChild(btn);
        }
      }

      function selectDay(iso, btn) {
        activeDay = iso;
        document.querySelectorAll('#day-tabs button').forEach((b) => {
          b.classList.toggle('bg-brand-blue', b === btn);
          b.classList.toggle('text-white', b === btn);
          b.classList.toggle('border-brand-blue', b === btn);
        });
        renderSlots();
      }

      function renderSlots() {
        const slotsToday = allSlots.filter((s) => s.start.slice(0, 10) === activeDay);
        slotGrid.innerHTML = '';
        if (slotsToday.length === 0) {
          noSlotsMsg.classList.remove('hidden');
        } else {
          noSlotsMsg.classList.add('hidden');
          for (const s of slotsToday) {
            const btn = document.createElement('button');
            btn.type = 'button';
            const time = fmtNL(new Date(s.start), { hour: '2-digit', minute: '2-digit' });
            btn.className = 'px-3 py-2 rounded-lg border border-pearl/20 hover:border-brand-blue hover:bg-brand-blue/10 text-sm transition';
            btn.textContent = time;
            btn.addEventListener('click', () => selectSlot(s, btn));
            slotGrid.appendChild(btn);
          }
        }
        stepSlot.classList.remove('hidden');
        stepForm.classList.add('hidden');
      }

      function selectSlot(s, btn) {
        selectedSlot = s;
        document.querySelectorAll('#slot-grid button').forEach((b) => {
          b.classList.toggle('bg-brand-blue', b === btn);
          b.classList.toggle('text-white', b === btn);
        });
        const startD = new Date(s.start);
        selectedSlotLabel.textContent = \\\`Geselecteerd: \\\${fmtNL(startD, { weekday: 'long', day: 'numeric', month: 'long' })} om \\\${fmtNL(startD, { hour: '2-digit', minute: '2-digit' })}\\\`;
        stepForm.classList.remove('hidden');
        stepForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      async function loadAvailability() {
        loadingMsg.classList.remove('hidden');
        errorMsg.classList.add('hidden');
        const days = buildDays();
        renderDayTabs(days);
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 30_000);
        try {
          const r = await fetch('/api/calendar/availability?dates=' + days.map((d) => d.iso).join(','), { signal: ctrl.signal });
          clearTimeout(tid);
          if (!r.ok) {
            const data = await r.json().catch(() => ({}));
            throw new Error(data.error || \\\`HTTP \\\${r.status}\\\`);
          }
          const data = await r.json();
          allSlots = data.slots || [];
          if (days.length > 0) {
            const firstDayBtn = dayTabs.querySelector('button');
            selectDay(days[0].iso, firstDayBtn);
          }
        } catch (err) {
          clearTimeout(tid);
          errorMsg.textContent = \\\`Kon agenda niet laden: \\\${err.message}. Probeer opnieuw of mail hello@aanloopai.nl.\\\`;
          errorMsg.classList.remove('hidden');
        } finally {
          loadingMsg.classList.add('hidden');
        }
      }

      stepForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedSlot) return;
        submitBtn.disabled = true;
        const originalLabel = submitBtn.textContent;
        submitBtn.textContent = 'Bezig met boeken...';
        submitStatus.classList.add('hidden');
        const data = new FormData(stepForm);
        const payload = {
          slot: selectedSlot,
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone') || '',
          company: data.get('company') || '',
          message: data.get('message') || '',
        };
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 30_000);
        try {
          const r = await fetch('/api/calendar/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: ctrl.signal,
          });
          clearTimeout(tid);
          const result = await r.json().catch(() => ({}));
          if (!r.ok || !result.ok) throw new Error(result.error || \\\`HTTP \\\${r.status}\\\`);
          stepForm.classList.add('hidden');
          stepSlot.classList.add('hidden');
          document.getElementById('step-day').classList.add('hidden');
          stepConfirmed.classList.remove('hidden');
          if (result.meetLink) {
            meetLink.href = result.meetLink;
            meetLink.textContent = result.meetLink;
            meetLinkWrap.classList.remove('hidden');
          }
          stepConfirmed.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
          clearTimeout(tid);
          const isTimeout = err.name === 'AbortError';
          submitStatus.textContent = isTimeout
            ? 'Time-out. Controleer je internet en probeer opnieuw, of mail hello@aanloopai.nl.'
            : \\\`Boeking mislukt: \\\${err.message}. Probeer opnieuw of mail hello@aanloopai.nl.\\\`;
          submitStatus.className = 'text-sm text-rose-300';
          submitStatus.classList.remove('hidden');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
      });

      loadAvailability();
    </script>
  </main>
</BaseLayout>
`,
};

let created = 0;
let overwritten = 0;
for (const [relPath, content] of Object.entries(FILES)) {
  const fp = path.join(ROOT, relPath);
  const dir = path.dirname(fp);
  fs.mkdirSync(dir, { recursive: true });
  const existed = fs.existsSync(fp);
  fs.writeFileSync(fp, content);
  if (existed) {
    overwritten++;
    console.log(`~ ${relPath} (overwritten)`);
  } else {
    created++;
    console.log(`+ ${relPath} (new)`);
  }
}
console.log(`\nResult: ${created} created, ${overwritten} overwritten — ${Object.keys(FILES).length} files total`);

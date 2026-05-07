// GET /api/calendar/availability?dates=YYYY-MM-DD,YYYY-MM-DD,...
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
      const offsetHours = h - nlHour;
      const realUtc = new Date(`${dateStr}T${String(h - offsetHours).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);
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

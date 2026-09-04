// Zichtbaarheid — pure helpers (no env, no D1, no fetch). Unit-tested in
// test/visibility.test.js. Everything that touches D1/KV/Google lives in
// visibility.js; keep this file side-effect free so the math can be locked
// down with plain assertions.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ROWS = 400;

// Portfolio seed — sites AGA/Aanloop owns or built. The ingest auto-adds any
// GSC property it can read that is not listed here (eigenaar 'onbekend'), so
// a new Search Console koppeling shows up without a code change.
export const SEED_SITES = [
  { key: 'aanloop', naam: 'Aanloop AI', host: 'www.aanloopai.nl', eigenaar: 'eigen' },
  { key: 'alfa', naam: 'Alfa Reclame', host: 'www.alfareclame.nl', eigenaar: 'eigen' },
  { key: 'fth', naam: 'FleetTrack Holland', host: 'www.fleettrackholland.nl', eigenaar: 'eigen' },
  { key: 'keukeninbeeld', naam: 'Keuken in Beeld', host: 'www.keukeninbeeld.nl', eigenaar: 'eigen' },
  { key: 'pasfoto', naam: 'Pasfoto Rotterdam Zuid', host: 'www.pasfotorotterdamzuid.nl', eigenaar: 'klant' },
  { key: 'tripandtick', naam: 'Trip and Tick', host: 'www.tripandtick.com', eigenaar: 'klant' },
  { key: 'klaasendaams', naam: 'Klaas & Daams', host: 'www.klaasendaams.nl', eigenaar: 'klant' },
];

// Google Business Profile Performance API daily metrics we store. Keys are
// the API enum names; labels are what the panel shows.
export const GBP_METRICS = {
  BUSINESS_IMPRESSIONS_DESKTOP_MAPS: 'Maps (desktop)',
  BUSINESS_IMPRESSIONS_MOBILE_MAPS: 'Maps (mobiel)',
  BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: 'Zoeken (desktop)',
  BUSINESS_IMPRESSIONS_MOBILE_SEARCH: 'Zoeken (mobiel)',
  BUSINESS_DIRECTION_REQUESTS: 'Routebeschrijvingen',
  CALL_CLICKS: 'Telefoontjes',
  WEBSITE_CLICKS: 'Websiteklikken',
  BUSINESS_CONVERSATIONS: 'Berichten',
  BUSINESS_BOOKINGS: 'Boekingen',
};

export function normalizeHost(v) {
  let h = String(v || '').trim().toLowerCase();
  h = h.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '');
  h = h.split('/')[0];
  return h;
}

// Bare host used for matching (www stripped): GSC url-prefix vs domain
// properties and GBP websiteUri all map to the same site this way.
export function bareHost(v) {
  return normalizeHost(v).replace(/^www\./, '');
}

function num(v, int = false) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return int ? Math.max(0, Math.round(n)) : n;
}

// Validate/coerce an ingest payload. Returns { ok, error } or the cleaned
// document. Never throws — the route maps { ok:false } to 400.
export function validateIngest(body) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body ontbreekt' };
  const siteKey = String(body.site_key || '').trim().toLowerCase();
  const host = normalizeHost(body.host);
  if (!/^[a-z0-9_-]{2,40}$/.test(siteKey)) return { ok: false, error: 'site_key ongeldig' };
  if (!host || !host.includes('.')) return { ok: false, error: 'host ongeldig' };

  const daily = [];
  for (const r of Array.isArray(body.daily) ? body.daily.slice(0, MAX_ROWS) : []) {
    const date = String(r?.date || '');
    if (!DATE_RE.test(date)) continue;
    daily.push({
      date,
      clicks: num(r.clicks, true),
      impressions: num(r.impressions, true),
      ctr: num(r.ctr),
      position: num(r.position),
    });
  }
  const top = [];
  for (const r of Array.isArray(body.top) ? body.top.slice(0, MAX_ROWS) : []) {
    const dim = r?.dim === 'page' ? 'page' : r?.dim === 'query' ? 'query' : '';
    const key = String(r?.key || '').trim().slice(0, 500);
    if (!dim || !key) continue;
    top.push({
      dim, key,
      clicks: num(r.clicks, true),
      impressions: num(r.impressions, true),
      ctr: num(r.ctr),
      position: num(r.position),
    });
  }
  return {
    ok: true,
    site_key: siteKey,
    host,
    naam: body.naam ? String(body.naam).slice(0, 120) : '',
    gsc_property: body.gsc_property ? String(body.gsc_property).slice(0, 200) : '',
    period_days: num(body.period_days, true) || 28,
    daily,
    top,
  };
}

export function addDays(iso, n) {
  const t = Date.parse(`${iso}T00:00:00Z`);
  return new Date(t + n * 86400000).toISOString().slice(0, 10);
}

function sumWindow(rows, from, to) {
  // inclusive [from, to]
  let clicks = 0, impressions = 0, posW = 0, days = 0;
  for (const r of rows) {
    if (r.datum < from || r.datum > to) continue;
    clicks += r.clicks || 0;
    impressions += r.impressions || 0;
    posW += (r.position || 0) * (r.impressions || 0);
    days += 1;
  }
  return {
    clicks, impressions, days,
    ctr: impressions ? clicks / impressions : 0,
    position: impressions ? posW / impressions : 0,
  };
}

export function pctDelta(now, before) {
  if (!before) return now ? null : 0;
  return (now - before) / before;
}

// rows: [{datum, clicks, impressions, ctr, position}] for ONE site, any
// order. Window end = latest datum present (GSC lags 2-3 days; anchoring on
// "today" would silently under-count the last window). Returns 28d vs the
// 28d before it plus a sparkline series of the last `sparkDays` days.
export function summarizeDaily(rows, windowDays = 28, sparkDays = 28) {
  const sorted = [...(rows || [])].sort((a, b) => (a.datum < b.datum ? -1 : 1));
  if (!sorted.length) {
    return { end: null, current: sumWindow([], '9', '0'), previous: sumWindow([], '9', '0'), delta: {}, spark: [] };
  }
  const end = sorted[sorted.length - 1].datum;
  const curFrom = addDays(end, -(windowDays - 1));
  const prevTo = addDays(curFrom, -1);
  const prevFrom = addDays(prevTo, -(windowDays - 1));
  const current = sumWindow(sorted, curFrom, end);
  const previous = sumWindow(sorted, prevFrom, prevTo);
  const sparkFrom = addDays(end, -(sparkDays - 1));
  const byDate = new Map(sorted.map((r) => [r.datum, r]));
  const spark = [];
  for (let i = 0; i < sparkDays; i++) {
    const d = addDays(sparkFrom, i);
    const r = byDate.get(d);
    spark.push({ datum: d, clicks: r ? r.clicks : 0, impressions: r ? r.impressions : 0 });
  }
  return {
    end,
    current,
    previous,
    delta: {
      clicks: pctDelta(current.clicks, previous.clicks),
      impressions: pctDelta(current.impressions, previous.impressions),
      ctr: previous.ctr ? current.ctr - previous.ctr : null,
      position: previous.position ? current.position - previous.position : null,
    },
    spark,
  };
}

// GBP rows: [{datum, metric, waarde}] for one site → 28d totals per metric
// (+ previous 28d) anchored on the latest datum present.
export function summarizeGbp(rows, windowDays = 28) {
  const sorted = [...(rows || [])].sort((a, b) => (a.datum < b.datum ? -1 : 1));
  if (!sorted.length) return { end: null, current: {}, previous: {}, mapsViews: 0, searchViews: 0 };
  const end = sorted[sorted.length - 1].datum;
  const curFrom = addDays(end, -(windowDays - 1));
  const prevTo = addDays(curFrom, -1);
  const prevFrom = addDays(prevTo, -(windowDays - 1));
  const current = {}, previous = {};
  for (const r of sorted) {
    if (r.datum >= curFrom && r.datum <= end) current[r.metric] = (current[r.metric] || 0) + (r.waarde || 0);
    else if (r.datum >= prevFrom && r.datum <= prevTo) previous[r.metric] = (previous[r.metric] || 0) + (r.waarde || 0);
  }
  const mapsViews = (current.BUSINESS_IMPRESSIONS_DESKTOP_MAPS || 0) + (current.BUSINESS_IMPRESSIONS_MOBILE_MAPS || 0);
  const searchViews = (current.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH || 0) + (current.BUSINESS_IMPRESSIONS_MOBILE_SEARCH || 0);
  return { end, current, previous, mapsViews, searchViews };
}

// Business Profile Performance API
// (locations/{id}:fetchMultiDailyMetricsTimeSeries) response → flat rows.
export function gbpResponseToRows(resp) {
  const out = [];
  const series = resp?.multiDailyMetricTimeSeries || [];
  for (const block of series) {
    for (const s of block?.dailyMetricTimeSeries || []) {
      const metric = s?.dailyMetric;
      if (!metric || !(metric in GBP_METRICS)) continue;
      for (const dv of s?.timeSeries?.datedValues || []) {
        const d = dv?.date;
        if (!d?.year || !d?.month || !d?.day) continue;
        const datum = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
        out.push({ datum, metric, waarde: num(dv.value, true) });
      }
    }
  }
  return out;
}

// Site-acties: click/submit events counted by the v.js beacon on each site.
// Keys are what the beacon sends; labels are what the panel shows.
export const EVENT_TYPES = {
  tel: 'Bellen (tel-link)',
  whatsapp: 'WhatsApp',
  route: 'Route (Maps-link)',
  mail: 'E-mail (mailto)',
  form: 'Formulier verzonden',
};

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|curl\/|wget|python-requests|facebookexternalhit/i;

export function isBotUserAgent(ua) {
  const s = String(ua || '');
  return !s || BOT_UA.test(s);
}

// Parse the beacon body ({e, p}) → {event, path} or null. Never throws.
export function parseEvent(raw) {
  let b;
  try { b = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  if (!b || typeof b !== 'object') return null;
  const event = String(b.e || b.event || '').toLowerCase();
  if (!(event in EVENT_TYPES)) return null;
  const path = String(b.p || b.path || '/').slice(0, 200);
  return { event, path: path.startsWith('/') ? path : '/' };
}

// Host the event belongs to: Origin header first (always set on cross-origin
// POST/sendBeacon), Referer as fallback. Bare host so www/no-www match.
export function eventHost(originHeader, refererHeader) {
  for (const h of [originHeader, refererHeader]) {
    if (!h) continue;
    try { return bareHost(new URL(h).host); } catch { /* not a URL */ }
  }
  return '';
}

// rows: [{datum, event, waarde}] for one site → 28d vs previous 28d per
// event, anchored on today (events arrive live, no lag).
export function summarizeEvents(rows, today, windowDays = 28) {
  const end = today || new Date().toISOString().slice(0, 10);
  const curFrom = addDays(end, -(windowDays - 1));
  const prevTo = addDays(curFrom, -1);
  const prevFrom = addDays(prevTo, -(windowDays - 1));
  const current = {}, previous = {};
  let total = 0;
  for (const r of rows || []) {
    if (r.datum >= curFrom && r.datum <= end) { current[r.event] = (current[r.event] || 0) + (r.waarde || 0); total += r.waarde || 0; }
    else if (r.datum >= prevFrom && r.datum <= prevTo) previous[r.event] = (previous[r.event] || 0) + (r.waarde || 0);
  }
  return { end, current, previous, total };
}

// HMAC-SHA256 hex over the raw body — same contract as the /api/intake
// forward to Hetzner (X-Intake-Signature: sha256=<hex>), reversed direction.
export async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifySignature(secret, rawBody, headerValue) {
  if (!secret || !headerValue) return false;
  const expected = `sha256=${await hmacHex(secret, rawBody)}`;
  return timingSafeEqual(expected, String(headerValue).trim());
}

// Pick the GBP location whose websiteUri points at this site (bare-host
// match). Returns null when none matches — the panel then offers a manual
// dropdown instead of guessing.
export function matchGbpLocation(host, locations) {
  const want = bareHost(host);
  if (!want) return null;
  for (const loc of locations || []) {
    if (bareHost(loc?.websiteUri) === want) return loc;
  }
  return null;
}

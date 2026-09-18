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
  demo: 'Emma live-demo gestart',
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

// Gedrag op de site — per-hit funnel (entry/exit/flow), cookieless. Types the
// beacon (v.js) sends; 'view'/'leave' bracket a page visit, the rest mirror
// the click/form/custom events. sid/seq come from sessionStorage on the
// client so a session is reconstructible without any personal data.
export const HIT_TYPES = new Set(['view', 'leave', 'tel', 'whatsapp', 'route', 'mail', 'form', 'form_start', 'demo', 'custom']);
const SID_RE = /^[a-z0-9]{8,32}$/;
const MAX_SEQ = 500;

// Validate/coerce one beacon hit ({t, sid, seq, p, r, src, med, dev, sec, sc,
// meta}) → the row shape visibility_hits stores, or null. Never throws.
// sec/sc are range-checked strictly (out of range → reject the whole hit,
// not just the field — an out-of-range value signals a forged/broken
// client, not a client we should silently half-trust). meta is capped, not
// rejected, since it is free text.
export function parseHit(raw) {
  let b;
  try { b = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
  if (!b || typeof b !== 'object') return null;

  const t = String(b.t || '').toLowerCase();
  if (!HIT_TYPES.has(t)) return null;

  const sid = String(b.sid || '');
  if (!SID_RE.test(sid)) return null;

  const seq = Number(b.seq);
  if (!Number.isInteger(seq) || seq < 1 || seq > MAX_SEQ) return null;

  const path = String(b.p ?? b.path ?? '');
  if (!path.startsWith('/') || path.length > 200) return null;

  const hit = { t, sid, seq, path };

  const refRaw = b.r ?? b.ref;
  if (refRaw) {
    const ref = bareHost(refRaw).slice(0, 100);
    if (ref) hit.ref = ref;
  }
  if (b.src) {
    const src = String(b.src).toLowerCase().slice(0, 50);
    if (src) hit.src = src;
  }
  if (b.med) {
    const med = String(b.med).toLowerCase().slice(0, 50);
    if (med) hit.med = med;
  }
  if (b.dev === 'm' || b.dev === 'd') hit.dev = b.dev;

  if (b.sec !== undefined && b.sec !== null && b.sec !== '') {
    const sec = Math.round(Number(b.sec));
    if (!Number.isFinite(sec) || sec < 0 || sec > 3600) return null;
    hit.sec = sec;
  }
  if (b.sc !== undefined && b.sc !== null && b.sc !== '') {
    const sc = Math.round(Number(b.sc));
    if (!Number.isFinite(sc) || sc < 0 || sc > 100) return null;
    hit.sc = sc;
  }
  if (b.meta) hit.meta = String(b.meta).slice(0, 80);
  return hit;
}

const CONVERTING_HIT_TYPES = new Set(['tel', 'whatsapp', 'mail', 'form', 'route']);
const FLOW_SEP = '\u0000';

function round1(n) { return Math.round(n * 10) / 10; }
function pct(n, d) { return d ? round1((n / d) * 100) : 0; }

// rows: [{sid, seq, t, path, ref, src, med, dev, sec, sc}] already filtered
// to one site and one time window (visibilityGedrag does the SQL SELECT +
// window filter; this is the pure per-session funnel math on top, kept here
// so it is unit-testable without D1). Session = distinct sid. Bounce =
// session with exactly one 'view'. Conversion = session with >=1 hit whose
// type is tel/whatsapp/mail/form/route. Landing = the seq=1 view per
// session; exit = the view with the highest seq per session. Flow = pairs
// of consecutive views (seq, seq+1) within a session.
export function summarizeHits(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const bySid = new Map();
  for (const r of list) {
    if (!bySid.has(r.sid)) bySid.set(r.sid, []);
    bySid.get(r.sid).push(r);
  }

  const sessions = bySid.size;
  let bounceCount = 0, convertingCount = 0, totalViews = 0, secSum = 0, secCount = 0;
  const landingMap = new Map();
  const exitMap = new Map();
  const pageMap = new Map();
  const sourceMap = new Map();
  const flowMap = new Map();
  const devices = { m: 0, d: 0 };

  const page = (path) => {
    if (!pageMap.has(path)) pageMap.set(path, { views: 0, secSum: 0, secCount: 0, scSum: 0, scCount: 0, actions: 0 });
    return pageMap.get(path);
  };

  for (const hits of bySid.values()) {
    const views = hits.filter((h) => h.t === 'view').slice().sort((a, b) => a.seq - b.seq);
    totalViews += views.length;
    const isBounce = views.length === 1;
    if (isBounce) bounceCount++;
    const converts = hits.some((h) => CONVERTING_HIT_TYPES.has(h.t));
    if (converts) convertingCount++;

    const landingHit = views.find((v) => v.seq === 1);
    if (landingHit) {
      if (!landingMap.has(landingHit.path)) landingMap.set(landingHit.path, { sessions: 0, bounce: 0, conv: 0 });
      const l = landingMap.get(landingHit.path);
      l.sessions++;
      if (isBounce) l.bounce++;
      if (converts) l.conv++;
    }

    if (views.length) {
      const exitHit = views[views.length - 1];
      exitMap.set(exitHit.path, (exitMap.get(exitHit.path) || 0) + 1);
    }

    const firstHit = hits.find((h) => h.seq === 1) || landingHit;
    if (firstHit) {
      const bron = firstHit.src || firstHit.ref || 'direct';
      if (!sourceMap.has(bron)) sourceMap.set(bron, { sessions: 0, conv: 0 });
      const s = sourceMap.get(bron);
      s.sessions++;
      if (converts) s.conv++;
    }

    const devHit = hits.find((h) => h.dev === 'm' || h.dev === 'd');
    if (devHit) devices[devHit.dev]++;

    for (let i = 0; i < views.length - 1; i++) {
      if (views[i + 1].seq === views[i].seq + 1) {
        const key = views[i].path + FLOW_SEP + views[i + 1].path;
        flowMap.set(key, (flowMap.get(key) || 0) + 1);
      }
    }

    for (const h of hits) {
      if (h.t === 'view') {
        page(h.path).views++;
      } else if (h.t === 'leave') {
        const p = page(h.path);
        if (typeof h.sec === 'number') { p.secSum += h.sec; p.secCount++; secSum += h.sec; secCount++; }
        if (typeof h.sc === 'number') { p.scSum += h.sc; p.scCount++; }
      } else {
        page(h.path).actions++;
      }
    }
  }

  const landing = [...landingMap.entries()]
    .map(([path, v]) => ({ path, sessions: v.sessions, bounce: pct(v.bounce, v.sessions), conv: pct(v.conv, v.sessions) }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 25);

  const exits = [...exitMap.entries()]
    .map(([path, n]) => ({ path, exits: n, exitRate: pct(n, pageMap.has(path) ? pageMap.get(path).views : n) }))
    .sort((a, b) => b.exits - a.exits)
    .slice(0, 25);

  const pages = [...pageMap.entries()]
    .map(([path, v]) => ({
      path,
      views: v.views,
      avgSec: v.secCount ? Math.round(v.secSum / v.secCount) : 0,
      avgScroll: v.scCount ? Math.round(v.scSum / v.scCount) : 0,
      actions: v.actions,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 25);

  const sources = [...sourceMap.entries()]
    .map(([bron, v]) => ({ bron, sessions: v.sessions, conv: pct(v.conv, v.sessions) }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 25);

  const flow = [...flowMap.entries()]
    .map(([key, n]) => { const [from, to] = key.split(FLOW_SEP); return { from, to, n }; })
    .sort((a, b) => b.n - a.n)
    .slice(0, 20);

  return {
    sessions,
    bounceRate: pct(bounceCount, sessions),
    pagesPerSession: sessions ? round1(totalViews / sessions) : 0,
    avgSec: secCount ? Math.round(secSum / secCount) : 0,
    conversionRate: pct(convertingCount, sessions),
    landing,
    exits,
    pages,
    sources,
    flow,
    devices,
  };
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

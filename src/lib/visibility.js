// Zichtbaarheid — portfolio-wide Search Console + Google Bedrijfsprofiel
// metrics behind /admin/zichtbaarheid.
//
// Data flow
//   fleetclaw (Hetzner, os-visibility-sync, daily)  --HMAC POST-->  /api/visibility/ingest
//   Google Business Profile Performance API          --cron daily-->  gbpSyncIfDue
//   /admin/zichtbaarheid(.astro)                     --session-->      /api/admin/visibility*
//
// Schema lives in migrations/0019_visibility.sql AND is applied here with
// CREATE TABLE IF NOT EXISTS on first use: there is no local wrangler auth to
// run `d1 execute --remote`, so the worker owns its own schema. The
// statements are idempotent; running both is harmless.
import { jsonResponse, errorResponse, getAccessToken } from './google-auth.js';
import {
  SEED_SITES, GBP_METRICS, EVENT_TYPES, validateIngest, verifySignature, summarizeDaily,
  summarizeGbp, summarizeEvents, gbpResponseToRows, matchGbpLocation, bareHost, addDays,
  parseEvent, eventHost, isBotUserAgent,
} from './visibility-core.js';
import { rateLimit } from './rate-limit.js';

export const GBP_KV_KEY = 'oauth:google:gbp';
export const GBP_SCOPE = 'https://www.googleapis.com/auth/business.manage';
const GBP_SYNC_MARK = 'visibility:gbp:last-sync-date';
const GBP_SYNC_AFTER_UTC_HOUR = 5;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS visibility_sites (
    key TEXT PRIMARY KEY,
    naam TEXT NOT NULL,
    host TEXT NOT NULL,
    eigenaar TEXT NOT NULL DEFAULT 'eigen',
    customer_id TEXT,
    gsc_property TEXT,
    gbp_location TEXT,
    gbp_titel TEXT,
    actief INTEGER NOT NULL DEFAULT 1,
    gsc_last_sync INTEGER,
    gbp_last_sync INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS visibility_gsc_daily (
    site_key TEXT NOT NULL,
    datum TEXT NOT NULL,
    clicks INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    ctr REAL NOT NULL DEFAULT 0,
    position REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (site_key, datum)
  )`,
  `CREATE TABLE IF NOT EXISTS visibility_gsc_top (
    site_key TEXT NOT NULL,
    dim TEXT NOT NULL,
    sleutel TEXT NOT NULL,
    clicks INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    ctr REAL NOT NULL DEFAULT 0,
    position REAL NOT NULL DEFAULT 0,
    periode_dagen INTEGER NOT NULL DEFAULT 28,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (site_key, dim, sleutel)
  )`,
  `CREATE TABLE IF NOT EXISTS visibility_gbp_daily (
    site_key TEXT NOT NULL,
    datum TEXT NOT NULL,
    metric TEXT NOT NULL,
    waarde INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (site_key, datum, metric)
  )`,
  `CREATE TABLE IF NOT EXISTS visibility_events_daily (
    site_key TEXT NOT NULL,
    datum TEXT NOT NULL,
    event TEXT NOT NULL,
    waarde INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (site_key, datum, event)
  )`,
];

let schemaReady = false;
export async function ensureVisibilitySchema(env) {
  if (schemaReady) return;
  const db = env.PORTAL_DB;
  for (const sql of SCHEMA) await db.prepare(sql).run();
  const now = Date.now();
  await db.batch(SEED_SITES.map((s) => db
    .prepare('INSERT OR IGNORE INTO visibility_sites (key, naam, host, eigenaar, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(s.key, s.naam, s.host, s.eigenaar, now)));
  schemaReady = true;
}

// ── POST /api/visibility/ingest (machine auth, fleetclaw) ──────────────────
export async function visibilityIngest(request, env) {
  if (request.method !== 'POST') return errorResponse('Use POST', 405);
  if (!env.INTAKE_WEBHOOK_SECRET) return errorResponse('ingest niet geconfigureerd', 503);
  const raw = await request.text();
  const ok = await verifySignature(env.INTAKE_WEBHOOK_SECRET, raw, request.headers.get('x-intake-signature'));
  if (!ok) return errorResponse('Ongeldige handtekening', 401);
  let body;
  try { body = JSON.parse(raw); } catch { return errorResponse('Ongeldige JSON', 400); }
  const doc = validateIngest(body);
  if (!doc.ok) return errorResponse(doc.error, 400);

  await ensureVisibilitySchema(env);
  const db = env.PORTAL_DB;
  const now = Date.now();
  // Unknown site_key (a GSC property we can read but never listed) → auto-add
  // as 'onbekend' so it is visible and can be relabelled in the panel.
  await db.prepare(
    `INSERT INTO visibility_sites (key, naam, host, eigenaar, gsc_property, gsc_last_sync, created_at)
     VALUES (?, ?, ?, 'onbekend', ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET gsc_property = excluded.gsc_property, gsc_last_sync = excluded.gsc_last_sync`,
  ).bind(doc.site_key, doc.naam || doc.host, doc.host, doc.gsc_property, now, now).run();

  const stmts = [];
  for (const r of doc.daily) {
    stmts.push(db.prepare(
      `INSERT INTO visibility_gsc_daily (site_key, datum, clicks, impressions, ctr, position) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(site_key, datum) DO UPDATE SET clicks = excluded.clicks, impressions = excluded.impressions,
       ctr = excluded.ctr, position = excluded.position`,
    ).bind(doc.site_key, r.date, r.clicks, r.impressions, r.ctr, r.position));
  }
  if (doc.top.length) {
    const dims = [...new Set(doc.top.map((t) => t.dim))];
    for (const dim of dims) stmts.push(db.prepare('DELETE FROM visibility_gsc_top WHERE site_key = ? AND dim = ?').bind(doc.site_key, dim));
    for (const t of doc.top) {
      stmts.push(db.prepare(
        `INSERT OR REPLACE INTO visibility_gsc_top (site_key, dim, sleutel, clicks, impressions, ctr, position, periode_dagen, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(doc.site_key, t.dim, t.key, t.clicks, t.impressions, t.ctr, t.position, doc.period_days, now));
    }
  }
  // D1 batch limit is generous but chunk anyway (90 daily + 100 top ≈ 200).
  for (let i = 0; i < stmts.length; i += 100) await db.batch(stmts.slice(i, i + 100));
  return jsonResponse({ ok: true, site_key: doc.site_key, daily: doc.daily.length, top: doc.top.length });
}

// ── POST /api/visibility/event (public beacon, sites) ──────────────────────
// Counts tel:/WhatsApp/Maps/mailto clicks and form submits sent by
// /v.js on each portfolio site. No cookies, no identifiers stored — one
// counter per site/day/event. The site is resolved from the Origin/Referer
// host (never from the body) so a page cannot claim another site's counts.
const EVENT_CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};
const SITE_CACHE_TTL_MS = 5 * 60_000;
let siteCache = { at: 0, byHost: new Map() };

async function siteKeyForHost(env, host) {
  if (!host) return '';
  if (Date.now() - siteCache.at > SITE_CACHE_TTL_MS) {
    const rows = (await env.PORTAL_DB.prepare('SELECT key, host FROM visibility_sites WHERE actief = 1').all()).results || [];
    siteCache = { at: Date.now(), byHost: new Map(rows.map((r) => [bareHost(r.host), r.key])) };
  }
  return siteCache.byHost.get(host) || '';
}

export async function visibilityEvent(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: EVENT_CORS });
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: EVENT_CORS });
  const done = () => new Response(null, { status: 204, headers: EVENT_CORS });
  // Every non-2xx below is deliberately also a silent 204: the beacon never
  // retries and a site must never see an error because of analytics.
  if (isBotUserAgent(request.headers.get('user-agent'))) return done();
  const host = eventHost(request.headers.get('origin'), request.headers.get('referer'));
  if (!host) return done();
  const ev = parseEvent(await request.text().catch(() => ''));
  if (!ev) return done();
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rl = await rateLimit(env.GOOGLE_TOKENS, `rl:visevent:${ip}`, 30, 60);
  if (!rl.allowed) return done();
  await ensureVisibilitySchema(env);
  const siteKey = await siteKeyForHost(env, host);
  if (!siteKey) return done();
  const datum = new Date().toISOString().slice(0, 10);
  await env.PORTAL_DB.prepare(
    `INSERT INTO visibility_events_daily (site_key, datum, event, waarde) VALUES (?, ?, ?, 1)
     ON CONFLICT(site_key, datum, event) DO UPDATE SET waarde = waarde + 1`,
  ).bind(siteKey, datum, ev.event).run();
  return done();
}

// ── GET /v.js (public beacon script) ───────────────────────────────────────
// One line per site: <script src="https://aanloopai.nl/v.js" defer></script>
// Classifies clicks by href, form submits by <form>. Elements can force a
// type with data-vis="tel|whatsapp|route|mail|form" (e.g. JS-driven
// buttons) or opt out with data-vis="off".
export const BEACON_JS = `(function(){
var U='https://aanloopai.nl/api/visibility/event',last={};
function send(e){var t=Date.now();if(last[e]&&t-last[e]<1500)return;last[e]=t;
var b=JSON.stringify({e:e,p:location.pathname.slice(0,200)});
try{if(navigator.sendBeacon&&navigator.sendBeacon(U,new Blob([b],{type:'text/plain'})))return;}catch(x){}
try{fetch(U,{method:'POST',body:b,keepalive:true,mode:'no-cors',headers:{'content-type':'text/plain'}});}catch(x){}}
function classify(a){var v=a.getAttribute('data-vis');if(v==='off')return'';if(v)return v;
var h=(a.getAttribute('href')||'').toLowerCase();if(!h)return'';
if(h.indexOf('tel:')===0)return'tel';if(h.indexOf('mailto:')===0)return'mail';
if(/wa\\.me|whatsapp/.test(h))return'whatsapp';
if(/google\\.[a-z.]+\\/maps|maps\\.google|maps\\.app\\.goo\\.gl|goo\\.gl\\/maps|maps\\.apple|waze\\.com/.test(h))return'route';return'';}
document.addEventListener('click',function(ev){var el=ev.target&&ev.target.closest?ev.target.closest('a[href],[data-vis]'):null;
if(!el)return;var e=classify(el);if(e)send(e);},true);
document.addEventListener('submit',function(ev){var f=ev.target;if(!f||f.getAttribute('data-vis')==='off')return;send('form');},true);
})();`;

export function beaconScript() {
  return new Response(BEACON_JS, {
    status: 200,
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'public, max-age=3600',
      'access-control-allow-origin': '*',
    },
  });
}

// ── GET /api/admin/visibility (staff) ──────────────────────────────────────
export async function visibilityOverview(env) {
  await ensureVisibilitySchema(env);
  const db = env.PORTAL_DB;
  const since = addDays(new Date().toISOString().slice(0, 10), -70);
  const [sites, daily, gbp, events] = await Promise.all([
    db.prepare(`SELECT s.*, c.bedrijf AS klant_bedrijf FROM visibility_sites s
                LEFT JOIN customers c ON c.id = s.customer_id
                WHERE s.actief = 1 ORDER BY s.eigenaar, s.naam`).all(),
    db.prepare('SELECT site_key, datum, clicks, impressions, ctr, position FROM visibility_gsc_daily WHERE datum >= ?').bind(since).all(),
    db.prepare('SELECT site_key, datum, metric, waarde FROM visibility_gbp_daily WHERE datum >= ?').bind(since).all(),
    db.prepare('SELECT site_key, datum, event, waarde FROM visibility_events_daily WHERE datum >= ?').bind(since).all(),
  ]);
  const dailyBy = groupBy(daily.results || [], 'site_key');
  const gbpBy = groupBy(gbp.results || [], 'site_key');
  const evBy = groupBy(events.results || [], 'site_key');
  const gbpConnected = !!(env.GOOGLE_TOKENS && await env.GOOGLE_TOKENS.get(GBP_KV_KEY));
  const totals = { clicks: 0, impressions: 0, prevClicks: 0, prevImpressions: 0, calls: 0, directions: 0, mapsViews: 0, searchViews: 0, siteTel: 0, siteWhatsapp: 0, siteRoute: 0, siteForm: 0, siteActies: 0 };
  const out = [];
  for (const s of sites.results || []) {
    const g = summarizeDaily(dailyBy.get(s.key) || []);
    const b = summarizeGbp(gbpBy.get(s.key) || []);
    const e = summarizeEvents(evBy.get(s.key) || []);
    totals.clicks += g.current.clicks; totals.impressions += g.current.impressions;
    totals.prevClicks += g.previous.clicks; totals.prevImpressions += g.previous.impressions;
    totals.calls += b.current.CALL_CLICKS || 0; totals.directions += b.current.BUSINESS_DIRECTION_REQUESTS || 0;
    totals.mapsViews += b.mapsViews; totals.searchViews += b.searchViews;
    totals.siteTel += e.current.tel || 0; totals.siteWhatsapp += e.current.whatsapp || 0;
    totals.siteRoute += e.current.route || 0; totals.siteForm += e.current.form || 0; totals.siteActies += e.total;
    out.push({
      key: s.key, naam: s.naam, host: s.host, eigenaar: s.eigenaar,
      customer_id: s.customer_id, klant_bedrijf: s.klant_bedrijf,
      gsc: { connected: !!s.gsc_property, property: s.gsc_property, last_sync: s.gsc_last_sync, ...g },
      gbp: { connected: !!s.gbp_location, location: s.gbp_location, titel: s.gbp_titel, last_sync: s.gbp_last_sync, ...b },
      events: { connected: (evBy.get(s.key) || []).length > 0, ...e },
    });
  }
  return jsonResponse({ ok: true, sites: out, totals, gbpConnected, gscServiceAccount: env.GSC_SERVICE_ACCOUNT_EMAIL || 'gsc-reader@alfa-seo.iam.gserviceaccount.com', eventLabels: EVENT_TYPES });
}

// ── GET /api/admin/visibility/site?key= (staff) ────────────────────────────
export async function visibilitySiteDetail(env, url) {
  await ensureVisibilitySchema(env);
  const key = String(url.searchParams.get('key') || '').trim();
  if (!key) return errorResponse('key ontbreekt', 400);
  const db = env.PORTAL_DB;
  const site = await db.prepare(`SELECT s.*, c.bedrijf AS klant_bedrijf FROM visibility_sites s
                                 LEFT JOIN customers c ON c.id = s.customer_id WHERE s.key = ?`).bind(key).first();
  if (!site) return errorResponse('Niet gevonden', 404);
  const since = addDays(new Date().toISOString().slice(0, 10), -190);
  const [daily, top, gbp, events] = await Promise.all([
    db.prepare('SELECT datum, clicks, impressions, ctr, position FROM visibility_gsc_daily WHERE site_key = ? AND datum >= ? ORDER BY datum').bind(key, since).all(),
    db.prepare('SELECT dim, sleutel, clicks, impressions, ctr, position, periode_dagen, updated_at FROM visibility_gsc_top WHERE site_key = ? ORDER BY clicks DESC, impressions DESC').bind(key).all(),
    db.prepare('SELECT datum, metric, waarde FROM visibility_gbp_daily WHERE site_key = ? AND datum >= ? ORDER BY datum').bind(key, since).all(),
    db.prepare('SELECT datum, event, waarde FROM visibility_events_daily WHERE site_key = ? AND datum >= ? ORDER BY datum').bind(key, since).all(),
  ]);
  const rows = daily.results || [];
  return jsonResponse({
    ok: true,
    site: {
      key: site.key, naam: site.naam, host: site.host, eigenaar: site.eigenaar,
      customer_id: site.customer_id, klant_bedrijf: site.klant_bedrijf,
      gsc_property: site.gsc_property, gsc_last_sync: site.gsc_last_sync,
      gbp_location: site.gbp_location, gbp_titel: site.gbp_titel, gbp_last_sync: site.gbp_last_sync,
    },
    summary28: summarizeDaily(rows, 28, 28),
    summary90: summarizeDaily(rows, 90, 90),
    daily: rows,
    queries: (top.results || []).filter((t) => t.dim === 'query'),
    pages: (top.results || []).filter((t) => t.dim === 'page'),
    gbp: { ...summarizeGbp(gbp.results || []), daily: gbp.results || [], labels: GBP_METRICS },
    events: { ...summarizeEvents(events.results || []), daily: events.results || [], labels: EVENT_TYPES, connected: (events.results || []).length > 0 },
  });
}

// ── PATCH /api/admin/visibility/site (staff) ───────────────────────────────
export async function visibilitySiteUpdate(request, env) {
  await ensureVisibilitySchema(env);
  const b = await request.json().catch(() => ({}));
  const key = String(b.key || '').trim();
  if (!key) return errorResponse('key ontbreekt', 400);
  const sets = [], vals = [];
  if ('customer_id' in b) { sets.push('customer_id = ?'); vals.push(b.customer_id ? String(b.customer_id) : null); }
  if (typeof b.naam === 'string' && b.naam.trim()) { sets.push('naam = ?'); vals.push(b.naam.trim().slice(0, 120)); }
  if (['eigen', 'klant', 'onbekend'].includes(b.eigenaar)) { sets.push('eigenaar = ?'); vals.push(b.eigenaar); }
  if ('gbp_location' in b) {
    const loc = b.gbp_location ? String(b.gbp_location) : null;
    if (loc && !/^locations\/\d+$/.test(loc)) return errorResponse('gbp_location ongeldig', 400);
    sets.push('gbp_location = ?'); vals.push(loc);
    sets.push('gbp_titel = ?'); vals.push(loc && b.gbp_titel ? String(b.gbp_titel).slice(0, 120) : null);
  }
  if (typeof b.actief === 'boolean') { sets.push('actief = ?'); vals.push(b.actief ? 1 : 0); }
  if (!sets.length) return errorResponse('Niets te wijzigen', 400);
  vals.push(key);
  await env.PORTAL_DB.prepare(`UPDATE visibility_sites SET ${sets.join(', ')} WHERE key = ?`).bind(...vals).run();
  return jsonResponse({ ok: true });
}

// ── Google Bedrijfsprofiel OAuth (separate token from Calendar) ────────────
// GET /api/admin/visibility/gbp/initiate — staff session (no init key needed).
// The consent callback is the existing /api/google/callback; it stores under
// GBP_KV_KEY when the state was minted here (value 'gbp'), so the Calendar
// refresh token under oauth:google:admin is never overwritten.
export async function gbpInitiate(request, env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_TOKENS) return errorResponse('Google OAuth niet geconfigureerd', 500);
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  await env.GOOGLE_TOKENS.put(`oauth:state:${state}`, 'gbp', { expirationTtl: 600 });
  const redirect = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  redirect.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  redirect.searchParams.set('redirect_uri', `${url.origin}/api/google/callback`);
  redirect.searchParams.set('response_type', 'code');
  redirect.searchParams.set('scope', GBP_SCOPE);
  redirect.searchParams.set('access_type', 'offline');
  redirect.searchParams.set('prompt', 'consent');
  redirect.searchParams.set('state', state);
  return Response.redirect(redirect.toString(), 302);
}

async function gbpFetch(env, url) {
  const token = await getAccessToken(env, GBP_KV_KEY);
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    // Status only — Google error bodies can echo account identifiers.
    const err = new Error(`GBP HTTP ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

// All locations the connected Google account manages (title, websiteUri).
export async function gbpListLocations(env) {
  const acc = await gbpFetch(env, 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts');
  const out = [];
  for (const a of acc.accounts || []) {
    let pageToken = '';
    do {
      const u = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${a.name}/locations`);
      u.searchParams.set('readMask', 'name,title,websiteUri');
      u.searchParams.set('pageSize', '100');
      if (pageToken) u.searchParams.set('pageToken', pageToken);
      const res = await gbpFetch(env, u.toString());
      for (const l of res.locations || []) out.push({ name: l.name, title: l.title || '', websiteUri: l.websiteUri || '', account: a.name });
      pageToken = res.nextPageToken || '';
    } while (pageToken);
  }
  return out;
}

// GET /api/admin/visibility/gbp/locations — for the manual koppel-dropdown.
export async function gbpLocationsRoute(env) {
  if (!env.GOOGLE_TOKENS || !(await env.GOOGLE_TOKENS.get(GBP_KV_KEY))) return errorResponse('Google Bedrijfsprofiel niet gekoppeld', 409);
  try {
    return jsonResponse({ ok: true, locations: await gbpListLocations(env) });
  } catch (err) {
    console.error('[visibility] gbp locations:', err.message || err);
    return errorResponse(`Google Bedrijfsprofiel API: ${err.message || 'fout'}`, err.status === 403 ? 403 : 502);
  }
}

function ymd(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

async function gbpPullLocation(env, siteKey, location, days) {
  const today = new Date().toISOString().slice(0, 10);
  const end = ymd(addDays(today, -1));
  const start = ymd(addDays(today, -days));
  const u = new URL(`https://businessprofileperformance.googleapis.com/v1/${location}:fetchMultiDailyMetricsTimeSeries`);
  for (const m of Object.keys(GBP_METRICS)) u.searchParams.append('dailyMetrics', m);
  u.searchParams.set('dailyRange.startDate.year', start.y); u.searchParams.set('dailyRange.startDate.month', start.m); u.searchParams.set('dailyRange.startDate.day', start.d);
  u.searchParams.set('dailyRange.endDate.year', end.y); u.searchParams.set('dailyRange.endDate.month', end.m); u.searchParams.set('dailyRange.endDate.day', end.d);
  const rows = gbpResponseToRows(await gbpFetch(env, u.toString()));
  const db = env.PORTAL_DB;
  const stmts = rows.map((r) => db.prepare(
    `INSERT INTO visibility_gbp_daily (site_key, datum, metric, waarde) VALUES (?, ?, ?, ?)
     ON CONFLICT(site_key, datum, metric) DO UPDATE SET waarde = excluded.waarde`,
  ).bind(siteKey, r.datum, r.metric, r.waarde));
  for (let i = 0; i < stmts.length; i += 100) await db.batch(stmts.slice(i, i + 100));
  await db.prepare('UPDATE visibility_sites SET gbp_last_sync = ? WHERE key = ?').bind(Date.now(), siteKey).run();
  return rows.length;
}

// Pull GBP metrics for every site with a location; auto-koppel unmapped
// sites whose websiteUri matches. Returns a summary (also used by the
// manual "Nu synchroniseren" button).
export async function gbpSync(env, { days = 35 } = {}) {
  await ensureVisibilitySchema(env);
  if (!env.GOOGLE_TOKENS || !(await env.GOOGLE_TOKENS.get(GBP_KV_KEY))) return { ok: false, error: 'niet gekoppeld' };
  const db = env.PORTAL_DB;
  const sites = (await db.prepare('SELECT key, host, gbp_location FROM visibility_sites WHERE actief = 1').all()).results || [];
  let locations = null;
  const summary = { ok: true, synced: [], koppeld: [], fouten: [] };
  for (const s of sites) {
    try {
      let loc = s.gbp_location;
      if (!loc) {
        if (!locations) locations = await gbpListLocations(env);
        const m = matchGbpLocation(s.host, locations);
        if (!m) continue;
        loc = m.name;
        await db.prepare('UPDATE visibility_sites SET gbp_location = ?, gbp_titel = ? WHERE key = ?').bind(loc, m.title, s.key).run();
        summary.koppeld.push({ key: s.key, location: loc, titel: m.title });
      }
      const n = await gbpPullLocation(env, s.key, loc, days);
      summary.synced.push({ key: s.key, rows: n });
    } catch (err) {
      console.error(`[visibility] gbp sync ${s.key}:`, err.message || err);
      summary.fouten.push({ key: s.key, error: err.message || 'fout' });
    }
  }
  return summary;
}

// POST /api/admin/visibility/gbp/sync — manual run from the panel.
export async function gbpSyncRoute(request, env) {
  const b = await request.json().catch(() => ({}));
  const days = Math.min(540, Math.max(7, Number(b.days) || 35));
  const res = await gbpSync(env, { days });
  return jsonResponse(res, res.ok ? 200 : 409);
}

// Cron hook (worker scheduled(), every 15 min): run once per UTC day after
// 05:00. Silent no-op while GBP is not connected.
export async function gbpSyncIfDue(env) {
  if (!env.GOOGLE_TOKENS) return;
  if (!(await env.GOOGLE_TOKENS.get(GBP_KV_KEY))) return;
  const now = new Date();
  if (now.getUTCHours() < GBP_SYNC_AFTER_UTC_HOUR) return;
  const today = now.toISOString().slice(0, 10);
  if ((await env.GOOGLE_TOKENS.get(GBP_SYNC_MARK)) === today) return;
  await env.GOOGLE_TOKENS.put(GBP_SYNC_MARK, today);
  const res = await gbpSync(env, { days: 35 });
  if (res.fouten?.length) console.error('[visibility] gbp cron fouten:', JSON.stringify(res.fouten));
}

// Stores tokens from /api/google/callback when state === 'gbp'.
export async function storeGbpTokens(env, tokens) {
  await env.GOOGLE_TOKENS.put(GBP_KV_KEY, JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
    scope: tokens.scope,
    created_at: Date.now(),
  }));
}

function groupBy(rows, field) {
  const m = new Map();
  for (const r of rows) {
    const k = r[field];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

export { bareHost };

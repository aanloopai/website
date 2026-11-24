// LEAD-1 — portfolio lead ledger. PII-minimal: no name/email/phone/message/IP.
//   fth|alfa|kib|zoekeen backends --HMAC POST--> /api/leads/ingest --> leads_all
//   aanloop's own /api/submit                     --direct insert-->    leads_all
// Schema: migrations/0028_leads_all.sql (apply with wrangler; the worker does
// NOT create it — a missing table degrades to a logged error, never a failed lead).
import { hmacHex } from './visibility-core.js';

export const LEDGER_SITES = ['fth', 'alfa', 'kib', 'zoekeen', 'aanloop'];
const SECRET_ENV = {
  fth: 'LEDGER_SECRET_FTH', alfa: 'LEDGER_SECRET_ALFA', kib: 'LEDGER_SECRET_KIB',
  zoekeen: 'LEDGER_SECRET_ZOEKEEN', aanloop: 'LEDGER_SECRET_AANLOOP',
};
const MAX_SKEW_S = 300;
const MAX_LEN = 200;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const clamp = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_LEN) : '');

// Only whitelisted fields survive; everything else (email, phone, ...) is dropped here.
export function ledgerRow(body, site) {
  return {
    site,
    lead_id: clamp(typeof body.lead_id === 'number' ? String(body.lead_id) : body.lead_id),
    form: clamp(body.form),
    landing: clamp(body.landing),
    referrer_host: clamp(body.referrer_host),
    utm_source: clamp(body.utm_source),
    utm_medium: clamp(body.utm_medium),
    utm_campaign: clamp(body.utm_campaign),
    ts: clamp(body.ts),
    status: clamp(body.status) || 'received',
  };
}

// Returns true when a new row was inserted, false on duplicate.
async function insertLedgerRow(db, row, now) {
  const res = await db.prepare(
    `INSERT OR IGNORE INTO leads_all
       (site, lead_id, form, landing, referrer_host, utm_source, utm_medium, utm_campaign, ts, status, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(row.site, row.lead_id, row.form, row.landing, row.referrer_host,
    row.utm_source, row.utm_medium, row.utm_campaign, row.ts, row.status, now).run();
  return (res?.meta?.changes ?? 0) > 0;
}

export async function ledgerIngest(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'Use POST' }, 405);
  const site = (request.headers.get('x-ledger-site') || '').trim().toLowerCase();
  const secretName = SECRET_ENV[site];
  const secret = secretName ? env[secretName] : '';
  if (!secret) return json({ ok: false, error: 'unauthorized' }, 401);

  const ts = (request.headers.get('x-ledger-ts') || '').trim();
  const sig = (request.headers.get('x-ledger-sig') || '').trim().toLowerCase();
  const tsNum = /^\d{1,12}$/.test(ts) ? Number(ts) : NaN;
  if (!sig || !Number.isFinite(tsNum) || Math.abs(Math.floor(Date.now() / 1000) - tsNum) > MAX_SKEW_S) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  const raw = await request.text();
  if (!safeEqual(await hmacHex(secret, `${ts}.${raw}`), sig)) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  let body;
  try { body = JSON.parse(raw); } catch { return json({ ok: false, error: 'bad_json' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ ok: false, error: 'bad_body' }, 400);
  const row = ledgerRow(body, site);
  if (!row.lead_id) return json({ ok: false, error: 'lead_id_missing' }, 400);
  if (clamp(body.site).toLowerCase() !== site) return json({ ok: false, error: 'site_mismatch' }, 400);

  if (!env.PORTAL_DB) return json({ ok: false, error: 'no_db' }, 503);
  try {
    const inserted = await insertLedgerRow(env.PORTAL_DB, row, Date.now());
    return json({ ok: true, dup: !inserted });
  } catch (err) {
    console.error('[ledger] insert failed:', err?.message || err);
    return json({ ok: false, error: 'db_error' }, 503);
  }
}

// aanloop's own forms: never throws, never blocks the lead.
export async function recordOwnLead(env, { leadId, form, landing, referrer, utm }) {
  try {
    if (!env.PORTAL_DB || !leadId) return;
    let referrer_host = '';
    try { referrer_host = referrer ? new URL(referrer).hostname : ''; } catch { /* ignore */ }
    const row = ledgerRow({
      lead_id: leadId, form, landing, referrer_host,
      utm_source: utm?.source, utm_medium: utm?.medium, utm_campaign: utm?.campaign,
      ts: new Date().toISOString(), status: 'received',
    }, 'aanloop');
    await insertLedgerRow(env.PORTAL_DB, row, Date.now());
  } catch (err) {
    console.error('[ledger] own lead insert failed:', err?.message || err);
  }
}

// Own domains per site: a referrer from the lead's own site is not a channel ("direct").
const OWN_HOSTS = {
  fth: ['fleettrackholland.nl'], alfa: ['alfareclame.nl'], kib: [],
  zoekeen: ['zoekeen.nl'], aanloop: ['aanloopai.nl'],
};
const SEARCH_ENGINES = ['google', 'bing', 'duckduckgo', 'yahoo', 'ecosia'];
const hostOf = (h) => String(h || '').trim().toLowerCase().replace(/^www\./, '');

// Pure. utm_source wins (+ "/campaign"); else search-engine referrer -> organic; else own/empty -> direct; else host.
export function leadKanaal(row) {
  const src = String(row?.utm_source || '').trim();
  if (src) {
    const camp = String(row?.utm_campaign || '').trim();
    return camp ? `${src}/${camp}` : src;
  }
  const host = hostOf(row?.referrer_host);
  if (!host) return 'direct';
  const engine = SEARCH_ENGINES.find((e) => host.startsWith(`${e}.`) || host.includes(`.${e}.`));
  if (engine) return `organic (${engine})`;
  const own = OWN_HOSTS[String(row?.site || '').toLowerCase()] || [];
  if (own.some((o) => host === o || host.endsWith(`.${o}`))) return 'direct';
  return host;
}

// Staff-only list (called from handleAdminApi, which already enforced the session).
export async function listLedger(env, url) {
  if (!env.PORTAL_DB) return json({ ok: false, error: 'no_db' }, 503);
  const site = (url.searchParams.get('site') || '').toLowerCase();
  const cols = 'site, lead_id, form, landing, ts, status, received_at, answered_at, utm_source, utm_medium, utm_campaign, referrer_host';
  try {
    const q = LEDGER_SITES.includes(site)
      ? env.PORTAL_DB.prepare(`SELECT ${cols} FROM leads_all WHERE site = ? ORDER BY received_at DESC LIMIT 100`).bind(site)
      : env.PORTAL_DB.prepare(`SELECT ${cols} FROM leads_all ORDER BY received_at DESC LIMIT 100`);
    const leads = ((await q.all()).results || []).map((r) => ({ ...r, kanaal: leadKanaal(r) }));
    return json({ ok: true, leads });
  } catch (err) {
    console.error('[ledger] list failed:', err?.message || err);
    return json({ ok: false, error: 'db_error' }, 503);
  }
}

// Staff-only: lead counts per site + raw channel source over the last N days (received_at = epoch ms).
export async function listLedgerKanalen(env, url) {
  if (!env.PORTAL_DB) return json({ ok: false, error: 'no_db' }, 503);
  const site = (url.searchParams.get('site') || '').toLowerCase();
  const d = Number(url.searchParams.get('days'));
  const days = Number.isFinite(d) && d > 0 ? Math.min(365, Math.floor(d)) : 90;
  const since = Date.now() - days * 86400000;
  const sel = `SELECT site, COALESCE(NULLIF(utm_source,''), NULLIF(referrer_host,''), 'direct') AS kanaal_source, COUNT(*) AS n
       FROM leads_all WHERE received_at >= ?`;
  const tail = ' GROUP BY site, kanaal_source ORDER BY n DESC LIMIT 200';
  try {
    const q = LEDGER_SITES.includes(site)
      ? env.PORTAL_DB.prepare(`${sel} AND site = ?${tail}`).bind(since, site)
      : env.PORTAL_DB.prepare(sel + tail).bind(since);
    return json({ ok: true, days, kanalen: (await q.all()).results || [] });
  } catch (err) {
    console.error('[ledger] kanalen failed:', err?.message || err);
    return json({ ok: false, error: 'db_error' }, 503);
  }
}

// LEAD-2 — AGA read API (server-to-server). Bearer LEDGER_READ_TOKEN, no session, no CORS.
// Both sides are HMAC'd first so the compare is fixed-length (no token-length leak).
async function bearerOk(request, token) {
  if (!token) return false;
  const m = /^Bearer (.+)$/.exec(request.headers.get('authorization') || '');
  if (!m) return false;
  return safeEqual(await hmacHex('ledger-read', m[1].trim()), await hmacHex('ledger-read', token));
}

export async function ledgerRead(request, env, url) {
  if (request.method !== 'GET') return json({ ok: false, error: 'Use GET' }, 405);
  if (!(await bearerOk(request, env.LEDGER_READ_TOKEN))) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!env.PORTAL_DB) return json({ ok: false, error: 'no_db' }, 503);
  const h = Number(url.searchParams.get('hours'));
  const hours = Number.isFinite(h) && h > 0 ? Math.min(720, Math.max(1, Math.floor(h))) : 168;
  const since = Date.now() - hours * 3600 * 1000;
  try {
    const res = await env.PORTAL_DB.prepare(
      `SELECT site, lead_id, form, landing, utm_source, ts, status, received_at, answered_at
       FROM leads_all WHERE received_at >= ? ORDER BY received_at DESC LIMIT 500`,
    ).bind(since).all();
    return json({ ok: true, leads: res.results || [] });
  } catch (err) {
    console.error('[ledger] read failed:', err?.message || err);
    return json({ ok: false, error: 'db_error' }, 503);
  }
}

// Staff-only (handleAdminApi enforced the session): mark a lead answered, idempotent.
export async function markLedgerAnswered(request, env) {
  if (!env.PORTAL_DB) return json({ ok: false, error: 'no_db' }, 503);
  const b = await request.json().catch(() => null);
  const site = typeof b?.site === 'string' ? b.site.trim().toLowerCase() : '';
  const leadId = typeof b?.lead_id === 'string' ? b.lead_id.trim() : '';
  if (!LEDGER_SITES.includes(site)) return json({ ok: false, error: 'bad_site' }, 400);
  if (!leadId || leadId.length > MAX_LEN) return json({ ok: false, error: 'bad_lead_id' }, 400);
  try {
    const res = await env.PORTAL_DB.prepare(
      'UPDATE leads_all SET answered_at = ? WHERE site = ? AND lead_id = ? AND answered_at IS NULL',
    ).bind(Date.now(), site, leadId).run();
    return json({ ok: true, updated: res?.meta?.changes ?? 0 });
  } catch (err) {
    console.error('[ledger] answered failed:', err?.message || err);
    return json({ ok: false, error: 'db_error' }, 503);
  }
}

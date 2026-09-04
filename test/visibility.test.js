// Zichtbaarheid (admin/zichtbaarheid): pure math + wiring guards.
// Same style as test/admin-klant-page.test.js: static assertions on the
// real source for wiring, unit tests for src/lib/visibility-core.js.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateIngest, summarizeDaily, summarizeGbp, gbpResponseToRows,
  verifySignature, hmacHex, matchGbpLocation, bareHost, addDays, SEED_SITES,
  parseEvent, eventHost, isBotUserAgent, summarizeEvents, EVENT_TYPES,
} from '../src/lib/visibility-core.js';
import { BEACON_JS } from '../src/lib/visibility.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

describe('validateIngest', () => {
  it('rejects a missing/invalid site_key or host', () => {
    expect(validateIngest(null).ok).toBe(false);
    expect(validateIngest({ host: 'www.alfareclame.nl' }).ok).toBe(false);
    expect(validateIngest({ site_key: 'alfa', host: 'nohost' }).ok).toBe(false);
    expect(validateIngest({ site_key: 'A L F A', host: 'www.alfareclame.nl' }).ok).toBe(false);
  });

  it('normalises the host from a GSC property and coerces rows', () => {
    const doc = validateIngest({
      site_key: 'ALFA', host: 'https://www.alfareclame.nl/', gsc_property: 'sc-domain:alfareclame.nl',
      daily: [
        { date: '2026-08-30', clicks: '3', impressions: 120.6, ctr: 2.5, position: '14.2' },
        { date: 'bad', clicks: 1 },
        { date: '2026-08-31', clicks: -2, impressions: null },
      ],
      top: [
        { dim: 'query', key: 'reclamebureau rotterdam', clicks: 2, impressions: 40 },
        { dim: 'device', key: 'MOBILE', clicks: 9 },
        { dim: 'page', key: '', clicks: 1 },
      ],
    });
    expect(doc.ok).toBe(true);
    expect(doc.site_key).toBe('alfa');
    expect(doc.host).toBe('www.alfareclame.nl');
    expect(doc.daily).toEqual([
      { date: '2026-08-30', clicks: 3, impressions: 121, ctr: 2.5, position: 14.2 },
      { date: '2026-08-31', clicks: 0, impressions: 0, ctr: 0, position: 0 },
    ]);
    expect(doc.top).toHaveLength(1);
    expect(doc.top[0]).toMatchObject({ dim: 'query', key: 'reclamebureau rotterdam', clicks: 2, impressions: 40 });
    expect(doc.period_days).toBe(28);
  });
});

describe('summarizeDaily', () => {
  // 56 days: previous window 1 click/day, current window 2 clicks/day.
  const rows = [];
  for (let i = 0; i < 56; i++) {
    const datum = addDays('2026-07-01', i);
    const cur = i >= 28;
    rows.push({ datum, clicks: cur ? 2 : 1, impressions: 100, ctr: 0, position: cur ? 10 : 20 });
  }

  it('anchors the window on the latest datum present, not on today', () => {
    const s = summarizeDaily(rows);
    expect(s.end).toBe('2026-08-25');
    expect(s.current.days).toBe(28);
    expect(s.previous.days).toBe(28);
  });

  it('sums clicks/impressions, weights position by impressions and computes deltas', () => {
    const s = summarizeDaily(rows);
    expect(s.current.clicks).toBe(56);
    expect(s.previous.clicks).toBe(28);
    expect(s.current.impressions).toBe(2800);
    expect(s.current.position).toBeCloseTo(10);
    expect(s.previous.position).toBeCloseTo(20);
    expect(s.delta.clicks).toBeCloseTo(1); // +100%
    expect(s.delta.position).toBeCloseTo(-10);
    expect(s.current.ctr).toBeCloseTo(0.02);
  });

  it('fills sparkline gaps with zero days so 28 points always come back', () => {
    const sparse = [{ datum: '2026-08-01', clicks: 5, impressions: 10 }, { datum: '2026-08-10', clicks: 7, impressions: 10 }];
    const s = summarizeDaily(sparse);
    expect(s.spark).toHaveLength(28);
    expect(s.spark[27]).toEqual({ datum: '2026-08-10', clicks: 7, impressions: 10 });
    expect(s.spark[26].clicks).toBe(0);
    expect(s.delta.clicks).toBeNull(); // no previous window → "nieuw", not +∞
  });

  it('handles an empty series without throwing', () => {
    const s = summarizeDaily([]);
    expect(s.end).toBeNull();
    expect(s.current.clicks).toBe(0);
    expect(s.spark).toEqual([]);
  });
});

describe('summarizeGbp + gbpResponseToRows', () => {
  it('maps the Performance API time series to flat rows and ignores unknown metrics', () => {
    const rows = gbpResponseToRows({
      multiDailyMetricTimeSeries: [{
        dailyMetricTimeSeries: [
          { dailyMetric: 'CALL_CLICKS', timeSeries: { datedValues: [{ date: { year: 2026, month: 8, day: 3 }, value: '4' }, { date: { year: 2026, month: 8, day: 4 } }] } },
          { dailyMetric: 'SOMETHING_NEW', timeSeries: { datedValues: [{ date: { year: 2026, month: 8, day: 3 }, value: '9' }] } },
        ],
      }],
    });
    expect(rows).toEqual([
      { datum: '2026-08-03', metric: 'CALL_CLICKS', waarde: 4 },
      { datum: '2026-08-04', metric: 'CALL_CLICKS', waarde: 0 },
    ]);
  });

  it('adds desktop+mobile Maps and Search impressions per window', () => {
    const rows = [
      { datum: '2026-08-20', metric: 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS', waarde: 10 },
      { datum: '2026-08-21', metric: 'BUSINESS_IMPRESSIONS_MOBILE_MAPS', waarde: 5 },
      { datum: '2026-08-21', metric: 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH', waarde: 7 },
      { datum: '2026-07-01', metric: 'CALL_CLICKS', waarde: 3 }, // previous window
      { datum: '2026-08-21', metric: 'CALL_CLICKS', waarde: 2 },
    ];
    const s = summarizeGbp(rows);
    expect(s.end).toBe('2026-08-21');
    expect(s.mapsViews).toBe(15);
    expect(s.searchViews).toBe(7);
    expect(s.current.CALL_CLICKS).toBe(2);
    expect(s.previous.CALL_CLICKS).toBe(3);
  });
});

describe('verifySignature (fleetclaw → aanloop HMAC contract)', () => {
  it('accepts sha256=<hex> over the raw body and rejects everything else', async () => {
    const body = '{"site_key":"alfa"}';
    const good = `sha256=${await hmacHex('geheim', body)}`;
    expect(await verifySignature('geheim', body, good)).toBe(true);
    expect(await verifySignature('geheim', body + ' ', good)).toBe(false);
    expect(await verifySignature('anders', body, good)).toBe(false);
    expect(await verifySignature('geheim', body, '')).toBe(false);
    expect(await verifySignature('', body, good)).toBe(false);
  });
});

describe('site/location matching', () => {
  it('strips scheme, www and sc-domain: for matching', () => {
    expect(bareHost('sc-domain:alfareclame.nl')).toBe('alfareclame.nl');
    expect(bareHost('https://www.alfareclame.nl/')).toBe('alfareclame.nl');
    expect(bareHost('WWW.Pasfotorotterdamzuid.nl')).toBe('pasfotorotterdamzuid.nl');
  });

  it('matches a GBP location on websiteUri host and returns null otherwise', () => {
    const locs = [
      { name: 'locations/1', title: 'Alfa', websiteUri: 'https://alfareclame.nl' },
      { name: 'locations/2', title: 'Pasfoto', websiteUri: 'http://www.pasfotorotterdamzuid.nl/' },
    ];
    expect(matchGbpLocation('www.pasfotorotterdamzuid.nl', locs).name).toBe('locations/2');
    expect(matchGbpLocation('www.fleettrackholland.nl', locs)).toBeNull();
  });

  it('seeds the six GSC-connected sites plus keukeninbeeld with unique keys', () => {
    const keys = SEED_SITES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of ['aanloop', 'alfa', 'fth', 'pasfoto', 'tripandtick', 'klaasendaams', 'keukeninbeeld']) expect(keys).toContain(k);
  });
});

describe('site-acties beacon', () => {
  it('parseEvent accepts only known event types and normalises the path', () => {
    expect(parseEvent('{"e":"tel","p":"/contact"}')).toEqual({ event: 'tel', path: '/contact' });
    expect(parseEvent('{"e":"TEL"}')).toEqual({ event: 'tel', path: '/' });
    expect(parseEvent('{"e":"pageview"}')).toBeNull();
    expect(parseEvent('not json')).toBeNull();
    expect(parseEvent('{"e":"form","p":"javascript:alert(1)"}').path).toBe('/');
    for (const k of ['tel', 'whatsapp', 'route', 'mail', 'form']) expect(EVENT_TYPES).toHaveProperty(k);
  });

  it('eventHost prefers Origin, falls back to Referer, strips www, ignores junk', () => {
    expect(eventHost('https://www.alfareclame.nl', 'https://other.nl/x')).toBe('alfareclame.nl');
    expect(eventHost(null, 'https://www.pasfotorotterdamzuid.nl/contact')).toBe('pasfotorotterdamzuid.nl');
    expect(eventHost('null', '')).toBe('');
    expect(eventHost('', '')).toBe('');
  });

  it('isBotUserAgent blocks crawlers/monitors and empty UAs, allows browsers', () => {
    expect(isBotUserAgent('')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(isBotUserAgent('Chrome-Lighthouse')).toBe(true);
    expect(isBotUserAgent('curl/8.0')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1')).toBe(false);
  });

  it('summarizeEvents anchors on today and splits current/previous windows', () => {
    const today = '2026-09-04';
    const rows = [
      { datum: '2026-09-04', event: 'tel', waarde: 3 },
      { datum: '2026-08-10', event: 'tel', waarde: 2 },     // still inside 28d (from 08-08)
      { datum: '2026-08-01', event: 'tel', waarde: 5 },     // previous window
      { datum: '2026-09-01', event: 'form', waarde: 1 },
    ];
    const s = summarizeEvents(rows, today);
    expect(s.end).toBe(today);
    expect(s.current.tel).toBe(5);
    expect(s.previous.tel).toBe(5);
    expect(s.current.form).toBe(1);
    expect(s.total).toBe(6);
  });

  it('beacon script classifies tel/mailto/WhatsApp/Maps links, honours data-vis, posts to the event endpoint', () => {
    expect(BEACON_JS).toContain("'https://aanloopai.nl/api/visibility/event'");
    expect(BEACON_JS).toMatch(/indexOf\('tel:'\)===0\)return'tel'/);
    expect(BEACON_JS).toMatch(/indexOf\('mailto:'\)===0\)return'mail'/);
    expect(BEACON_JS).toMatch(/wa\\\.me\|whatsapp/);
    expect(BEACON_JS).toMatch(/maps\\\.apple\|waze\\\.com/);
    expect(BEACON_JS).toMatch(/data-vis/);
    expect(BEACON_JS).toMatch(/navigator\.sendBeacon/);
    expect(BEACON_JS).toMatch(/addEventListener\('submit'/);
    expect(BEACON_JS).not.toMatch(/document\.cookie|localStorage/);
  });

  it('worker serves /v.js and /api/visibility/event publicly; BaseLayout loads the beacon', () => {
    const w = read('src/worker.js');
    expect(w).toMatch(/url\.pathname === '\/v\.js'/);
    expect(w).toMatch(/url\.pathname === '\/api\/visibility\/event'/);
    expect(w.indexOf("'/api/visibility/event'")).toBeLessThan(w.indexOf("url.pathname.startsWith('/api/admin/')"));
    expect(read('src/layouts/BaseLayout.astro')).toMatch(/<script src="\/v\.js" defer is:inline><\/script>/);
    const v = read('src/lib/visibility.js');
    // site resolved from headers, never from the body
    expect(v).toMatch(/eventHost\(request\.headers\.get\('origin'\), request\.headers\.get\('referer'\)\)/);
    expect(v).toMatch(/rl:visevent:/);
    expect(read('migrations/0019_visibility.sql')).toContain('CREATE TABLE IF NOT EXISTS visibility_events_daily');
  });
});

describe('wiring', () => {
  it('worker routes /api/visibility/ingest outside the staff-session gate and runs the GBP cron', () => {
    const w = read('src/worker.js');
    const ingestIdx = w.indexOf("url.pathname === '/api/visibility/ingest'");
    const adminIdx = w.indexOf("url.pathname.startsWith('/api/admin/')");
    expect(ingestIdx).toBeGreaterThan(-1);
    expect(ingestIdx).toBeLessThan(adminIdx);
    expect(w).toMatch(/await gbpSyncIfDue\(env\)/);
  });

  it('ingest verifies the HMAC before parsing JSON', () => {
    const v = read('src/lib/visibility.js');
    const verify = v.indexOf('verifySignature(env.INTAKE_WEBHOOK_SECRET');
    const parse = v.indexOf('JSON.parse(raw)');
    expect(verify).toBeGreaterThan(-1);
    expect(verify).toBeLessThan(parse);
    expect(v).toMatch(/if \(!env\.INTAKE_WEBHOOK_SECRET\) return errorResponse/);
  });

  it('admin API exposes overview, site detail/patch and GBP routes behind handleAdminApi', () => {
    const a = read('src/lib/admin-routes.js');
    for (const p of ['/api/admin/visibility', '/api/admin/visibility/site', '/api/admin/visibility/gbp/initiate', '/api/admin/visibility/gbp/locations', '/api/admin/visibility/gbp/sync']) {
      expect(a).toContain(`'${p}'`);
    }
  });

  it('Google callback stores GBP consent under its own KV key and never touches the Calendar token', () => {
    const c = read('src/lib/calendar-routes.js');
    expect(c).toMatch(/stateValid === 'gbp'/);
    const gbpIdx = c.indexOf("stateValid === 'gbp'");
    const calIdx = c.indexOf('await env.GOOGLE_TOKENS.put(\n    KV_KEY');
    expect(gbpIdx).toBeGreaterThan(-1);
    expect(gbpIdx).toBeLessThan(calIdx);
    const v = read('src/lib/visibility.js');
    expect(v).toMatch(/GBP_KV_KEY = 'oauth:google:gbp'/);
    expect(v).not.toMatch(/'oauth:google:admin'/);
  });

  it('nav + both admin pages exist and fetch the visibility endpoints', () => {
    expect(read('src/layouts/AdminLayout.astro')).toMatch(/href: '\/admin\/zichtbaarheid'/);
    const p1 = read('src/pages/admin/zichtbaarheid.astro');
    expect(p1).toMatch(/fetch\('\/api\/admin\/visibility'/);
    expect(p1).toMatch(/zichtbaarheid-site\?key=/);
    const p2 = read('src/pages/admin/zichtbaarheid-site.astro');
    expect(p2).toMatch(/\/api\/admin\/visibility\/site\?key=/);
    expect(p2).toMatch(/'PATCH'/);
  });

  it('migration file mirrors the four tables the worker creates', () => {
    const m = read('migrations/0019_visibility.sql');
    const v = read('src/lib/visibility.js');
    for (const t of ['visibility_sites', 'visibility_gsc_daily', 'visibility_gsc_top', 'visibility_gbp_daily']) {
      expect(m).toContain(`CREATE TABLE IF NOT EXISTS ${t}`);
      expect(v).toContain(`CREATE TABLE IF NOT EXISTS ${t}`);
    }
  });
});

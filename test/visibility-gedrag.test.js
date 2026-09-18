// Gedrag op de site (admin/zichtbaarheid-site): per-hit funnel math + wiring
// guards. Same style as test/visibility.test.js — unit tests for the pure
// helpers in src/lib/visibility-core.js, plus one D1-double integration
// test for the write path (no miniflare/D1 harness exists in this repo —
// see test/voorstel-store.test.js for the same "fake D1" pattern).
import { describe, it, expect } from 'vitest';
import { parseHit, summarizeHits, parseEvent } from '../src/lib/visibility-core.js';
import { BEACON_JS, visibilityEvent } from '../src/lib/visibility.js';

describe('parseHit', () => {
  it('round-trips a valid hit and normalises ref/src/med', () => {
    const hit = parseHit(JSON.stringify({
      t: 'view', sid: 'abcdefgh12345678', seq: 1, p: '/contact/',
      r: 'https://www.google.com', src: 'Google', med: 'CPC', dev: 'd', meta: 'x',
    }));
    expect(hit).toEqual({
      t: 'view', sid: 'abcdefgh12345678', seq: 1, path: '/contact/',
      ref: 'google.com', src: 'google', med: 'cpc', dev: 'd', meta: 'x',
    });
  });

  it('accepts a leave hit with sec/sc in range', () => {
    const hit = parseHit({ t: 'leave', sid: 'abcdefgh12345678', seq: 3, p: '/blog/', sec: 42, sc: 87 });
    expect(hit).toMatchObject({ t: 'leave', sec: 42, sc: 87 });
  });

  it('rejects a bad sid, out-of-range seq, a path without a leading slash and an unknown type', () => {
    const base = { sid: 'abcdefgh12345678', seq: 1, p: '/', t: 'view' };
    expect(parseHit({ ...base, sid: 'short' })).toBeNull();
    expect(parseHit({ ...base, sid: 'HAS-UPPER-AND-DASH' })).toBeNull();
    expect(parseHit({ ...base, seq: 0 })).toBeNull();
    expect(parseHit({ ...base, seq: 501 })).toBeNull();
    expect(parseHit({ ...base, p: 'no-slash' })).toBeNull();
    expect(parseHit({ ...base, t: 'pageview' })).toBeNull();
    expect(parseHit(null)).toBeNull();
    expect(parseHit('not json')).toBeNull();
  });

  it('rejects an out-of-range sec (the whole hit, not just the field)', () => {
    expect(parseHit({ sid: 'abcdefgh12345678', seq: 1, p: '/', t: 'leave', sec: 5000 })).toBeNull();
    expect(parseHit({ sid: 'abcdefgh12345678', seq: 1, p: '/', t: 'leave', sc: 150 })).toBeNull();
  });

  it('caps meta at 80 chars instead of rejecting the hit', () => {
    const hit = parseHit({ sid: 'abcdefgh12345678', seq: 1, p: '/', t: 'custom', meta: 'x'.repeat(200) });
    expect(hit.meta).toHaveLength(80);
  });

  it('legacy parseEvent ({e,p}) still works alongside the new hit shape', () => {
    expect(parseEvent('{"e":"tel","p":"/contact"}')).toEqual({ event: 'tel', path: '/contact' });
  });
});

describe('summarizeHits', () => {
  // 5 sessions: A+B bounce (1 view), C converts (tel) and creates the flow
  // '/' -> '/gevelreclame-rotterdam/', D+E add a second, non-converting
  // multi-view session each with mixed devices (m: B,D · d: A,C,E).
  const rows = [
    { sid: 'a1a1a1a1', seq: 1, t: 'view', path: '/', dev: 'd' },
    { sid: 'a1a1a1a1', seq: 1, t: 'leave', path: '/', sec: 5, sc: 10 },

    { sid: 'b2b2b2b2', seq: 1, t: 'view', path: '/diensten/', dev: 'm' },
    { sid: 'b2b2b2b2', seq: 1, t: 'leave', path: '/diensten/', sec: 8, sc: 15 },

    { sid: 'c3c3c3c3', seq: 1, t: 'view', path: '/', dev: 'd' },
    { sid: 'c3c3c3c3', seq: 2, t: 'view', path: '/gevelreclame-rotterdam/', dev: 'd' },
    { sid: 'c3c3c3c3', seq: 2, t: 'tel', path: '/gevelreclame-rotterdam/' },
    { sid: 'c3c3c3c3', seq: 2, t: 'leave', path: '/gevelreclame-rotterdam/', sec: 45, sc: 80 },

    { sid: 'd4d4d4d4', seq: 1, t: 'view', path: '/blog/', dev: 'm', src: 'google' },
    { sid: 'd4d4d4d4', seq: 2, t: 'view', path: '/blog/artikel-1/', dev: 'm' },
    { sid: 'd4d4d4d4', seq: 2, t: 'leave', path: '/blog/artikel-1/', sec: 20, sc: 40 },

    { sid: 'e5e5e5e5', seq: 1, t: 'view', path: '/gevelreclame-rotterdam/', dev: 'd' },
    { sid: 'e5e5e5e5', seq: 2, t: 'view', path: '/contact/', dev: 'd' },
    { sid: 'e5e5e5e5', seq: 2, t: 'leave', path: '/contact/', sec: 15, sc: 25 },
  ];

  it('computes sessions, bounce/conversion rate, pages/session, avg time and device split exactly', () => {
    const s = summarizeHits(rows);
    expect(s.sessions).toBe(5);
    expect(s.bounceRate).toBe(40); // A, B
    expect(s.conversionRate).toBe(20); // C (tel)
    expect(s.pagesPerSession).toBe(1.6); // 8 views / 5 sessions
    expect(s.avgSec).toBe(19); // round((5+8+45+20+15)/5)
    expect(s.devices).toEqual({ m: 2, d: 3 });
  });

  it('lands "/" from A+C with the right bounce/conversion split', () => {
    const s = summarizeHits(rows);
    expect(s.landing.find((l) => l.path === '/')).toEqual({ path: '/', sessions: 2, bounce: 50, conv: 50 });
    expect(s.landing.find((l) => l.path === '/diensten/')).toEqual({ path: '/diensten/', sessions: 1, bounce: 100, conv: 0 });
  });

  it('exits "/gevelreclame-rotterdam/" once out of its two views', () => {
    const s = summarizeHits(rows);
    expect(s.exits.find((e) => e.path === '/gevelreclame-rotterdam/')).toEqual({ path: '/gevelreclame-rotterdam/', exits: 1, exitRate: 50 });
  });

  it('carries the / -> /gevelreclame-rotterdam/ flow with count 1', () => {
    const s = summarizeHits(rows);
    expect(s.flow.find((f) => f.from === '/' && f.to === '/gevelreclame-rotterdam/')).toEqual({ from: '/', to: '/gevelreclame-rotterdam/', n: 1 });
  });

  it('attributes source by the seq=1 hit (utm_source first, then direct) and rolls up conversion', () => {
    const s = summarizeHits(rows);
    expect(s.sources.find((r) => r.bron === 'direct')).toEqual({ bron: 'direct', sessions: 4, conv: 25 });
    expect(s.sources.find((r) => r.bron === 'google')).toEqual({ bron: 'google', sessions: 1, conv: 0 });
  });

  it('averages time-on-page and scroll depth per page from the leave hits, and counts non-view/leave hits as actions', () => {
    const s = summarizeHits(rows);
    expect(s.pages.find((p) => p.path === '/gevelreclame-rotterdam/')).toEqual({ path: '/gevelreclame-rotterdam/', views: 2, avgSec: 45, avgScroll: 80, actions: 1 });
    expect(s.pages.find((p) => p.path === '/')).toEqual({ path: '/', views: 2, avgSec: 5, avgScroll: 10, actions: 0 });
  });

  it('handles an empty series without throwing', () => {
    const s = summarizeHits([]);
    expect(s).toMatchObject({ sessions: 0, bounceRate: 0, conversionRate: 0, pagesPerSession: 0, avgSec: 0 });
    expect(s.landing).toEqual([]);
    expect(s.devices).toEqual({ m: 0, d: 0 });
  });
});

describe('beaconScript (v.js)', () => {
  it('carries the entry/exit/custom-event hooks, no cookies/localStorage, and stays under 3500 bytes', () => {
    expect(BEACON_JS).toContain('sendBeacon');
    expect(BEACON_JS).toContain('sessionStorage');
    expect(BEACON_JS).toContain('aanloopTrack');
    expect(BEACON_JS).toContain('pagehide');
    expect(BEACON_JS).toContain('visibilitychange');
    expect(BEACON_JS).not.toMatch(/document\.cookie|localStorage/);
    expect(Buffer.byteLength(BEACON_JS, 'utf8')).toBeLessThanOrEqual(3500);
  });
});

// Minimale D1-dubbel voor visibility_hits/visibility_events_daily/
// visibility_sites — zelfde stijl als test/voorstel-store.test.js. Geen
// miniflare/D1-harness in deze repo, dus dit is de dichtstbijzijnde
// integratietest voor de write-path.
function fakeVisibilityDb() {
  const sites = [{ key: 'alfa', host: 'www.alfareclame.nl', actief: 1 }];
  const hits = [];
  const eventsDaily = [];
  function stmt(sql) {
    const bound = (args) => ({
      async run() {
        if (/^CREATE (TABLE|INDEX)/.test(sql)) return { meta: {} };
        if (sql.startsWith('INSERT OR IGNORE INTO visibility_sites')) return { meta: {} }; // pre-seeded above
        if (sql.startsWith('INSERT INTO visibility_hits')) {
          const [site_key, ts, datum, sid, seq, t, path, ref, src, med, dev, sec, sc, meta] = args;
          hits.push({ site_key, ts, datum, sid, seq, t, path, ref, src, med, dev, sec, sc, meta });
          return { meta: {} };
        }
        if (sql.startsWith('INSERT INTO visibility_events_daily')) {
          const [site_key, datum, event] = args;
          const row = eventsDaily.find((r) => r.site_key === site_key && r.datum === datum && r.event === event);
          if (row) row.waarde += 1; else eventsDaily.push({ site_key, datum, event, waarde: 1 });
          return { meta: {} };
        }
        if (sql.startsWith('DELETE FROM visibility_hits')) {
          const [cutoff] = args;
          for (let i = hits.length - 1; i >= 0; i--) if (hits[i].ts < cutoff) hits.splice(i, 1);
          return { meta: {} };
        }
        throw new Error(`fakeVisibilityDb: onbekende run-query: ${sql}`);
      },
      async all() {
        if (sql.startsWith('SELECT key, host FROM visibility_sites')) {
          return { results: sites.filter((s) => s.actief === 1).map((s) => ({ key: s.key, host: s.host })) };
        }
        if (sql.startsWith('SELECT sid, seq, t, path, ref, src, med, dev, sec, sc FROM visibility_hits')) {
          const [site_key, since] = args;
          return { results: hits.filter((h) => h.site_key === site_key && h.ts >= since) };
        }
        throw new Error(`fakeVisibilityDb: onbekende all-query: ${sql}`);
      },
      async first() { return null; },
    });
    return { bind: (...args) => bound(args), ...bound([]) };
  }
  return {
    hits, eventsDaily, sites,
    prepare: (sql) => stmt(sql),
    async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; },
  };
}

function hitRequest(body, headers) {
  return new Request('https://aanloopai.nl/api/visibility/event', {
    method: 'POST',
    headers: { 'content-type': 'text/plain', 'user-agent': 'Mozilla/5.0 (Macintosh)', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('visibilityEvent (fake D1)', () => {
  it('stores a valid hit and bumps the daily counter for a click type', async () => {
    const db = fakeVisibilityDb();
    const env = { PORTAL_DB: db };
    const req = hitRequest(
      { t: 'tel', sid: 'testsidone123456', seq: 2, p: '/contact/', dev: 'd' },
      { origin: 'https://www.alfareclame.nl' },
    );
    const res = await visibilityEvent(req, env);
    expect(res.status).toBe(204);
    expect(db.hits).toHaveLength(1);
    expect(db.hits[0]).toMatchObject({ site_key: 'alfa', sid: 'testsidone123456', seq: 2, t: 'tel', path: '/contact/' });
    expect(db.eventsDaily.find((r) => r.site_key === 'alfa' && r.event === 'tel').waarde).toBe(1);
  });

  it('does not bump the daily counter for a view/leave hit', async () => {
    const db = fakeVisibilityDb();
    const env = { PORTAL_DB: db };
    const req = hitRequest({ t: 'view', sid: 'testsidone123456', seq: 1, p: '/' }, { origin: 'https://www.alfareclame.nl' });
    await visibilityEvent(req, env);
    expect(db.hits).toHaveLength(1);
    expect(db.eventsDaily).toHaveLength(0);
  });

  it('drops a malformed hit (sid too short) silently — no row written, still 204', async () => {
    const db = fakeVisibilityDb();
    const env = { PORTAL_DB: db };
    const req = hitRequest({ t: 'view', sid: 'bad', seq: 1, p: '/' }, { origin: 'https://www.alfareclame.nl' });
    const res = await visibilityEvent(req, env);
    expect(res.status).toBe(204);
    expect(db.hits).toHaveLength(0);
  });

  it('still accepts the legacy {e,p} shape and only bumps the daily counter', async () => {
    const db = fakeVisibilityDb();
    const env = { PORTAL_DB: db };
    const req = hitRequest({ e: 'form', p: '/contact/' }, { origin: 'https://www.alfareclame.nl' });
    const res = await visibilityEvent(req, env);
    expect(res.status).toBe(204);
    expect(db.hits).toHaveLength(0);
    expect(db.eventsDaily.find((r) => r.event === 'form').waarde).toBe(1);
  });
});

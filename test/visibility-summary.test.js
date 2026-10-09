// Formulier-trechter (form_view -> form_start -> form) + machine-readable
// /api/visibility/summary route (HMAC over the raw query string).
import { describe, it, expect } from 'vitest';
import { parseHit, summarizeHits } from '../src/lib/visibility-core.js';
import { readFileSync } from 'node:fs';
import { BEACON_JS, visibilitySummary } from '../src/lib/visibility.js';
import { hmacHex } from '../src/lib/visibility-core.js';

describe('form_view hit + formulier funnel', () => {
  it('parseHit accepts form_view', () => {
    expect(parseHit({ t: 'form_view', sid: 'abcdefgh12345678', seq: 1, p: '/contact/' }))
      .toMatchObject({ t: 'form_view', path: '/contact/' });
  });

  it('beacon fires form_view via IntersectionObserver at 25%, stays cookieless and small', () => {
    expect(BEACON_JS).toContain("send('form_view')");
    expect(BEACON_JS).toContain('IntersectionObserver');
    expect(BEACON_JS).toContain('0.25');
    expect(BEACON_JS).not.toMatch(/document\.cookie|localStorage/);
    expect(Buffer.byteLength(BEACON_JS, 'utf8')).toBeLessThanOrEqual(3500);
  });

  const rows = [
    // A: sees form, starts, submits (two form_view hits on 2 pages -> still 1 session)
    { sid: 'a1a1a1a1', seq: 1, t: 'view', path: '/' },
    { sid: 'a1a1a1a1', seq: 1, t: 'form_view', path: '/' },
    { sid: 'a1a1a1a1', seq: 2, t: 'view', path: '/contact/' },
    { sid: 'a1a1a1a1', seq: 2, t: 'form_view', path: '/contact/' },
    { sid: 'a1a1a1a1', seq: 2, t: 'form_start', path: '/contact/' },
    { sid: 'a1a1a1a1', seq: 2, t: 'form', path: '/contact/' },
    // B: sees + starts, abandons
    { sid: 'b2b2b2b2', seq: 1, t: 'view', path: '/contact/' },
    { sid: 'b2b2b2b2', seq: 1, t: 'form_view', path: '/contact/' },
    { sid: 'b2b2b2b2', seq: 1, t: 'form_start', path: '/contact/' },
    { sid: 'b2b2b2b2', seq: 1, t: 'form_start', path: '/contact/' },
    // C: sees only
    { sid: 'c3c3c3c3', seq: 1, t: 'view', path: '/contact/' },
    { sid: 'c3c3c3c3', seq: 1, t: 'form_view', path: '/contact/' },
    // D: no form at all
    { sid: 'd4d4d4d4', seq: 1, t: 'view', path: '/' },
  ];

  it('counts distinct sessions per stage and start->submit pct', () => {
    const s = summarizeHits(rows);
    expect(s.formulier).toEqual({ gezien: 3, gestart: 2, verzonden: 1 });
    expect(s.gestartNaarVerzonden).toBe(50);
    expect(s.sessions).toBe(4);
  });

  it('empty input gives zeros (no NaN) and leaves existing keys intact', () => {
    const s = summarizeHits([]);
    expect(s.formulier).toEqual({ gezien: 0, gestart: 0, verzonden: 0 });
    expect(s.gestartNaarVerzonden).toBe(0);
    expect(s).toHaveProperty('kanalen');
    expect(s).toHaveProperty('aiLanding');
    expect(s).toHaveProperty('aiBronnen');
  });
});

// ── /api/visibility/summary ────────────────────────────────────────────────
const SECRET = 'test-secret';

function fakeDb(hits) {
  const stmt = (sql) => {
    const bound = (args) => ({
      async run() { return { meta: {} }; },
      async all() {
        if (sql.startsWith('SELECT sid, seq, t, path, ref, src, med, dev, sec, sc FROM visibility_hits')) {
          const [site_key, since] = args;
          return { results: hits.filter((h) => h.site_key === site_key && h.ts >= since) };
        }
        throw new Error(`onbekende all-query: ${sql}`);
      },
      async first() {
        if (sql.startsWith('SELECT key FROM visibility_sites WHERE key = ? AND actief = 1')) {
          return args[0] === 'alfa' ? { key: 'alfa' } : null;
        }
        return null;
      },
    });
    return { bind: (...args) => bound(args), ...bound([]) };
  };
  return { prepare: stmt, async batch(l) { const o = []; for (const x of l) o.push(await x.run()); return o; } };
}

async function call(query, { env, sign = true, sigOverride } = {}) {
  const headers = {};
  if (sigOverride !== undefined) headers['x-intake-signature'] = sigOverride;
  else if (sign) headers['x-intake-signature'] = `sha256=${await hmacHex(SECRET, query)}`;
  const req = new Request(`https://aanloopai.nl/api/visibility/summary?${query}`, { method: 'GET', headers });
  return visibilitySummary(req, env);
}

describe('GET /api/visibility/summary', () => {
  const now = Date.now();
  const mk = (sid, seq, t, extra = {}) => ({ site_key: 'alfa', ts: now - 1000, sid, seq, t, path: '/contact/', ...extra });
  const hits = [
    mk('a1a1a1a1', 1, 'view', { src: 'chatgpt.com' }), mk('a1a1a1a1', 1, 'form_view'), mk('a1a1a1a1', 1, 'form_start'), mk('a1a1a1a1', 1, 'form'),
    mk('b2b2b2b2', 1, 'view'),
    { ...mk('c3c3c3c3', 1, 'view'), ts: now - 60 * 86400000 }, // outside 28d window
  ];
  const env = () => ({ INTAKE_WEBHOOK_SECRET: SECRET, PORTAL_DB: fakeDb(hits) });

  it('403 without / with wrong signature, also when the query is tampered after signing', async () => {
    expect((await call('site=alfa&win=28', { env: env(), sign: false })).status).toBe(403);
    expect((await call('site=alfa&win=28', { env: env(), sigOverride: 'sha256=deadbeef' })).status).toBe(403);
    const sig = `sha256=${await hmacHex(SECRET, 'site=alfa&win=28')}`;
    const tampered = new Request('https://aanloopai.nl/api/visibility/summary?site=alfa&win=90', { headers: { 'x-intake-signature': sig } });
    expect((await visibilitySummary(tampered, env())).status).toBe(403);
  });

  it('503 when the secret is not configured', async () => {
    const res = await call('site=alfa&win=28', { env: { PORTAL_DB: fakeDb(hits) }, sign: false });
    expect(res.status).toBe(503);
  });

  it('404 {ok:false,error:"site onbekend"} for an unknown or offboarded site (signed correctly)', async () => {
    for (const q of ['site=nope&win=28', 'site=klaasendaams&win=28', 'win=28']) {
      const res = await call(q, { env: env() });
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ ok: false, error: 'site onbekend' });
    }
  });

  it('happy path: shape, window filter, no-store + noindex', async () => {
    const res = await call('site=alfa&win=28', { env: env() });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-robots-tag')).toMatch(/noindex/);
    const j = await res.json();
    expect(Object.keys(j).sort()).toEqual(['aiBronnen', 'aiLanding', 'bounceRate', 'conversionRate', 'formulier', 'generatedAt', 'kanalen', 'ok', 'sessions', 'site', 'win']);
    expect(j).toMatchObject({ ok: true, site: 'alfa', win: 28, sessions: 2, conversionRate: 50, bounceRate: 100 });
    expect(j.formulier).toEqual({ gezien: 1, gestart: 1, verzonden: 1 });
    expect(Number.isNaN(Date.parse(j.generatedAt))).toBe(false);
    // win=90 pulls in the 60-day-old session
    const j90 = await (await call('site=alfa&win=90', { env: env() })).json();
    expect(j90).toMatchObject({ win: 90, sessions: 3 });
  });

  it('is routed in worker.js outside /api/admin', () => {
    const src = readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8');
    expect(src).toMatch(/pathname === '\/api\/visibility\/summary'[\s\S]{0,80}visibilitySummary\(request, env\)/);
  });
});

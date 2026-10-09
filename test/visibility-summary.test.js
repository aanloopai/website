// Formulier-trechter (form_view -> form_start -> form) + machine-readable
// /api/visibility/summary route (HMAC over the raw query string).
import { describe, it, expect } from 'vitest';
import { parseHit, summarizeHits } from '../src/lib/visibility-core.js';
import { BEACON_JS } from '../src/lib/visibility.js';

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

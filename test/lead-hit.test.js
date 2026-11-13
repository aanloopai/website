// MEAS-1: eerste-partij lead-hit (t:'lead') via /v.js bij elke ECHTE formulier-
// verzending. Bron van waarheid voor lead-tellingen, niet consent-gated.
// Guards: (1) server accepteert + telt 'lead', (2) v.js stuurt hem (ook uit de
// __visQ-wachtrij), (3) _track('generate_lead') routeert ernaartoe, (4) elke
// generate_lead-aanroep staat NA een ok-check en vuurt maar eenmaal.
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseHit, EVENT_TYPES } from '../src/lib/visibility-core.js';
import { BEACON_JS, visibilityEvent } from '../src/lib/visibility.js';

const SID = 'leadsid123456789';

describe('server: lead hit', () => {
  it('parseHit accepts t:lead with form_name meta, EVENT_TYPES counts it', () => {
    expect(EVENT_TYPES).toHaveProperty('lead');
    expect(parseHit({ t: 'lead', sid: SID, seq: 2, p: '/contact/', meta: 'contact_form' }))
      .toMatchObject({ t: 'lead', meta: 'contact_form', path: '/contact/' });
  });

  it('visibilityEvent stores the lead hit and bumps visibility_events_daily lead', async () => {
    const hits = []; const daily = [];
    const stmt = (sql) => {
      const bound = (a) => ({
        async run() {
          if (sql.startsWith('INSERT INTO visibility_hits')) hits.push({ site_key: a[0], t: a[5], meta: a[13] });
          else if (sql.startsWith('INSERT INTO visibility_events_daily')) daily.push({ site_key: a[0], event: a[2] });
          return { meta: {} };
        },
        async all() { return { results: [{ key: 'aanloop', host: 'aanloopai.nl' }] }; },
        async first() { return null; },
      });
      return { bind: (...a) => bound(a), ...bound([]) };
    };
    const req = new Request('https://aanloopai.nl/api/visibility/event', {
      method: 'POST',
      headers: { 'content-type': 'text/plain', 'user-agent': 'Mozilla/5.0', origin: 'https://aanloopai.nl' },
      body: JSON.stringify({ t: 'lead', sid: SID, seq: 2, p: '/contact/', meta: 'contact_form' }),
    });
    const res = await visibilityEvent(req, { PORTAL_DB: { prepare: stmt, async batch(l) { for (const x of l) await x.run(); return []; } } });
    expect(res.status).toBe(204);
    expect(hits).toEqual([{ site_key: 'aanloop', t: 'lead', meta: 'contact_form' }]);
    expect(daily).toEqual([{ site_key: 'aanloop', event: 'lead' }]);
  });
});

function runBeacon(preset = {}) {
  const sent = [];
  const win = {
    ...preset,
    location: { pathname: '/contact/', search: '', host: 'aanloopai.nl' },
    navigator: { sendBeacon: (_u, blob) => { sent.push(blob); return true; } },
    document: { referrer: '', addEventListener() {}, documentElement: { scrollHeight: 0, scrollTop: 0, contains: () => false }, body: null, querySelector: () => null },
    addEventListener() {}, matchMedia: () => ({ matches: false }), innerHeight: 800, pageYOffset: 0,
    sessionStorage: { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = String(v); } },
    Blob, URL, JSON, Math, Date, parseInt, String, RegExp, decodeURIComponent, Array,
  };
  win.window = win;
  const ctx = vm.createContext(win);
  vm.runInContext(BEACON_JS, ctx);
  return { win, ctx, sent };
}
const bodies = async (sent) => Promise.all(sent.map(async (b) => JSON.parse(await b.text())));

describe('v.js: aanloopTrack("lead", form_name)', () => {
  it('sends exactly one t:lead hit with meta = form_name (no custom hit)', async () => {
    const { win, sent } = runBeacon();
    const before = sent.length; // view hit
    win.aanloopTrack('lead', 'contact_form');
    const hs = await bodies(sent.slice(before));
    expect(hs).toHaveLength(1);
    expect(hs[0]).toMatchObject({ t: 'lead', meta: 'contact_form', p: '/contact/' });
  });

  it('flushes leads queued in window.__visQ before v.js loaded', async () => {
    const { sent, win } = runBeacon({ __visQ: [['lead', 'founding']] });
    const hs = await bodies(sent);
    expect(hs.filter((h) => h.t === 'lead').map((h) => h.meta)).toEqual(['founding']);
    expect(win.__visQ).toEqual([]);
  });

  it('other names stay custom events', async () => {
    const { win, sent } = runBeacon();
    const before = sent.length;
    win.aanloopTrack('x', 'y');
    expect((await bodies(sent.slice(before)))[0]).toMatchObject({ t: 'custom', meta: 'x:y' });
  });
});

describe('BaseLayout _track routes generate_lead to the beacon', () => {
  const src = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
  it('calls aanloopTrack("lead") or queues in __visQ, before and independent of gtag, skipping a filled honeypot', () => {
    const i = src.indexOf('window._track = function');
    const body = src.slice(i, src.indexOf('};', src.indexOf('dataLayer.push', i)));
    expect(body).toMatch(/name === 'generate_lead'/);
    expect(body).toContain("aanloopTrack('lead'");
    expect(body).toContain('__visQ');
    expect(body).toContain('botcheck');
    expect(body.indexOf("aanloopTrack('lead'")).toBeLessThan(body.indexOf("gtag('event'"));
  });
});

describe('every generate_lead call site fires once, after a server ok-check', () => {
  const files = execSync('git grep -l generate_lead -- src', { encoding: 'utf8' }).split('\n').filter(Boolean)
    .filter((f) => f !== 'src/scripts/email-hint.js' && f !== 'src/layouts/BaseLayout.astro');
  it('the set of call-site files is the audited one (a new site must be added here consciously)', () => {
    expect(files.sort()).toEqual([
      'src/components/Footer.astro', 'src/components/Header.astro', 'src/pages/aanvragen.astro',
      'src/pages/ai-oplossing-matcher.astro', 'src/pages/ai-roi-calculator.astro', 'src/pages/ai-vindbaarheid/check.astro',
      'src/pages/contact.astro', 'src/pages/demo-aanvragen.astro', 'src/pages/demo-inplannen.astro',
      'src/pages/founding.astro', 'src/pages/gratis-ai-scan.astro', 'src/pages/kennisbank.astro',
      'src/pages/leads-kopen/aanmelden.astro', 'src/pages/onderzoek/ai-adoption-mkb-nederland-2026.astro',
      'src/pages/pilot.astro', 'src/pages/start.astro',
    ]);
  });
  for (const f of files) {
    it(`${f}: one call, preceded by an ok-check, routed via _track`, () => {
      const s = readFileSync(f, 'utf8');
      const calls = [...s.matchAll(/generate_lead/g)];
      expect(calls).toHaveLength(1);
      const at = calls[0].index;
      const before = s.slice(Math.max(0, at - 1500), at);
      expect(before).toMatch(/(res|r)\.ok\b|!r\.ok|\bok &&|if \(ok\b|\.success\b/);
      const line = s.slice(s.lastIndexOf('\n', at), s.indexOf('\n', at));
      expect(line).not.toMatch(/\btrackEvent\('generate_lead'/); // omzeilt _track -> geen beacon
    });
  }
});

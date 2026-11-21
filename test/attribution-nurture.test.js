// Lead-engine: first-touch attributie (boot.js -> /api/submit -> D1 + ledger),
// nurture-opt-in op de scan, en een D1-storing die de eigenaar bereikt.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import worker from '../src/worker.js';

const ROOT = join(import.meta.dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// Fake D1: legt elke gebonden statement vast; failInbound laat de lead-insert falen.
function fakeDb({ failInbound = false } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind: (...args) => ({
          run: async () => {
            calls.push({ sql, args });
            if (failInbound && /INSERT INTO inbound_leads/.test(sql)) throw new Error('D1 down');
            return {};
          },
        }),
      };
    },
  };
}

async function submit(env, fields, referer = 'https://aanloopai.nl/gratis-ai-scan/') {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  const req = new Request('https://aanloopai.nl/api/submit', { method: 'POST', body: fd, headers: { Referer: referer } });
  return worker.fetch(req, env, { waitUntil() {} });
}

describe('/api/submit — first_landing', () => {
  let origFetch;
  beforeEach(() => { origFetch = globalThis.fetch; globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200 })); });
  afterEach(() => { globalThis.fetch = origFetch; });

  const base = { form_type: 'newsletter_x', email: 'a@b.nl', naam: 'Jan' };

  it('geeft first_landing voorrang op de Referer in het ledger en bewaart hem bij de lead', async () => {
    const db = fakeDb();
    await submit({ PORTAL_DB: db }, { ...base, first_landing: '/kennisbank/ai-agent/', utm_source: 'google' });
    const ledger = db.calls.find((c) => /leads_all/.test(c.sql));
    expect(ledger.args).toContain('/kennisbank/ai-agent/');
    expect(ledger.args).not.toContain('/gratis-ai-scan/');
    const lead = db.calls.find((c) => /INSERT INTO inbound_leads/.test(c.sql));
    expect(JSON.parse(lead.args[8]).first_landing).toBe('/kennisbank/ai-agent/');
  });

  it('valt terug op de Referer bij ontbrekende of ongeldige first_landing', async () => {
    for (const bad of [undefined, 'https://evil.example/x', '//evil.example']) {
      const db = fakeDb();
      await submit({ PORTAL_DB: db }, { ...base, ...(bad ? { first_landing: bad } : {}) });
      const ledger = db.calls.find((c) => /leads_all/.test(c.sql));
      expect(ledger.args, String(bad)).toContain('/gratis-ai-scan/');
    }
  });
});

describe('/api/submit — D1-storing bereikt de eigenaar', () => {
  let origFetch; let sent;
  beforeEach(() => {
    origFetch = globalThis.fetch; sent = [];
    globalThis.fetch = vi.fn(async (url, init) => { sent.push({ url: String(url), body: init && init.body }); return { ok: true, status: 200 }; });
  });
  afterEach(() => { globalThis.fetch = origFetch; });

  it('roept alertStaff (Telegram) aan zonder bezoeker-PII', async () => {
    const db = fakeDb({ failInbound: true });
    const env = { PORTAL_DB: db, TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '1' };
    await submit(env, { form_type: 'contact', email: 'geheim@bezoeker.nl', naam: 'Geheime Naam', bericht: 'hallo' });
    const alerts = sent.filter((s) => s.url.includes('api.telegram.org') && String(s.body).includes('NIET opgeslagen'));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].body).not.toContain('geheim@bezoeker.nl');
    expect(alerts[0].body).not.toContain('Geheime Naam');
  });
});

describe('boot.js first-touch', () => {
  function run({ search = '', pathname = '/blog/x/', store = {}, throwing = false } = {}) {
    const posted = [];
    class FormData { constructor() { this.m = new Map(); } has(k) { return this.m.has(k); } append(k, v) { this.m.set(k, v); } get(k) { return this.m.get(k); } }
    const sessionStorage = throwing
      ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }
      : { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } };
    const win = {
      fetch: async (u, i) => { posted.push([u, i]); return {}; },
      __aanloopConsent: { onGrant() {} }, addEventListener() {},
    };
    const ctx = {
      window: win, FormData, sessionStorage, URLSearchParams, MutationObserver: function () { this.observe = () => {}; },
      location: { pathname, search }, requestIdleCallback: undefined, setTimeout: () => {},
      document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({}), head: { appendChild() {} } },
    };
    const src = read('public/js/boot.js');
    const i = src.indexOf('/* ---- First-touch');
    expect(i, 'first-touch blok ontbreekt in boot.js').toBeGreaterThan(0);
    vm.runInNewContext(src.slice(i, src.lastIndexOf('})();')), ctx);
    return { win, posted, store, FormData };
  }

  it('bewaart landing + utm bij de eerste pageview en overschrijft nooit', () => {
    const a = run({ search: '?utm_source=li&utm_medium=cpc&utm_campaign=x', pathname: '/landing/' });
    const saved = JSON.parse(a.store.aanloop_first_touch);
    expect(saved).toMatchObject({ first_landing: '/landing/', utm_source: 'li', utm_medium: 'cpc', utm_campaign: 'x' });
    const b = run({ search: '?utm_source=other', pathname: '/andere/', store: a.store });
    expect(JSON.parse(b.store.aanloop_first_touch).first_landing).toBe('/landing/');
  });

  it('voegt velden toe aan /api/submit-FormData, maar niet als het formulier ze al heeft', async () => {
    const r = run({ search: '?utm_source=li', pathname: '/landing/' });
    const body = new r.FormData(); body.append('utm_source', 'eigen');
    await r.win.fetch('/api/submit', { method: 'POST', body });
    expect(body.get('first_landing')).toBe('/landing/');
    expect(body.get('utm_source')).toBe('eigen');
    const other = new r.FormData();
    await r.win.fetch('/api/other', { body: other });
    expect(other.has('first_landing')).toBe(false);
  });

  it('breekt niet als sessionStorage geblokkeerd is', () => {
    expect(() => run({ throwing: true })).not.toThrow();
  });
});

describe('gratis-ai-scan — nurture opt-in', () => {
  it('heeft dezelfde optionele, niet-aangevinkte akkoord_marketing-checkbox als de demo', () => {
    const scan = read('src/pages/gratis-ai-scan.astro');
    const demo = read('src/pages/demo-aanvragen.astro');
    const label = 'Ik ontvang graag AI-tips van Aanloop AI (max 1× per week, altijd afmeldbaar).';
    expect(demo).toContain(label);
    expect(scan).toContain(label);
    const m = scan.match(/<input[^>]*name="akkoord_marketing"[^>]*>/);
    expect(m).not.toBeNull();
    expect(m[0]).not.toMatch(/required|checked/);
  });
});

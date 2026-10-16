// form_view must fire for forms rendered AFTER script start (Next.js/React SPA
// client-side navigation, late hydration). No jsdom in this repo, so the real
// BEACON_JS text is executed in a node:vm sandbox with a minimal fake DOM.
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { BEACON_JS } from '../src/lib/visibility.js';

function run({ formAtStart }) {
  const sent = [];
  const root = { forms: formAtStart ? [{ id: 'f0' }] : [], contains(el) { return this.forms.includes(el); } };
  let moCb = null;
  const ios = [];
  const doc = {
    documentElement: root, body: {}, referrer: '', visibilityState: 'visible',
    querySelector: () => root.forms[0] || null,
    addEventListener() {},
  };
  class IO { constructor(cb) { this.cb = cb; this.els = new Set(); ios.push(this); }
    observe(e) { this.els.add(e); } unobserve(e) { this.els.delete(e); } disconnect() { this.els.clear(); } }
  class MO { constructor(cb) { moCb = cb; this.off = false; } observe() {} disconnect() { this.off = true; moCb = null; } }
  const win = { IntersectionObserver: IO, MutationObserver: MO };
  const ctx = {
    window: win, document: doc, IntersectionObserver: IO, MutationObserver: MO,
    location: { pathname: '/contact/', search: '', host: 'x.nl' }, innerHeight: 800, pageYOffset: 0,
    sessionStorage: { getItem: () => null, setItem() {} },
    navigator: { sendBeacon: (u, b) => { sent.push(b.s); return true; } },
    Blob: class { constructor(p) { this.s = p[0]; } },
    matchMedia: () => ({ matches: false }), addEventListener() {}, setTimeout, Date, Math, JSON, parseInt, RegExp, String, URL,
    decodeURIComponent, fetch() {},
  };
  win.document = doc;
  vm.runInNewContext(BEACON_JS, ctx);
  const types = () => sent.map((s) => JSON.parse(s).t);
  return { types, root, ios, fireMutation: () => moCb && moCb(), see: () => ios[0].cb([{ isIntersecting: true }]) };
}

describe('beacon form_view is SPA-safe', () => {
  it('observes a form inserted after start and sends exactly one form_view', () => {
    const h = run({ formAtStart: false });
    expect(h.ios.length).toBe(0);
    h.root.forms.push({ id: 'late' });
    h.fireMutation();
    expect(h.ios[0].els.size).toBe(1);
    h.see();
    h.fireMutation();
    expect(h.types().filter((t) => t === 'form_view')).toHaveLength(1);
  });

  it('re-targets when the observed form is removed by client-side navigation', () => {
    const h = run({ formAtStart: true });
    const first = h.root.forms[0];
    h.root.forms = [{ id: 'next-page-form' }];
    h.fireMutation();
    expect(h.ios[0].els.has(first)).toBe(false);
    expect(h.ios[0].els.size).toBe(1);
  });

  it('still works for a form present at start; no form_view before it is visible', () => {
    const h = run({ formAtStart: true });
    expect(h.types()).not.toContain('form_view');
    h.see();
    expect(h.types()).toContain('form_view');
  });
});

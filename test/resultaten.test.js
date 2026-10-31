// Guard voor /resultaten/: elk gepubliceerd cijfer heeft methode, periode en
// meetdatum; elk kernpunt wijst naar bestaande cijfers; de publieke API lekt
// geen paden of verwijzers. Wie een cijfer zonder bron toevoegt, breekt de build.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { RESULTATEN, KERNPUNTEN, RESULTATEN_PEILDATUM, alleCijfers, gemetenSites } from '../src/data/resultaten.ts';
import { publicResultaat, resultatenPublic, PUBLIC_SITES } from '../src/lib/resultaten-public.js';
import { summarizeHits } from '../src/lib/visibility-core.js';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe('resultaten.ts — elk cijfer heeft een bron', () => {
  it('peildatum is een ISO-datum en elk cijfer draagt methode, periode en gemeten_op', () => {
    expect(RESULTATEN_PEILDATUM).toMatch(ISO);
    const ids = new Set();
    for (const c of alleCijfers()) {
      expect(c.id, 'id').toBeTruthy();
      expect(ids.has(c.id), `dubbel id ${c.id}`).toBe(false);
      ids.add(c.id);
      expect(c.waarde.trim(), c.id).not.toBe('');
      expect(c.toelichting.length, `${c.id} toelichting`).toBeGreaterThan(20);
      expect(['beacon', 'brevo', 'site-analytics', 'ai-radar', 'benchmark', 'bron'], c.id).toContain(c.methode);
      expect(c.periode.trim(), `${c.id} periode`).not.toBe('');
      expect(c.gemeten_op, `${c.id} gemeten_op`).toMatch(ISO);
      expect(c.gemeten_op <= RESULTATEN_PEILDATUM || c.methode === 'benchmark', `${c.id} ligt na de peildatum`).toBe(true);
    }
  });

  it('elk kernpunt verwijst naar bestaande cijfers', () => {
    const ids = new Set(alleCijfers().map((c) => c.id));
    for (const k of KERNPUNTEN) {
      expect(k.bron.length, k.id).toBeGreaterThan(0);
      for (const b of k.bron) expect(ids.has(b), `${k.id} → ${b}`).toBe(true);
    }
  });

  it('sites zonder cijfers melden sinds wanneer er gemeten wordt, of waarom er niet gemeten wordt', () => {
    for (const s of RESULTATEN) {
      if (s.geenMeting) {
        expect(s.cijfers, `${s.key} geenMeting maar wel cijfers`).toEqual([]);
        expect(s.metingSinds, `${s.key} geenMeting en metingSinds`).toBeUndefined();
        expect(s.geenMeting.length, `${s.key} geenMeting reden`).toBeGreaterThan(20);
      } else if (!s.cijfers.length) expect(s.metingSinds, s.key).toMatch(ISO);
      // CI check-meta: description 110–155 tekens.
      expect(s.metaDescription.length, `${s.key} metaDescription ${s.metaDescription.length}`).toBeGreaterThanOrEqual(110);
      expect(s.metaDescription.length, `${s.key} metaDescription ${s.metaDescription.length}`).toBeLessThanOrEqual(155);
      expect(['eigen', 'klant']).toContain(s.eigenaar);
      expect(s.url.startsWith('https://')).toBe(true);
    }
    // Alle sites die we bouwden staan in het portfolio (owner 2026-11-01); alleen de
    // beacon-gemeten sites gaan naar de live tabel en de publieke API.
    for (const k of ['allesinrenovatie', 'grynnstudio', '4menterprise', 'pasfoto', 'zorgadviesbureau']) {
      expect(RESULTATEN.some((s) => s.key === k), `${k} ontbreekt in het portfolio`).toBe(true);
    }
    expect([...PUBLIC_SITES].sort()).toEqual(gemetenSites().map((s) => s.key).sort());
  });

  it('beacon-cijfers heten "contactactie", nooit "lead"', () => {
    for (const c of alleCijfers().filter((c) => c.methode === 'beacon')) {
      expect(`${c.label} ${c.toelichting}`.toLowerCase(), c.id).not.toMatch(/\blead\b/);
    }
  });

  it('de pagina /resultaten/ toont uitsluitend cijfers uit resultaten.ts (geen losse percentages in de template)', () => {
    const src = readFileSync(new URL('../src/pages/resultaten.astro', import.meta.url), 'utf8');
    const template = src.split('---').slice(2).join('---');
    const losse = template.match(/>\s*\d+([,.]\d+)?\s?(%|×)\s*</g) || [];
    expect(losse, losse.join(' | ')).toEqual([]);
  });
});

describe('/api/resultaten — publieke projectie', () => {
  const rows = [
    { sid: 'a', seq: 1, t: 'view', path: '/x/', src: 'chatgpt.com' },
    { sid: 'a', seq: 1, t: 'tel', path: '/x/', src: 'chatgpt.com' },
    { sid: 'b', seq: 1, t: 'view', path: '/y/', ref: 'https://www.google.com/' },
    { sid: 'c', seq: 1, t: 'view', path: '/y/', ref: 'https://www.google.com/' },
    { sid: 'c', seq: 1, t: 'form', path: '/y/', ref: 'https://www.google.com/' },
  ];

  it('geeft per site alleen totalen: sessies, ai, zoek, formulieren', () => {
    const r = publicResultaat('alfa', summarizeHits(rows));
    expect(r).toEqual({ site: 'alfa', sessies: 3, ai: { sessies: 1, contactacties: 1, pct: 100 }, zoek: { sessies: 2, contactacties: 1, pct: 50 }, formulieren: 1 });
    expect(JSON.stringify(r)).not.toMatch(/\/x\/|\/y\/|google|chatgpt/);
  });

  it('lege site geeft nullen, geen NaN', () => {
    expect(publicResultaat('zoekeen', summarizeHits([]))).toEqual({ site: 'zoekeen', sessies: 0, ai: { sessies: 0, contactacties: 0, pct: 0 }, zoek: { sessies: 0, contactacties: 0, pct: 0 }, formulieren: 0 });
  });

  it('route: GET geeft JSON met cache-headers en alle publieke sites; POST wordt geweigerd', async () => {
    const env = { PORTAL_DB: { prepare: () => ({ bind: () => ({ all: async () => ({ results: rows.map((r) => ({ ...r })) }) }) }) } };
    const res = await resultatenPublic(new Request('https://aanloopai.nl/api/resultaten'), env, { waitUntil() {} });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('max-age=3600');
    expect(res.headers.get('x-robots-tag')).toContain('noindex');
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.win).toBe(28);
    expect(body.sites.map((s) => s.site).sort()).toEqual([...PUBLIC_SITES].sort());
    const post = await resultatenPublic(new Request('https://aanloopai.nl/api/resultaten', { method: 'POST' }), env, {});
    expect(post.status).toBe(405);
  });
});

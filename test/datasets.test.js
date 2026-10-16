// Machine-leesbare datasets: een datapunt zonder volledige bron mag de dataset niet in,
// en het gegenereerde JSON moet evenveel datapunten hebben als de bron.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { validate, build, loadSources } = require('../scripts/gen-datasets.cjs');

const bronBasis = () => structuredClone(loadSources()[0]);

describe('gen-datasets', () => {
  it('beide datasets staan in de bronmap', () => {
    expect(loadSources().map((b) => b.slug).sort()).toEqual(['ai-adoptie-marktcontext-2026', 'branche-statistieken-mkb-ai']);
  });
  it('weigert een datapunt zonder citaat', () => {
    const b = bronBasis();
    b.datapunten[0].bron.citaat = '  ';
    expect(() => validate(b)).toThrow(/volledige bron/);
  });
  it('weigert een niet-https bron-url en een ontbrekende gelezen-datum', () => {
    const a = bronBasis(); a.datapunten[0].bron.url = 'http://example.com';
    expect(() => validate(a)).toThrow();
    const c = bronBasis(); delete c.datapunten[0].bron.gelezen;
    expect(() => validate(c)).toThrow();
  });
  it('gegenereerde JSON heeft evenveel datapunten als de bron en publisher-blok', () => {
    for (const bron of loadSources()) {
      const out = build(bron);
      expect(out.datapunten.length).toBe(bron.datapunten.length);
      expect(out.aantalDatapunten).toBe(bron.datapunten.length);
      expect(out.licentie).toContain('creativecommons.org/licenses/by/4.0');
      expect(out.uitgever.kvk).toBe('88606902');
      const onDisk = JSON.parse(readFileSync(new URL(`../public/data/${bron.slug}.json`, import.meta.url), 'utf8'));
      expect(onDisk.aantalDatapunten).toBe(bron.datapunten.length);
    }
  });
});

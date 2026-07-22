import { describe, it, expect } from 'vitest';
import { berekenEersteBetaling } from '../src/lib/mollie.js';
import { getCatalogTier } from '../src/data/portal-catalog.ts';

describe('berekenEersteBetaling', () => {
  it('telt setup-fee eenmalig bij de eerste betaling op', () => {
    const tier = getCatalogTier('emma-telefoon', 'Starter');
    const b = berekenEersteBetaling(tier);
    expect(b.maandInclCent).toBe(Math.round(49700 * 1.21));
    expect(b.setupInclCent).toBe(Math.round(49500 * 1.21));
    expect(b.totaalInclCent).toBe(b.maandInclCent + b.setupInclCent);
  });

  it('laat het maandbedrag ongemoeid wanneer er geen setup-fee is', () => {
    const b = berekenEersteBetaling({ prijsCent: 19700, setupCent: 0, betaling: 'maandelijks' });
    expect(b.setupInclCent).toBe(0);
    expect(b.totaalInclCent).toBe(b.maandInclCent);
  });
});

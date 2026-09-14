import { describe, it, expect } from 'vitest';
import { berekenEersteBetaling } from '../src/lib/mollie.js';
import { getCatalogTier } from '../src/data/portal-catalog.ts';

describe('berekenEersteBetaling', () => {
  it('telt setup-fee eenmalig bij de eerste betaling op', () => {
    const tier = getCatalogTier('emma-telefoon', 'Groei');
    const b = berekenEersteBetaling(tier);
    expect(b.maandInclCent).toBe(Math.round(29900 * 1.21));
    expect(b.setupInclCent).toBe(Math.round(49500 * 1.21));
    expect(b.totaalInclCent).toBe(b.maandInclCent + b.setupInclCent);
  });

  it('laat het maandbedrag ongemoeid wanneer er geen setup-fee is (Starter)', () => {
    const b = berekenEersteBetaling(getCatalogTier('emma-telefoon', 'Starter'));
    expect(b.maandInclCent).toBe(Math.round(14900 * 1.21));
    expect(b.setupInclCent).toBe(0);
    expect(b.totaalInclCent).toBe(b.maandInclCent);
  });
});

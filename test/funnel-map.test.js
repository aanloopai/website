import { describe, it, expect } from 'vitest';
import { getFunnelEntry, isSellable, FUNNEL_MAP } from '../src/data/funnel-map.ts';
import { getCatalogTier } from '../src/data/portal-catalog.ts';

describe('funnel-map', () => {
  it('mapt voice-agent naar de betaalbare emma-telefoon Starter-tier', () => {
    const entry = getFunnelEntry('voice-agent');
    expect(entry.productKey).toBe('emma-telefoon');
    expect(entry.tierNaam).toBe('Starter');
    expect(entry.sellable).toBe(true);
  });

  it('verkoopt in plak A niets anders dan voice-agent', () => {
    expect(isSellable('agenda-assistant')).toBe(false);
    expect(isSellable('whatsapp-bot')).toBe(false);
    expect(isSellable('ai-scan-consult')).toBe(false);
  });

  it('geeft null voor een onbekende dienst', () => {
    expect(getFunnelEntry('bestaat-niet')).toBe(null);
  });

  it('verwijst voor elke sellable entry naar een bestaande, betaalbare tier', () => {
    for (const entry of FUNNEL_MAP.filter((e) => e.sellable)) {
      const tier = getCatalogTier(entry.productKey, entry.tierNaam);
      expect(tier, `${entry.productKey}/${entry.tierNaam} bestaat niet in de catalogus`).toBeTruthy();
      expect(tier.prijsCent).toBeGreaterThan(0);
      expect(tier.betaling).toBe('maandelijks');
    }
  });
});

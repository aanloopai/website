import { describe, it, expect } from 'vitest';
import { getFunnelEntry, isSellable, FUNNEL_MAP, PLAN_SLUG_TO_TIER, tierForPlanSlug } from '../src/data/funnel-map.ts';
import { getCatalogTier } from '../src/data/portal-catalog.ts';

describe('funnel-map', () => {
  it('mapt voice-agent naar de begeleide emma-telefoon Groei-tier (2026-09-15: telefoon + WhatsApp, intake)', () => {
    const entry = getFunnelEntry('voice-agent');
    expect(entry.productKey).toBe('emma-telefoon');
    expect(entry.tierNaam).toBe('Groei');
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

  // Punt 5 (eindreview): deze controle liep eerder alleen over sellable
  // entries. Precies die filter verborg dat emma-whatsapp/ai-scan niet in de
  // catalogus bestaan — "sellable omzetten is een vlag, geen codewijziging"
  // (spec §8/§9) klopt alleen als ELKE entry, ook niet-sellable, al naar een
  // bestaand catalogusproduct wijst.
  it('verwijst voor ELKE entry (ook niet-sellable) naar een bestaande, betaalbare tier', () => {
    for (const entry of FUNNEL_MAP) {
      const tier = getCatalogTier(entry.productKey, entry.tierNaam);
      expect(tier, `${entry.serviceId}: ${entry.productKey}/${entry.tierNaam} bestaat niet in de catalogus`).toBeTruthy();
      expect(tier.prijsCent).toBeGreaterThan(0);
      expect(tier.betaling).toBe('maandelijks');
    }
  });

  // /tarieven/?plan=… → voorstel-tier. Elke slug moet op een bestaande,
  // betaalbare catalogus-tier landen; al het andere → null (funnel-default).
  it('vertaalt de /tarieven/-slugs naar bestaande betaalbare Emma-tiers', () => {
    expect(tierForPlanSlug('start')).toBe('Starter');
    expect(tierForPlanSlug('groei')).toBe('Groei');
    expect(tierForPlanSlug('compleet')).toBe('Compleet');
    expect(tierForPlanSlug(' Start ')).toBe('Starter');
    for (const slug of Object.keys(PLAN_SLUG_TO_TIER)) {
      const tier = getCatalogTier('emma-telefoon', PLAN_SLUG_TO_TIER[slug]);
      expect(tier, `slug ${slug}`).toBeDefined();
      expect(tier.prijsCent).toBeGreaterThan(0);
    }
  });

  it('geeft null voor onbekende, lege of prototype-slugs', () => {
    expect(tierForPlanSlug('enterprise')).toBeNull();
    expect(tierForPlanSlug('')).toBeNull();
    expect(tierForPlanSlug(undefined)).toBeNull();
    expect(tierForPlanSlug('constructor')).toBeNull();
    expect(tierForPlanSlug('__proto__')).toBeNull();
  });
});

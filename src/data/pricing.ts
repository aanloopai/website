// Single source of truth for all Aanloop AI / Emma pricing.
// Emma = één omnichannel AI-agent (telefoon + WhatsApp + workflow + automatisering).
// GEEN setup-fee — markt-differentiator (de meeste NL-concurrenten rekenen €299-999 setup).
// Marketing pages AND portal-catalog.ts (Mollie checkout) derive from here.
// Benchmark (jun 2026): voice managed €199-299 · WhatsApp €99-199 · omnichannel mid €290-499.
// Eén heldere ladder — Start instap, Core meest gekozen, Pro hoog volume, Enterprise op aanvraag.

export interface PricePoint {
  /** Maandprijs (excl. btw) in euro */
  readonly monthly: number;
  /** Maand-equivalent bij jaarbetaling (~16% korting) */
  readonly annual: number;
  /** Maandprijs in centen — drijft Mollie checkout */
  readonly monthlyCent: number;
  /** Eenmalige setup in euro (0 — geen setup-fee) */
  readonly setup: number;
}

/** Emma Start — instap omnichannel (gecapte volumes). "Onder €100" instappunt. */
export const START: PricePoint = { monthly: 99, annual: 83, monthlyCent: 9900, setup: 0 };

/** Emma Core — volledige omnichannel (telefoon + WhatsApp + workflow). Meest gekozen. */
export const CORE: PricePoint = { monthly: 249, annual: 209, monthlyCent: 24900, setup: 0 };

/** Emma Pro — hoog volume + multi-number + integraties + priority support. */
export const PRO: PricePoint = { monthly: 497, annual: 416, monthlyCent: 49700, setup: 0 };

// Emma Enterprise — op aanvraag (SLA, dedicated, custom workflows, white-label). Geen vast tarief.

// ── Display-strings — gebruik deze overal i.p.v. hardcoded bedragen ──
export const START_LABEL = '€99';
export const START_MND = '€99/mnd';
export const CORE_LABEL = '€249';
export const CORE_MND = '€249/mnd';
export const PRO_LABEL = '€497';
export const PRO_MND = '€497/mnd';
export const VANAF = 'Vanaf €99/mnd';
/** schema.org Organization priceRange */
export const PRICE_RANGE = '€99-€5000';

// ── LEGACY portal/Mollie tiers — D1-bound tier-namen (service_orders.tier), checkout-kritisch.
//    NIET gebruiken op marketingpagina's. monthlyCent ONGEWIJZIGD = Mollie blijft identiek.
//    Migratie naar de Emma-ladder (Start/Core/Pro) staat open — vereist M + data-migratie. ──
export const PORTAL_CORE_497: PricePoint = { monthly: 497, annual: 416, monthlyCent: 49700, setup: 0 };
export const PORTAL_GROEI_997: PricePoint = { monthly: 997, annual: 836, monthlyCent: 99700, setup: 0 };
export const PORTAL_CORE_MND = '€497/mnd';
export const PORTAL_GROEI_MND = '€997/mnd';

// ── À-la-carte diensten (ongewijzigd — geen kern, geen bron van inconsistentie) ──
export const SEO = { audit: 495, setup: 1950, maand: 795 } as const;
export const GEO = { setup: 1450, maand: 595 } as const;
export const SEO_GEO_BUNDEL = 1195;
export const WEBSITE_BUNDEL = { setup: 4950, maand: 397 } as const;

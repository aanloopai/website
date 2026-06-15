// Single source of truth for all Aanloop AI pricing.
// Marketing pages AND portal-catalog.ts (Mollie checkout) derive from here.
// Core price benchmarked to NL AI-agency market average (jun 2026 ≈ €450-460/mnd):
// Voicelabs €199-249 · TalkMate ~€500 · Utomatic €349/mnd · managed bureau €500-1.200.
// Eén vast kerntarief — geen Lite/Starter-verwarring, geen tegenstrijdige prijzen per pagina.

export interface PricePoint {
  /** Maandprijs (excl. btw) in euro */
  readonly monthly: number;
  /** Maand-equivalent bij jaarbetaling (~16% korting) */
  readonly annual: number;
  /** Maandprijs in centen — drijft Mollie checkout */
  readonly monthlyCent: number;
  /** Eenmalige setup in euro */
  readonly setup: number;
}

/** Kernpakket — Marco AI-receptionist. HET vaste tarief, overal op de site. */
export const CORE: PricePoint = { monthly: 497, annual: 416, monthlyCent: 49700, setup: 495 };

/** Groei — Marco + Emma. Enige upsell-tier. */
export const GROEI: PricePoint = { monthly: 997, annual: 836, monthlyCent: 99700, setup: 795 };

// ── Display-strings — gebruik deze overal i.p.v. hardcoded bedragen ──
export const CORE_LABEL = '€497';
export const CORE_MND = '€497/mnd';
export const GROEI_MND = '€997/mnd';
export const VANAF = 'Vanaf €497/mnd';
/** schema.org Organization priceRange */
export const PRICE_RANGE = '€497-€5000';

// ── À-la-carte diensten (ongewijzigd — geen kern, geen bron van inconsistentie) ──
export const EMMA = { lite: 49, standard: 197 } as const;
export const SEO = { audit: 495, setup: 1950, maand: 795 } as const;
export const GEO = { setup: 1450, maand: 595 } as const;
export const SEO_GEO_BUNDEL = 1195;
export const WEBSITE_BUNDEL = { setup: 4950, maand: 397 } as const;

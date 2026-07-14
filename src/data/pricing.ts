// Single source of truth for all Aanloop AI / Emma pricing.
// Marketing pages AND portal-catalog.ts (Mollie checkout) derive from here.
//
// Emma is NIET één product. Het zijn twee productlijnen met dezelfde merknaam:
//   • Emma WhatsApp Agent (chat-only) — Lite €49 · Standard €197. Géén telefonie.
//   • Emma AI-receptie (telefoon)     — Emma €497 · Groei €997. Telefonie MET WhatsApp inbegrepen.
// Let op: WhatsApp zit AL in €497 en €997. Tel een los WhatsApp-abonnement er dus nooit
// bovenop in een kostenvergelijking — dat is dubbeltelling (deze fout stond tot 2026-07-14
// in ai-website-bundel-mkb-nederland.astro en blies de "besparing" kunstmatig op).
// Label beide lijnen OVERAL expliciet (kanaal tussen haakjes) — zonder dat label
// leest het prijsverschil als willekeurig en denkt de klant dat hij dubbel betaalt.
//
// SETUP-FEE: die is er WEL (€495 Emma / €795 Groei). Dit bestand claimde tot 2026-07-14
// "geen setup-fee — markt-differentiator" terwijl 9 andere pagina's + 2 JSON-LD Offers
// wél €495/€795 publiceerden. Owner heeft bevestigd: de fee is echt, dit bestand was fout.
// Benchmark (jun 2026): voice managed €199-299 · WhatsApp €99-199 · omnichannel mid €290-499.
// Publieke ladder: Emma Lite €49 · Emma WhatsApp Standard €197 · Emma €497 · Groei €997 ·
// Enterprise op aanvraag. Setup: €495 (Emma) / €795 (Groei).

export interface PricePoint {
  /** Maandprijs (excl. btw) in euro */
  readonly monthly: number;
  /** Maand-equivalent bij jaarbetaling (~16% korting) */
  readonly annual: number;
  /** Maandprijs in centen — drijft Mollie checkout */
  readonly monthlyCent: number;
  /** Eenmalige setup in euro (0 = dit pakket kent geen setup-fee) */
  readonly setup: number;
}

// ── PUBLIEKE MARKETING-LADDER (single source voor /tarieven + diensten/emma) ──
/** Emma Lite — WhatsApp-only AI-assistent (instap). Chat, geen telefonie. Geen setup-fee. */
export const EMMA_LITE: PricePoint = { monthly: 49, annual: 41, monthlyCent: 4900, setup: 0 };

/** Emma WhatsApp Standard — WhatsApp-only, onbeperkt berichten + webshop-koppeling.
 *  Chat, geen telefonie. Geen setup-fee. Drijft de Mollie-tier 'Standard'. */
export const EMMA_WHATSAPP_STANDARD: PricePoint = { monthly: 197, annual: 165, monthlyCent: 19700, setup: 0 };

/** Emma AI-receptie (telefoon) — neemt de telefoon op. WhatsApp INBEGREPEN. Setup €495. */
export const EMMA: PricePoint = { monthly: 497, annual: 416, monthlyCent: 49700, setup: 495 };

/** Groei — onbeperkt gespreksvolume, WhatsApp INBEGREPEN, CRM, priority support. Setup €795. */
export const GROEI: PricePoint = { monthly: 997, annual: 836, monthlyCent: 99700, setup: 795 };

// Emma Enterprise — op aanvraag (SLA, dedicated, custom workflows, white-label). Geen vast tarief.

// ── DEPRECATED (oude €99/€249/€497 ladder — niet meer publiek gebruikt; bewaard voor referentie) ──
/** @deprecated gebruik EMMA */
export const START: PricePoint = { monthly: 99, annual: 83, monthlyCent: 9900, setup: 0 };
/** @deprecated gebruik EMMA */
export const CORE: PricePoint = { monthly: 249, annual: 209, monthlyCent: 24900, setup: 0 };
/** @deprecated gebruik GROEI */
export const PRO: PricePoint = { monthly: 497, annual: 416, monthlyCent: 49700, setup: 0 };

// ── Display-strings — gebruik deze overal i.p.v. hardcoded bedragen ──
export const START_LABEL = '€99';
export const START_MND = '€99/mnd';
export const CORE_LABEL = '€249';
export const CORE_MND = '€249/mnd';
export const PRO_LABEL = '€497';
export const PRO_MND = '€497/mnd';
export const EMMA_LITE_LABEL = '€49';
export const EMMA_LITE_MND = '€49/mnd';
export const EMMA_WHATSAPP_STANDARD_LABEL = '€197';
export const EMMA_WHATSAPP_STANDARD_MND = '€197/mnd';
export const EMMA_LABEL = '€497';
export const EMMA_MND = '€497/mnd';
export const GROEI_LABEL = '€997';
export const GROEI_MND = '€997/mnd';
export const VANAF = 'Vanaf €49/mnd';
/** schema.org Organization priceRange */
export const PRICE_RANGE = '€49-€5000';

// ── Setup-fees — gebruik deze i.p.v. hardcoded €495/€795/€500 ──
export const EMMA_SETUP = 495;
export const GROEI_SETUP = 795;
export const EMMA_SETUP_LABEL = '€495';
export const GROEI_SETUP_LABEL = '€795';
/** Standaardzin voor de setup-fee. Eén formulering, site-breed. */
export const SETUP_ZIN = 'Eenmalige setup: €495 (Emma) of €795 (Groei).';

// ── Productlabels — Emma is twee producten. Gebruik deze, nooit kaal "Emma". ──
export const EMMA_TELEFOON_NAAM = 'Emma AI-receptie (telefoon)';
export const EMMA_WHATSAPP_NAAM = 'Emma WhatsApp Agent (chat)';
/** Anchors op /diensten/emma/ — link hiernaartoe i.p.v. twee keer naar de kale productpagina. */
export const EMMA_TELEFOON_URL = '/diensten/emma/#telefoon';
export const EMMA_WHATSAPP_URL = '/diensten/emma/#whatsapp';

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

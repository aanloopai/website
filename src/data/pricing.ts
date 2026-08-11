// Single source of truth for all Aanloop AI / Emma pricing.
// Marketing pages AND portal-catalog.ts (Mollie checkout) derive from here.
//
// Owner-besluit 2026-08-11: de standalone "Emma WhatsApp Agent" productlijn
// (Lite €49 / Standard €197, chat-only, geen telefonie) is DEFINITIEF
// geschrapt. Er bestaat geen prijs of pakket onder €497 meer op de site.
// WhatsApp blijft bestaan — maar uitsluitend als ingebouwde functie van Emma
// AI-receptie (telefoon), nooit meer als apart te kopen abonnement. Elke
// vermelding van WhatsApp elders moet lezen als "WhatsApp zit inbegrepen bij
// Emma (vanaf €497/mnd)" — nooit als eigen prijspunt.
//
// Emma is dus weer één product met twee tiers: Emma €497 · Groei €997.
// SETUP-FEE: €495 (Emma) / €795 (Groei). Owner heeft bevestigd: de fee is echt.
// Benchmark (jun 2026): voice managed €199-299 · omnichannel mid €290-499.
// Publieke ladder: Emma €497 · Groei €997 · Enterprise op aanvraag.

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
export const EMMA_LABEL = '€497';
export const EMMA_MND = '€497/mnd';
export const GROEI_LABEL = '€997';
export const GROEI_MND = '€997/mnd';
export const VANAF = 'Vanaf €497/mnd';
/** schema.org Organization priceRange */
export const PRICE_RANGE = '€497-€5000';

// ── Setup-fees — gebruik deze i.p.v. hardcoded €495/€795/€500 ──
export const EMMA_SETUP = 495;
export const GROEI_SETUP = 795;
export const EMMA_SETUP_LABEL = '€495';
export const GROEI_SETUP_LABEL = '€795';
/** Standaardzin voor de setup-fee. Eén formulering, site-breed. */
export const SETUP_ZIN = 'Eenmalige setup: €495 (Emma) of €795 (Groei).';

// ── Productlabel — Emma is weer ÉÉN product. WhatsApp is een inbegrepen kanaal,
//    geen eigen product meer. Gebruik EMMA_TELEFOON_NAAM nooit kaal als "Emma"
//    wanneer je specifiek de telefonie-functie bedoelt. Voor WhatsApp: beschrijf
//    het als kanaal ("WhatsApp inbegrepen bij Emma"), verzin geen productnaam. ──
export const EMMA_TELEFOON_NAAM = 'Emma AI-receptie (telefoon)';
/** Anchors op /diensten/emma/ — telefoon- en WhatsApp-functionaliteit staan op
 *  dezelfde productpagina, WhatsApp is geen apart product. */
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
// AI-Website Bundel = website Groei (€5.950 setup + €197/mnd) + Emma AI-receptie
// (€495 setup + €497/mnd) + integratiewerk (€1.500), in één contract.
//
// Was €4.950 + €397/mnd. Dat was NIET houdbaar: het maandbedrag lag onder de
// prijs van Emma alleen (€497), dus de bundel was goedkoper dan één van zijn
// eigen onderdelen. Dat produceerde een "besparing" van €6.559 (40%) op de
// vergelijkingspagina — een korting die zo groot is dat hij ongeloofwaardig
// wordt, en die de losse prijzen impliciet tot onzin verklaart.
//
// Nu: setup gelijk aan de website alleen (Emma-setup + integratie zijn het
// setup-voordeel, €1.995), maandbedrag €45 onder de som van de losse
// abonnementen (€694). Een pakketkorting die klopt, geen verkooptruc.
// Marketing-tekst framet die €45/mnd als "€540 per jaar" — het kale bedrag €45
// las op de homepage als een (veel te lage) prijs i.p.v. een korting.
// Website Starter is per 2026-08-04 €3.450 setup + €129/mnd (was €2.950 + €97;
// NL-benchmark: specialist-bureaus starten rond €3.400-€3.600). Groei en de
// bundel-wiskunde hierboven zijn ongewijzigd.
export const WEBSITE_BUNDEL = { setup: 5950, maand: 649 } as const;

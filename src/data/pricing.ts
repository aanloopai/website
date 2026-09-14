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
// (Historie: aug-sep 2026 was de ladder Emma €497 · Groei €997. Per 2026-09-15
// vervangen door Start €149 · Groei €299 · Compleet €497 — zie hieronder.)

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
// Owner-besluit 2026-09-15: de ladder volgt de NL-markt (Voicelabs €149/€299,
// Loekas €149, VoxFlow €99, ai-receptionisten €50). Dit draait het besluit van
// 2026-08-11/09-10 ("geen prijs onder €497") bewust terug — zie
// test/prijs-consistentie.test.js voor de nieuwe kanon. Mapping oud→nieuw:
//   oud Emma €497 (150 gesprekken, tel+WhatsApp)  → Groei €299 (1.000 min)
//   oud Groei €997 (onbeperkt, CRM, priority)      → Compleet €497
//   nieuw: Start €149 (300 min, telefoon, self-serve, geen setup)
// Elke tier: 14 dagen niet goed, geld terug (abonnement; setup uitgezonderd).
// Boven de belminuten: €0,25 per minuut.

/** Emma Start — telefoon 24/7, 300 belminuten, agenda + lead-melding, self-serve. Geen setup. */
export const START: PricePoint = { monthly: 149, annual: 125, monthlyCent: 14900, setup: 0 };

/** Emma Groei — 1.000 belminuten, telefoon + WhatsApp, CRM-koppeling, begeleide onboarding. Setup €495. */
export const GROEI: PricePoint = { monthly: 299, annual: 251, monthlyCent: 29900, setup: 495 };

/** Emma Compleet — onbeperkt volume, multi-number, n8n-workflows op maat, priority support. Setup €795. */
export const COMPLEET: PricePoint = { monthly: 497, annual: 416, monthlyCent: 49700, setup: 795 };

/** Legacy alias: "Emma" zonder tier-naam = Compleet (de omnichannel agent van €497). */
export const EMMA: PricePoint = COMPLEET;

// Emma Enterprise — op aanvraag (SLA, dedicated, custom workflows, white-label). Geen vast tarief.

/** Belminuten boven het pakket — publiek zichtbaar, geen verrassingen op de factuur. */
export const OVERAGE_PER_MIN = 0.25;
export const OVERAGE_LABEL = '€0,25 per extra belminuut';
/** Garantie op elk Emma-pakket (abonnementsdeel; eenmalige setup uitgezonderd). */
export const GARANTIE = '14 dagen niet goed, geld terug';
export const GARANTIE_KORT = '14 dagen geld terug';

// ── Display-strings — gebruik deze overal i.p.v. hardcoded bedragen ──
export const START_LABEL = '€149';
export const START_MND = '€149/mnd';
export const GROEI_LABEL = '€299';
export const GROEI_MND = '€299/mnd';
export const COMPLEET_LABEL = '€497';
export const COMPLEET_MND = '€497/mnd';
export const EMMA_LABEL = COMPLEET_LABEL;
export const EMMA_MND = COMPLEET_MND;
export const PRO_LABEL = COMPLEET_LABEL;
export const PRO_MND = COMPLEET_MND;
export const VANAF = 'Vanaf €149/mnd';
/** schema.org Organization priceRange — publieke maandprijzen Start t/m Compleet.
 *  GEEN eenmalige/setup-bedragen hierin. */
export const PRICE_RANGE = '€149-€497';

// ── Setup-fees — interne bedragen (portal/Mollie/offerte-berekening). NIET
//    tonen op publieke marketingpagina's — owner-besluit 2026-08-11: alle
//    eenmalige bedragen site-breed verborgen, alleen maandprijzen zichtbaar.
//    De fee zelf bestaat en mag genoemd worden ("eenmalige setup van
//    toepassing"); het bedrag wordt pas in het gesprek besproken. Gebruik
//    EMMA_SETUP_LABEL/GROEI_SETUP_LABEL/SETUP_DISPLAY voor alle publieke tekst
//    i.p.v. hardcoded €495/€795/€500 — één bron, geen whack-a-mole. ──
export const START_SETUP = 0;
export const GROEI_SETUP = 495;
export const COMPLEET_SETUP = 795;
export const EMMA_SETUP = COMPLEET_SETUP;
/** Publiek display-label — GEEN bedrag. Owner-besluit 2026-08-11. */
export const SETUP_DISPLAY = 'op aanvraag';
export const START_SETUP_LABEL = 'geen setup';
export const GROEI_SETUP_LABEL = SETUP_DISPLAY;
export const COMPLEET_SETUP_LABEL = SETUP_DISPLAY;
export const EMMA_SETUP_LABEL = COMPLEET_SETUP_LABEL;
/** Standaardzin voor de setup-fee. Eén formulering, site-breed. */
export const SETUP_ZIN = 'Eenmalige setup van toepassing — bespreken we in het gesprek.';

// ── Productlabel — Emma is weer ÉÉN product. WhatsApp is een inbegrepen kanaal,
//    geen eigen product meer. Gebruik EMMA_TELEFOON_NAAM nooit kaal als "Emma"
//    wanneer je specifiek de telefonie-functie bedoelt. Voor WhatsApp: beschrijf
//    het als kanaal ("WhatsApp inbegrepen bij Emma"), verzin geen productnaam. ──
export const EMMA_TELEFOON_NAAM = 'Emma AI-receptie (telefoon)';
/** Anchors op /diensten/emma/ — telefoon- en WhatsApp-functionaliteit staan op
 *  dezelfde productpagina, WhatsApp is geen apart product. */
export const EMMA_TELEFOON_URL = '/diensten/emma/#telefoon';
export const EMMA_WHATSAPP_URL = '/diensten/emma/#whatsapp';

// ── Portal/Mollie tiers — D1-bound tier-namen (service_orders.tier): 'Starter',
//    'Groei', 'Partner' NOOIT hernoemen, alleen herprijzen. Per 2026-09-15 volgen ze
//    de publieke ladder: Starter = Start €149 (geen setup), Groei = €299, nieuw
//    'Compleet' = €497, Partner = op aanvraag. Bestaande Mollie-abonnementen houden
//    het bedrag waarmee ze zijn aangemaakt; dit raakt alleen nieuwe checkouts. ──
export const PORTAL_STARTER = START;
export const PORTAL_GROEI = GROEI;
export const PORTAL_COMPLEET = COMPLEET;
export const PORTAL_STARTER_MND = START_MND;
export const PORTAL_GROEI_MND = GROEI_MND;
export const PORTAL_COMPLEET_MND = COMPLEET_MND;

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

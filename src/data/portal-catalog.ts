// Portal product catalog (Faz 1, + V4 Sprint D pricing). Static — admin-managed
// via code, not DB. Prices derive from src/data/pricing.ts (single source).
// `key` matches services.product_key. `prijsCent` + `betaling` drive Mollie checkout.
// NB: tier `naam` is stored in D1 (service_orders.tier) — never rename/remove, only reprice.

// Portal/Mollie pricing is checkout-critical (D1 tier-namen 'Starter'/'Groei'/
// 'Partner' nooit hernoemen). Per 2026-09-15 volgen de bedragen de publieke ladder
// uit pricing.ts: Starter = Start €149 (geen setup) · Groei €299 · Compleet €497 ·
// Partner op aanvraag. Bestaande Mollie-abonnementen behouden hun oude bedrag.
import {
  PORTAL_STARTER as STARTER,
  PORTAL_GROEI as GROEI,
  PORTAL_COMPLEET as COMPLEET,
  PORTAL_STARTER_MND as STARTER_MND,
  PORTAL_GROEI_MND as GROEI_MND,
  PORTAL_COMPLEET_MND as COMPLEET_MND,
} from './pricing';

export type TierBetaling = 'maandelijks' | 'eenmalig' | 'aanvraag';

export interface CatalogTier {
  naam: string;
  prijs: string; // display string
  prijsCent: number | null; // numeric price in cents; null for 'aanvraag'
  /** Eenmalige inrichtingskosten in centen, EXCL btw. 0 = geen setup-fee. */
  setupCent: number;
  betaling: TierBetaling;
  kenmerken: string[];
}

export interface CatalogProduct {
  key: string;
  naam: string;
  categorie: string;
  omschrijving: string;
  tiers: CatalogTier[];
  meerInfoUrl: string;
  /**
   * Niet in /portal/ontdekken tonen en niet door klanten zelf te starten
   * (POST /api/portal/orders weigert). Een order voor zo'n product ontstaat
   * alleen via de admin-uitnodiging (POST /api/admin/intake-invite).
   */
  verborgen?: boolean;
}

export const PORTAL_CATALOG: CatalogProduct[] = [
  {
    key: 'emma-telefoon',
    naam: 'Emma — AI-receptionist',
    categorie: 'Voice AI',
    omschrijving:
      'Neemt inkomende telefoongesprekken 24/7 aan, plant afspraken in en legt leads vast. Nederlandse stem, klinkt natuurlijk.',
    meerInfoUrl: 'https://aanloopai.nl/diensten/emma/',
    tiers: [
      { naam: 'Starter', prijs: STARTER_MND, prijsCent: STARTER.monthlyCent, setupCent: STARTER.setup * 100, betaling: 'maandelijks', kenmerken: ['AI-telefoon 24/7', '300 belminuten/mnd', 'Afspraken in uw agenda', 'Lead-melding e-mail/Telegram', 'Self-serve, geen setup', '14 dagen niet goed, geld terug'] },
      { naam: 'Groei', prijs: GROEI_MND, prijsCent: GROEI.monthlyCent, setupCent: GROEI.setup * 100, betaling: 'maandelijks', kenmerken: ['1.000 belminuten/mnd', 'WhatsApp inbegrepen', 'CRM-koppeling (HubSpot/Pipedrive)', 'Tot 3 callscripts', 'Begeleide onboarding, 7 werkdagen', '14 dagen niet goed, geld terug'] },
      { naam: 'Compleet', prijs: COMPLEET_MND, prijsCent: COMPLEET.monthlyCent, setupCent: COMPLEET.setup * 100, betaling: 'maandelijks', kenmerken: ['Onbeperkt volume + WhatsApp', 'Multi-number', 'Workflows op maat (n8n)', 'Gespreksopnames', 'Priority support < 1 uur', '14 dagen niet goed, geld terug'] },
      { naam: 'Partner', prijs: 'Op aanvraag', prijsCent: null, setupCent: 0, betaling: 'aanvraag', kenmerken: ['Onbeperkt Emma', 'Custom workflows', 'Dedicated accountmanager', 'SLA 99,9%'] },
    ],
  },
  {
    key: 'seo',
    naam: 'SEO — vindbaarheid in Google',
    categorie: 'Groei',
    omschrijving:
      'Technische SEO, on-page optimalisatie en maandelijkse content om hoger te ranken in Google.',
    meerInfoUrl: 'https://aanloopai.nl/tarieven/',
    tiers: [
      { naam: 'Audit', prijs: '€495 eenmalig', prijsCent: 49500, setupCent: 0, betaling: 'eenmalig', kenmerken: ['Core Web Vitals + schema-audit', 'SERP-concurrentieanalyse', 'Actieplan', '5 werkdagen'] },
      { naam: 'Setup', prijs: '€1.950 eenmalig', prijsCent: 195000, setupCent: 0, betaling: 'eenmalig', kenmerken: ['Tech-SEO + 10 pagina’s', 'Schema-markup', 'GA4 + GSC-setup', '4 weken'] },
      { naam: 'Maandelijks', prijs: '€795/mnd', prijsCent: 79500, setupCent: 0, betaling: 'maandelijks', kenmerken: ['3 nieuwe pagina’s/mnd', 'Ranking-rapporten', 'Schema-updates', '30-min strategiecall'] },
    ],
  },
  {
    key: 'geo',
    naam: 'GEO — vindbaarheid in AI-zoekmachines',
    categorie: 'Groei',
    omschrijving:
      'Generative Engine Optimization: zichtbaar worden in ChatGPT, Claude, Perplexity en Google AI Overviews.',
    meerInfoUrl: 'https://aanloopai.nl/tarieven/',
    tiers: [
      { naam: 'Quick Scan', prijs: 'Gratis', prijsCent: null, setupCent: 0, betaling: 'aanvraag', kenmerken: ['AI-citability check', '4 platforms getest', 'GEO-score 0-100', '20 minuten'] },
      { naam: 'Setup', prijs: '€1.450 eenmalig', prijsCent: 145000, setupCent: 0, betaling: 'eenmalig', kenmerken: ['llms.txt + schema', 'AI-crawler configuratie', 'Speakable markup', '4-6 weken'] },
      { naam: 'Maandelijks', prijs: '€595/mnd', prijsCent: 59500, setupCent: 0, betaling: 'maandelijks', kenmerken: ['Tracking 5 AI-platforms', 'Citatie-rapporten', 'Content-updates', '30-min strategiecall'] },
    ],
  },
  {
    key: 'seo-geo-bundel',
    naam: 'SEO + GEO Bundel',
    categorie: 'Groei',
    omschrijving:
      'SEO Maandelijks en GEO Maandelijks gecombineerd — bespaart €195/mnd. Geïntegreerde SERP- én AI-strategie.',
    meerInfoUrl: 'https://aanloopai.nl/tarieven/',
    tiers: [
      { naam: 'Maandelijks', prijs: '€1.195/mnd', prijsCent: 119500, setupCent: 0, betaling: 'maandelijks', kenmerken: ['SEO Maandelijks volledig', 'GEO Maandelijks volledig', 'Bespaart €195/mnd', 'Eén strategiecall'] },
    ],
  },
  {
    key: 'ai-website-bundel',
    naam: 'AI-Website Bundel',
    categorie: 'Website',
    omschrijving:
      'Een nieuwe AI-ready website inclusief Emma — alles in één pakket opgezet.',
    meerInfoUrl: 'https://aanloopai.nl/diensten/ai-website-bundel-mkb-nederland/',
    tiers: [
      { naam: 'Bundel', prijs: '€5.950 setup + €649/mnd', prijsCent: null, setupCent: 0, betaling: 'aanvraag', kenmerken: ['AI-ready website', 'Emma AI-receptionist (WhatsApp inbegrepen)', 'Eén vast maandbedrag'] },
    ],
  },
  {
    key: 'website',
    naam: 'Website laten maken',
    categorie: 'Website',
    omschrijving:
      'Een snelle, AI-ready website (Astro, Next.js of WordPress) — geoptimaliseerd voor zoekmachines én AI.',
    meerInfoUrl: 'https://aanloopai.nl/diensten/website-laten-maken-mkb-nederland-2026/',
    tiers: [
      { naam: 'Maatwerk', prijs: 'Op aanvraag', prijsCent: null, setupCent: 0, betaling: 'aanvraag', kenmerken: ['AI-ready opgebouwd', 'SEO + GEO-fundament', 'Snelle laadtijden', 'Offerte op maat'] },
    ],
  },
  {
    key: 'webshop',
    naam: 'Webshop laten maken',
    categorie: 'Website',
    omschrijving:
      'Een complete webshop (Shopify, WooCommerce of Lightspeed) met iDEAL en PostNL-koppeling.',
    meerInfoUrl: 'https://aanloopai.nl/diensten/webshop-laten-maken-shopify-woocommerce-nederland-2026/',
    tiers: [
      { naam: 'Maatwerk', prijs: 'Op aanvraag', prijsCent: null, setupCent: 0, betaling: 'aanvraag', kenmerken: ['Shopify/WooCommerce/Lightspeed', 'iDEAL + PostNL', 'Productimport', 'Offerte op maat'] },
    ],
  },
  {
    key: 'automation',
    naam: 'Custom AI Workflows',
    categorie: 'Automatisering',
    omschrijving:
      'Maatwerk-automatisering van uw bedrijfsprocessen met n8n / Make — van documentverwerking tot lead-opvolging.',
    meerInfoUrl: 'https://aanloopai.nl/diensten/custom/',
    tiers: [
      { naam: 'Maatwerk', prijs: 'Op aanvraag', prijsCent: null, setupCent: 0, betaling: 'aanvraag', kenmerken: ['n8n / Make-integraties', 'Procesanalyse vooraf', 'Koppeling met uw tools', 'Offerte op maat'] },
    ],
  },
  {
    // Leadpartner-intake (leads kopen, B2B). Verborgen: alleen via uitnodiging.
    // Prijs per lead wordt in gesprek afgesproken — nooit een bedrag hier.
    key: 'leadpartner',
    naam: 'Leads kopen — partnerintake',
    categorie: 'Leads',
    omschrijving:
      'Intake voor leadpartners: uw dienstverlening, werkgebied en wat voor u een goede lead is. Geen abonnement, betalen per lead.',
    meerInfoUrl: 'https://aanloopai.nl/leads-kopen/',
    verborgen: true,
    tiers: [
      { naam: 'Exclusief', prijs: 'Op aanvraag', prijsCent: null, setupCent: 0, betaling: 'aanvraag', kenmerken: ['Exclusieve leads', 'Per lead betalen', 'Geen abonnement of minimumafname', 'Reclamatie binnen 48 uur'] },
    ],
  },
  {
    // Leadpartner-intake voor schoonmaakbedrijven (zakelijke schoonmaak).
    // Zelfde regels als 'leadpartner': verborgen, geen bedrag.
    key: 'leadpartner-schoonmaak',
    naam: 'Leads kopen — partnerintake schoonmaak',
    categorie: 'Leads',
    omschrijving:
      'Intake voor schoonmaakbedrijven: uw diensten, werkgebied en welke panden en opdrachten voor u een goede lead zijn. Geen abonnement, betalen per lead.',
    meerInfoUrl: 'https://aanloopai.nl/leads-kopen/schoonmaakbedrijven/',
    verborgen: true,
    tiers: [
      { naam: 'Exclusief', prijs: 'Op aanvraag', prijsCent: null, setupCent: 0, betaling: 'aanvraag', kenmerken: ['Exclusieve leads', 'Per lead betalen', 'Geen abonnement of minimumafname', 'Reclamatie binnen 48 uur'] },
    ],
  },
];

export function getCatalogProduct(key: string): CatalogProduct | undefined {
  return PORTAL_CATALOG.find((p) => p.key === key);
}

export function getCatalogTier(key: string, tierNaam: string): CatalogTier | undefined {
  return getCatalogProduct(key)?.tiers.find((t) => t.naam === tierNaam);
}

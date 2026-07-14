// Portal product catalog (Faz 1, + V4 Sprint D pricing). Static — admin-managed
// via code, not DB. Prices derive from src/data/pricing.ts (single source).
// `key` matches services.product_key. `prijsCent` + `betaling` drive Mollie checkout.
// NB: tier `naam` is stored in D1 (service_orders.tier) — never rename/remove, only reprice.

// Portal/Mollie pricing is checkout-critical (D1 tier-namen). Use LEGACY constants so
// monthlyCent stays identical — marketing pages use the new Emma ladder (START/CORE/PRO).
import {
  PORTAL_CORE_497 as CORE,
  PORTAL_GROEI_997 as GROEI,
  PORTAL_CORE_MND as CORE_MND,
  PORTAL_GROEI_MND as GROEI_MND,
} from './pricing';

export type TierBetaling = 'maandelijks' | 'eenmalig' | 'aanvraag';

export interface CatalogTier {
  naam: string;
  prijs: string; // display string
  prijsCent: number | null; // numeric price in cents; null for 'aanvraag'
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
      { naam: 'Starter', prijs: CORE_MND, prijsCent: CORE.monthlyCent, betaling: 'maandelijks', kenmerken: ['Max 150 gesprekken/mnd', 'Emma WhatsApp inbegrepen', 'Eigen belscript', 'Transcripties', 'Live in 10 dagen'] },
      { naam: 'Groei', prijs: GROEI_MND, prijsCent: GROEI.monthlyCent, betaling: 'maandelijks', kenmerken: ['Onbeperkt gesprekken', 'Emma WhatsApp inbegrepen', 'CRM-koppeling', 'Priority support <4u'] },
      { naam: 'Partner', prijs: 'Op aanvraag', prijsCent: null, betaling: 'aanvraag', kenmerken: ['Onbeperkt Emma', 'Custom workflows', 'Dedicated accountmanager', 'SLA 99,9%'] },
    ],
  },
  {
    key: 'emma',
    naam: 'Emma — WhatsApp-assistent',
    categorie: 'Chat AI',
    omschrijving:
      'Beantwoordt WhatsApp- en chatvragen automatisch, 24/7. Getraind op uw FAQ en productcatalogus.',
    meerInfoUrl: 'https://aanloopai.nl/diensten/emma/',
    tiers: [
      { naam: 'Lite', prijs: '€49/mnd', prijsCent: 4900, betaling: 'maandelijks', kenmerken: ['500 berichten/mnd', 'Standaard FAQ-training', 'WhatsApp Business API', 'NL/EN auto-detectie'] },
      { naam: 'Standard', prijs: '€197/mnd', prijsCent: 19700, betaling: 'maandelijks', kenmerken: ['Onbeperkt berichten', 'Eigen FAQ + productcatalogus', 'Shopify/WooCommerce-koppeling', 'Meertalig NL/EN/FR/DE'] },
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
      { naam: 'Audit', prijs: '€495 eenmalig', prijsCent: 49500, betaling: 'eenmalig', kenmerken: ['Core Web Vitals + schema-audit', 'SERP-concurrentieanalyse', 'Actieplan', '5 werkdagen'] },
      { naam: 'Setup', prijs: '€1.950 eenmalig', prijsCent: 195000, betaling: 'eenmalig', kenmerken: ['Tech-SEO + 10 pagina’s', 'Schema-markup', 'GA4 + GSC-setup', '4 weken'] },
      { naam: 'Maandelijks', prijs: '€795/mnd', prijsCent: 79500, betaling: 'maandelijks', kenmerken: ['3 nieuwe pagina’s/mnd', 'Ranking-rapporten', 'Schema-updates', '30-min strategiecall'] },
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
      { naam: 'Quick Scan', prijs: 'Gratis', prijsCent: null, betaling: 'aanvraag', kenmerken: ['AI-citability check', '4 platforms getest', 'GEO-score 0-100', '20 minuten'] },
      { naam: 'Setup', prijs: '€1.450 eenmalig', prijsCent: 145000, betaling: 'eenmalig', kenmerken: ['llms.txt + schema', 'AI-crawler configuratie', 'Speakable markup', '4-6 weken'] },
      { naam: 'Maandelijks', prijs: '€595/mnd', prijsCent: 59500, betaling: 'maandelijks', kenmerken: ['Tracking 5 AI-platforms', 'Citatie-rapporten', 'Content-updates', '30-min strategiecall'] },
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
      { naam: 'Maandelijks', prijs: '€1.195/mnd', prijsCent: 119500, betaling: 'maandelijks', kenmerken: ['SEO Maandelijks volledig', 'GEO Maandelijks volledig', 'Bespaart €195/mnd', 'Eén strategiecall'] },
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
      { naam: 'Bundel', prijs: '€4.950 setup + €397/mnd', prijsCent: null, betaling: 'aanvraag', kenmerken: ['AI-ready website', 'Emma AI-receptionist', 'Emma WhatsApp-assistent', 'Eén vast maandbedrag'] },
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
      { naam: 'Maatwerk', prijs: 'Op aanvraag', prijsCent: null, betaling: 'aanvraag', kenmerken: ['AI-ready opgebouwd', 'SEO + GEO-fundament', 'Snelle laadtijden', 'Offerte op maat'] },
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
      { naam: 'Maatwerk', prijs: 'Op aanvraag', prijsCent: null, betaling: 'aanvraag', kenmerken: ['Shopify/WooCommerce/Lightspeed', 'iDEAL + PostNL', 'Productimport', 'Offerte op maat'] },
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
      { naam: 'Maatwerk', prijs: 'Op aanvraag', prijsCent: null, betaling: 'aanvraag', kenmerken: ['n8n / Make-integraties', 'Procesanalyse vooraf', 'Koppeling met uw tools', 'Offerte op maat'] },
    ],
  },
];

export function getCatalogProduct(key: string): CatalogProduct | undefined {
  return PORTAL_CATALOG.find((p) => p.key === key);
}

export function getCatalogTier(key: string, tierNaam: string): CatalogTier | undefined {
  return getCatalogProduct(key)?.tiers.find((t) => t.naam === tierNaam);
}

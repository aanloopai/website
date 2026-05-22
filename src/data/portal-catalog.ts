// Portal product catalog (Faz 1). Static — admin-managed via code, not DB.
// Derived from src/pages/tarieven.astro. `key` matches services.product_key
// so the portal can tell which products a customer already has.

export interface CatalogTier {
  naam: string;
  prijs: string; // display string, e.g. "€249/mnd" or "Op aanvraag"
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
    key: 'marco',
    naam: 'Marco — AI-receptionist',
    categorie: 'Voice AI',
    omschrijving:
      'Neemt inkomende telefoongesprekken 24/7 aan, plant afspraken in en legt leads vast. Nederlandse stem, klinkt natuurlijk.',
    meerInfoUrl: 'https://aanloopai.nl/diensten/marco/',
    tiers: [
      { naam: 'Lite', prijs: '€249/mnd', kenmerken: ['Max 50 gesprekken/mnd', '1 standaard belscript', 'Agenda-koppeling', 'Live in 5 dagen'] },
      { naam: 'Starter', prijs: '€597/mnd', kenmerken: ['Max 150 gesprekken/mnd', 'Eigen belscript', 'Transcripties', 'Live in 10 dagen'] },
      { naam: 'Groei', prijs: '€1.197/mnd', kenmerken: ['Onbeperkt gesprekken', 'Emma WhatsApp inbegrepen', 'CRM-koppeling', 'Priority support <4u'] },
      { naam: 'Partner', prijs: 'Op aanvraag', kenmerken: ['Onbeperkt Marco + Emma', 'Custom workflows', 'Dedicated accountmanager', 'SLA 99,9%'] },
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
      { naam: 'Lite', prijs: '€49/mnd', kenmerken: ['500 berichten/mnd', 'Standaard FAQ-training', 'WhatsApp Business API', 'NL/EN auto-detectie'] },
      { naam: 'Standard', prijs: '€197/mnd', kenmerken: ['Onbeperkt berichten', 'Eigen FAQ + productcatalogus', 'Shopify/WooCommerce-koppeling', 'Meertalig NL/EN/FR/DE'] },
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
      { naam: 'Audit', prijs: '€495 eenmalig', kenmerken: ['Core Web Vitals + schema-audit', 'SERP-concurrentieanalyse', 'Actieplan', '5 werkdagen'] },
      { naam: 'Setup', prijs: '€1.950 eenmalig', kenmerken: ['Tech-SEO + 10 pagina’s', 'Schema-markup', 'GA4 + GSC-setup', '4 weken'] },
      { naam: 'Maandelijks', prijs: '€795/mnd', kenmerken: ['3 nieuwe pagina’s/mnd', 'Ranking-rapporten', 'Schema-updates', '30-min strategiecall'] },
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
      { naam: 'Quick Scan', prijs: 'Gratis', kenmerken: ['AI-citability check', '4 platforms getest', 'GEO-score 0-100', '20 minuten'] },
      { naam: 'Setup', prijs: '€1.450 eenmalig', kenmerken: ['llms.txt + schema', 'AI-crawler configuratie', 'Speakable markup', '4-6 weken'] },
      { naam: 'Maandelijks', prijs: '€595/mnd', kenmerken: ['Tracking 5 AI-platforms', 'Citatie-rapporten', 'Content-updates', '30-min strategiecall'] },
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
      { naam: 'Maandelijks', prijs: '€1.195/mnd', kenmerken: ['SEO Maandelijks volledig', 'GEO Maandelijks volledig', 'Bespaart €195/mnd', 'Eén strategiecall'] },
    ],
  },
  {
    key: 'ai-website-bundel',
    naam: 'AI-Website Bundel',
    categorie: 'Website',
    omschrijving:
      'Een nieuwe AI-ready website inclusief Marco en Emma — alles in één pakket opgezet.',
    meerInfoUrl: 'https://aanloopai.nl/diensten/ai-website-bundel-mkb-nederland/',
    tiers: [
      { naam: 'Bundel', prijs: '€4.950 setup + €397/mnd', kenmerken: ['AI-ready website', 'Marco AI-receptionist', 'Emma WhatsApp-assistent', 'Eén vast maandbedrag'] },
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
      { naam: 'Maatwerk', prijs: 'Op aanvraag', kenmerken: ['AI-ready opgebouwd', 'SEO + GEO-fundament', 'Snelle laadtijden', 'Offerte op maat'] },
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
      { naam: 'Maatwerk', prijs: 'Op aanvraag', kenmerken: ['Shopify/WooCommerce/Lightspeed', 'iDEAL + PostNL', 'Productimport', 'Offerte op maat'] },
    ],
  },
  {
    key: 'automation',
    naam: 'Custom AI Workflows',
    categorie: 'Automatisering',
    omschrijving:
      'Maatwerk-automatisering van uw bedrijfsprocessen met n8n / Make — van documentverwerking tot lead-opvolging.',
    meerInfoUrl: 'https://aanloopai.nl/diensten/custom-ai-workflows/',
    tiers: [
      { naam: 'Maatwerk', prijs: 'Op aanvraag', kenmerken: ['n8n / Make-integraties', 'Procesanalyse vooraf', 'Koppeling met uw tools', 'Offerte op maat'] },
    ],
  },
];

export function getCatalogProduct(key: string): CatalogProduct | undefined {
  return PORTAL_CATALOG.find((p) => p.key === key);
}

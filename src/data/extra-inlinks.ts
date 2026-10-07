// Extra interne links naar goede pagina's die in de 2026-10-07 index-analyse
// (133 sitemap-URL's "pending") nauwelijks inkomende body-links hadden.
// Per doelpagina: een beschrijvend anker + maximaal 3 thematisch verwante
// bronpagina's. Gerenderd door components/ExtraInlinks.astro (BaseLayout) als
// "Lees ook"-blok onderaan de bronpagina. Terugdraaien = regel verwijderen.
export interface ExtraInlink {
  target: string;
  label: string;
  sources: string[]; // max 3
}

export const EXTRA_INLINKS: ExtraInlink[] = [
  { target: '/kennisbank/ai-agent-microsoft-365-outlook-mkb-nederland/', label: 'AI-agent voor Microsoft 365 en Outlook', sources: ['/kennisbank/ai-agent-google-workspace-gmail-mkb-nederland/', '/diensten/ai-email-assistent/', '/kennisbank/ai-workflow-automation/'] },
  { target: '/kennisbank/ai-hypotheek-software-wat-het-doet-en-wanneer-het-past/', label: 'AI-hypotheeksoftware: wat het doet en wanneer het past', sources: ['/kennisbank/ai-voor-hypotheekadviseur-nederland-2026/', '/kennisbank/ai-hypotheeksoftware-uitleg-en-keuzehulp-voor-adviseurs/', '/kennisbank/ai-voor-verzekeringsmakelaar-financieel-adviseur/'] },
  { target: '/kennisbank/ai-intake-clienten-notariaat/', label: 'AI-intake voor cliënten in het notariaat', sources: ['/kennisbank/ai-voor-notariskantoor-nederland-2026/', '/kennisbank/ai-voor-advocatenkantoor-nederland-2026/', '/diensten/ai-document-processing/'] },
  { target: '/kennisbank/ai-integration-agency-amsterdam/', label: 'AI integration agency in Amsterdam kiezen', sources: ['/ai-agency-nederland/', '/kennisbank/ai-automatisering-voor-bedrijven-amsterdam/', '/locaties/amsterdam/'] },
  { target: '/kennisbank/ai-marketing-bureau-amsterdam/', label: 'AI marketing bureau in Amsterdam kiezen', sources: ['/ai-marketing-bureau/', '/locaties/amsterdam/', '/kennisbank/ai-voor-marketingbureau-nederland-2026/'] },
  { target: '/kennisbank/marketingbureau-dat-werkt-met-ai-eindhoven/', label: 'Marketingbureau met AI in Eindhoven: waar let u op?', sources: ['/locaties/eindhoven/', '/ai-marketing-bureau/', '/kennisbank/ai-consultants-eindhoven/'] },
  { target: '/kennisbank/ai-search-optimalisatie-eindhoven/', label: 'AI-zoekoptimalisatie in Eindhoven', sources: ['/locaties/eindhoven/', '/ai-vindbaarheid/', '/kennisbank/wat-is-geo-ai-vindbaarheid-mkb-nederland/'] },
  { target: '/kennisbank/hoe-kom-ik-in-chatgpt-als-bedrijf-mkb-nederland/', label: 'Hoe komt uw bedrijf in ChatGPT? Gids voor 2026', sources: ['/ai-vindbaarheid/', '/kennisbank/wat-is-geo-ai-vindbaarheid-mkb-nederland/', '/gratis-ai-scan/'] },
  { target: '/kennisbank/off-site-autoriteitssprint-reviews-directories-mediapitch/', label: 'Off-site autoriteitssprint: reviews, directories en mediapitch', sources: ['/ai-vindbaarheid/', '/kennisbank/wat-is-geo-ai-vindbaarheid-mkb-nederland/', '/diensten/ai-seo-content-generator/'] },
  { target: '/kennisbank/ai-voor-pedicure-praktijk-nederland-2026/', label: 'AI voor de pedicure-praktijk', sources: ['/kennisbank/ai-voor-schoonheidssalon-kapsalon-nederland-2026/', '/kennisbank/ai-voor-fysiotherapiepraktijk-nederland-2026/', '/sectoren/schoonheid/'] },
  { target: '/kennisbank/ai-voor-zorginstelling-thuiszorg-avg-eu-ai-act-2026/', label: 'AI voor zorg en thuiszorg: AVG en EU AI Act', sources: ['/ai-voor-zorg-mkb-nederland/', '/kennisbank/ai-voor-huisartsenpraktijk-nederland-2026/', '/kennisbank/ai-avg-gdpr-compliance-mkb-nederland/'] },
  { target: '/kennisbank/zorgcontrol-2-0-grip-op-uw-praktijk-met-data-en-ai/', label: 'Zorgcontrol 2.0: grip op uw praktijk met data en AI', sources: ['/ai-voor-zorg-mkb-nederland/', '/kennisbank/ai-voor-fysiotherapiepraktijk-nederland-2026/'] },
  { target: '/kennisbank/ai-workshop-groningen-wat-een-goede-workshop-het-mkb-oplevert/', label: 'AI-workshop in Groningen: wat levert het het MKB op?', sources: ['/locaties/groningen/', '/kennisbank/ai-implementatie-stappen-mkb-nederland/', '/kennisbank/wat-kost-een-ai-implementatietraject-voor-een-mkb-bedrijf/'] },
  { target: '/kennisbank/automatische-orderinvoer-ai-transport/', label: 'Automatische orderinvoer met AI in transport', sources: ['/kennisbank/ai-voor-logistiek-mkb-track-trace/', '/diensten/ai-document-processing/', '/kennisbank/ai-workflow-automation/'] },
  { target: '/kennisbank/automatisering-emmen-waar-begint-u-als-dienstverlener/', label: 'Automatisering in Emmen: waar begint u als dienstverlener?', sources: ['/locaties/emmen/', '/kennisbank/ai-automatisering-mkb/', '/kennisbank/ai-automatisering-mkb-waar-beginnen/'] },
  { target: '/kennisbank/processen-automatiseren-tilburg/', label: 'Processen automatiseren in Tilburg: waar begint u?', sources: ['/locaties/tilburg/', '/kennisbank/ai-automatisering-mkb/', '/kennisbank/ai-workflow-automation/'] },
  { target: '/kennisbank/wat-is-een-ai-agency/', label: 'Wat is een AI-agency? Complete gids voor 2026', sources: ['/ai-agency-nederland/', '/kennisbank/ai-agency-kiezen-mkb-nederland-2026/', '/kennisbank/aanloop-ai-vs-voicelabs/'] },
  { target: '/kennisbank/wat-kost-een-ai-implementatietraject-voor-een-mkb-bedrijf/', label: 'Wat kost een AI-implementatietraject voor het mkb?', sources: ['/tarieven/', '/kennisbank/hoeveel-kost-een-ai-agent/', '/kennisbank/ai-prijzen-vergelijking-mkb-nederland-2026/'] },
  { target: '/kennisbank/welke-bedrijven-helpen-met-ai-implementatie-mkb-nederland/', label: 'Welke bedrijven helpen met AI-implementatie in het mkb?', sources: ['/ai-agency-nederland/', '/kennisbank/ai-agency-kiezen-mkb-nederland-2026/', '/kennisbank/wat-is-een-ai-agency/'] },
  { target: '/vergelijk/aanloop-vs-innoworks/', label: 'Aanloop AI vs Innoworks: eerlijke vergelijking', sources: ['/vergelijk/aanloop-vs-voicelabs/', '/kennisbank/ai-agency-kiezen-mkb-nederland-2026/', '/ai-agency-nederland/'] },
  { target: '/vergelijk/aanloop-vs-schedulio/', label: 'Aanloop AI vs Schedulio: feiten-check en vergelijking', sources: ['/vergelijk/aanloop-vs-mike365/', '/diensten/ai-afspraken-inplannen/', '/kennisbank/ai-receptionist-kiezen-vergelijkingsgids-mkb-nederland/'] },
  { target: '/vergelijk/emma-vs-fysiotelefoniste/', label: 'Emma vs FysioTelefoniste', sources: ['/kennisbank/ai-voor-fysiotherapiepraktijk-nederland-2026/', '/diensten/emma/', '/vergelijk/emma-vs-trengo/'] },
  { target: '/onderzoek/', label: 'Onderzoek: AI-adoptie in het Nederlandse MKB', sources: ['/pers/', '/branche-statistieken-mkb-ai-nederland/', '/kennisbank/eu-ai-act-mkb-nederland-2026/'] },
  { target: '/onderzoek/ai-adoption-mkb-nederland-2026/methodologie/', label: 'Methodologie van het AI-adoptieonderzoek MKB 2026', sources: ['/branche-statistieken-mkb-ai-nederland/', '/pers/'] },
  { target: '/ai-voor-ecommerce-webshops-nederland/', label: 'AI voor e-commerce en webshops in Nederland', sources: ['/kennisbank/ai-voor-shopify-webshop-nederland/', '/diensten/webshop-laten-maken-shopify-woocommerce-nederland-2026/', '/ai-voor-administratie-boekhouding-mkb-nederland/'] },
  { target: '/ai-agents-voor-bedrijven/', label: 'AI-agents voor bedrijven', sources: ['/kennisbank/ai-agent-voorbeelden/', '/kennisbank/wat-is-een-ai-agent/', '/diensten/'] },
  { target: '/ai-marketing-bureau/', label: 'AI-marketingbureau voor het MKB', sources: ['/diensten/ai-social-media-agent/', '/diensten/ai-seo-content-generator/', '/kennisbank/ai-voor-marketingbureau-nederland-2026/'] },
  { target: '/diensten/ai-influencer-marketing/', label: 'AI-influencer en persona-marketing', sources: ['/diensten/ai-social-media-agent/', '/ai-marketing-bureau/'] },
  { target: '/pilot/', label: 'Emma-pilot: 60 dagen tegen kostprijs', sources: ['/tarieven/', '/diensten/emma/', '/werkwijze/'] },
  { target: '/founding/', label: 'Founding-klanten: actievoorwaarden', sources: ['/tarieven/', '/pilot/'] },
  { target: '/partners/', label: 'Partner worden van Aanloop AI', sources: ['/over/', '/team/', '/werkwijze/'] },
  { target: '/gemiste-omzet-calculator/', label: 'Gemiste-omzet calculator', sources: ['/no-show-calculator/', '/ai-roi-calculator/', '/gratis-ai-tools/'] },
  { target: '/gratis-ai-tools/', label: 'Gratis AI-tools voor het MKB', sources: ['/gratis-ai-scan/', '/ai-roi-calculator/', '/no-show-calculator/'] },
  { target: '/ai-oplossing-matcher/', label: 'Welke AI-oplossing past bij uw bedrijf?', sources: ['/gratis-ai-tools/', '/diensten/', '/gratis-ai-scan/'] },
  { target: '/vertrouwen/', label: 'Vertrouwen en AVG: waar uw data staat', sources: ['/over/', '/kennisbank/ai-avg-gdpr-compliance-mkb-nederland/', '/diensten/emma/'] },
  { target: '/zekerheden/', label: 'Zekerheden: AVG, datalocatie en beveiliging', sources: ['/vertrouwen/', '/tarieven/', '/over/'] },
  { target: '/beveiliging/', label: 'Beveiliging: wat wel en niet geldt', sources: ['/vertrouwen/', '/zekerheden/'] },
];

/** Bronpad naar de extra links die daar gerenderd worden. */
export function extraInlinksFor(pathname: string): { href: string; label: string }[] {
  const p = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return EXTRA_INLINKS.filter((l) => l.sources.includes(p) && l.target !== p).map((l) => ({ href: l.target, label: l.label }));
}

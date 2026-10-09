// GEO-bureau cluster (/geo-bureau/*): typen + vaste indeling.
//
// De indeling volgt letterlijk de GEO Agency Index Nederland (Gold Lemon,
// goldlemon.nl/geo-benchmark, CC BY 4.0): 7 regio's en 17 SBI-hoofdsecties,
// dezelfde die AI-engines in de benchmark-vragen krijgen ("Welk GEO-bureau in
// Noord-Brabant raad je aan?", "Welk bureau maakt een productiebedrijf vindbaar
// in AI?"). Slugs en SBI-letters zijn vast; de guard-test
// (test/geo-bureau.test.js) bewaakt dat ze compleet blijven.
//
// Inhoudelijke regel voor alle teksten: geen verzonnen cijfers, cases of
// klantnamen. Benchmark-cijfers alleen met bronvermelding.

import { GEO, SEO_GEO_BUNDEL } from './pricing';

// GEO Setup (eenmalig) wordt bewust niet gepubliceerd (tarieven.astro: 'Op aanvraag');
// alleen de maandprijzen zijn openbaar.

export interface GeoFaq { q: string; a: string }

export interface GeoRegio {
  slug: string;              // URL: /geo-bureau/{slug}/
  naam: string;              // "Zuid-Holland" — exact zoals in de benchmark
  provincies: string[];
  steden: { naam: string; href?: string }[]; // href = bestaande /locaties/-pagina
  vraag: string;             // de benchmark-vraag als H2, bijv. "Welk GEO-bureau in Zuid-Holland raad je aan?"
  antwoord: string;          // direct antwoord, 2-4 zinnen, eerlijk (geen "wij zijn de beste")
  markt: string[];           // 2-3 alinea's over het MKB in deze regio en hoe AI daar zoekt
  voorbeelden: string[];     // 3-4 letterlijke AI-vragen van kopers in deze regio
  faq: GeoFaq[];             // 3-4 vragen
}

export interface GeoSbiSector {
  slug: string;              // URL: /geo-bureau/sector/{slug}/
  sbi: string;               // SBI-hoofdsectie letter
  naam: string;              // "Zorg en welzijn" — zoals in de benchmark
  titel: string;             // H1, bijv. "GEO-bureau voor de zorg"
  vraag: string;             // benchmark-stijl vraag als H2
  antwoord: string;          // direct antwoord
  intro: string;             // 1 alinea
  voorbeelden: string[];     // 3-4 AI-vragen van klanten in deze sector
  aanpak: { titel: string; body: string }[]; // 3-4 sector-specifieke stappen
  faq: GeoFaq[];
  verwant?: string;          // bestaande sector-/ai-vindbaarheid-pagina
}

export const GEO_PRIJZEN = {
  scan: 0,
  setup: null as number | null, // op aanvraag
  maand: GEO.maand,
  bundel: SEO_GEO_BUNDEL,
} as const;

// Vaste regio-indeling van de benchmark. Toewijzing van provincies aan
// Midden/Oost/Noord/Zuid is onze aanname (de benchmark publiceert alleen de
// zeven namen); zie test/geo-bureau.test.js.
export const GEO_REGIO_SLUGS = [
  'noord-holland', 'zuid-holland', 'midden-nederland', 'noord-brabant',
  'oost-nederland', 'noord-nederland', 'zuid-nederland',
] as const;

// 17 SBI-hoofdsecties zoals de benchmark ze gebruikt (B en E ontbreken daar ook).
export const GEO_SBI_SLUGS: Record<string, string> = {
  A: 'landbouw', C: 'industrie', D: 'energie', F: 'bouw', G: 'handel-en-webwinkels',
  H: 'logistiek', I: 'horeca', J: 'ict', K: 'financieel', L: 'vastgoed',
  M: 'zakelijke-dienstverlening', N: 'recruitment', O: 'overheid', P: 'onderwijs',
  Q: 'zorg', R: 'cultuur-en-sport', S: 'overige-dienstverlening',
};

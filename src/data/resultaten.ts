// Gemeten resultaten van websites die Aanloop AI heeft gebouwd — de bron voor
// /resultaten/, /werk/<site>/ en de bewijs-blokken op de homepage en de bundelpagina.
//
// Regels (guard: test/resultaten.test.js):
//  - Elk cijfer draagt methode + periode + gemeten_op. Geen cijfer zonder bron.
//  - "contactactie" = een klik op bellen, WhatsApp, e-mail, route of een verzonden
//    formulier, gemeten door de eigen cookieloze beacon (src/lib/visibility-core.js).
//    Dat is géén lead; leads tellen we apart (Brevo-afleverstatistiek).
//  - De peildatum is de laatste gemeten dag van het 28-dagenvenster. Verversen =
//    dit bestand bijwerken met de output van de summary-API (win=28), niet schatten.
//  - Eigen bedrijven heten eigen bedrijven. Pasfoto Rotterdam Zuid is per 2026-10-05
//    uit beheer en staat hier bewust niet.

// 2026-10-16: beacon-cijfers ververst uit de live /api/resultaten (28 dagen t/m
// 16 oktober). Brevo-leads, KIB-serverstatistiek en benchmark dragen hun eigen datum.
export const RESULTATEN_PEILDATUM = '2026-10-16';

export type Methode = 'beacon' | 'brevo' | 'site-analytics' | 'ai-radar' | 'benchmark' | 'bron';

export interface Cijfer {
  id: string;
  label: string;
  waarde: string;
  toelichting: string;
  methode: Methode;
  periode: string;
  gemeten_op: string; // ISO-datum
}

export interface SiteResultaat {
  key: 'keukeninbeeld' | 'alfa' | 'fth' | 'tripandtick' | 'aanloop' | 'zoekeen' | 'grynnstudio';
  naam: string;
  host: string;
  url: string;
  eigenaar: 'eigen' | 'klant';
  eigenaarLabel: string;
  sector: string;
  live: string; // jaar of ISO-datum van livegang van de huidige site
  samenvatting: string;
  /** Meta-description van /werk/<key>/ — 110–155 tekens (CI check-meta; guard test/resultaten.test.js). */
  metaDescription: string;
  gebouwd: string[];
  ai: string[];
  cijfers: Cijfer[];
  /** Beacon-meting gestart op; alleen gevuld als er nog geen 28-dagenvenster vol is. */
  metingSinds?: string;
  screenshot?: string; // pad onder /public
}

const beacon28 = (id: string, label: string, waarde: string, toelichting: string): Cijfer => ({
  id, label, waarde, toelichting, methode: 'beacon', periode: `28 dagen t/m ${RESULTATEN_PEILDATUM}`, gemeten_op: RESULTATEN_PEILDATUM,
});

export const RESULTATEN: SiteResultaat[] = [
  {
    key: 'keukeninbeeld',
    naam: 'Keuken in Beeld',
    host: 'keukeninbeeld.nl',
    url: 'https://keukeninbeeld.nl',
    eigenaar: 'eigen',
    eigenaarLabel: 'Eigen platform (zusterproject van Aanloop AI)',
    sector: 'Keukenplatform voor consumenten',
    live: '2026',
    samenvatting: 'Onafhankelijk keukenplatform met AI-visualisatie, offertecheck en een open keukenprijs-index. Grotendeels gegenereerd uit data: merken, stijlen en regio\'s krijgen elk een eigen pagina.',
    metaDescription: 'Keuken in Beeld: keukenplatform met AI-visualisatie, offertecheck en prijsindex, gebouwd door Aanloop AI. 102 AI-bezoeken en 3,9% lead-ratio in 30 dagen.',
    gebouwd: [
      'Statische site op Cloudflare Pages met Functions en D1',
      'Datagedreven generator: 25 merkpagina\'s, stijlen, kleuren, 57 regio\'s — circa 270 pagina\'s',
      'Keukenprijs-index als open dataset (CC BY 4.0, JSON + embed)',
      'Offertecheck op een taalmodel met strikt JSON-schema, zonder eigen prijsoordeel',
      'Wizard-intake, terugbelverzoek en chatopener "Kim" (stelt zich voor als AI)',
    ],
    ai: [
      'AI-visualisatie van de eigen keuken als instap zonder verplichting',
      'llms.txt, answer-first blokken en datasets die AI-assistenten letterlijk kunnen citeren',
      'Wekelijkse AI-radar: 20 vragen aan Gemini en ChatGPT, bijgestuurd op wat wél geciteerd wordt',
    ],
    cijfers: [
      { id: 'kib-ai-bezoek', label: 'bezoeken via AI-assistenten', waarde: '102', toelichting: 'ChatGPT 95, Perplexity 4, Gemini 2, Copilot 1 — in 30 dagen, uit de eigen serverstatistiek van het platform.', methode: 'site-analytics', periode: '30 dagen t/m 2026-10-09', gemeten_op: '2026-10-09' },
      { id: 'kib-ai-lead', label: 'lead-ratio van AI-bezoek', waarde: '3,9%', toelichting: 'Tegenover 0,8% uit Google-zoekverkeer in dezelfde periode: 4,9× hoger. Lead = ingevulde aanvraag (visualisatie, offertecheck of terugbelverzoek).', methode: 'site-analytics', periode: '30 dagen t/m 2026-10-09', gemeten_op: '2026-10-09' },
      { id: 'kib-paginas', label: 'pagina\'s per ChatGPT-bezoek', waarde: '4,2', toelichting: 'Bezoekers die via ChatGPT binnenkomen, lezen gemiddeld meer dan vier pagina\'s.', methode: 'site-analytics', periode: '30 dagen t/m 2026-10-09', gemeten_op: '2026-10-09' },
      { id: 'kib-radar', label: 'radar-vragen waarin Gemini de site citeert', waarde: '5 van 20', toelichting: 'Wekelijkse meting met vaste vragen over keukenmerken, prijzen en garantie (Gemini, grounded).', methode: 'ai-radar', periode: 'meting van 2026-10-08', gemeten_op: '2026-10-08' },
      beacon28('kib-formulieren', 'verzonden formulieren', '70', 'Visualisatie-, offertecheck- en terugbelformulieren, geteld door de beacon op 974 sessies; 81 sessies kwamen via AI-assistenten.'),
    ],
    screenshot: '/werk/keukeninbeeld.jpg',
  },
  {
    key: 'fth',
    naam: 'FleetTrack Holland',
    host: 'fleettrackholland.nl',
    url: 'https://fleettrackholland.nl',
    eigenaar: 'eigen',
    eigenaarLabel: 'Eigen bedrijf uit dezelfde groep',
    sector: 'GPS-voertuigtracking (B2B SaaS)',
    live: '2025',
    samenvatting: 'Commercieel actieve SaaS: OBD-trackers en accu-trackers met ritregistratie. Website, offerteflow, contractportaal met e-handtekening en een AI-verkoopagent op de site.',
    metaDescription: 'FleetTrack Holland: GPS-tracking SaaS met AI-verkoopagent, gebouwd door Aanloop AI. 14 leads in 30 dagen; AI-bezoek neemt vaker contact op dan Google.',
    gebouwd: [
      'React-site op Cloudflare Pages met prerendering en 301-beheer',
      'Offerte- en aanmeldflow met D1-opslag en Brevo-mailafhandeling',
      'Contract- en e-handtekeningportaal',
      'Aanbod bewust versmald tot OBD en accu (29 oude URL\'s netjes doorgestuurd)',
    ],
    ai: [
      'AI-verkoopagent "Lars" beantwoordt bezoekersvragen en stuurt leads direct door',
      'Woordenboek-, FAQ- en vergelijkingspagina\'s met FAQ-schema voor AI-antwoorden',
      'llms-full.txt en AI-crawler-toegang via headers',
    ],
    cijfers: [
      beacon28('fth-sessies', 'bezoeken (sessies)', '342', 'Cookieloze beacon, bots uitgefilterd; 15 verzonden formulieren.'),
      beacon28('fth-ai-conv', 'AI-bezoek dat een contactactie doet', '37,5%', '3 van de 8 sessies via AI-assistenten klikten op bellen, WhatsApp, mail of een formulier. Google-zoekverkeer: 8,3% (13 van 157). Klein aantal, dus richting telt, niet de decimaal.'),
      { id: 'fth-leads', label: 'echte leads in 30 dagen', waarde: '14', toelichting: 'Afgeleverde lead-notificaties naar de inbox van het bedrijf (Brevo-afleverstatistiek), ongeveer één per twee dagen.', methode: 'brevo', periode: '30 dagen t/m 2026-10-08', gemeten_op: '2026-10-08' },
    ],
    screenshot: '/werk/fth.jpg',
  },
  {
    key: 'alfa',
    naam: 'Alfa Reclame',
    host: 'alfareclame.nl',
    url: 'https://alfareclame.nl',
    eigenaar: 'eigen',
    eigenaarLabel: 'Eigen bedrijf uit dezelfde groep (sinds 2012)',
    sector: 'Reclame, belettering en lichtreclame — Rotterdam',
    live: '2026',
    samenvatting: 'Herbouwde site van een reclamebureau: elke dienst een eigen pagina, één rijk offerteformulier op elke pagina, een prijsindicator en een kennisbank die uit meetdata wordt bijgestuurd.',
    metaDescription: 'Alfa Reclame: site van een Rotterdams reclamebureau met formulier op elke pagina, gebouwd door Aanloop AI. 5 leads en 259 sessies in 28 dagen.',
    gebouwd: [
      'Next.js op Cloudflare Workers, Lighthouse-geoptimaliseerd',
      'Eén lead-formulier met foto-upload op elke pagina, formulier ook in de header',
      'Prijsindicator en dienstpagina\'s per product en per stad',
      'Wekelijkse inhoudsmotor met blocklist tegen kannibalisatie van eigen pagina\'s',
    ],
    ai: [
      'AI-widget op de site beantwoordt vragen en haalt aanvragen op',
      'Feiten-datasets en FAQ-schema zodat AI-assistenten de dienstpagina\'s kunnen citeren',
      'Meetlus: GSC + beacon → maandelijkse bijsturing van de content',
    ],
    cijfers: [
      beacon28('alfa-sessies', 'bezoeken (sessies)', '259', 'Cookieloze beacon, bots uitgefilterd; 7 verzonden formulieren.'),
      beacon28('alfa-ai-aandeel', 'bezoek via AI-assistenten', '21 sessies', '8% van alle sessies kwam via ChatGPT, Perplexity, Gemini of Copilot. Contactactie-ratio AI 9,5% tegenover Google 10% — hier gelijkwaardig.'),
      { id: 'alfa-leads', label: 'echte leads in 30 dagen', waarde: '5', toelichting: 'Afgeleverde lead-notificaties naar de inbox van het bedrijf (Brevo-afleverstatistiek). Lokale dienstverlener; het volume is klein en wordt wekelijks bewaakt.', methode: 'brevo', periode: '30 dagen t/m 2026-10-08', gemeten_op: '2026-10-08' },
    ],
    screenshot: '/werk/alfa.jpg',
  },
  {
    key: 'tripandtick',
    naam: 'Trip and Tick',
    host: 'tripandtick.com',
    url: 'https://tripandtick.com',
    eigenaar: 'klant',
    eigenaarLabel: 'Klant (reisorganisatie)',
    sector: 'Reizen en excursies, internationaal',
    live: '2026',
    samenvatting: 'Meertalige reissite (zeven geïndexeerde talen) met WhatsApp-boeking, cookieloze gedragsmeting en een admin-paneel voor prijzen en analyses.',
    metaDescription: 'Trip and Tick: meertalige reissite met WhatsApp-boeking, gebouwd door Aanloop AI. 20% van het bezoek komt via AI-assistenten en neemt vaker contact op.',
    gebouwd: [
      'Next.js op Cloudflare Workers, zeventien talen waarvan zeven geïndexeerd',
      'WhatsApp-boekingsknop met verkoopattributie en Telegram-notificatie',
      'Cookieloze events + /admin/analyse voor de eigenaar',
      'FAQPage-schema op 22 pagina\'s, "vanaf"-prijzen in alle talen (guard-test)',
    ],
    ai: [
      'AI-gegenereerde productvideo\'s en beeld',
      'Chatbot met herinnering en WhatsApp-overdracht',
      'GEO-radar (8 vragen) als vaste meting',
    ],
    cijfers: [
      beacon28('tt-sessies', 'bezoeken (sessies)', '165', 'Cookieloze beacon, bots uitgefilterd.'),
      beacon28('tt-ai-aandeel', 'bezoek via AI-assistenten', '33 sessies', '20% van alle sessies kwam via een AI-assistent — het hoogste aandeel in ons portfolio, meer dan via Google (14 sessies).'),
      beacon28('tt-ai-conv', 'AI-bezoek dat een contactactie doet', '15,2%', '5 van de 33; tegenover 7,1% uit Google-zoekverkeer: ruim twee keer zo vaak een WhatsApp-, mail- of boekingsklik.'),
    ],
    screenshot: '/werk/tripandtick.jpg',
  },
  {
    key: 'aanloop',
    naam: 'Aanloop AI',
    host: 'aanloopai.nl',
    url: 'https://aanloopai.nl',
    eigenaar: 'eigen',
    eigenaarLabel: 'Onze eigen site',
    sector: 'AI-bureau voor het MKB',
    live: '2026',
    samenvatting: 'Deze site: Astro op Cloudflare Workers, klantenportaal, Mollie-checkout, GEO-cluster met markdown-twins en machineleesbare feiten (facts.json, claims.json, pricing.json).',
    metaDescription: 'Aanloop AI: onze eigen site met GEO-cluster, klantenportaal en machineleesbare feiten. Plaats 24 van 222 in de GEO Agency Index, techniek 90,6 van 100.',
    gebouwd: [
      'Astro + Cloudflare Workers, D1, portaal met magic-link login',
      'GEO-cluster: 28 pagina\'s per regio en sector, elk met een .md-twin',
      'Open onderzoek en datasets met bronvermelding per datapunt',
      'Centrale meting van zes sites in één paneel',
    ],
    ai: [
      'Emma, de AI-receptionist, live te bellen vanaf de homepage',
      'llms.txt + llms-full.txt, facts/claims/pricing als JSON',
      'Maandelijkse externe meting via de GEO Agency Index',
    ],
    cijfers: [
      { id: 'aanloop-geo-index', label: 'plaats in de GEO Agency Index Nederland', waarde: '24 van 222', toelichting: 'Onafhankelijke benchmark van Gold Lemon, editie oktober 2026 (CC BY 4.0). Techniek 90,6 van 100, transparantie van het aanbod 100 van 100; nummer 1 scoort 96,9 op techniek.', methode: 'benchmark', periode: 'editie oktober 2026 (meting 29 september)', gemeten_op: '2026-10-01' },
      beacon28('aanloop-ai-conv', 'AI-bezoek dat een contactactie doet', '37,5%', '3 van de 8 sessies via AI-assistenten; Google-zoekverkeer 8,3% (5 van 60) op 475 sessies. Klein aantal — richting, geen decimaal.'),
    ],
    screenshot: '/werk/aanloop.jpg',
  },
  {
    key: 'zoekeen',
    naam: 'Zoekeen.nl',
    host: 'zoekeen.nl',
    url: 'https://zoekeen.nl',
    eigenaar: 'eigen',
    eigenaarLabel: 'Eigen platform',
    sector: 'Zoekplatform voor keukenzaken per stad',
    live: '2026-09-24',
    samenvatting: 'Vindt keukenzaken per stad en koppelt zoekers aan de keukenprijs-index. Zoekfunctie en herontwerp live sinds 14 oktober 2026; de meting loopt sinds 9 oktober.',
    metaDescription: 'Zoekeen.nl: zoekplatform voor keukenzaken per stad met kort antwoord en prijsindex-koppeling, gebouwd door Aanloop AI. Meting gestart op 9 oktober 2026.',
    gebouwd: [
      'Astro op Cloudflare Pages, stadspagina\'s met FAQ-schema',
      'Zoekfunctie en herontwerp (conversiefunnel wordt gemeten vanaf 28 oktober)',
      'IndexNow-ping na elke deploy, robots met 14 AI-crawlergroepen',
    ],
    ai: [
      'Kort antwoord per stad met bronlink naar de keukenprijs-index',
      'llms.txt en Content-Signal headers voor AI-crawlers',
    ],
    cijfers: [],
    metingSinds: '2026-10-09',
    screenshot: '/werk/zoekeen.jpg',
  },
  {
    key: 'grynnstudio',
    naam: 'Grynn Studio',
    host: 'grynnstudio.nl',
    url: 'https://grynnstudio.nl',
    eigenaar: 'klant',
    eigenaarLabel: 'Klant (keukenstudio, Wateringen)',
    sector: 'Keukens en interieur',
    live: '2026-10-14',
    samenvatting: 'Nieuwe site voor een keukenstudio: lichte stijl, vier categorieën en vijf materialen, projectenpagina en een lead-engine. Live sinds 14 oktober 2026; de meting start zodra de eerste 28 dagen vol zijn.',
    metaDescription: 'Grynn Studio: site voor een keukenstudio in Wateringen met lead-engine en GEO-basis, gebouwd door Aanloop AI. Live sinds 14 oktober 2026, meting loopt.',
    gebouwd: [
      'Statische site met categorie-, materiaal- en projectpagina\'s',
      'Lead-engine met wekelijkse Telegram-samenvatting voor de eigenaar',
      'Keukenbladen-vergelijkingstabel en FAQ-schema',
    ],
    ai: [
      'GEO-basis vanaf dag 1: llms.txt, FAQ, feitencontrole in de build',
      'Meting van AI-verkeer en formulieren via dezelfde beacon als de andere sites',
    ],
    cijfers: [],
    metingSinds: '2026-10-15',
    screenshot: '/werk/grynnstudio.jpg',
  },
];

// Portfolio-brede kernpunten voor homepage en bundelpagina. Elk punt wijst naar
// de cijfers hierboven (ids) zodat de guard-test de herkomst kan controleren.
export interface Kernpunt { id: string; waarde: string; label: string; toelichting: string; bron: string[] }

export const KERNPUNTEN: Kernpunt[] = [
  {
    id: 'kern-ai-beter',
    waarde: '4 van de 5',
    label: 'gemeten sites waar AI-bezoek vaker contact opneemt dan Google-bezoek',
    toelichting: 'FleetTrack Holland, Trip and Tick, Aanloop AI en Keuken in Beeld; bij Alfa Reclame gelijkwaardig.',
    bron: ['fth-ai-conv', 'tt-ai-conv', 'aanloop-ai-conv', 'kib-ai-lead', 'alfa-ai-aandeel'],
  },
  {
    id: 'kern-kib-lead',
    waarde: '4,9×',
    label: 'hogere lead-ratio uit AI-bezoek dan uit Google op keukeninbeeld.nl',
    toelichting: '3,9% tegenover 0,8%, 30 dagen.',
    bron: ['kib-ai-lead'],
  },
  {
    id: 'kern-leads',
    waarde: '19',
    label: 'echte leads in 30 dagen op twee eigen bedrijfssites',
    toelichting: 'FleetTrack Holland 14, Alfa Reclame 5 — geteld in de afleverstatistiek, niet geschat.',
    bron: ['fth-leads', 'alfa-leads'],
  },
  {
    id: 'kern-techniek',
    waarde: '90,6',
    label: 'van 100 op techniek in de GEO Agency Index (222 bureaus)',
    toelichting: 'Transparantie van het aanbod: 100 van 100. Editie oktober 2026.',
    bron: ['aanloop-geo-index'],
  },
];

export const alleCijfers = (): Cijfer[] => RESULTATEN.flatMap((s) => s.cijfers);
export const siteByKey = (key: string): SiteResultaat | undefined => RESULTATEN.find((s) => s.key === key);

// Gedeelde teksten van de GEO-bureau-pagina's die niet in een ander databestand staan.
// Gebruikt door de HTML-pagina's (index.astro, vergelijken.astro) en door de
// Markdown-twins (index.md.ts, vergelijken.md.ts), zodat beide dezelfde bron hebben.
import { GEO_BENCHMARK as B } from './geo-benchmark';
import { GEO_PRIJZEN } from './geo-bureau';

export interface PillarFaq { question: string; answer: string }

const eur = (n: number) => `€${n.toLocaleString('nl-NL')}`;
export const nl = (n: number, d = 1) => n.toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });

export const PILLAR_FAQ: PillarFaq[] = [
  { question: 'Wat is een GEO-bureau?', answer: 'Een GEO-bureau (Generative Engine Optimization) zorgt dat AI-assistenten zoals ChatGPT, Claude, Perplexity, Gemini en Google AI Overviews een bedrijf noemen en aanbevelen wanneer iemand om een leverancier vraagt. Andere namen voor hetzelfde vak zijn AEO (Answer Engine Optimization), LLMO en AI-SEO. Het werk bestaat uit techniek (schema.org-entiteiten, llms.txt, toegang voor AI-crawlers), antwoordgerichte content, consistente vermeldingen en een herhaalde meting.' },
  { question: 'Welke bureaus in Nederland zijn goed in GEO?', answer: 'Een onafhankelijk ijkpunt is de GEO Agency Index Nederland van Gold Lemon, die maandelijks meet welke bureaus AI-assistenten noemen en hoe hun website er technisch en qua transparantie voor staat. In de editie van oktober 2026 stond Aanloop AI op plaats 24 van 222, met 90,6 op techniek en 100 op transparantie van het aanbod. Vergelijk bureaus op gepubliceerde prijzen, meetbaarheid en eerlijkheid over wat wel en niet te garanderen is; op onze pagina GEO-bureaus vergelijken staat de top 10 met bron.' },
  { question: 'Wie kan mijn bedrijf zichtbaar maken in ChatGPT?', answer: 'Aanloop AI doet dat voor het Nederlandse MKB: wij richten uw website in als bron die AI-assistenten kunnen lezen en citeren, schrijven content die de vragen van uw klanten letterlijk beantwoordt, zorgen voor consistente vermeldingen en meten elke maand in ChatGPT, Claude, Perplexity, Gemini en Google AI of u genoemd wordt. We beginnen met een gratis GEO Quick Scan als nulmeting.' },
  { question: 'Wat kost een GEO-bureau?', answer: `Bij Aanloop AI is de GEO Quick Scan gratis. GEO Maandelijks kost ${eur(GEO_PRIJZEN.maand)} per maand en de SEO + GEO Bundel ${eur(GEO_PRIJZEN.bundel)} per maand, beide exclusief 21% btw. De eenmalige GEO Setup hangt af van de omvang van uw website en wordt in het eerste gesprek vastgesteld. Alle maandtarieven staan op /tarieven/.` },
  { question: 'Kan een GEO-bureau een vermelding in ChatGPT garanderen?', answer: 'Nee. Geen enkel bureau bepaalt wat een AI-assistent antwoordt; de antwoorden verschillen per engine, per dag en per formulering. Een serieus GEO-bureau belooft daarom een meetbare aanpak en een maandelijkse meting, geen gegarandeerde plek. Wees voorzichtig bij bureaus die wel een garantie geven.' },
  { question: 'Wat is het verschil tussen SEO en GEO?', answer: 'SEO maakt u vindbaar in de blauwe links van Google en Bing. GEO maakt u onderdeel van het antwoord dat een AI-assistent geeft, met doorgaans drie tot vijf namen. De signalen overlappen: een snelle, goed gestructureerde site met heldere content helpt beide. GEO voegt entiteiten (Organization, Person, Service), llms.txt, FAQ-structuur en vermeldingen op bronnen die AI leest toe.' },
  { question: 'Hoe meet Aanloop AI of GEO werkt?', answer: 'Met een vaste set vragen die uw klanten stellen, gesteld aan ChatGPT, Claude, Perplexity, Gemini en Google AI Overviews. We leggen per engine vast of u genoemd wordt, op welke plek in het antwoord en welke pagina als bron dient. Dezelfde vragen elke maand, zodat verschillen echt verschillen zijn en geen toeval.' },
  { question: 'Hoe snel zie ik resultaat?', answer: 'Eerste citaties zien we doorgaans binnen 4 tot 6 weken na de technische setup, afhankelijk van hoe vaak AI-crawlers uw site bezoeken en hoe druk uw markt is. In sectoren met veel aanbod duurt het langer. We geven geen garantie op termijnen; we laten de meting spreken.' },
  { question: 'Werkt Aanloop AI in heel Nederland?', answer: 'Ja. We zitten in Rotterdam en werken remote voor heel Nederland, met een intake en oplevering op locatie waar dat zinvol is. Per regio en per sector hebben we aparte pagina\'s met de vragen die daar spelen.' },
  { question: 'Blijft alles van mij als ik stop?', answer: 'Ja. Alle techniek, content en gestructureerde data staan op uw eigen domein. Er is geen tool of platform van ons waar uw vindbaarheid van afhangt, dus bij een vertrek blijft alles werken.' },
];

export const PILLAR_STAPPEN: { titel: string; body: string }[] = [
  { titel: 'Nulmeting', body: 'We stellen de vragen die uw klanten stellen aan ChatGPT, Claude, Perplexity, Gemini en Google AI en leggen vast wie genoemd wordt, in welke volgorde en met welke bron.' },
  { titel: 'Entiteiten en techniek', body: 'Organisatie, personen en diensten als schema.org-entiteiten met sameAs en KvK-nummer, een llms.txt, robots.txt met toegang voor AI-crawlers, inhoud die leesbaar is zonder JavaScript.' },
  { titel: 'Antwoordgerichte content', body: 'Pagina\'s die de echte vraag letterlijk beantwoorden: diensten, prijzen, werkgebied, sector, veelgestelde vragen. Geen omwegen, geen marketingtaal die een AI niet kan citeren.' },
  { titel: 'Vermeldingen en bronnen', body: 'Consistente bedrijfsgegevens op de platforms die AI-engines lezen. Zonder betaalde advertenties en zonder gekochte vermeldingen.' },
  { titel: 'Maandelijkse meting', body: 'Dezelfde vragen, dezelfde engines, elke maand. U ziet wat verandert, welke pagina als bron dient en waar we bijsturen.' },
];

export const VERGELIJKEN_FAQ: PillarFaq[] = [
  { question: 'Welke GEO-bureaus in Nederland worden het vaakst genoemd door AI?', answer: `In de ${B.naam} van ${B.uitgever} (editie ${B.editie}) stonden ${B.top10.slice(0, 5).map((r) => r.bureau).join(', ')} in de top 5 van de index. Het vaakst genoemd werd ${B.top10.reduce((a, b) => (a.genoemdPct > b.genoemdPct ? a : b)).bureau}, in ${nl(B.top10.reduce((a, b) => (a.genoemdPct > b.genoemdPct ? a : b)).genoemdPct)}% van de ${B.antwoorden.toLocaleString('nl-NL')} antwoorden. De index weegt vermeldingen voor ${B.weging.vermeldingen}%, techniek voor ${B.weging.techniek}% en transparantie van het aanbod voor ${B.weging.aanbod}%.` },
  { question: 'Hoe wordt de GEO Agency Index Nederland gemeten?', answer: `${B.vragen} vragen zonder bureaunamen, gesteld aan ${B.engines} AI-engines (ChatGPT via API en app, Claude, Gemini, Perplexity, Google AI Mode en het AI-overzicht van Google), samen ${B.antwoorden.toLocaleString('nl-NL')} antwoorden. Daarnaast ${27} technische controles en ${8} transparantiepunten op de website van elk van de ${B.register.toLocaleString('nl-NL')} geregistreerde aanbieders. Een plaats krijgt wie minstens vijf keer genoemd wordt. De methode staat openbaar op goldlemon.nl.` },
  { question: 'Waar staat Aanloop AI in de index?', answer: `Op plaats ${B.aanloop.plaats} van ${B.geplaatst} in de editie ${B.editie}, met een index van ${nl(B.aanloop.index)}, ${nl(B.aanloop.techniek)} van 100 op techniek en ${nl(B.aanloop.aanbod)} van 100 op transparantie van het aanbod. AI noemde ons in ${B.aanloop.genoemdAantal} antwoorden (${nl(B.aanloop.genoemdPct)}%), vooral bij vragen over de zorg, waar we op plaats ${B.aanloop.sectorZorgPlaats} staan. Het verschil met de top zit in het aantal vermeldingen, niet in techniek of transparantie.` },
  { question: 'Is een hoge plek in deze index hetzelfde als een goed bureau?', answer: 'Nee. De index meet zichtbaarheid in AI-antwoorden en de staat van de eigen website, niet de resultaten die een bureau voor klanten haalt. Dat zegt de uitgever zelf ook. Gebruik de index als startpunt en vergelijk daarna op gepubliceerde prijzen, meetbaarheid en eerlijkheid over garanties.' },
  { question: 'Waarom publiceert Aanloop AI een lijst waarin concurrenten hoger staan?', answer: 'Omdat de cijfers openbaar zijn en u ze toch vindt. Liever met de juiste bron en context dan zonder. Wij meten onze eigen klanten met dezelfde logica, dus het zou vreemd zijn om voor onszelf een andere maatstaf te kiezen.' },
];

/** Datum waarop de tekst van de GEO-bureau-pagina's voor het laatst is nagelopen (ISO). */
export const GEO_PAGINA_DATUM = '2026-10-09';

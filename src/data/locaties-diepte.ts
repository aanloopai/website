// Stad-specifieke diepte voor de vier /locaties/-pagina's die GSC-vertoningen hebben
// (amsterdam, eindhoven, rotterdam, utrecht). De overige locaties staan in
// noindex-paths.json: dunne sjabloonpagina's horen niet in de index.
// De bundelprijs komt uit pricing.ts (WEBSITE_BUNDEL), zodat hij nooit afwijkt
// van /tarieven/ en de bundelpagina.
import { WEBSITE_BUNDEL } from './pricing';

export interface LocatieDiepte {
  stad: string;
  marketingH2: string;
  marketing: string[];
  geoH2: string;
  geo: string[];
  websiteH2: string;
  website: string[];
  sectorenH2: string;
  sectoren: { naam: string; tekst: string }[];
  werkwijzeH2: string;
  werkwijze: string[];
}

const bundel = `€${WEBSITE_BUNDEL.setup.toLocaleString('nl-NL')} eenmalig en €${WEBSITE_BUNDEL.maand.toLocaleString('nl-NL')} per maand`;

export const LOCATIES_DIEPTE: Record<string, LocatieDiepte> = {
  amsterdam: {
    stad: 'Amsterdam',
    marketingH2: 'AI marketing bureau Amsterdam: wat u van ons mag verwachten',
    marketing: [
      'Wie in Amsterdam zoekt naar een AI marketing bureau, komt meestal uit bij grote reclame- en performancebureaus of bij dure internationale consultants. Aanloop AI is iets anders: een kleine, gespecialiseerde partij uit Rotterdam die Amsterdamse MKB-bedrijven helpt om aanvragen sneller op te volgen, zichtbaar te worden in AI-assistenten en een website te hebben die daadwerkelijk contact oplevert. Wij kopen geen advertentieruimte en bouwen geen campagnebeelden. Wij automatiseren het deel van marketing dat in het MKB het vaakst misgaat: wat gebeurt er met een lead nadat iemand heeft gebeld, een formulier heeft ingevuld of een WhatsApp-bericht heeft gestuurd.',
      'In Amsterdam is dat verlies groot, omdat de concurrentie dicht op elkaar zit. Een makelaar in de Jordaan, een restaurant bij de Pijp of een adviesbureau op de Zuidas krijgt aanvragen op momenten dat niemand kan opnemen: tijdens een bezichtiging, in de bediening, in een cliëntgesprek. Wie dan niet binnen minuten reageert, ziet de aanvraag naar een concurrent gaan. Onze AI-receptionist Emma neemt op, stelt de juiste vragen, plant waar mogelijk een afspraak in en zet het gesprek met contactgegevens in uw CRM of mailbox.',
    ],
    geoH2: 'GEO voor Amsterdamse bedrijven: genoemd worden door ChatGPT, Perplexity en Google',
    geo: [
      'Steeds meer Amsterdammers vragen een AI-assistent in plaats van Google om een aanbeveling: "welke notaris in Amsterdam-Zuid neemt starters aan", "welk bureau helpt met AI voor een webshop". Generative Engine Optimization (GEO) zorgt dat uw bedrijf in die antwoorden kan voorkomen. Dat begint met een nulmeting: welke vragen stellen uw klanten, wie wordt nu genoemd, en welke bronnen gebruiken de assistenten daarvoor. Daarna volgen de technische basis (schema.org-gegevens, llms.txt, toegang voor AI-crawlers) en antwoordgerichte pagina\'s over uw diensten en werkgebied.',
      'Geen enkel bureau kan garanderen wat een AI-assistent antwoordt, en wij doen dat ook niet. Wat wij wel doen: elke maand dezelfde vragen in dezelfde assistenten stellen en rapporteren wat er verandert. GEO Maandelijks kost €595 per maand; de gratis GEO Quick Scan laat vooraf zien waar u staat. Lees meer over onze aanpak en tarieven bij ons GEO-bureau en bekijk de gemeten uitkomsten op de resultatenpagina.',
    ],
    websiteH2: 'Een AI-ready website voor een Amsterdams bedrijf',
    website: [
      `Amsterdamse bedrijven hebben vaak een mooie maar trage website die nergens op is gemeten. Onze AI-Website Bundel combineert een snelle, AI-ready website, Emma als AI-receptie en maandelijkse AI-vindbaarheid, voor ${bundel}. U krijgt één aanspreekpunt, één factuur en een publiek meetpaneel waarop te zien is hoeveel bezoek uit AI-assistenten komt en hoeveel daarvan contact opneemt.`,
    ],
    sectorenH2: 'Amsterdamse sectoren waar AI-marketing het snelst loont',
    sectoren: [
      { naam: 'Vastgoed en makelaardij', tekst: 'Vraag naar bezichtigingen komt in pieken, vaak buiten kantoortijd. Een AI-receptie plant bezichtigingen in en filtert serieuze kopers van nieuwsgierigen; GEO zorgt dat uw kantoor genoemd wordt bij vragen per buurt.' },
      { naam: 'Horeca en hospitality', tekst: 'Reserveringen via WhatsApp en telefoon tijdens de service gaan verloren. Een agent bevestigt, verzet en stuurt herinneringen, zodat no-shows dalen.' },
      { naam: 'Zakelijke dienstverlening en Zuidas', tekst: 'Advocaten, adviseurs en accountants winnen met snelle intake. Een AI-intake legt de vraag vast, controleert of de zaak past en plant het eerste gesprek.' },
      { naam: 'Webshops en startups', tekst: 'Veel vragen zijn herhaling: levertijd, retour, status. Een AI-agent beantwoordt die direct en geeft complexe gevallen door aan uw team.' },
    ],
    werkwijzeH2: 'Zo werken wij met Amsterdamse klanten',
    werkwijze: [
      'We starten met een gratis AI-scan van 45 minuten, op locatie in Amsterdam of per video. Daarin bepalen we waar de meeste aanvragen verloren gaan en welk onderdeel eerst moet worden opgelost. Is daarna meer analyse nodig, dan is er de AI-audit met een 90-dagenroadmap. Implementatie van Emma duurt standaard zeven werkdagen. Alle gegevens worden volgens de AVG verwerkt en wij doen geen uitspraken over certificeringen die wij niet hebben.',
    ],
  },
  eindhoven: {
    stad: 'Eindhoven',
    marketingH2: 'AI marketing bureau Eindhoven: praktische AI voor de Brainport-regio',
    marketing: [
      'Eindhoven staat bekend om techniek en maakindustrie, maar de meeste bedrijven in de regio zijn geen techgiganten. Het zijn toeleveranciers, installateurs, ingenieursbureaus, groothandels en dienstverleners met vijf tot tweehonderd medewerkers. Voor hen is een AI marketing bureau zinvol als het praktisch blijft: hoe komt een offerteaanvraag binnen, wie reageert er binnen een uur, en wordt het bedrijf gevonden wanneer een inkoper aan een AI-assistent vraagt welke partij in Zuidoost-Brabant een bepaalde klus doet?',
      'Aanloop AI helpt Eindhovense bedrijven met precies die drie dingen. Emma vangt telefoon en WhatsApp op en legt aanvragen vast met de gegevens die uw verkoper nodig heeft: type werk, locatie, urgentie. GEO maakt uw expertise vindbaar in AI-antwoorden. En een heldere website laat zien wat u doet, voor wie, en tegen welke voorwaarden. Geen campagnes en geen advertentiebudget, wel meetbare opvolging.',
    ],
    geoH2: 'AI-vindbaarheid in Zuidoost-Brabant: GEO voor B2B',
    geo: [
      'Zakelijke inkopers gebruiken AI-assistenten om leveranciers te verkennen voordat ze iemand bellen. Voor een B2B-bedrijf in Eindhoven betekent GEO dat uw diensten, specificaties en werkgebied in duidelijke, citeerbare vorm online staan: wat u levert, welke normen u hanteert, hoe snel u reageert. Wij zetten de technische laag neer met schema.org-markeringen en een llms.txt, en schrijven antwoordpagina\'s op de vragen die inkopers echt stellen.',
      'Die aanpak past bij de regio, waar veel bedrijven in ketens werken en elkaar via aanbevelingen vinden. De gratis GEO Quick Scan laat zien of AI-assistenten uw bedrijf nu kennen. Daarna kunt u kiezen voor GEO Maandelijks (€595 per maand) met een vaste maandelijkse meting. De methode en de uitkomsten voor andere sectoren staan bij ons GEO-bureau en op de resultatenpagina.',
    ],
    websiteH2: 'Website en AI-receptie als één pakket voor Eindhovense MKB',
    website: [
      `Veel technische bedrijven hebben een website die door een ingenieur is gemaakt en door een klant niet wordt begrepen. In onze AI-Website Bundel (${bundel}) bouwen wij een website die uw aanbod in gewone taal uitlegt, voorzien van de gegevens die AI-assistenten nodig hebben. Emma beantwoordt vragen en neemt telefoon aan als de planner op locatie is.`,
    ],
    sectorenH2: 'Eindhovense sectoren en hun AI-kansen',
    sectoren: [
      { naam: 'Toeleveranciers en maakindustrie', tekst: 'Offerteverzoeken komen binnen via mail, telefoon en portalen. Een AI-intake haalt de kerngegevens eruit en zet ze klaar voor uw calculator.' },
      { naam: 'Installatie en technische dienstverlening', tekst: 'Storingen en spoedvragen buiten kantoortijd worden opgenomen, geclassificeerd en doorgezet naar de dienstdoende monteur.' },
      { naam: 'Ingenieurs- en adviesbureaus', tekst: 'Zichtbaarheid in AI-antwoorden op specifieke vakvragen levert gekwalificeerde aanvragen op, ver voordat iemand een vergelijkingssite bezoekt.' },
      { naam: 'Retail en horeca in het centrum', tekst: 'WhatsApp-agents voor reserveringen en veelgestelde vragen houden de balie vrij voor de gast die voor u staat.' },
    ],
    werkwijzeH2: 'Van eerste gesprek tot werkend resultaat',
    werkwijze: [
      'Een eerste gesprek loopt gratis en duurt 45 minuten, per video of op locatie in Eindhoven. We bespreken uw aanvraagstromen, bepalen waar tijd of omzet weglekt en adviseren eerlijk of AI daar de juiste oplossing is. Past het, dan staat Emma binnen zeven werkdagen live. Wilt u eerst een dieper plan, dan levert onze AI-audit een geprioriteerde roadmap voor 90 dagen. Prijzen zijn gelijk voor heel Nederland; er is geen regiotoeslag.',
    ],
  },
  rotterdam: {
    stad: 'Rotterdam',
    marketingH2: 'AI marketing bureau Rotterdam: uw buur, geen landelijk callcenter',
    marketing: [
      'Aanloop AI is gevestigd in Rotterdam (KvK 88606902). Voor Rotterdamse ondernemers betekent dat korte lijnen: een afspraak op locatie is een kwestie van een tramrit, niet van een offerte voor reistijd. Wij zijn een AI marketing bureau in de zin dat wij het werk doen dat uw marketing laat renderen: leads direct opvangen, binnen minuten opvolgen, meten welk kanaal aanvragen oplevert en zorgen dat uw bedrijf zichtbaar is in AI-assistenten.',
      'Rotterdamse bedrijven werken vaak praktisch en op afspraak: aannemers, schoonmaakbedrijven, transporteurs, horeca langs de Maas en in Delfshaven. Hun telefoon staat zelden stil, en juist daarom gaat er veel verloren. Emma neemt gesprekken aan, legt de aanvraag vast en stuurt u een samenvatting. Zo bepaalt de agenda van de dag niet meer of een klant wordt bediend.',
    ],
    geoH2: 'GEO in Rotterdam: gevonden worden in AI-antwoorden in de Rijnmond',
    geo: [
      'Als iemand een AI-assistent vraagt naar "een betrouwbare loodgieter in Rotterdam-Zuid" of "een expediteur bij de haven die snel kan schakelen", beslist de assistent op basis van wat hij op het web kan vinden en vertrouwen. Wij leggen uw bedrijfsgegevens, diensten en werkgebied in een vorm vast die machines goed lezen: schema.org, een duidelijke over-ons-pagina, consistente vermeldingen en antwoordpagina\'s per dienst.',
      'Omdat wij zelf in Rotterdam zitten, meten wij ook voor onze eigen site en publiceren wij de uitkomsten openlijk op de resultatenpagina. Voor klanten starten we met de gratis GEO Quick Scan en leveren we daarna GEO Maandelijks voor €595 per maand, met een maandelijkse meting in dezelfde AI-assistenten. Wij beloven geen vermeldingen; wij beloven transparantie over wat verandert.',
    ],
    websiteH2: 'Een website die aanvragen oplevert voor Rotterdamse ondernemers',
    website: [
      `Onze AI-Website Bundel kost ${bundel} en bevat een snelle website, Emma als AI-receptie en maandelijkse AI-vindbaarheid. Dat is bewust één pakket: in plaats van een webbouwer, een telefoonservice en een SEO-freelancer te beheren, heeft u één contract en één contactpersoon die u zonder reistijd kunt spreken.`,
    ],
    sectorenH2: 'Rotterdamse branches waar wij het meeste verschil maken',
    sectoren: [
      { naam: 'Logistiek en haven', tekst: 'Transportvragen komen via telefoon, WhatsApp en mail. Een AI-agent legt ritgegevens vast en meldt wat ontbreekt voordat de planner belt.' },
      { naam: 'Bouw en installatie', tekst: 'Wie op een dak staat, neemt niet op. Emma vangt aanvragen en spoedmeldingen op en plant offerte-opnames in.' },
      { naam: 'Horeca en evenementen', tekst: 'Groepsreserveringen en vragen over beschikbaarheid worden buiten openingstijden afgehandeld, inclusief bevestiging per WhatsApp.' },
      { naam: 'Zakelijke en maatschappelijke dienstverlening', tekst: 'Intake, afspraken en veelgestelde vragen worden gestandaardiseerd, zodat adviseurs meer tijd hebben voor gesprekken.' },
    ],
    werkwijzeH2: 'Een afspraak in Rotterdam of per video',
    werkwijze: [
      'Wij komen graag langs, ook voor een kort gesprek van 45 minuten. Daarin bepalen we samen waar uw aanvragen vastlopen en wat een eerste stap is. Voor een grondiger plan is er de AI-audit met een 90-dagenroadmap. Emma staat standaard binnen zeven werkdagen live, gegevens worden volgens de AVG verwerkt, en de prijzen staan openbaar op de tarievenpagina.',
    ],
  },
  utrecht: {
    stad: 'Utrecht',
    marketingH2: 'AI marketing bureau Utrecht: centraal gelegen, landelijk inzetbaar',
    marketing: [
      'Utrecht ligt in het midden van het land en dat zie je terug in de bedrijven: veel dienstverleners, softwarebedrijven, zorg- en onderwijsorganisaties, evenementenbureaus en een groot aantal ondernemers dat landelijk werkt maar hier gevestigd is. Voor hen is een AI marketing bureau vooral nuttig als het klantcontact stroomlijnt: één plek waar telefoon, WhatsApp en formulieren samenkomen, en een zichtbaar profiel voor de vragen die in AI-assistenten worden gesteld.',
      'Aanloop AI begint daarom niet bij tools maar bij uw route van aanvraag naar klant. Hoe lang duurt het nu voordat iemand reageert? Welke vragen worden steeds opnieuw gesteld? Welke aanvragen zijn kansloos en kosten toch tijd? Op die vragen antwoorden wij met meetbare cijfers uit uw eigen telefoon- en mailverkeer, en pas daarna kiezen we welke automatisering de moeite waard is.',
    ],
    geoH2: 'GEO voor Utrechtse dienstverleners en zorgorganisaties',
    geo: [
      'In de zakelijke dienstverlening en de zorg oriënteren mensen zich steeds vaker via een AI-assistent, juist omdat het vertrouwen kost om een aanbieder te kiezen. Dat maakt het belangrijk dat uw bedrijf met feiten wordt beschreven: wie u bent, welke kwalificaties u hebt, wat uw werkgebied is, wat u kost of hoe de intake verloopt. Wij brengen die gegevens in kaart en publiceren ze op een manier die zowel mensen als AI-crawlers begrijpen.',
      'Uitkomsten kunnen wij niet garanderen, wel meten we elke maand opnieuw in dezelfde assistenten. GEO Maandelijks kost €595 per maand, de GEO Quick Scan is gratis. Voor Utrechtse zorg- en welzijnsorganisaties is onze sectorpagina over GEO in de zorg een goed vertrekpunt; bij ons GEO-bureau staan alle sectoren en regio\'s en op de resultatenpagina de gemeten cijfers.',
    ],
    websiteH2: 'Website, AI-receptie en vindbaarheid in één Utrechts pakket',
    website: [
      `De AI-Website Bundel (${bundel}) is bedoeld voor bedrijven die geen drie leveranciers willen aansturen. U krijgt een snelle website, Emma voor telefoon en WhatsApp, en maandelijkse AI-vindbaarheid. De website wordt zo gebouwd dat het contactmoment direct zichtbaar is: bellen, appen of een afspraak maken, zonder zoeken.`,
    ],
    sectorenH2: 'Utrechtse sectoren en concrete toepassingen',
    sectoren: [
      { naam: 'Zakelijke dienstverlening', tekst: 'Een AI-intake bepaalt of een aanvraag past bij uw vakgebied en plant het kennismakingsgesprek, waardoor uw team zich op betaalde uren richt.' },
      { naam: 'Zorg en welzijn', tekst: 'Praktijken verliezen veel afspraken aan telefoon die niet wordt opgenomen. Een AI-telefoniste neemt op, noteert de zorgvraag en verwijst bij spoed door naar de juiste route.' },
      { naam: 'Software en creatieve bureaus', tekst: 'Zichtbaarheid in AI-antwoorden over vakspecialismen levert aanvragen op die niet via advertenties lopen.' },
      { naam: 'Evenementen en vrijetijd', tekst: 'Veel herhaalvragen over beschikbaarheid en prijs; een WhatsApp-agent beantwoordt ze direct en stuurt bevestigingen.' },
    ],
    werkwijzeH2: 'Hoe een traject met een Utrechts bedrijf verloopt',
    werkwijze: [
      'Wij starten met een gratis AI-scan van 45 minuten, per video of in Utrecht. Op basis daarvan adviseren we eerlijk wat zinvol is en wat niet. Voor meer diepgang is er de AI-audit met 90-dagenroadmap. Emma wordt in zeven werkdagen live gezet. Alle prijzen zijn landelijk gelijk en openbaar, en we doen geen uitspraken over certificeringen die we niet hebben.',
    ],
  },
};

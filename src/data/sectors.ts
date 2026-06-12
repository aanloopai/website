// Sector content data — used by /sectoren/index.astro and /sectoren/[sector].astro
// Add new sectors here; they auto-generate landing pages.

export interface Sector {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  icon: string;
  hero: {
    headline: string;
    subheadline: string;
  };
  challenges: string[];
  solutions: { title: string; description: string }[];
  caseExample: {
    company: string;
    location: string;
    quote: string;
    metrics: { label: string; value: string }[];
  };
  recommendedServices: string[];
}

export const sectors: Sector[] = [
  {
    slug: 'horeca',
    title: 'Horeca',
    shortDescription: 'Reserveringen, no-shows, voorraadprognose — laat AI uw zaal vullen.',
    description: 'AI-oplossingen voor restaurants, cafés, hotels en cateraars die hun bezetting willen verhogen en operationele rompslomp willen verminderen.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h7v18H3zM14 3h7v9h-7zM14 16h7v5h-7z"/></svg>',
    hero: {
      headline: 'AI voor de horeca die uw zaal vol houdt.',
      subheadline: 'Van reserveringen aannemen om 23:00 tot no-shows voorkomen en voorraad voorspellen — laat AI de operationele klusjes overnemen, zodat u zich kunt richten op de gasten.',
    },
    challenges: [
      'Telefoon gaat over op piekuren — gasten ophangen = verloren omzet',
      'No-shows kosten gemiddeld 8% van de dagomzet',
      'Reserveringen via meerdere kanalen (telefoon, e-mail, Instagram, TheFork)',
      'Personeel kan niet tegelijkertijd serveren én reserveringen verwerken',
      'Voorraad voorspellen voor weekenden en feestdagen is gokwerk',
    ],
    solutions: [
      { title: 'Reserveringen via telefoon (Marco)', description: 'AI-receptionist neemt op, controleert beschikbaarheid, boekt direct in uw bestaande systeem (TheFork, Resengo, Zenchef, etc.).' },
      { title: 'WhatsApp-bevestigingen (Emma)', description: 'Automatische bevestiging + reminder 4u voor de reservering. No-shows verlaagd door tijdige bevestiging en reminder.' },
      { title: 'Multi-channel inbox', description: 'Reserveringen van telefoon, WhatsApp, Instagram-DM en e-mail komen samen in één dashboard.' },
      { title: 'Voorraadprognose', description: 'Custom AI die uw historische data analyseert en wekelijkse inkoop-suggesties geeft per ingrediënt.' },
    ],
    caseExample: {
      company: 'Voorbeeldscenario',
      location: 'Scheveningen',
      quote: 'In een druk restaurant worden avondreserveringen vaak gemist tijdens piekuren. Een AI-receptionist neemt ze aan terwijl het team serveert.',
      metrics: [
        { label: 'Omzetstijging', value: '+18%' },
        { label: 'No-shows verlaagd', value: '−60%' },
        { label: 'Tijdsbesparing/week', value: '11 uur' },
      ],
    },
    recommendedServices: ['marco', 'emma'],
  },
  {
    slug: 'logistiek',
    title: 'Logistiek & transport',
    shortDescription: 'Track-and-trace, klantmeldingen, route-optimalisatie via AI.',
    description: 'AI voor transportbedrijven, koeriers en distributiecentra die hun klantcommunicatie en planning willen automatiseren.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>',
    hero: {
      headline: 'AI voor logistiek die uw klanten en chauffeurs in real-time bedient.',
      subheadline: 'Klantvragen over zendingen, route-aanpassingen, leveringsbevestigingen — automatiseer de communicatie zonder een chauffeur of dispatcher te belasten.',
    },
    challenges: [
      'Klanten bellen continu over "waar is mijn pakket?"',
      'Chauffeurs hebben geen tijd voor administratie tijdens de rit',
      'Leveringsbevestigingen vergeten of te laat verstuurd',
      'Last-minute route-aanpassingen niet doorgegeven',
      'Track-and-trace via portaal werkt, maar klanten bellen toch',
    ],
    solutions: [
      { title: 'Status-WhatsApp-bot (Emma)', description: 'Klanten typen hun trackingnummer in WhatsApp, krijgen direct status, ETA en chauffeur-info — zonder iemand te storen.' },
      { title: 'AI-receptionist voor logistieke vragen', description: 'Marco neemt vragen aan, raadpleegt uw systeem, geeft antwoord. Verbindt door als er echt een mens nodig is.' },
      { title: 'Voice-to-text voor chauffeurs', description: 'Chauffeurs spreken hun update in via een knop in de app — AI maakt er een gestructureerde notitie van die direct in TMS belandt.' },
      { title: 'Route-suggesties via AI', description: 'Custom workflow die historische data + verkeer + werkdrukte combineert voor dagelijkse routesuggesties.' },
    ],
    caseExample: {
      company: 'Voorbeeldscenario',
      location: 'Vlaardingen',
      quote: 'Logistieke bedrijven krijgen veel "waar is mijn zending?"-vragen. Een WhatsApp-AI handelt die direct af, zodat de planner tijd houdt om te plannen.',
      metrics: [
        { label: 'Telefonische status-vragen', value: '−85%' },
        { label: 'Klanttevredenheid', value: '+22%' },
        { label: 'Planner-uren vrij/week', value: '14 uur' },
      ],
    },
    recommendedServices: ['emma', 'custom'],
  },
  {
    slug: 'vastgoed',
    title: 'Vastgoed & makelaars',
    shortDescription: 'Bezichtigingen plannen, leads kwalificeren, marktrapporten genereren.',
    description: 'AI voor makelaars, beheerders en projectontwikkelaars die meer leads willen omzetten zonder hun team te overbelasten.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>',
    hero: {
      headline: 'AI die uw leads kwalificeert terwijl u op bezichtiging bent.',
      subheadline: 'Bezichtigingsverzoeken via Funda, Pararius en uw eigen site komen 24/7 binnen. Marco of Emma neemt ze direct op, kwalificeert, plant — en u ziet alleen de serieuze kandidaten.',
    },
    challenges: [
      'Funda-leads contacteren binnen 5 min anders zijn ze weg',
      'Veel onserieuze "kijk-leads" die nooit kopen',
      'Bezichtigingen plannen kost 2-3 e-mails over en weer',
      'Klanten verwachten antwoord op zaterdag- en zondagavond',
      'Marktrapporten voor verkopers maken kost een halve werkdag',
    ],
    solutions: [
      { title: 'Lead-kwalificatie (Marco)', description: 'AI belt nieuwe leads binnen 60 seconden, kwalificeert op budget, gewenste regio en urgentie. U krijgt alleen "warme" leads in uw inbox.' },
      { title: '24/7 bezichtigings-bot (Emma)', description: 'Geïnteresseerden chatten via WhatsApp, AI controleert agenda en plant direct — zelfs om 22:00 op zondag.' },
      { title: 'Auto-marktrapport', description: 'Custom workflow die marktdata, vergelijkbare panden en buurt-info combineert tot een marktrapport op uw briefpapier.' },
      { title: 'Telefoon screening', description: 'Marco vangt cold-callers van verkopende makelaars af, registreert details voor terugbel-batch.' },
    ],
    caseExample: {
      company: 'Voorbeeldscenario',
      location: 'Utrecht',
      quote: 'Snelheid bepaalt de conversie op vastgoed-leads. Een AI-receptionist belt nieuwe leads direct terug, ook tijdens andere gesprekken.',
      metrics: [
        { label: 'Lead-naar-bezichtiging', value: '+175%' },
        { label: 'Reactietijd Funda-leads', value: '< 60 sec' },
        { label: 'Tijd per marktrapport', value: '4u → 8 min' },
      ],
    },
    recommendedServices: ['marco', 'emma', 'custom'],
  },
  {
    slug: 'detailhandel',
    title: 'Detailhandel',
    shortDescription: 'Productadvies via chat, klantenservice 24/7, retour-afhandeling.',
    description: 'AI voor webwinkels, fysieke retail en hybride formules die hun klantenservice willen schalen zonder personeelskosten.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>',
    hero: {
      headline: 'AI die uw webshop bemenst — ook \'s nachts en in het weekend.',
      subheadline: 'Productvragen, voorraad-checks, retour-aanvragen, track-and-trace — Emma beantwoordt 80% van alle klantenservice-tickets zonder dat een mens hoeft in te grijpen.',
    },
    challenges: [
      'Klanten verwachten antwoord binnen het uur, ook \'s avonds',
      'Productvragen herhalen zich (maat, materiaal, voorraad)',
      'Retouren-tickets opstapelen rond Black Friday en kerst',
      'Klantenservice schaalt niet mee met seizoenen',
      'Multi-platform (eigen shop, bol.com, Marktplaats) is chaos',
    ],
    solutions: [
      { title: 'Productadvies-bot (Emma)', description: 'Getraind op uw productcatalogus + reviews. Geeft eerlijk advies, suggereert alternatieven, voorkomt retouren door betere matches.' },
      { title: 'Retour-afhandeling automatisch', description: 'Klanten starten retour via WhatsApp, AI check voorwaarden, genereert label, mailt instructies. Geen ticket meer.' },
      { title: 'Voorraad-vragen real-time', description: 'AI haalt live voorraad uit uw kassasysteem of webshop-backend. Geen "ik moet even kijken" meer.' },
      { title: 'Multi-platform inbox', description: 'Vragen van Bol, Marktplaats, eigen shop, Instagram en e-mail komen in één AI-beheerde inbox.' },
    ],
    caseExample: {
      company: 'Voorbeeldscenario',
      location: 'Rotterdam',
      quote: 'Klantenservice-teams verwerken veel repetitieve tickets. Een WhatsApp-AI vangt de standaardvragen op, zodat mensen zich op de complexe richten.',
      metrics: [
        { label: 'Tickets opgelost door AI', value: '83%' },
        { label: 'Reactietijd gemiddeld', value: '< 30 sec' },
        { label: 'Retour-afhandeling versneld', value: '24u → 3u' },
      ],
    },
    recommendedServices: ['emma', 'custom'],
  },
  {
    slug: 'zakelijk',
    title: 'Zakelijke dienstverlening',
    shortDescription: 'Offertes opstellen, contracten reviewen, intakes automatiseren.',
    description: 'AI voor accountants, juristen, consultants en andere kennisintensieve diensten die meer billable hours willen vrijspelen.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
    hero: {
      headline: 'AI die de administratieve klusjes doet, zodat u declarabel werk doet.',
      subheadline: 'Intakes, offerte-concepten, contract-reviews, factuur-controles — laat AI de eerste 80% doen, u doet de specialistische 20% waar uw klant voor betaalt.',
    },
    challenges: [
      'Intakes nemen 30-60 minuten per nieuwe klant',
      'Offertes opstellen kost niet-declarabele uren',
      'Contracten reviewen op standaard-clausules is tijdrovend',
      'Telefoon onderbreekt diepe-werk-blokken',
      'Veel herhalende vragen van klanten over status',
    ],
    solutions: [
      { title: 'AI-intakegesprekken', description: 'Custom workflow waarin AI de eerste intake doet via chat of telefoon. Klant beantwoordt vragen, u krijgt een gestructureerde samenvatting.' },
      { title: 'Offerte-generator', description: 'AI vult uw standaard offerte-template op basis van het intake-gesprek. U reviewt en stuurt — bespaart 45 min per offerte.' },
      { title: 'Contract-clausule-checker', description: 'AI scant contracten op afwijkingen van uw standaard-clausules en uitbetalingsvoorwaarden. U ziet alleen de afwijkingen.' },
      { title: 'Marco voor inbound calls', description: 'Marco filtert sales-calls weg en plant alleen serieuze cliënt-calls in uw agenda.' },
    ],
    caseExample: {
      company: 'Voorbeeldscenario',
      location: 'Den Haag',
      quote: 'Niet-declarabele intakes kosten zakelijke dienstverleners tijd. Een AI doet de intake en levert een samenvatting, zodat partners declarabel blijven.',
      metrics: [
        { label: 'Niet-declarabele uren bespaard', value: '12u/week' },
        { label: 'Tijd per offerte', value: '90 → 15 min' },
        { label: 'Sales-call filter', value: '95% accuraat' },
      ],
    },
    recommendedServices: ['marco', 'custom', 'audit'],
  },
  {
    slug: 'zorg',
    title: 'Zorg & welzijn',
    shortDescription: 'Afsprakenbeheer, intake-vragenlijsten, patiëntcommunicatie.',
    description: 'AI voor huisartspraktijken, fysiotherapeuten, tandartsen en welzijnsorganisaties die meer tijd voor patiënten willen, minder voor administratie.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>',
    hero: {
      headline: 'AI die uw assistent ondersteunt, zodat patiënten centraal staan.',
      subheadline: 'Afspraak verzetten, formulieren vooraf invullen, herinneringen sturen — laat AI de telefoon aannemen voor niet-urgente vragen, uw assistent richt zich op patiënten in de praktijk.',
    },
    challenges: [
      'Telefoon overbelast tussen 8:00 en 10:00',
      'Patiënten vergeten formulieren mee te nemen',
      'No-shows kosten 6-9% van de praktijk-omzet',
      'Avond- en weekendvragen blijven liggen',
      'Privacy-eisen (NEN 7510) maken AI-keuze complex',
    ],
    solutions: [
      { title: 'Triage-AI (Marco)', description: 'AI bepaalt urgentie, plant niet-spoedeisende afspraken zelf, verbindt spoed direct door. NEN 7510-compliant.' },
      { title: 'Intake-formulieren via WhatsApp', description: 'Patiënt krijgt 24u voor afspraak een WhatsApp met de intake-vragen. AI verwerkt antwoorden in patiëntdossier.' },
      { title: 'Afspraak-herinneringen', description: 'Automatische SMS/WhatsApp 1 dag van tevoren. Patiënt kan via knop verzetten — AI verwerkt direct.' },
      { title: 'Beveiligde EU-verwerking', description: 'Alle data binnen EU (Frankfurt of Amsterdam), NEN 7510-conform, verwerkersovereenkomst standaard.' },
    ],
    caseExample: {
      company: 'Voorbeeldscenario',
      location: 'Rotterdam',
      quote: 'In de ochtendpiek staat de telefoon roodgloeiend. Een AI-receptionist neemt niet-spoedvragen af, zodat de assistent de wachtkamer kan bedienen.',
      metrics: [
        { label: 'Telefoondruk in piek', value: '−70%' },
        { label: 'No-shows door reminders', value: '−45%' },
        { label: 'Intakes correct ingevuld', value: '93%' },
      ],
    },
    recommendedServices: ['marco', 'emma'],
  },
];

export const serviceLabels: Record<string, string> = {
  marco: 'Marco — AI sekreter',
  emma: 'Emma — WhatsApp agent',
  'telefoon-assistent': 'AI telefoon assistent',
  custom: 'Custom AI workflows',
  audit: 'AI strategie & audit',
};

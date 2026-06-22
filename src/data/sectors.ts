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
      { title: 'Reserveringen via telefoon (Emma)', description: 'AI-receptionist neemt op, controleert beschikbaarheid, boekt direct in uw bestaande systeem (TheFork, Resengo, Zenchef, etc.).' },
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
    recommendedServices: ['emma'],
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
      { title: 'AI-receptionist voor logistieke vragen', description: 'Emma neemt vragen aan, raadpleegt uw systeem, geeft antwoord. Verbindt door als er echt een mens nodig is.' },
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
      subheadline: 'Bezichtigingsverzoeken via Funda, Pararius en uw eigen site komen 24/7 binnen. Emma neemt ze direct op, kwalificeert, plant — en u ziet alleen de serieuze kandidaten.',
    },
    challenges: [
      'Funda-leads contacteren binnen 5 min anders zijn ze weg',
      'Veel onserieuze "kijk-leads" die nooit kopen',
      'Bezichtigingen plannen kost 2-3 e-mails over en weer',
      'Klanten verwachten antwoord op zaterdag- en zondagavond',
      'Marktrapporten voor verkopers maken kost een halve werkdag',
    ],
    solutions: [
      { title: 'Lead-kwalificatie (Emma)', description: 'AI belt nieuwe leads binnen 60 seconden, kwalificeert op budget, gewenste regio en urgentie. U krijgt alleen "warme" leads in uw inbox.' },
      { title: '24/7 bezichtigings-bot (Emma)', description: 'Geïnteresseerden chatten via WhatsApp, AI controleert agenda en plant direct — zelfs om 22:00 op zondag.' },
      { title: 'Auto-marktrapport', description: 'Custom workflow die marktdata, vergelijkbare panden en buurt-info combineert tot een marktrapport op uw briefpapier.' },
      { title: 'Telefoon screening', description: 'Emma vangt cold-callers van verkopende makelaars af, registreert details voor terugbel-batch.' },
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
    recommendedServices: ['emma', 'custom'],
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
      { title: 'Emma voor inbound calls', description: 'Emma filtert sales-calls weg en plant alleen serieuze cliënt-calls in uw agenda.' },
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
    recommendedServices: ['emma', 'custom', 'audit'],
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
      { title: 'Triage-AI (Emma)', description: 'AI bepaalt urgentie, plant niet-spoedeisende afspraken zelf, verbindt spoed direct door. NEN 7510-compliant.' },
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
    recommendedServices: ['emma'],
  },
  {
    slug: 'automotive',
    title: 'Automotive & garage',
    shortDescription: 'Pech- en APK-calls 24/7 aangenomen, werkplaats vol — zonder gemiste telefoon.',
    description: 'AI-oplossingen voor garagebedrijven, autodealers en bandenspecialisten die geen onderhouds- of pechafspraak meer willen missen terwijl de werkplaats draait.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13l2-5a2 2 0 012-1h10a2 2 0 012 1l2 5M5 17h14M6 13h12M7 17v2M17 17v2"/></svg>',
    hero: {
      headline: 'AI voor de garage die elke afspraak vastlegt.',
      subheadline: 'Terwijl uw monteurs sleutelen, neemt Emma de telefoon aan: APK, onderhoud, pech. Geen gemiste klant meer, de planning altijd vol.',
    },
    challenges: [
      'Telefoon gaat over terwijl het team in de werkplaats staat — klant belt de volgende garage',
      'Pech- en storingscalls komen vaak buiten openingstijd binnen',
      'APK- en onderhoudsafspraken handmatig inplannen kost tijd aan de balie',
      'No-shows op werkplaatsafspraken laten een brug onbenut',
      'Offerte-aanvragen voor banden/reparatie blijven liggen',
    ],
    solutions: [
      { title: 'Afspraken via telefoon (Emma)', description: 'AI-receptionist neemt APK-, onderhouds- en pechcalls 24/7 aan en plant direct in uw werkplaatsplanning.' },
      { title: 'Status-updates via WhatsApp (Emma)', description: '"Uw auto is klaar" of "onderdeel besteld" automatisch via WhatsApp — minder terugbel-verkeer aan de balie.' },
      { title: 'Afspraakherinneringen', description: 'Reminder de dag vóór de werkplaatsafspraak verlaagt no-shows en houdt de planning vol.' },
      { title: 'Offerte-intake', description: 'Aanvragen voor banden, reparatie of inruil worden gestructureerd vastgelegd en naar uw systeem gerouteerd.' },
    ],
    caseExample: {
      company: 'Voorbeeldscenario',
      location: 'Apeldoorn',
      quote: 'Een garage met 6 bruggen mist op drukke dagen telefoontjes omdat iedereen in de werkplaats staat. Een AI-receptionist vangt ze op en houdt de planning vol.',
      metrics: [
        { label: 'Gemiste calls', value: '−65%' },
        { label: 'Werkplaatsbezetting', value: '+12%' },
        { label: 'Baliestoringen/dag', value: '−40%' },
      ],
    },
    recommendedServices: ['emma'],
  },
  {
    slug: 'installatie',
    title: 'Installatie & techniek',
    shortDescription: 'Spoed (lekkage, storing, gas) gefilterd en doorgezet — ook in de avond en het weekend.',
    description: 'AI-oplossingen voor loodgieters, installateurs, elektriciens en cv-monteurs die spoedmeldingen nooit willen missen terwijl ze op locatie werken.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M14 7l-3 3m0 0l-7 7 3 3 7-7m-3-3l3 3m4-9a4 4 0 01-5 5l-7 7"/></svg>',
    hero: {
      headline: 'AI die uw spoedcalls nooit mist.',
      subheadline: 'Lekkage om 22:00? Storing in het weekend? Emma neemt op, filtert spoed van regulier en schakelt de dienstdoende monteur direct in.',
    },
    challenges: [
      'Spoedcalls (lekkage, gas, stroomuitval) komen vaak ’s avonds en in het weekend',
      'Op locatie aan het werk — de telefoon blijft onbeheerd',
      'Geen onderscheid tussen echte spoed en een reguliere afspraak',
      'Offerte-aanvragen blijven liggen tijdens drukke klusdagen',
      'Planning van onderhoud en storingen handmatig',
    ],
    solutions: [
      { title: 'Spoed-triage (Emma)', description: 'AI-receptionist herkent spoed (lekkage, gas, breuk), filtert van regulier en escaleert urgente gevallen direct naar de dienstdoende monteur.' },
      { title: 'Inplannen in uw systeem', description: 'Reguliere afspraken worden direct ingepland in Bouw7, Werkbon of uw eigen planning.' },
      { title: 'WhatsApp-bevestiging (Emma)', description: 'Klant krijgt automatisch een bevestiging met tijdvak en een reminder — minder no-shows en belverkeer.' },
      { title: 'Offerte-intake', description: 'Aanvragen onder een drempelbedrag automatisch gestructureerd vastgelegd voor snelle opvolging.' },
    ],
    caseExample: {
      company: 'Voorbeeldscenario',
      location: 'Utrecht',
      quote: 'Een installatiebedrijf verliest avond- en weekendspoed omdat niemand opneemt. Emma filtert spoed en zet die direct door naar de monteur van dienst.',
      metrics: [
        { label: 'Spoed correct doorgezet', value: '95%' },
        { label: 'Gemiste avond/weekend-calls', value: '−80%' },
        { label: 'Tijd aan telefoon/week', value: '−9 uur' },
      ],
    },
    recommendedServices: ['emma'],
  },
  {
    slug: 'schoonheid',
    title: 'Schoonheid & kappers',
    shortDescription: 'Telefoon tijdens de behandeling? Emma neemt op, Emma stuurt reminders — no-shows omlaag.',
    description: 'AI-oplossingen voor kapsalons, schoonheidssalons, nagelstudio’s en pedicures die geen afspraak meer willen missen en no-shows willen terugdringen.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M14.5 9.5L21 3m-7 7l-3 3m0 0l-6 6m6-6l-3-3M9 4a5 5 0 100 10A5 5 0 009 4z"/></svg>',
    hero: {
      headline: 'AI die opneemt terwijl u knipt.',
      subheadline: 'U staat met de handen vol — Emma neemt de telefoon aan en boekt direct in uw agenda. Emma stuurt reminders en haalt no-shows naar beneden.',
    },
    challenges: [
      'Telefoon gaat over tijdens een behandeling — beller boekt elders',
      'No-shows kosten direct stoeltijd en omzet',
      'Afspraken komen via telefoon, WhatsApp én Instagram-DM',
      'Terugkomafspraken (recall) worden vergeten',
      'Geen tijd om buiten openingstijd terug te bellen',
    ],
    solutions: [
      { title: 'Afspraken via telefoon (Emma)', description: 'AI-receptionist neemt op tijdens behandelingen en boekt direct in uw systeem (Salonized, Treatwell, Shore, etc.).' },
      { title: 'No-show-reductie (Emma)', description: 'WhatsApp-bevestiging plus reminder 24u en 2u vooraf — no-shows fors omlaag.' },
      { title: 'Recall-berichten', description: 'Automatische terugkomberichten ("tijd voor uw volgende afspraak") houden de agenda gevuld.' },
      { title: 'Multi-channel afspraken', description: 'Telefoon, WhatsApp en Instagram-DM komen samen — geen gemiste boeking meer.' },
    ],
    caseExample: {
      company: 'Voorbeeldscenario',
      location: 'Haarlem',
      quote: 'Een drukke salon mist telefoontjes tijdens behandelingen. Emma neemt ze aan en boekt direct, Emma stuurt reminders zodat stoelen niet leeg blijven.',
      metrics: [
        { label: 'No-shows', value: '−55%' },
        { label: 'Gemiste afspraken', value: '−70%' },
        { label: 'Recall-omzet', value: '+15%' },
      ],
    },
    recommendedServices: ['emma'],
  },
  {
    slug: 'fitness',
    title: 'Fitness & sport',
    shortDescription: 'Ledenvragen en proeflessen 24/7 afgehandeld via WhatsApp en telefoon.',
    description: 'AI-oplossingen voor sportscholen, zwemscholen, yoga- en fitnessstudio’s die proefles-leads willen vasthouden en ledenvragen willen automatiseren.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6.5 6.5l11 11M3 10l3-3m12 7l3-3M4 14l2 2m12-12l2 2"/></svg>',
    hero: {
      headline: 'AI die proefles-leads niet laat lopen.',
      subheadline: 'Vragen over openingstijden, abonnementen of een proefles — Emma beantwoordt ze 24/7 op WhatsApp en zet leads om in ingeplande proeflessen.',
    },
    challenges: [
      'Hoog volume standaardvragen (openingstijden, prijzen, opzeggen, proefles)',
      'Telefoon en balie onbemand tijdens lessen en piekuren',
      'Proefles-leads buiten openingstijd gaan verloren',
      'Les- en baanreserveringen handmatig',
      'Opzeg- en pauzeverzoeken kosten administratie',
    ],
    solutions: [
      { title: 'Ledenvragen via WhatsApp (Emma)', description: '24/7 antwoord op de meest gestelde vragen, getraind op uw tarieven, rooster en voorwaarden.' },
      { title: 'Proefles-intake (Emma)', description: 'Leads worden gekwalificeerd en direct ingepland voor een proefles — ook ’s avonds en in het weekend.' },
      { title: 'Reserveringen en reminders', description: 'Les- of baanreserveringen met automatische herinnering, minder no-shows.' },
      { title: 'Administratie-automatisering', description: 'Opzeg-, pauze- en wijzigingsverzoeken gestructureerd naar uw systeem.' },
    ],
    caseExample: {
      company: 'Voorbeeldscenario',
      location: 'Eindhoven',
      quote: 'Een sportschool mist proefles-aanvragen die ’s avonds binnenkomen. Emma beantwoordt vragen en plant proeflessen in, ook als de balie dicht is.',
      metrics: [
        { label: 'Vragen automatisch afgehandeld', value: '80%' },
        { label: 'Proefles-leads vastgehouden', value: '+35%' },
        { label: 'Balietijd/week', value: '−10 uur' },
      ],
    },
    recommendedServices: ['emma'],
  },
  {
    slug: 'recruitment',
    title: 'Recruitment & uitzenden',
    shortDescription: 'Kandidaten 24/7 te woord gestaan en voorgescreend — meer intakes, minder belwerk.',
    description: 'AI-oplossingen voor uitzendbureaus, werving-en-selectie en recruiters die kandidaten sneller willen bereiken en intakes willen automatiseren.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z"/></svg>',
    hero: {
      headline: 'AI die elke kandidaat te woord staat.',
      subheadline: 'Kandidaten bellen op het moment dat ú in gesprek bent. Emma neemt op, screent op beschikbaarheid en locatie, en plant de intake direct in.',
    },
    challenges: [
      'Kandidaat-calls komen binnen terwijl recruiters in gesprek zijn',
      'Pre-screening (beschikbaarheid, locatie, ervaring) kost veel tijd',
      'Snelheid bepaalt wie de kandidaat plaatst — trage opvolging = mis',
      'Vacature- en sollicitatievragen in hoog volume',
      'Intakes handmatig inplannen',
    ],
    solutions: [
      { title: 'Kandidaat-intake (Emma)', description: 'AI-receptionist neemt op, pre-screent op beschikbaarheid, locatie en ervaring en plant de intake direct in.' },
      { title: 'WhatsApp-opvolging (Emma)', description: 'Snelle, geautomatiseerde opvolging en statusupdates houden kandidaten warm.' },
      { title: 'Custom screening-workflow', description: 'Kwalificatie volgens uw criteria, met routering van geschikte kandidaten naar de juiste recruiter.' },
      { title: 'Vacaturevragen 24/7', description: 'Veelgestelde vragen over functies, uren en voorwaarden automatisch beantwoord.' },
    ],
    caseExample: {
      company: 'Voorbeeldscenario',
      location: 'Rotterdam',
      quote: 'Een uitzendbureau verliest kandidaten doordat recruiters in gesprek zijn. Emma staat elke beller te woord, screent voor en plant intakes in.',
      metrics: [
        { label: 'Kandidaten te woord gestaan', value: '100%' },
        { label: 'Tijd aan pre-screening', value: '−50%' },
        { label: 'Intakes per week', value: '+30%' },
      ],
    },
    recommendedServices: ['emma', 'custom'],
  },
  {
    slug: 'onderwijs',
    title: 'Onderwijs & opleiders',
    shortDescription: 'Aanmeldingen, proefles-vragen en planning afgehandeld — ook tijdens de les.',
    description: 'AI-oplossingen voor rijscholen, cursusaanbieders en particuliere opleiders die aanmeldingen willen vastleggen en lesplanning willen automatiseren.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m-4-4v3a4 4 0 008 0v-3"/></svg>',
    hero: {
      headline: 'AI die uw aanmeldingen vastlegt.',
      subheadline: 'Terwijl u lesgeeft, neemt Emma aanmeldingen en vragen aan en plant proeflessen in. Emma stuurt lesherinneringen en houdt de planning vol.',
    },
    challenges: [
      'Telefoon gaat over tijdens een les of rijles — aanmelding gemist',
      'Veel vragen over pakketten, prijzen en proeflessen',
      'Lesplanning en omboekingen handmatig',
      'No-shows op (rij)lessen kosten direct omzet',
      'Aanmeldingen ’s avonds en in het weekend blijven liggen',
    ],
    solutions: [
      { title: 'Aanmeld-intake (Emma)', description: 'AI-receptionist neemt aanmeldingen en vragen aan, ook tijdens lessen, en plant proeflessen direct in.' },
      { title: 'Lesherinneringen (Emma)', description: 'WhatsApp-reminders voor (rij)lessen verlagen no-shows en houden het rooster gevuld.' },
      { title: 'Planning en omboekingen', description: 'Les-afspraken en wijzigingen worden gestructureerd verwerkt in uw planning.' },
      { title: 'Vragen 24/7', description: 'Standaardvragen over pakketten, prijzen en voorwaarden automatisch beantwoord.' },
    ],
    caseExample: {
      company: 'Voorbeeldscenario',
      location: 'Groningen',
      quote: 'Een rijschool mist aanmeldingen tijdens lessen. Emma neemt ze aan en plant proeflessen in, Emma stuurt lesherinneringen tegen no-shows.',
      metrics: [
        { label: 'Aanmeldingen vastgelegd', value: '+40%' },
        { label: 'No-shows op lessen', value: '−45%' },
        { label: 'Planningstijd/week', value: '−7 uur' },
      ],
    },
    recommendedServices: ['emma'],
  },
];

export const serviceLabels: Record<string, string> = {
  emma: 'Emma — WhatsApp agent',
  'telefoon-assistent': 'AI telefoon assistent',
  custom: 'Custom AI workflows',
  audit: 'AI strategie & audit',
};

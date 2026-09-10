// Leads kopen per branche — data voor /leads-kopen/ (hub) en
// /leads-kopen/[sector].astro (sectorpagina's) + scripts/build-sitemap.cjs.
//
// Spelregels (bewaakt door test/leads-kopen.test.js):
// - GEEN prijzen. Prijs per lead is altijd "op aanvraag" (owner-besluit
//   2026-09-10). Geen €-bedragen, geen "vanaf", geen marktcijfers.
// - GEEN verzonnen volumes, klantaantallen, conversiepercentages of cases.
// - status 'actief' alleen als er aantoonbaar een lopende leadstroom is
//   (keukens: keukeninbeeld.nl). Alle andere sectoren zijn 'in-opbouw':
//   de leadstroom wordt gestart zodra de eerste partner aansluit. Een
//   'in-opbouw'-sector mag nergens "beschikbaar" of "direct leverbaar" zeggen.
// - Geen bijzondere persoonsgegevens (AVG art. 9): geen medische, religieuze
//   of strafrechtelijke leadvelden. Daarom (nog) geen zorg-sectoren.
// - Nieuwe sector = object toevoegen; pagina, hub-kaart en sitemap volgen.

export type LeadType = 'b2c' | 'b2b' | 'beide';
export type LeadStatus = 'actief' | 'in-opbouw';

export interface LeadSector {
  /** URL-slug: /leads-kopen/<slug>/ */
  slug: string;
  /** Kort, klein geschreven: "keukenzaken" */
  naam: string;
  /** H1: "Keukenleads kopen" */
  titel: string;
  /** Wie koopt: "keukenzaken en keukenspecialisten" */
  doelgroep: string;
  emoji: string;
  groep: string;
  type: LeadType;
  status: LeadStatus;
  /** 2-3 zinnen: wat de aanvrager zoekt en waarom dit een lead is */
  intro: string;
  /** Wat een lead bevat — alleen gewone contact- en projectgegevens */
  velden: string[];
  /** Illustratieve aanvragen, geen echte klanten */
  voorbeelden: string[];
  /** Waarom leads kopen in deze branche werkt — zonder cijfers */
  waarom: string;
  faq: { q: string; a: string }[];
}

export const LEAD_GROEPEN = [
  'Wonen & verbouwen',
  'Energie & verduurzaming',
  'Zakelijke dienstverlening',
  'Financieel & juridisch',
  'Auto & mobiliteit',
  'Horeca & events',
  'Opleiding & coaching',
] as const;

export const LEAD_SECTORS: LeadSector[] = [
  {
    slug: 'keukens',
    naam: 'keukenzaken',
    titel: 'Keukenleads kopen',
    doelgroep: 'keukenzaken en keukenspecialisten',
    emoji: '🍳',
    groep: 'Wonen & verbouwen',
    type: 'b2c',
    status: 'actief',
    intro: 'Consumenten die een nieuwe keuken willen, oriënteren zich online en vragen bij meerdere zaken een offerte aan. Via ons platform keukeninbeeld.nl vullen zij een aanvraag in met budget, stijl, afmetingen en gewenste levertermijn. Die aanvraag wordt gecontroleerd en exclusief doorgezet naar één keukenzaak in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats van het project', 'Budgetindicatie en gewenste stijl', 'Afmetingen of type opstelling', 'Gewenste levertermijn en contactvoorkeur'],
    voorbeelden: ['Gezin dat de keuken van hun jaren-90-woning wil vervangen en binnen drie maanden geleverd wil hebben', 'Starter op de woningmarkt met een vaste budgetgrens die twee offertes wil vergelijken', 'Verbouwer die een kookeiland en een nieuwe indeling overweegt'],
    waarom: 'Een keuken is een grote aankoop met een lang oriëntatietraject. Wie de aanvraag als eerste en als enige krijgt, spreekt de klant vóór de concurrent en kan een showroombezoek plannen op het moment dat de interesse het hoogst is. Omdat de aanvraag al budget, stijl en termijn bevat, weet uw verkoper waarover het gesprek gaat voordat de telefoon wordt gepakt.',
    faq: [
      { q: 'Krijg ik een keukenlead exclusief?', a: 'Ja. Een aanvraag gaat naar één keukenzaak. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
      { q: 'Uit welke regio komen de aanvragen?', a: 'U geeft bij aanmelding de postcodegebieden op die u bedient. Alleen aanvragen uit die gebieden worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'boekhouders',
    naam: 'boekhouders',
    titel: 'Leads kopen voor boekhouders',
    doelgroep: 'boekhoudkantoren en administratiekantoren',
    emoji: '📒',
    groep: 'Zakelijke dienstverlening',
    type: 'b2b',
    status: 'in-opbouw',
    intro: 'Ondernemers die van boekhouder wisselen of hun eerste administratie uitbesteden, zoeken online naar een kantoor dat bij hun rechtsvorm en branche past. Wij vangen die vraag op met een korte intake — rechtsvorm, omvang, gewenste diensten — en zetten de aanvraag exclusief door naar één kantoor in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Bedrijfsnaam en rechtsvorm', 'Omvang: zzp, klein team of groter', 'Gewenste diensten: boekhouding, btw-aangifte, jaarrekening, salaris', 'Regio en contactvoorkeur'],
    voorbeelden: ['Zzp-er die na het eerste jaar de btw-aangifte en jaarrekening wil uitbesteden', 'Bv met enkele medewerkers die overstapt omdat het huidige kantoor slecht bereikbaar is', 'Webshop die een boekhouder zoekt met ervaring in e-commerce en koppelingen'],
    waarom: 'Een boekhoudrelatie duurt jaren; één nieuwe klant per maand verandert de omzet van een klein kantoor. Ondernemers kiezen op bereikbaarheid en branchekennis, en de eerste die belt met een concreet voorstel wint meestal. Omdat de intake de rechtsvorm en gewenste diensten al bevat, kunt u direct een passend tarief noemen.',
    faq: [
      { q: 'Zijn dit zakelijke of particuliere aanvragen?', a: 'Zakelijk. De aanvrager is een ondernemer of bedrijf dat een boekhouder zoekt. Particuliere belastingaangiften nemen wij niet op.' },
      { q: 'Kan ik me beperken tot een rechtsvorm of branche?', a: 'Ja. U geeft bij aanmelding aan welke rechtsvormen, branches en regio\'s u bedient; alleen passende aanvragen worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'badkamers',
    naam: 'badkamerspecialisten',
    titel: 'Badkamerleads kopen',
    doelgroep: 'badkamerzaken en sanitairspecialisten',
    emoji: '🛁',
    groep: 'Wonen & verbouwen',
    type: 'b2c',
    status: 'in-opbouw',
    intro: 'Consumenten die hun badkamer willen renoveren of vervangen, vergelijken online meerdere zaken voordat ze een afspraak maken. Wij vangen die oriëntatie op met een aanvraagformulier over de huidige situatie, gewenste stijl en planning, en zetten de aanvraag exclusief door naar één badkamerspecialist in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats van het project', 'Type project: renovatie of nieuwe badkamer', 'Gewenste stijl en indicatie van de ruimte', 'Gewenste planning en contactvoorkeur'],
    voorbeelden: ['Bewoner van een jaren-70-woning die de badkamer volledig wil vernieuwen', 'Huiseigenaar die een bad wil vervangen door een inloopdouche', 'Verbouwer die badkamer en toilet in één traject wil combineren'],
    waarom: 'Een badkamerrenovatie is een grote uitgave waarbij de klant meerdere zaken vergelijkt voordat hij kiest. Wie de aanvraag als eerste ontvangt, kan een opname inplannen voordat de klant bij een andere zaak langsgaat. De aanvraag bevat de huidige situatie en gewenste stijl, zodat de opname gericht kan worden voorbereid.',
    faq: [
      { q: 'Krijg ik een badkamerlead exclusief?', a: 'Ja. Een aanvraag gaat naar één badkamerspecialist. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
      { q: 'Uit welke regio komen de aanvragen?', a: 'U geeft bij aanmelding de postcodegebieden op die u bedient. Alleen aanvragen uit die gebieden worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'dakkapellen',
    naam: 'dakkapelbouwers',
    titel: 'Dakkapelleads kopen',
    doelgroep: 'dakkapelbouwers en dakspecialisten',
    emoji: '🏠',
    groep: 'Wonen & verbouwen',
    type: 'b2c',
    status: 'in-opbouw',
    intro: 'Huiseigenaren die een dakkapel willen laten plaatsen, zoeken online naar een bouwer die in hun regio werkt en ervaring heeft met hun type woning. De aanvraag bevat het type dak, de gewenste afmeting en de reden voor de uitbreiding, en wordt exclusief doorgezet naar één dakkapelbouwer.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats van het project', 'Type woning en type dak', 'Gewenste afmeting of aantal ramen', 'Gewenste planning en contactvoorkeur'],
    voorbeelden: ['Huiseigenaar die zolderruimte wil ombouwen tot extra slaapkamer', 'Gezin dat een dakkapel aan de voor- en achterzijde overweegt', 'Bewoner die eerst wil weten of een vergunning nodig is'],
    waarom: 'Een dakkapel is een zichtbare en definitieve ingreep aan de woning, waardoor kopers zorgvuldig kiezen tussen enkele bouwers. Wie als eerste contact opneemt, kan de situatie opnemen en een reële planning bespreken voordat de klant elders een afspraak maakt. Doordat het type dak en de gewenste afmeting al bekend zijn, kan de bouwer de opname gerichter voorbereiden.',
    faq: [
      { q: 'Krijg ik een dakkapellead exclusief?', a: 'Ja. Een aanvraag gaat naar één dakkapelbouwer. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
      { q: 'Uit welke regio komen de aanvragen?', a: 'U geeft bij aanmelding de postcodegebieden op die u bedient. Alleen aanvragen uit die gebieden worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'kozijnen',
    naam: 'kozijnenbedrijven',
    titel: 'Kozijnleads kopen',
    doelgroep: 'kozijnenbedrijven en glaszetters',
    emoji: '🪟',
    groep: 'Wonen & verbouwen',
    type: 'b2c',
    status: 'in-opbouw',
    intro: 'Huiseigenaren die kozijnen willen vervangen, letten op materiaal, isolatiewaarde en uitstraling en vragen bij meerdere bedrijven een opname aan. De aanvraag bevat het huidige materiaal, het gewenste materiaal en het aantal kozijnen, en wordt exclusief doorgezet naar één kozijnenbedrijf in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats van het project', 'Huidig materiaal en gewenst materiaal', 'Aantal kozijnen of ramen', 'Gewenste planning en contactvoorkeur'],
    voorbeelden: ['Bewoner van een jaren-80-woning die houten kozijnen wil vervangen door kunststof', 'Huiseigenaar die enkel glas wil laten vervangen door isolerend glas', 'Verbouwer die kozijnen en voordeur in één keer wil laten vervangen'],
    waarom: 'Kozijnen vervangen is een langdurige investering waarbij isolatiewaarde en uitstraling allebei meewegen, dus kopers vergelijken bewust. Wie de aanvraag als eerste ontvangt, kan een opname inplannen voordat de klant een andere offerte afwacht. Doordat materiaal en aantal kozijnen al bekend zijn, kan de opname gericht worden voorbereid.',
    faq: [
      { q: 'Krijg ik een kozijnlead exclusief?', a: 'Ja. Een aanvraag gaat naar één kozijnenbedrijf. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
      { q: 'Uit welke regio komen de aanvragen?', a: 'U geeft bij aanmelding de postcodegebieden op die u bedient. Alleen aanvragen uit die gebieden worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'schilders',
    naam: 'schildersbedrijven',
    titel: 'Schilderleads kopen',
    doelgroep: 'schildersbedrijven binnen en buiten',
    emoji: '🎨',
    groep: 'Wonen & verbouwen',
    type: 'beide',
    status: 'in-opbouw',
    intro: 'Particulieren en bedrijven die binnen- of buitenschilderwerk laten uitvoeren, vragen online een offerte aan met de omvang van het werk en de gewenste periode. Die aanvraag wordt gecontroleerd en exclusief doorgezet naar één schildersbedrijf in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats van het project', 'Particulier of zakelijk, binnen of buiten', 'Omvang van het werk of aantal ruimtes', 'Gewenste periode en contactvoorkeur'],
    voorbeelden: ['Huiseigenaar die de buitenkant van de woning wil laten schilderen na jaren van weersinvloed', 'Vve die het schilderwerk van een portiek wil laten uitvoeren', 'Ondernemer die het interieur van een kantoorpand wil laten opfrissen'],
    waarom: 'Schilderwerk wordt vaak gepland rond een seizoen of een verhuizing, waardoor de aanvrager op korte termijn een bedrijf zoekt dat kan inplannen. Wie de aanvraag als eerste ontvangt, kan direct een planning voorstellen voordat de klant een ander bedrijf belt. Doordat de omvang van het werk al bekend is, kan de offerte sneller worden opgesteld.',
    faq: [
      { q: 'Gaat het om particulier of zakelijk schilderwerk?', a: 'Beide. Bij aanmelding geeft u aan of u particuliere aanvragen, zakelijke aanvragen of allebei wilt ontvangen.' },
      { q: 'Krijg ik een schilderlead exclusief?', a: 'Ja. Een aanvraag gaat naar één schildersbedrijf. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
    ],
  },
  {
    slug: 'vloeren',
    naam: 'vloerenspecialisten',
    titel: 'Vloerenleads kopen',
    doelgroep: 'vloerenzaken en parketteurs',
    emoji: '🪵',
    groep: 'Wonen & verbouwen',
    type: 'b2c',
    status: 'in-opbouw',
    intro: 'Consumenten die een nieuwe vloer willen laten leggen, oriënteren zich op materiaal en stijl voordat ze een zaak bezoeken. De aanvraag bevat het gewenste materiaal, de oppervlakte en de ruimte, en wordt exclusief doorgezet naar één vloerenspecialist in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats van het project', 'Gewenst materiaal: laminaat, PVC, parket of anders', 'Oppervlakte of ruimte waar de vloer komt', 'Gewenste planning en contactvoorkeur'],
    voorbeelden: ['Bewoner die de bestaande vloer in de woonkamer wil vervangen door een visgraatpatroon', 'Verhuizer die de hele woning van dezelfde vloer wil voorzien', 'Huiseigenaar die twijfelt tussen laminaat en PVC voor de begane grond'],
    waarom: 'Een vloer bepaalt de uitstraling van een ruimte voor lange tijd, dus kopers nemen de tijd om materiaal en leverancier te vergelijken. Wie de aanvraag als eerste ontvangt, kan een showroombezoek of opmeting plannen op het moment dat de interesse het hoogst is. Doordat materiaal en oppervlakte al bekend zijn, kan de zaak direct een indicatie geven.',
    faq: [
      { q: 'Krijg ik een vloerenlead exclusief?', a: 'Ja. Een aanvraag gaat naar één vloerenspecialist. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
      { q: 'Uit welke regio komen de aanvragen?', a: 'U geeft bij aanmelding de postcodegebieden op die u bedient. Alleen aanvragen uit die gebieden worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'hoveniers',
    naam: 'hoveniers',
    titel: 'Hovenierleads kopen',
    doelgroep: 'hoveniersbedrijven en tuinontwerpers',
    emoji: '🌳',
    groep: 'Wonen & verbouwen',
    type: 'beide',
    status: 'in-opbouw',
    intro: 'Particulieren en bedrijven die hun tuin willen laten aanleggen of onderhouden, vragen online een offerte aan met de omvang van de tuin en de gewenste werkzaamheden. Die aanvraag wordt exclusief doorgezet naar één hoveniersbedrijf in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats van het project', 'Particulier of zakelijk', 'Gewenste werkzaamheden: aanleg, onderhoud of ontwerp', 'Gewenste planning en contactvoorkeur'],
    voorbeelden: ['Huiseigenaar die de achtertuin volledig opnieuw wil laten aanleggen', 'Vve die het groenonderhoud van een gemeenschappelijke tuin wil uitbesteden', 'Bedrijf dat de buitenruimte bij een nieuw pand wil laten inrichten'],
    waarom: 'Tuinaanleg en -onderhoud worden meestal gepland rond het groeiseizoen, waardoor de aanvrager op zoek is naar een hovenier die op korte termijn kan starten. Wie de aanvraag als eerste ontvangt, kan een schouw inplannen voordat de klant een ander bedrijf belt. Doordat de gewenste werkzaamheden al bekend zijn, kan het gesprek direct over de invulling gaan.',
    faq: [
      { q: 'Gaat het om particuliere of zakelijke tuinen?', a: 'Beide. Bij aanmelding geeft u aan of u particuliere aanvragen, zakelijke aanvragen of allebei wilt ontvangen.' },
      { q: 'Krijg ik een hovenierlead exclusief?', a: 'Ja. Een aanvraag gaat naar één hoveniersbedrijf. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
    ],
  },
  {
    slug: 'verhuisbedrijven',
    naam: 'verhuisbedrijven',
    titel: 'Verhuisleads kopen',
    doelgroep: 'verhuisbedrijven particulier en zakelijk',
    emoji: '🚚',
    groep: 'Wonen & verbouwen',
    type: 'beide',
    status: 'in-opbouw',
    intro: 'Mensen en bedrijven die gaan verhuizen, vragen kort voor de verhuisdatum een offerte aan bij meerdere verhuisbedrijven. De aanvraag bevat de vertrek- en aankomstlocatie, de gewenste datum en de omvang van de verhuizing, en wordt exclusief doorgezet naar één verhuisbedrijf.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Vertreklocatie en aankomstlocatie', 'Particulier of zakelijk', 'Omvang: aantal kamers of bedrijfsomvang', 'Gewenste verhuisdatum en contactvoorkeur'],
    voorbeelden: ['Gezin dat naar een andere stad verhuist en de hele inboedel wil laten vervoeren', 'Student die een studio wil laten verhuizen op een vaste datum', 'Bedrijf dat naar een ander kantoorpand verhuist en apparatuur wil laten meenemen'],
    waarom: 'Een verhuizing heeft een vaste datum, waardoor de aanvrager snel een bedrijf zoekt dat op die datum kan inplannen. Wie de aanvraag als eerste ontvangt, kan de planning direct bevestigen voordat de klant een ander bedrijf belt. Doordat locatie en omvang al bekend zijn, kan de offerte snel worden opgesteld.',
    faq: [
      { q: 'Gaat het om particuliere of zakelijke verhuizingen?', a: 'Beide. Bij aanmelding geeft u aan of u particuliere aanvragen, zakelijke aanvragen of allebei wilt ontvangen.' },
      { q: 'Krijg ik een verhuislead exclusief?', a: 'Ja. Een aanvraag gaat naar één verhuisbedrijf. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
    ],
  },
  {
    slug: 'zonnepanelen',
    naam: 'zonnepaneleninstallateurs',
    titel: 'Zonnepanelenleads kopen',
    doelgroep: 'installateurs van zonnepanelen en thuisbatterijen',
    emoji: '☀️',
    groep: 'Energie & verduurzaming',
    type: 'beide',
    status: 'in-opbouw',
    intro: 'Huiseigenaren en bedrijven die zonnepanelen of een thuisbatterij overwegen, vragen online een opname aan met het type dak en het gewenste systeem. Die aanvraag wordt gecontroleerd en exclusief doorgezet naar één installateur in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats van het project', 'Particulier of zakelijk', 'Type dak en oriëntatie', 'Gewenst systeem: zonnepanelen, thuisbatterij of beide'],
    voorbeelden: ['Huiseigenaar die het platte dak van de garage wil benutten voor zonnepanelen', 'Bedrijf dat het dak van een bedrijfspand vol wil leggen', 'Bewoner die naast panelen ook een thuisbatterij overweegt'],
    waarom: 'De keuze voor zonnepanelen hangt af van dakoriëntatie en het gewenste systeem, waardoor kopers een opname op locatie willen voordat ze kiezen. Wie de aanvraag als eerste ontvangt, kan die opname inplannen voordat de klant een andere installateur benadert. Doordat het type dak al bekend is, kan de installateur zich gericht voorbereiden.',
    faq: [
      { q: 'Gaat het om particuliere of zakelijke daken?', a: 'Beide. Bij aanmelding geeft u aan of u particuliere aanvragen, zakelijke aanvragen of allebei wilt ontvangen.' },
      { q: 'Krijg ik een zonnepanelenlead exclusief?', a: 'Ja. Een aanvraag gaat naar één installateur. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
    ],
  },
  {
    slug: 'warmtepompen',
    naam: 'warmtepompinstallateurs',
    titel: 'Warmtepompleads kopen',
    doelgroep: 'installateurs van warmtepompen en hybride systemen',
    emoji: '🌡️',
    groep: 'Energie & verduurzaming',
    type: 'b2c',
    status: 'in-opbouw',
    intro: 'Huiseigenaren die van het gas af willen of hun cv-ketel willen vervangen, oriënteren zich op het type warmtepomp dat bij hun woning past. De aanvraag bevat het huidige verwarmingssysteem en het type woning, en wordt exclusief doorgezet naar één installateur in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats van het project', 'Huidig verwarmingssysteem', 'Type woning en bouwjaar', 'Gewenste planning en contactvoorkeur'],
    voorbeelden: ['Huiseigenaar die de oude cv-ketel wil vervangen door een hybride warmtepomp', 'Bewoner van een vrijstaande woning die volledig van het gas af wil', 'Verbouwer die de warmtepomp meeneemt in een bredere verduurzaming'],
    waarom: 'De keuze voor een warmtepomp hangt sterk af van het huidige systeem en het type woning, waardoor een opname op locatie nodig is voordat een offerte kan worden opgesteld. Wie de aanvraag als eerste ontvangt, kan die opname inplannen voordat de klant een andere installateur benadert. Doordat het huidige systeem al bekend is, kan het gesprek direct over de mogelijkheden gaan.',
    faq: [
      { q: 'Krijg ik een warmtepomplead exclusief?', a: 'Ja. Een aanvraag gaat naar één installateur. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
      { q: 'Uit welke regio komen de aanvragen?', a: 'U geeft bij aanmelding de postcodegebieden op die u bedient. Alleen aanvragen uit die gebieden worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'isolatie',
    naam: 'isolatiebedrijven',
    titel: 'Isolatieleads kopen',
    doelgroep: 'isolatiebedrijven (spouw, dak, vloer)',
    emoji: '🧱',
    groep: 'Energie & verduurzaming',
    type: 'b2c',
    status: 'in-opbouw',
    intro: 'Huiseigenaren die hun woning willen isoleren, weten vaak niet precies welk type isolatie het meeste oplevert en vragen daarom een opname aan. De aanvraag bevat het bouwjaar van de woning en het gewenste type isolatie, en wordt exclusief doorgezet naar één isolatiebedrijf in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats van het project', 'Bouwjaar van de woning', 'Gewenst type isolatie: spouw, dak of vloer', 'Gewenste planning en contactvoorkeur'],
    voorbeelden: ['Bewoner van een jaren-60-woning die de spouwmuur wil laten isoleren', 'Huiseigenaar die het dak wil naisoleren voor een lagere energierekening', 'Verbouwer die vloerisolatie combineert met andere verduurzaming'],
    waarom: 'Isoleren is voor veel huiseigenaren een eerste stap richting verduurzaming, maar het juiste type isolatie hangt af van bouwjaar en huidige situatie. Wie de aanvraag als eerste ontvangt, kan een opname inplannen voordat de klant een ander bedrijf belt. Doordat het bouwjaar al bekend is, kan het bedrijf zich gericht voorbereiden.',
    faq: [
      { q: 'Krijg ik een isolatielead exclusief?', a: 'Ja. Een aanvraag gaat naar één isolatiebedrijf. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
      { q: 'Uit welke regio komen de aanvragen?', a: 'U geeft bij aanmelding de postcodegebieden op die u bedient. Alleen aanvragen uit die gebieden worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'laadpalen',
    naam: 'laadpaalinstallateurs',
    titel: 'Laadpaalleads kopen',
    doelgroep: 'installateurs van laadpalen thuis en zakelijk',
    emoji: '🔌',
    groep: 'Energie & verduurzaming',
    type: 'beide',
    status: 'in-opbouw',
    intro: 'Particulieren en bedrijven die een elektrische auto aanschaffen, zoeken vaak tegelijk naar een installateur voor een laadpaal thuis of op de zaak. De aanvraag bevat de locatie en de gewenste situatie, en wordt exclusief doorgezet naar één installateur in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats van het project', 'Particulier of zakelijk', 'Locatie: eigen oprit, garage of bedrijfsterrein', 'Gewenste planning en contactvoorkeur'],
    voorbeelden: ['Huiseigenaar die een laadpaal bij de oprit wil laten plaatsen na aanschaf van een elektrische auto', 'Bedrijf dat meerdere laadpunten op het bedrijfsterrein wil laten installeren', 'Bewoner van een appartement die de mogelijkheden voor een laadpaal in de garage wil laten bekijken'],
    waarom: 'De installatie van een laadpaal hangt samen met de aanschaf van een elektrische auto en heeft daardoor vaak haast. Wie de aanvraag als eerste ontvangt, kan een opname en planning voorstellen voordat de klant een andere installateur benadert. Doordat de locatie al bekend is, kan de installateur direct inschatten wat het werk vraagt.',
    faq: [
      { q: 'Gaat het om particuliere of zakelijke aanvragen?', a: 'Beide. Bij aanmelding geeft u aan of u particuliere aanvragen, zakelijke aanvragen of allebei wilt ontvangen.' },
      { q: 'Krijg ik een laadpaallead exclusief?', a: 'Ja. Een aanvraag gaat naar één installateur. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
    ],
  },
  {
    slug: 'marketingbureaus',
    naam: 'marketingbureaus',
    titel: 'Leads kopen voor marketingbureaus',
    doelgroep: 'marketing-, SEO- en webbureaus',
    emoji: '📣',
    groep: 'Zakelijke dienstverlening',
    type: 'b2b',
    status: 'in-opbouw',
    intro: 'Ondernemers die hun online vindbaarheid of website willen verbeteren, zoeken een bureau dat bij hun branche en budget past. Wij vangen die vraag op met een korte intake — huidige situatie, gewenste dienst, budgetindicatie — en zetten de aanvraag exclusief door naar één bureau in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Bedrijfsnaam en branche', 'Gewenste dienst: SEO, website, advertenties of content', 'Huidige situatie: bestaande website of geen', 'Regio en contactvoorkeur'],
    voorbeelden: ['Lokale ondernemer die voor het eerst een website wil laten bouwen', 'Webshop die de vindbaarheid in zoekmachines wil verbeteren', 'Dienstverlener die zijn huidige bureau wil vervangen wegens gebrek aan resultaat'],
    waarom: 'Ondernemers die een bureau zoeken, vergelijken meestal enkele partijen op basis van portfolio en aanpak, en kiezen vaak degene die als eerste met een concreet voorstel komt. Doordat de intake de gewenste dienst en huidige situatie al bevat, kan uw accountmanager het gesprek direct op de juiste aanpak richten. Zo wint u tijd ten opzichte van bureaus die pas bij het eerste gesprek de situatie in kaart brengen.',
    faq: [
      { q: 'Zijn dit zakelijke aanvragen?', a: 'Ja. De aanvrager is een ondernemer of bedrijf dat een marketingbureau zoekt.' },
      { q: 'Kan ik me beperken tot een dienst of branche?', a: 'Ja. U geeft bij aanmelding aan welke diensten, branches en regio\'s u bedient; alleen passende aanvragen worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'it-diensten',
    naam: 'IT-dienstverleners',
    titel: 'Leads kopen voor IT-dienstverleners',
    doelgroep: 'IT-beheer, cloud en cybersecurity voor het MKB',
    emoji: '💻',
    groep: 'Zakelijke dienstverlening',
    type: 'b2b',
    status: 'in-opbouw',
    intro: 'MKB-bedrijven die hun IT willen uitbesteden of hun huidige leverancier willen vervangen, zoeken een partij die bij hun omvang en systemen past. De intake vraagt naar bedrijfsomvang, huidige situatie en gewenste dienst, en zet de aanvraag exclusief door naar één IT-dienstverlener in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Bedrijfsnaam en aantal medewerkers', 'Huidige situatie: eigen beheer of bestaande leverancier', 'Gewenste dienst: beheer, cloud of cybersecurity', 'Regio en contactvoorkeur'],
    voorbeelden: ['Groeiend bedrijf dat IT-beheer voor het eerst wil uitbesteden', 'Kantoor dat overstapt omdat de huidige leverancier traag reageert op storingen', 'Bedrijf dat een cybersecurity-check wil laten uitvoeren na een incident bij een branchegenoot'],
    waarom: 'IT-beheer is vertrouwenswerk waarbij bedrijven kiezen op basis van reactiesnelheid en kennis van hun systemen, en de leverancier die als eerste een helder voorstel doet, heeft een voorsprong. Doordat de intake bedrijfsomvang en huidige situatie al bevat, kan uw team het gesprek direct op een passend beheerpakket richten. Zo hoeft u niet eerst een verkennend gesprek te plannen om de basis in kaart te brengen.',
    faq: [
      { q: 'Zijn dit zakelijke aanvragen?', a: 'Ja. De aanvrager is een bedrijf dat IT-beheer, cloud- of cybersecuritydiensten zoekt. Particuliere aanvragen nemen wij niet op.' },
      { q: 'Kan ik me beperken tot een dienst of bedrijfsomvang?', a: 'Ja. U geeft bij aanmelding aan welke diensten en bedrijfsgroottes u bedient; alleen passende aanvragen worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'schoonmaakbedrijven',
    naam: 'schoonmaakbedrijven',
    titel: 'Leads kopen voor schoonmaakbedrijven',
    doelgroep: 'schoonmaakbedrijven voor kantoren en bedrijfspanden',
    emoji: '🧹',
    groep: 'Zakelijke dienstverlening',
    type: 'b2b',
    status: 'in-opbouw',
    intro: 'Bedrijven die de schoonmaak van hun kantoor of bedrijfspand willen uitbesteden of van leverancier willen wisselen, vragen online een offerte aan. De intake vraagt naar het type pand, de oppervlakte en de gewenste frequentie, en zet de aanvraag exclusief door naar één schoonmaakbedrijf in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Bedrijfsnaam en type pand', 'Oppervlakte of aantal ruimtes', 'Gewenste frequentie: dagelijks, wekelijks of anders', 'Regio en contactvoorkeur'],
    voorbeelden: ['Kantoor dat wekelijkse schoonmaak wil laten verzorgen na een verhuizing', 'Bedrijfspand dat overstapt omdat de huidige schoonmaker onbetrouwbaar is', 'Praktijk die dagelijkse schoonmaak van behandelruimtes zoekt'],
    waarom: 'Schoonmaakcontracten lopen meestal voor langere tijd, waardoor een nieuwe klant een stabiele bron van terugkerende omzet is. Bedrijven kiezen vaak voor de partij die als eerste een passende offerte stuurt, zeker bij een gedwongen overstap. Doordat oppervlakte en frequentie al bekend zijn, kan de offerte snel en gericht worden opgesteld.',
    faq: [
      { q: 'Zijn dit zakelijke aanvragen?', a: 'Ja. De aanvrager is een bedrijf dat schoonmaak van een kantoor of bedrijfspand zoekt. Particuliere huishoudens nemen wij niet op.' },
      { q: 'Kan ik me beperken tot een regio of pandtype?', a: 'Ja. U geeft bij aanmelding aan welke regio\'s en pandtypes u bedient; alleen passende aanvragen worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'beveiliging',
    naam: 'beveiligingsbedrijven',
    titel: 'Leads kopen voor beveiligingsbedrijven',
    doelgroep: 'installateurs van alarm-, camera- en toegangssystemen',
    emoji: '🔐',
    groep: 'Zakelijke dienstverlening',
    type: 'beide',
    status: 'in-opbouw',
    intro: 'Particulieren en bedrijven die een alarmsysteem, camerabeveiliging of toegangscontrole willen laten installeren, vragen online een opname aan. De intake vraagt naar het type pand en het gewenste systeem, en zet de aanvraag exclusief door naar één beveiligingsbedrijf in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats van het project', 'Particulier of zakelijk', 'Type pand: woning, kantoor of bedrijfspand', 'Gewenst systeem: alarm, camera of toegangscontrole'],
    voorbeelden: ['Huiseigenaar die een alarmsysteem wil laten installeren na een inbraak in de buurt', 'Bedrijf dat cameratoezicht bij de ingang van het pand wil laten plaatsen', 'Kantoor dat toegangscontrole met pasjes wil invoeren'],
    waarom: 'De vraag naar beveiliging ontstaat vaak naar aanleiding van een concrete aanleiding, waardoor de aanvrager snel een installateur zoekt die kan opnemen en adviseren. Wie de aanvraag als eerste ontvangt, kan die opname inplannen voordat de klant een ander bedrijf belt. Doordat het type pand en gewenste systeem al bekend zijn, kan het advies gerichter worden voorbereid.',
    faq: [
      { q: 'Gaat het om particuliere of zakelijke aanvragen?', a: 'Beide. Bij aanmelding geeft u aan of u particuliere aanvragen, zakelijke aanvragen of allebei wilt ontvangen.' },
      { q: 'Krijg ik een beveiligingslead exclusief?', a: 'Ja. Een aanvraag gaat naar één beveiligingsbedrijf. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
    ],
  },
  {
    slug: 'hypotheekadviseurs',
    naam: 'hypotheekadviseurs',
    titel: 'Hypotheekleads kopen',
    doelgroep: 'onafhankelijke hypotheekadviseurs',
    emoji: '🏦',
    groep: 'Financieel & juridisch',
    type: 'b2c',
    status: 'in-opbouw',
    intro: 'Mensen die een eerste huis kopen, hun hypotheek willen oversluiten of gaan verhuizen, zoeken een onafhankelijke adviseur voordat ze in gesprek gaan met een bank. De intake vraagt alleen naar de situatie en gewenste regio, zonder inkomens- of financieringsdetails, en zet de aanvraag exclusief door naar één hypotheekadviseur.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Situatie: starter, oversluiten of verhuizen', 'Gewenste regio voor het adviesgesprek', 'Gewenste planning voor een eerste gesprek', 'Contactvoorkeur'],
    voorbeelden: ['Starter die zich oriënteert op de mogelijkheden voor een eerste hypotheek', 'Huiseigenaar die wil onderzoeken of oversluiten voordeliger uitpakt', 'Gezin dat gaat verhuizen en de bestaande hypotheek wil laten meenemen'],
    waarom: 'Een hypotheekadvies is een keuze voor de lange termijn, waardoor mensen liever met een adviseur in gesprek gaan die snel en persoonlijk reageert. Wie de aanvraag als eerste ontvangt, kan een eerste gesprek inplannen voordat de aanvrager een andere adviseur benadert. De intake bevat bewust geen inkomens- of financieringsgegevens: die bespreekt u zelf in het adviesgesprek.',
    faq: [
      { q: 'Vraagt de intake naar inkomen of financiële gegevens?', a: 'Nee. De intake bevat alleen de situatie (starter, oversluiten of verhuizen), de gewenste regio en contactgegevens. Financiële details bespreekt u zelf in het adviesgesprek.' },
      { q: 'Krijg ik een hypotheeklead exclusief?', a: 'Ja. Een aanvraag gaat naar één hypotheekadviseur. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
    ],
  },
  {
    slug: 'advocaten',
    naam: 'advocaten',
    titel: 'Leads kopen voor advocaten',
    doelgroep: 'advocatenkantoren en juridisch adviseurs',
    emoji: '⚖️',
    groep: 'Financieel & juridisch',
    type: 'beide',
    status: 'in-opbouw',
    intro: 'Particulieren en bedrijven die juridisch advies zoeken, willen eerst weten of een kantoor het juiste rechtsgebied behandelt voordat ze details van hun zaak delen. De intake vraagt daarom alleen naar het rechtsgebied en contactgegevens, zonder inhoud van de zaak, en zet de aanvraag exclusief door naar één advocatenkantoor in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Particulier of zakelijk', 'Rechtsgebied: bijvoorbeeld arbeidsrecht, huurrecht of ondernemingsrecht', 'Gewenste regio voor het gesprek', 'Contactvoorkeur'],
    voorbeelden: ['Werknemer die advies zoekt over een arbeidsrechtelijk geschil met de werkgever', 'Verhuurder die een vraag heeft over huurrecht bij een lopend huurcontract', 'Ondernemer die juridische ondersteuning zoekt bij een zakelijk geschil'],
    waarom: 'Mensen die juridisch advies zoeken, willen snel een kantoor spreken dat hun rechtsgebied behandelt, en kiezen vaak degene die als eerste reageert. De intake bevat bewust geen inhoud van de zaak: de aanvrager deelt dat pas in het gesprek met uw kantoor. Zo weet u alleen het rechtsgebied en de regio vooraf, en bepaalt u zelf hoe het intakegesprek verloopt.',
    faq: [
      { q: 'Deelt de aanvrager details van de zaak?', a: 'Nee. De intake vraagt alleen naar het rechtsgebied en contactgegevens. Inhoudelijke details van de zaak bespreekt de aanvrager rechtstreeks met uw kantoor.' },
      { q: 'Kan ik me beperken tot bepaalde rechtsgebieden?', a: 'Ja. U geeft bij aanmelding aan welke rechtsgebieden en regio\'s u behandelt; alleen passende aanvragen worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'autobedrijven',
    naam: 'autobedrijven',
    titel: 'Leads kopen voor autobedrijven',
    doelgroep: 'autobedrijven, occasiondealers en leasepartijen',
    emoji: '🚗',
    groep: 'Auto & mobiliteit',
    type: 'b2c',
    status: 'in-opbouw',
    intro: 'Consumenten die een andere auto zoeken, oriënteren zich online op merk, type en budget voordat ze een showroom bezoeken. De intake vraagt naar het gewenste type auto en de situatie, en zet de aanvraag exclusief door naar één autobedrijf in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats', 'Gewenst merk of type auto', 'Situatie: aankoop, inruil of lease', 'Gewenste planning en contactvoorkeur'],
    voorbeelden: ['Huishouden dat de huidige auto wil inruilen voor een ruimere gezinsauto', 'Starter die voor het eerst een auto op lease overweegt', 'Koper die op zoek is naar een specifiek merk en bouwjaar'],
    waarom: 'Een auto kopen is een aankoop waarbij mensen enkele opties naast elkaar leggen voordat ze een showroom bezoeken. Wie de aanvraag als eerste ontvangt, kan een passend aanbod voorstellen voordat de klant elders kijkt. Doordat het gewenste type en de situatie al bekend zijn, kan het gesprek direct over concrete opties gaan.',
    faq: [
      { q: 'Krijg ik een autolead exclusief?', a: 'Ja. Een aanvraag gaat naar één autobedrijf. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
      { q: 'Kan ik me beperken tot een merk of type auto?', a: 'Ja. U geeft bij aanmelding aan op welke merken of type auto\'s u zich richt; alleen passende aanvragen worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'autoschade',
    naam: 'autoschadeherstellers',
    titel: 'Autoschadeleads kopen',
    doelgroep: 'schadeherstelbedrijven',
    emoji: '🔧',
    groep: 'Auto & mobiliteit',
    type: 'b2c',
    status: 'in-opbouw',
    intro: 'Automobilisten die schade aan hun auto willen laten herstellen, zoeken online een schadeherstelbedrijf in de buurt. De intake vraagt naar het type schade en het merk van de auto, en zet de aanvraag exclusief door naar één schadeherstelbedrijf in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats', 'Merk en bouwjaar van de auto', 'Type schade: parkeerschade, deukje of aanrijding', 'Gewenste planning en contactvoorkeur'],
    voorbeelden: ['Automobilist met parkeerschade die snel een afspraak wil maken', 'Bestuurder die na een aanrijding de schade wil laten beoordelen', 'Eigenaar die een deukje zonder lakschade wil laten uitdeuken'],
    waarom: 'Schadeherstel heeft vaak haast, omdat de auto dagelijks nodig is en de klant snel een werkplaats zoekt die kan inplannen. Wie de aanvraag als eerste ontvangt, kan direct een afspraak voorstellen voordat de klant een ander bedrijf belt. Doordat het type schade al bekend is, kan de werkplaats de doorlooptijd beter inschatten.',
    faq: [
      { q: 'Krijg ik een autoschadelead exclusief?', a: 'Ja. Een aanvraag gaat naar één schadeherstelbedrijf. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
      { q: 'Uit welke regio komen de aanvragen?', a: 'U geeft bij aanmelding de postcodegebieden op die u bedient. Alleen aanvragen uit die gebieden worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'rijscholen',
    naam: 'rijscholen',
    titel: 'Leads kopen voor rijscholen',
    doelgroep: 'rijscholen en rijopleiders',
    emoji: '🚘',
    groep: 'Auto & mobiliteit',
    type: 'b2c',
    status: 'in-opbouw',
    intro: 'Mensen die willen leren rijden of van rijschool willen wisselen, vergelijken online enkele rijscholen in hun buurt. De intake vraagt naar het gewenste lestype en de gewenste lestijden, en zet de aanvraag exclusief door naar één rijschool in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats', 'Gewenst lestype: los, pakket of spoedcursus', 'Gewenste lestijden: doordeweeks, avond of weekend', 'Contactvoorkeur'],
    voorbeelden: ['Achttienjarige die net is begonnen met rijlessen en een pakket zoekt', 'Bijrijder die van rijschool wisselt wegens een volle planning', 'Werkende die alleen in het weekend tijd heeft voor lessen'],
    waarom: 'Wie op zoek is naar een rijschool, kiest vaak voor de school die als eerste reageert en lestijden kan bieden die aansluiten bij het rooster van de leerling. Wie de aanvraag als eerste ontvangt, kan een intakeles voorstellen voordat de leerling een andere rijschool belt. Doordat de gewenste lestijden al bekend zijn, kan de planning direct worden afgestemd.',
    faq: [
      { q: 'Krijg ik een rijschoollead exclusief?', a: 'Ja. Een aanvraag gaat naar één rijschool. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
      { q: 'Uit welke regio komen de aanvragen?', a: 'U geeft bij aanmelding de postcodegebieden op die u bedient. Alleen aanvragen uit die gebieden worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'catering',
    naam: 'cateraars',
    titel: 'Cateringleads kopen',
    doelgroep: 'cateraars en partyservices',
    emoji: '🍽️',
    groep: 'Horeca & events',
    type: 'beide',
    status: 'in-opbouw',
    intro: 'Particulieren en bedrijven die catering zoeken voor een feest, vergadering of bedrijfsevenement, vragen online een offerte aan met het type gelegenheid en het gewenste aantal gasten. Die aanvraag wordt exclusief doorgezet naar één cateraar in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats van het evenement', 'Type gelegenheid: feest, vergadering of bedrijfsevenement', 'Gewenst aantal gasten', 'Datum en contactvoorkeur'],
    voorbeelden: ['Gezin dat catering zoekt voor een verjaardagsfeest bij hen thuis', 'Bedrijf dat een lunch wil laten verzorgen bij een vergadering op locatie', 'Organisator die catering zoekt voor een bedrijfsborrel'],
    waarom: 'Catering wordt geboekt rond een vaste datum, waardoor de aanvrager op zoek is naar een cateraar die op die datum kan inplannen. Wie de aanvraag als eerste ontvangt, kan een passend menu voorstellen voordat de klant een andere cateraar benadert. Doordat het aantal gasten en het type gelegenheid al bekend zijn, kan de offerte snel worden opgesteld.',
    faq: [
      { q: 'Gaat het om particuliere of zakelijke aanvragen?', a: 'Beide. Bij aanmelding geeft u aan of u particuliere aanvragen, zakelijke aanvragen of allebei wilt ontvangen.' },
      { q: 'Krijg ik een cateringlead exclusief?', a: 'Ja. Een aanvraag gaat naar één cateraar. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
    ],
  },
  {
    slug: 'trouwlocaties',
    naam: 'trouwlocaties',
    titel: 'Leads kopen voor trouwlocaties',
    doelgroep: 'trouw- en feestlocaties',
    emoji: '💍',
    groep: 'Horeca & events',
    type: 'b2c',
    status: 'in-opbouw',
    intro: 'Aanstaande bruidsparen die een locatie zoeken voor hun trouwdag, bezoeken meerdere locaties voordat ze kiezen. De intake vraagt naar de gewenste periode en het aantal gasten, en zet de aanvraag exclusief door naar één trouwlocatie in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Postcode en plaats van de gewenste locatie', 'Gewenste periode of seizoen', 'Verwacht aantal gasten', 'Contactvoorkeur'],
    voorbeelden: ['Bruidspaar dat een locatie zoekt voor een ceremonie en feest op één plek', 'Stel dat een buitenlocatie overweegt voor een kleinschalige trouwerij', 'Bruidspaar dat meerdere locaties wil bezichtigen voordat ze een keuze maken'],
    waarom: 'Bruidsparen boeken hun locatie vaak ruim vooraf en bezichtigen daarbij enkele opties, waardoor de locatie die als eerste een bezichtiging aanbiedt een streepje voor heeft. Doordat de gewenste periode en het aantal gasten al bekend zijn, kan de locatie meteen laten weten of de datum vrij is. Dat scheelt over-en-weer mailen voordat er een bezichtiging wordt gepland.',
    faq: [
      { q: 'Krijg ik een trouwlocatielead exclusief?', a: 'Ja. Een aanvraag gaat naar één trouwlocatie. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
      { q: 'Uit welke regio komen de aanvragen?', a: 'U geeft bij aanmelding de postcodegebieden op die u bedient. Alleen aanvragen uit die gebieden worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'opleidingen',
    naam: 'opleiders',
    titel: 'Leads kopen voor opleiders',
    doelgroep: 'opleidingsinstituten en cursusaanbieders',
    emoji: '🎓',
    groep: 'Opleiding & coaching',
    type: 'beide',
    status: 'in-opbouw',
    intro: 'Particulieren en bedrijven die een opleiding of cursus zoeken, vergelijken online enkele aanbieders op inhoud en vorm. De intake vraagt naar het gewenste vakgebied en de vorm van de opleiding, en zet de aanvraag exclusief door naar één opleider in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Particulier of zakelijk (via werkgever)', 'Gewenst vakgebied of opleiding', 'Vorm: klassikaal, online of hybride', 'Contactvoorkeur'],
    voorbeelden: ['Werknemer die via de werkgever een vakopleiding wil volgen', 'Particulier die een cursus zoekt om van loopbaan te veranderen', 'Bedrijf dat een training voor meerdere medewerkers wil inkopen'],
    waarom: 'Wie een opleiding zoekt, vergelijkt meestal enkele aanbieders op inhoud, vorm en beschikbare startdata, en kiest vaak degene die als eerste duidelijkheid geeft. Wie de aanvraag als eerste ontvangt, kan het passende programma voorstellen voordat de aanvrager elders informeert. Doordat het gewenste vakgebied al bekend is, kan het gesprek direct over de inhoud gaan.',
    faq: [
      { q: 'Gaat het om particuliere of zakelijke aanvragen?', a: 'Beide. Bij aanmelding geeft u aan of u particuliere aanvragen, zakelijke aanvragen (via werkgevers) of allebei wilt ontvangen.' },
      { q: 'Kan ik me beperken tot een vakgebied?', a: 'Ja. U geeft bij aanmelding aan op welke vakgebieden en opleidingsvormen u zich richt; alleen passende aanvragen worden aan u toegewezen.' },
    ],
  },
  {
    slug: 'coaches',
    naam: 'coaches',
    titel: 'Leads kopen voor coaches',
    doelgroep: 'business- en loopbaancoaches',
    emoji: '🧭',
    groep: 'Opleiding & coaching',
    type: 'beide',
    status: 'in-opbouw',
    intro: 'Particulieren en ondernemers die een coach zoeken voor loopbaan- of businessvragen, oriënteren zich online op aanpak en specialisatie. De intake vraagt naar het gewenste type coaching en de situatie, en zet de aanvraag exclusief door naar één coach in de regio.',
    velden: ['Naam, e-mailadres en telefoonnummer', 'Particulier of zakelijk', 'Gewenst type coaching: loopbaan of business', 'Korte situatie: bijvoorbeeld heroriëntatie of groeivraag', 'Contactvoorkeur'],
    voorbeelden: ['Werknemer die zich wil heroriënteren op zijn loopbaan', 'Zelfstandig ondernemer die begeleiding zoekt bij de groei van zijn bedrijf', 'Leidinggevende die coaching zoekt bij een nieuwe rol'],
    waarom: 'Coaching is een persoonlijke keuze waarbij de klik met de coach net zo belangrijk is als de aanpak, waardoor mensen vaak een kennismakingsgesprek plannen bij de eerste coach die reageert. Wie de aanvraag als eerste ontvangt, kan die kennismaking voorstellen voordat de aanvrager een andere coach benadert. Doordat het gewenste type coaching al bekend is, kan het gesprek gericht worden voorbereid.',
    faq: [
      { q: 'Gaat het om particuliere of zakelijke aanvragen?', a: 'Beide. Bij aanmelding geeft u aan of u particuliere aanvragen, zakelijke aanvragen of allebei wilt ontvangen.' },
      { q: 'Kan ik me beperken tot een type coaching?', a: 'Ja. U geeft bij aanmelding aan op welk type coaching en welke doelgroep u zich richt; alleen passende aanvragen worden aan u toegewezen.' },
    ],
  },
];

export function leadSectorBySlug(slug: string): LeadSector | undefined {
  return LEAD_SECTORS.find((s) => s.slug === slug);
}

export function leadSectorsPerGroep(): { groep: string; sectoren: LeadSector[] }[] {
  return LEAD_GROEPEN.map((groep) => ({ groep, sectoren: LEAD_SECTORS.filter((s) => s.groep === groep) })).filter((g) => g.sectoren.length > 0);
}

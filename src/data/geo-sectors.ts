// Sector-specifieke GEO (AI-vindbaarheid) content. Rijke, onderscheidende data
// per sector — gerendert door src/pages/ai-vindbaarheid/voor-[sector].astro.
// Geen verzonnen claims; alle voorbeeld-queries zijn illustratief.

export interface GeoSector {
  slug: string;
  naam: string;
  titel: string;
  emoji: string;
  intro: string;
  queries: string[];
  waarom: string;
  faq: { q: string; a: string }[];
}

export const GEO_SECTORS: GeoSector[] = [
  {
    slug: 'horeca',
    naam: 'horeca',
    titel: 'GEO voor de horeca',
    emoji: '🍽️',
    intro: 'Gasten plannen hun avond steeds vaker met een AI-assistent in plaats van met Google. Ze vragen ChatGPT of Gemini direct om een restaurant-aanbeveling — en de AI noemt er maar een paar. Voor restaurants, cafes en cateraars bepaalt AI-vindbaarheid (GEO) of je in dat lijstje staat.',
    queries: [
      'beste restaurant voor een zakelijk diner in [stad]',
      'welk restaurant in [stad] heeft goede glutenvrije of vegan opties?',
      'waar kan ik vanavond nog last-minute een tafel reserveren in [stad]?',
    ],
    waarom: 'In de horeca draait alles om lokale aanbeveling op het juiste moment. Waar gasten vroeger op reviews en Google Maps leunden, vragen ze nu een AI om een concreet advies. Een restaurant dat in ChatGPT als aanbeveling verschijnt, vangt de gast precies op het beslismoment — vaak nog voor de concurrent in beeld komt. Sleutels: kloppende NAP-gegevens (naam, adres, openingstijden), reviews, menu-informatie en gestructureerde data die een AI kan lezen.',
    faq: [
      { q: 'Hoe word mijn restaurant aanbevolen door ChatGPT?', a: 'Zorg dat je openingstijden, adres, keuken-type en menu-informatie consistent en gestructureerd online staan, geef AI-crawlers toegang via je robots.txt en bouw reviews en vermeldingen op. Hoe betrouwbaarder en consistenter je online aanwezigheid, hoe groter de kans dat een AI je noemt bij een horeca-vraag.' },
      { q: 'Telt mijn Google-review-score mee voor AI-aanbevelingen?', a: 'Ja, indirect. Reviews zijn een vertrouwenssignaal waar AI-assistenten op leunen. Een consistente, goed beoordeelde aanwezigheid op review-platforms vergroot de kans dat een AI je als aanbeveling opneemt.' },
    ],
  },
  {
    slug: 'accountancy',
    naam: 'accountancy',
    titel: 'GEO voor accountants',
    emoji: '📊',
    intro: 'Ondernemers zoeken een accountant niet meer alleen via Google of via-via. Steeds vaker vragen ze een AI-assistent: "welk accountantskantoor past bij mijn bedrijf?" De AI geeft een kort advies met enkele namen — en daar wil je tussen staan.',
    queries: [
      'goed accountantskantoor voor het MKB in [stad]',
      'welke accountant is gespecialiseerd in [branche] in [regio]?',
      'accountant die met Twinfield of Exact werkt in [stad]',
    ],
    waarom: 'Accountancy is een vertrouwensdienst waar specialisatie en betrouwbaarheid zwaar wegen. Een AI beveelt het kantoor aan dat duidelijk, consistent en autoritatief online aanwezig is — met heldere informatie over diensten, branches en software-integraties. Kantoren die hun expertise gestructureerd presenteren (schema, heldere dienstpagina-s, vakinhoudelijke content) worden eerder herkend en genoemd dan kantoren met een vage of verouderde site.',
    faq: [
      { q: 'Hoe zorg ik dat AI mijn accountantskantoor aanbeveelt?', a: 'Presenteer je specialisaties, branches en software-integraties (zoals Exact of Twinfield) helder en gestructureerd op je website, met Schema.org-markup. Houd je bedrijfsgegevens consistent en bouw autoriteit op via vakpublicaties en vermeldingen. Zo herkent een AI je als gespecialiseerde, betrouwbare partij.' },
      { q: 'Is GEO relevant als ik vooral via doorverwijzing klanten krijg?', a: 'Ja. Ook doorverwezen prospects checken je tegenwoordig bij een AI voordat ze contact opnemen. Sta je daar sterk en consistent, dan bevestigt dat de doorverwijzing; ben je onzichtbaar of tegenstrijdig, dan zaait dat twijfel.' },
    ],
  },
  {
    slug: 'zorg',
    naam: 'zorg',
    titel: 'GEO voor de zorg',
    emoji: '🏥',
    intro: 'Patienten en clienten gebruiken AI-assistenten om een praktijk of zorgverlener te vinden. Voor huisartsen, tandartsen, fysiotherapeuten en zorginstellingen bepaalt AI-vindbaarheid steeds vaker of nieuwe patienten bij jou of bij een ander uitkomen.',
    queries: [
      'tandarts die nieuwe patienten aanneemt in [stad]',
      'fysiotherapeut gespecialiseerd in [klacht] in [regio]',
      'huisartsenpraktijk met online afspraken in [stad]',
    ],
    waarom: 'In de zorg zoeken mensen vaak met een concrete behoefte: een praktijk die nieuwe patienten aanneemt, een specialisatie, of avond-bereikbaarheid. Een AI beveelt de praktijk aan met de duidelijkste, meest actuele informatie. Tegelijk gelden er strenge eisen: AVG en NEN 7510. Goede AI-vindbaarheid in de zorg betekent dus heldere, gestructureerde praktijkinformatie en een zorgvuldige, compliant aanpak.',
    faq: [
      { q: 'Mag een zorgpraktijk wel inzetten op AI-vindbaarheid?', a: 'Ja. GEO gaat over hoe je publieke praktijkinformatie (specialisaties, openingstijden, aanmeldbeleid) vindbaar maakt voor AI — niet over patientgegevens. Patientdata blijft uiteraard binnen de AVG- en NEN 7510-kaders. Het is puur het beter vindbaar maken van je openbare aanbod.' },
      { q: 'Hoe verschijn ik in AI als praktijk die nieuwe patienten aanneemt?', a: 'Vermeld expliciet en consistent of je nieuwe patienten aanneemt, je specialisaties en je bereikbaarheid, met gestructureerde data. Dat is precies de informatie waar een AI op zoekt bij zorgvragen.' },
    ],
  },
  {
    slug: 'vastgoed',
    naam: 'vastgoed',
    titel: 'GEO voor makelaars',
    emoji: '🏠',
    intro: 'Kopers en verkopers orienteren zich steeds vaker via een AI-assistent voordat ze een makelaar kiezen. "Welke makelaar is goed in [wijk]?" levert een kort AI-advies op met enkele namen — en daar wil je als makelaarskantoor bovenaan staan.',
    queries: [
      'beste makelaar voor verkoop in [wijk of stad]',
      'makelaar gespecialiseerd in [type woning] in [regio]',
      'aankoopmakelaar met goede reviews in [stad]',
    ],
    waarom: 'De makelaardij is lokaal en reputatie-gedreven — precies de signalen waar een AI op leunt. Een kantoor dat duidelijk z\'n werkgebied, specialisaties en reviews presenteert, en dat in directories en op Funda consistent vindbaar is, wordt eerder door een AI aanbevolen. GEO zorgt dat je verschijnt op het moment dat iemand een makelaar zoekt, nog voordat ze op een vergelijkingssite belanden.',
    faq: [
      { q: 'Hoe word ik als makelaar aanbevolen door AI?', a: 'Maak je werkgebied, specialisaties en reviews consistent en gestructureerd vindbaar, geef AI-crawlers toegang en zorg voor heldere, actuele content over je diensten. Lokale autoriteit en betrouwbare vermeldingen vergroten de kans dat een AI je noemt.' },
      { q: 'Vervangt AI-vindbaarheid mijn Funda-aanwezigheid?', a: 'Nee, het is aanvullend. Funda blijft belangrijk, maar steeds meer orientatie gebeurt eerst bij een AI-assistent. Wie daar zichtbaar is, vangt de klant nog vroeger in de zoektocht.' },
    ],
  },
  {
    slug: 'bouw',
    naam: 'bouw en installatie',
    titel: 'GEO voor bouw & installatie',
    emoji: '🏗️',
    intro: 'Wie een aannemer, installateur of loodgieter zoekt, vraagt het steeds vaker direct aan een AI-assistent — vaak met spoed. "Welke installateur kan deze week een warmtepomp plaatsen?" Het AI-antwoord noemt een paar bedrijven, en daar wil je tussen staan.',
    queries: [
      'installateur voor warmtepomp in [regio] op korte termijn',
      'betrouwbare aannemer voor verbouwing in [stad]',
      'loodgieter met spoeddienst in [regio]',
    ],
    waarom: 'In de bouw en installatie telt beschikbaarheid en betrouwbaarheid. Klanten zoeken vaak met urgentie en kiezen het bedrijf dat als eerste, duidelijk en betrouwbaar in beeld komt. Een AI beveelt het bedrijf aan met heldere informatie over werkgebied, specialisaties (zoals warmtepompen of dakwerk) en reviews. Veel installatiebedrijven hebben een verouderde of dunne website — juist daar ligt een grote GEO-kans.',
    faq: [
      { q: 'Hoe kom ik als installatiebedrijf in ChatGPT?', a: 'Zorg dat je specialisaties (bijvoorbeeld warmtepompen, cv of dakwerk), werkgebied en beschikbaarheid duidelijk en gestructureerd op je site staan, met kloppende bedrijfsgegevens en reviews. Geef AI-crawlers toegang. Zo herkent een AI je als relevante, betrouwbare optie.' },
      { q: 'Werkt dit ook als ik vooral met spoedklussen werk?', a: 'Juist dan. Bij spoed zoeken klanten snel en vragen ze een AI om een directe aanbeveling. Vermeld je spoeddienst en bereikbaarheid expliciet, dan kom je bovenaan bij urgente vragen.' },
    ],
  },
  {
    slug: 'advocatuur',
    naam: 'advocatuur',
    titel: 'GEO voor advocaten',
    emoji: '⚖️',
    intro: 'Mensen met een juridische vraag wenden zich steeds vaker eerst tot een AI-assistent: "welke advocaat is goed in [rechtsgebied]?" De AI geeft een kort advies met enkele kantoren — en als advocaat wil je daar deel van uitmaken.',
    queries: [
      'advocaat gespecialiseerd in [rechtsgebied] in [stad]',
      'advocatenkantoor voor arbeidsrecht of familierecht in [regio]',
      'advocaat met gratis intakegesprek in [stad]',
    ],
    waarom: 'De advocatuur is sterk specialisatie-gedreven: een client zoekt iemand met precies de juiste expertise. Een AI beveelt het kantoor aan dat zijn rechtsgebieden, specialisaties en aanpak helder en autoritatief presenteert. Kantoren die hun expertise gestructureerd en consistent online zetten — met vakinhoudelijke content en kloppende gegevens — worden eerder herkend dan kantoren met een algemene, vage profilering.',
    faq: [
      { q: 'Hoe word ik als advocaat aanbevolen door AI-assistenten?', a: 'Presenteer je rechtsgebieden en specialisaties helder en gestructureerd, publiceer vakinhoudelijke content en houd je gegevens consistent. Autoriteit en duidelijkheid zijn de signalen waar een AI op vertrouwt bij juridische vragen.' },
      { q: 'Is AI-vindbaarheid passend voor de advocatuur qua reputatie?', a: 'Ja, mits zorgvuldig. GEO gaat over het beter vindbaar maken van je openbare expertise en aanbod — feitelijk en zonder overpromises. Dat past goed bij de zakelijke, betrouwbare uitstraling die de advocatuur vraagt.' },
    ],
  },
  {
    slug: 'logistiek',
    naam: 'logistiek en transport',
    titel: 'GEO voor logistiek',
    emoji: '🚚',
    intro: 'Bedrijven die een transporteur, koerier of logistiek partner zoeken, gebruiken steeds vaker een AI-assistent voor een eerste shortlist. "Welk transportbedrijf doet [type vervoer] in [regio]?" Het AI-antwoord bepaalt wie er op de shortlist komt.',
    queries: [
      'transportbedrijf voor [type lading] in [regio]',
      'koeriersdienst met same-day levering in [stad]',
      'logistiek partner met track-and-trace voor webshops',
    ],
    waarom: 'In logistiek draait het om specialisatie, dekkingsgebied en betrouwbaarheid. Een AI beveelt de partij aan die helder communiceert welk type vervoer, regio en service ze bieden. Veel transportbedrijven profileren zich online te algemeen; wie z\'n niche en sterke punten gestructureerd en consistent presenteert, wordt eerder als relevante optie herkend door een AI.',
    faq: [
      { q: 'Hoe kom ik als transportbedrijf in AI-aanbevelingen?', a: 'Maak je specialisaties (type lading, regio, services zoals track-and-trace of same-day) helder en gestructureerd vindbaar, met kloppende bedrijfsgegevens. Geef AI-crawlers toegang en bouw vermeldingen op bij relevante platforms.' },
      { q: 'Telt B2B-logistiek ook voor GEO?', a: 'Ja. Ook inkopers en logistiek managers orienteren zich via AI voordat ze offertes aanvragen. Wie daar duidelijk en betrouwbaar in beeld komt, komt eerder op de shortlist.' },
    ],
  },
  {
    slug: 'detailhandel',
    naam: 'detailhandel en e-commerce',
    titel: 'GEO voor webshops & retail',
    emoji: '🛍️',
    intro: 'Consumenten vragen een AI-assistent steeds vaker om een product- of winkeladvies: "waar koop ik het beste [product]?" De AI noemt enkele webshops of winkels — en daar wil je als retailer of webshop bij horen.',
    queries: [
      'beste webshop voor [productcategorie] in Nederland',
      'winkel in [stad] die [product] op voorraad heeft',
      'duurzame of Nederlandse alternatieven voor [product]',
    ],
    waarom: 'In retail en e-commerce gaat het om productrelevantie, voorraad en vertrouwen. Een AI beveelt de webshop aan met heldere productinformatie, gestructureerde data (Product-schema), reviews en betrouwbare bedrijfsgegevens. Webshops die hun assortiment en USP\'s machine-leesbaar presenteren, worden eerder genoemd dan shops met dunne of slecht gestructureerde productpagina-s.',
    faq: [
      { q: 'Hoe wordt mijn webshop aanbevolen door ChatGPT?', a: 'Zorg voor rijke, gestructureerde productinformatie (Product- en Offer-schema), reviews en consistente bedrijfsgegevens, en geef AI-crawlers toegang. Hoe beter een AI je assortiment en betrouwbaarheid kan inschatten, hoe eerder hij je noemt.' },
      { q: 'Helpt GEO ook tegen concurrentie van grote platforms?', a: 'Het helpt je onderscheiden op niche en specialisatie. Een AI noemt niet alleen de grootste, maar ook de meest relevante en betrouwbare aanbieder voor een specifieke vraag — daar liggen kansen voor gespecialiseerde webshops.' },
    ],
  },
  {
    slug: 'schoonheid',
    naam: 'schoonheids- en wellnessbranche',
    titel: 'GEO voor kappers & schoonheidssalons',
    emoji: '💇',
    intro: 'Klanten zoeken een kapper, schoonheidssalon of nagelstudio steeds vaker via een AI-assistent in plaats van Google Maps. Ze vragen ChatGPT om een aanbeveling in de buurt — en de AI noemt er maar een paar.',
    queries: [
      'goede kapper voor [behandeling] in [stad]',
      'schoonheidssalon met online afspraken in [stad]',
      'nagelstudio in [stad] die [techniek] doet',
    ],
    waarom: 'In de schoonheids- en wellnessbranche draait alles om een lokale beslissing op het juiste moment. Klanten kiezen op basis van nabijheid, behandelaanbod en reviews. Een salon waarvan de behandelingen, openingstijden en boekbaarheid consistent en gestructureerd online staan, wordt door een AI eerder genoemd dan een salon met verouderde of tegenstrijdige informatie. Sleutels: kloppende NAP-gegevens, een helder behandelmenu, reviews en een vindbare online agenda.',
    faq: [
      { q: 'Hoe word mijn salon aanbevolen door een AI-assistent?', a: 'Zorg dat je behandelmenu, openingstijden en adresgegevens consistent en gestructureerd online staan, bouw reviews op en geef AI-crawlers toegang. Hoe duidelijker en betrouwbaarder je online aanwezigheid, hoe groter de kans dat een AI je noemt bij een vraag in de buurt.' },
      { q: 'Telt mijn online agenda mee voor AI-aanbevelingen?', a: 'Indirect wel. Een duidelijk vindbare, actuele boekbaarheid is een vertrouwenssignaal: het laat zien dat je actief en bereikbaar bent, wat de kans vergroot dat een AI je als concrete optie aanraadt.' },
    ],
  },
  {
    slug: 'automotive',
    naam: 'automotive-sector',
    titel: 'GEO voor autobedrijven & garages',
    emoji: '🚗',
    intro: 'Autobezitters vragen een AI-assistent om een betrouwbare garage of dealer: "waar laat ik mijn [merk] onderhouden in [stad]?" De AI geeft een kort advies met enkele namen — en daar wil je tussen staan.',
    queries: [
      'betrouwbare garage voor [automerk] in [stad]',
      'autobedrijf met APK en korte wachttijd in [regio]',
      'garage gespecialiseerd in [merk of EV] onderhoud in [stad]',
    ],
    waarom: 'In de automotive-sector wegen vertrouwen, specialisatie en locatie zwaar. Een AI beveelt het bedrijf aan dat zijn diensten (APK, onderhoud, schadeherstel), merkspecialisaties en werkgebied helder en consistent presenteert. Bedrijven die hun expertise — bijvoorbeeld in een specifiek merk of in elektrische auto-s — gestructureerd online zetten, worden eerder herkend bij een gerichte vraag dan bedrijven met een vage of verouderde site.',
    faq: [
      { q: 'Hoe vindt een AI mijn garage of autobedrijf?', a: 'Presenteer je diensten, merkspecialisaties en werkgebied helder en gestructureerd, houd je bedrijfsgegevens consistent en bouw reviews op. Zo kan een AI inschatten waar je goed in bent en je koppelen aan de juiste vraag.' },
      { q: 'Werkt dit ook voor EV- of merkspecialisten?', a: 'Juist dan. Hoe specifieker je specialisatie (een bepaald merk, elektrische auto-s, schadeherstel), hoe waardevoller het is om die helder te presenteren — een AI matcht een niche-vraag graag aan een duidelijke specialist.' },
    ],
  },
  {
    slug: 'installatie',
    naam: 'installatie- en technieksector',
    titel: 'GEO voor installateurs & technici',
    emoji: '🔧',
    intro: 'Bij een lekkage, storing of verbouwing pakt men steeds vaker een AI-assistent: "loodgieter met spoed in [stad]" of "erkend installateur voor een warmtepomp in [regio]". De AI noemt enkele bedrijven — daar wil je bij horen.',
    queries: [
      'loodgieter met spoed in [stad]',
      'erkend installateur voor warmtepomp of zonnepanelen in [regio]',
      'elektricien voor [klus] in [stad]',
    ],
    waarom: 'In de installatie- en technieksector telt de combinatie van spoed, werkgebied en certificering. Een AI beveelt de installateur aan die zijn specialisaties, werkgebied, spoedbeschikbaarheid en erkenningen helder en consistent online heeft staan. Vooral certificeringen (zoals erkend installateur of vakdiploma-s) zijn sterke vertrouwenssignalen die een AI meeweegt bij een gerichte technische vraag.',
    faq: [
      { q: 'Hoe word ik als installateur aanbevolen door een AI?', a: 'Zet je werkgebied, specialisaties, spoedbeschikbaarheid en certificeringen helder en gestructureerd op je site, houd je gegevens consistent en bouw reviews op. Zo herkent een AI je als een betrouwbare, relevante specialist.' },
      { q: 'Tellen mijn certificeringen mee?', a: 'Ja. Vermeld erkenningen en vakdiploma-s expliciet en gestructureerd — het zijn sterke vertrouwenssignalen die de kans vergroten dat een AI je noemt bij een vraag waar betrouwbaarheid cruciaal is.' },
    ],
  },
  {
    slug: 'fitness',
    naam: 'fitness- en sportbranche',
    titel: 'GEO voor sportscholen & trainers',
    emoji: '🏋️',
    intro: 'Wie wil sporten vraagt een AI-assistent om een sportschool, personal trainer of studio in de buurt — met de juiste lessen en de passende abonnementsvorm. De AI noemt enkele opties, en daar wil je tussen staan.',
    queries: [
      'sportschool met [les of faciliteit] in [stad]',
      'personal trainer gespecialiseerd in [doel] in [regio]',
      'yoga- of fitnessstudio met proefles in [stad]',
    ],
    waarom: 'In de fitness- en sportbranche draait de keuze om locatie, aanbod en sfeer. Een AI beveelt de aanbieder aan die zijn lesrooster, faciliteiten, specialisaties en abonnementen helder en consistent presenteert. Een vindbare, laagdrempelige instap (zoals een proefles) en goede reviews vergroten de kans dat een AI je als concrete optie noemt bij een sportvraag in de buurt.',
    faq: [
      { q: 'Hoe beveelt een AI mijn sportschool of studio aan?', a: 'Presenteer je aanbod (lessen, faciliteiten, abonnementen) en openingstijden helder en gestructureerd, bouw reviews op en geef AI-crawlers toegang. Zo kan een AI je koppelen aan iemand die precies zoekt wat jij biedt.' },
      { q: 'Helpt een proefles-aanbod bij AI-vindbaarheid?', a: 'Een duidelijke, vindbare instap zoals een proefles verlaagt de drempel en is een concreet signaal dat een AI kan benoemen — het maakt je aanbeveling tastbaarder dan een algemene vermelding.' },
    ],
  },
  {
    slug: 'reisbranche',
    naam: 'reisbranche',
    titel: 'GEO voor reisbureaus & touroperators',
    emoji: '✈️',
    intro: 'Reizigers plannen hun vakantie steeds vaker met een AI-assistent: "welk reisbureau is gespecialiseerd in [bestemming of type reis]?" De AI geeft een kort advies met enkele specialisten — en daar wil je bij horen.',
    queries: [
      'reisbureau gespecialiseerd in [bestemming] reizen',
      'touroperator voor [type reis] vanuit Nederland',
      'reisadviseur voor maatwerk reizen voor [doelgroep]',
    ],
    waarom: 'In de reisbranche wegen specialisatie, persoonlijk advies en vertrouwen zwaar. Een AI beveelt de aanbieder aan die zijn specialisaties, bestemmingen en garanties helder en consistent presenteert. Keurmerken zoals SGR en ANVR zijn sterke vertrouwenssignalen; door ze expliciet en gestructureerd te vermelden vergroot je de kans dat een AI je noemt bij een gerichte reisvraag.',
    faq: [
      { q: 'Hoe word ik als reisspecialist aanbevolen door een AI?', a: 'Presenteer je specialisaties, bestemmingen en reisvormen helder en gestructureerd, vermeld je garanties en keurmerken, en bouw reviews op met consistente bedrijfsgegevens. Zo herkent een AI je als een betrouwbare specialist voor een specifieke reisvraag.' },
      { q: 'Tellen keurmerken zoals SGR en ANVR mee?', a: 'Ja. Vermeld ze expliciet en gestructureerd — voor reizigers en voor AI zijn ze een belangrijk vertrouwenssignaal dat meeweegt bij een reisadvies.' },
    ],
  },
  {
    slug: 'onderwijs',
    naam: 'onderwijs- en opleidingssector',
    titel: 'GEO voor opleiders & trainers',
    emoji: '🎓',
    intro: 'Wie een cursus, training of rijschool zoekt, vraagt nu een AI-assistent: "beste opleiding voor [vaardigheid]" of "rijschool met een hoog slagingspercentage in [stad]". De AI noemt enkele aanbieders — en daar wil je tussen staan.',
    queries: [
      'opleiding of cursus voor [vaardigheid] in [stad of online]',
      'rijschool met hoog slagingspercentage in [stad]',
      'erkende training voor [certificaat of beroep] in Nederland',
    ],
    waarom: 'In de onderwijs- en opleidingssector kiest men op resultaat, erkenning en lesvorm. Een AI beveelt de aanbieder aan die zijn cursusaanbod, erkenningen en lesvormen (online of klassikaal) helder en consistent presenteert. Erkenningen en keurmerken zijn sterke vertrouwenssignalen; samen met reviews en gestructureerde informatie vergroten ze de kans dat een AI je noemt bij een leervraag.',
    faq: [
      { q: 'Hoe wordt mijn opleiding aanbevolen door een AI?', a: 'Presenteer je cursusaanbod, erkenningen en lesvormen helder en gestructureerd, met reviews en consistente bedrijfsgegevens. Zo kan een AI je koppelen aan iemand die precies zoekt wat jij aanbiedt.' },
      { q: 'Is GEO ook relevant voor online cursussen?', a: 'Juist dan. Bij online aanbod is AI-vindbaarheid cruciaal, omdat de keuze niet lokaal beperkt is en vrijwel volledig op online signalen leunt — wie daar sterk en consistent staat, wordt eerder genoemd.' },
    ],
  },
];

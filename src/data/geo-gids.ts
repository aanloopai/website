// GEO-gidsen: "GEO-bureau kiezen" en "Wat kost GEO in Nederland?".
//
// Inhoudelijke regel: koperszijde, eerlijk, geen verzonnen marktcijfers.
// Prijzen van Aanloop AI komen uitsluitend uit ./pricing (nooit hardcoden).
// GEO Setup is op de site niet gepubliceerd ("op aanvraag"), dus prijs: null.

import { GEO, SEO_GEO_BUNDEL } from './pricing';

export interface GidsFaq { q: string; a: string }
export interface Criterium { titel: string; body: string; vraagAanBureau: string }

export const KIEZEN: {
  titel: string;
  intro: string;
  criteria: Criterium[];
  rodeVlaggen: string[];
  specialistOfFullservice: { vraag: string; antwoord: string; alinea: string[] };
  faq: GidsFaq[];
} = {
  titel: "GEO-bureau kiezen: waar let u op?",
  intro:
    "GEO (Generative Engine Optimization) is een jong vakgebied en de markt is nog niet gestandaardiseerd. Elk bureau gebruikt andere termen, andere methoden en andere rapportages, waardoor offertes lastig te vergelijken zijn. Deze gids geeft zeven criteria waarmee u zelf kunt toetsen of een bureau zijn werk meetbaar, controleerbaar en eerlijk doet. Bij elk criterium vindt u een concrete vraag die u aan een bureau kunt stellen, ook aan ons.",
  criteria: [
    {
      titel: "Meetbaarheid in meerdere AI-engines",
      body:
        "Een serieus bureau begint met een nulmeting: komt uw bedrijf nu voor in de antwoorden van AI-assistenten, en zo ja, bij welke vragen en met welke bron? Daarna wordt maandelijks opnieuw gemeten. Meet het bureau alleen ChatGPT, dan ziet u maar een deel van het beeld. Claude, Perplexity, Gemini en Google AI-overzichten gebruiken andere bronnen en geven andere antwoorden.",
      vraagAanBureau:
        "Welke AI-engines meten jullie, met welke vragen, en kan ik de nulmeting en de maandelijkse metingen zelf inzien?",
    },
    {
      titel: "Gepubliceerde prijzen",
      body:
        "Een bureau dat zijn prijzen op de website zet, laat zien dat het zijn aanbod kan afbakenen. Ontbreken prijzen volledig, dan weet u pas na een gesprek of een offerte of het bureau past bij uw budget. Een prijs op de site is geen garantie voor kwaliteit, maar maakt vergelijken wel mogelijk en voorkomt dat u tijd verliest aan gesprekken die op budget stuklopen.",
      vraagAanBureau:
        "Wat kost de eerste fase precies, wat is daarin inbegrepen, en wat komt er per maand bij?",
    },
    {
      titel: "Techniek die u zelf kunt controleren",
      body:
        "De technische basis van GEO is openbaar te controleren. Denk aan schema.org-markup in de broncode, een llms.txt-bestand, een robots.txt die AI-crawlers toelaat en pagina-inhoud die zonder JavaScript leesbaar is. Een bureau dat dit goed doet, kan u laten zien waar u dit controleert. Een bureau dat het vaag houdt, maakt zichzelf onmisbaar zonder dat u kunt nagaan wat er is aangepast.",
      vraagAanBureau:
        "Welke technische aanpassingen doen jullie precies, en waar in de broncode of op welke URL kan ik die zelf controleren?",
    },
    {
      titel: "Content die echte vragen beantwoordt",
      body:
        "AI-assistenten citeren pagina's die een concrete vraag helder beantwoorden. Content die is geschreven om zoekwoorden te bedienen, wordt minder vaak aangehaald dan een pagina die de vraag van een klant direct en feitelijk beantwoordt. Vraag hoe het bureau bepaalt welke vragen uw klanten stellen en hoe het die antwoorden onderbouwt.",
      vraagAanBureau:
        "Hoe bepalen jullie welke vragen mijn klanten aan AI stellen, en hoe zorgen jullie dat de antwoorden op mijn site feitelijk kloppen?",
    },
    {
      titel: "Eerlijkheid over garanties",
      body:
        "Niemand buiten de AI-aanbieders zelf bepaalt wat een AI-assistent antwoordt, en die antwoorden verschillen per vraag, per dag en per engine. Een bureau kan uw kans op een vermelding vergroten en dat meetbaar maken, maar kan geen vermelding of positie garanderen. Een bureau dat dat wel belooft, belooft iets dat het niet kan waarmaken.",
      vraagAanBureau:
        "Wat beloven jullie wel, wat niet, en wat gebeurt er als na zes maanden de vermeldingen uitblijven?",
    },
    {
      titel: "Eigenaarschap en geen lock-in",
      body:
        "Alles wat voor uw GEO wordt gemaakt, hoort op uw eigen domein te staan en van u te zijn: de pagina's, de markup, het llms.txt-bestand en de meetgegevens. Stopt u na een jaar, dan moet alles blijven werken. Bij bureaus die content op hun eigen platform hosten, verdwijnt de winst op het moment dat u stopt.",
      vraagAanBureau:
        "Staat alles op mijn eigen domein, en wat neem ik mee als wij de samenwerking beëindigen?",
    },
    {
      titel: "Sectorkennis en bronvermelding",
      body:
        "AI-assistenten wegen bronnen en feiten zwaar. Een bureau dat uw sector niet kent, schrijft algemene teksten waar geen AI naar verwijst. Goede GEO-content noemt zijn bronnen, gebruikt controleerbare feiten en laat zien wie de auteur is. Vraag naar voorbeelden uit uw branche en naar de wijze waarop het bureau feiten controleert voordat ze online komen.",
      vraagAanBureau:
        "Welke ervaring hebben jullie in mijn sector, en hoe controleren en verwijzen jullie naar bronnen in de content?",
    },
  ],
  rodeVlaggen: [
    "Het bureau garandeert een plek of vermelding in ChatGPT of een andere AI-assistent.",
    "Er staan nergens prijzen op de website en ook na een gesprek blijft het bedrag vaag.",
    "De rapportage bestaat uit losse screenshots zonder vaste vragen, datum of herhaalbare methode.",
    "Het bureau wil de content op een eigen domein of platform hosten in plaats van op het uwe.",
    "GEO wordt verward met adverteren in AI-assistenten, terwijl het gaat om organische vindbaarheid.",
    "Het bureau kan niet uitleggen welke AI-engines het meet en met welke vragen.",
  ],
  specialistOfFullservice: {
    vraag: "Kies ik een GEO-specialist of een fullservicebureau voor AI-vindbaarheid?",
    antwoord:
      "Kies een specialist als AI-vindbaarheid uw knelpunt is en uw website technisch in orde is. Kies een fullservicebureau als website, SEO en content alle drie aandacht nodig hebben.",
    alinea: [
      "Een GEO-specialist is de juiste keuze als uw bedrijf al een degelijke, snelle website heeft met goede basisinhoud en u gericht wilt werken aan zichtbaarheid in AI-antwoorden. U betaalt dan niet voor werk dat u niet nodig heeft, en de meting en rapportage zijn meestal scherper omdat het bureau zich op een onderwerp richt.",
      "Een fullservicebureau past beter als de basis zelf nog niet staat: een verouderde website, weinig inhoud, een zwakke SEO-basis of geen eigen meetpunt. GEO bouwt voort op die basis. Het heeft weinig zin AI-vindbaarheid te optimaliseren op een site die slecht te lezen of te vinden is. Een bureau dat alles samen doet, voorkomt ook dat verschillende partijen langs elkaar heen werken.",
      "Aanloop AI positioneert zich als AI-bureau dat GEO combineert met websitebouw en AI-assistenten. Dat is een keuze voor wie die onderdelen bij een partij wil beleggen, geen keuze die voor elk bedrijf beter is. Gebruik de zeven criteria hierboven om ook ons te toetsen.",
    ],
  },
  faq: [
    {
      q: "Hoeveel bureaus moet ik vergelijken?",
      a: "Twee of drie is genoeg. Vraag elk bureau naar dezelfde zeven punten en leg de antwoorden naast elkaar. Let vooral op verschillen in meting, prijs en eigenaarschap, want daar zitten de grootste risico's.",
    },
    {
      q: "Kan ik GEO ook zelf doen?",
      a: "Een deel wel. De technische basis en het schrijven van duidelijke antwoordpagina's zijn voor een bedrijf met kennis in huis haalbaar. De maandelijkse meting in meerdere AI-engines kost vaak de meeste tijd, en daar helpt een bureau of tool het meest.",
    },
    {
      q: "Hoe lang duurt het voor GEO effect heeft?",
      a: "Dat verschilt per branche, concurrentie en engine, en niemand kan dat vooraf exact voorspellen. Technische aanpassingen kunnen binnen weken worden opgepikt, de opbouw van vermeldingen kost meestal maanden. Een nulmeting en maandelijkse meting laten zien of u de goede kant opgaat.",
    },
    {
      q: "Is een SEO-bureau dat ook GEO aanbiedt minder geschikt dan een GEO-bureau?",
      a: "Niet per se. Veel SEO-werk, zoals goede techniek en sterke content, helpt ook bij AI-vindbaarheid. Kijk niet naar de titel, maar naar de zeven criteria: meting, prijs, controleerbare techniek, content, eerlijkheid, eigenaarschap en sectorkennis.",
    },
  ],
};

export const WATKOST: {
  titel: string;
  intro: string;
  kostenposten: { titel: string; body: string }[];
  modellen: { naam: string; body: string }[];
  aanloop: { naam: string; prijs: number | null; eenheid: string; body: string }[];
  waaromVerschilt: string[];
  faq: GidsFaq[];
} = {
  titel: "Wat kost GEO in Nederland?",
  intro:
    "Wat GEO kost, hangt af van wat u laat doen en hoe vaak. Er is geen vaste marktprijs en wij noemen daarom geen gemiddelden. Wel kunt u de kosten uiteenleggen in vijf onderdelen en drie manieren waarop bureaus die verrekenen. Onderaan staat wat Aanloop AI zelf rekent, zodat u één concreet referentiepunt heeft. Alle genoemde prijzen zijn exclusief 21% BTW.",
  kostenposten: [
    {
      titel: "Eenmalige setup: techniek, schema en llms.txt",
      body:
        "De technische basis maakt uw site leesbaar voor AI-assistenten: schema.org-markup voor uw organisatie en diensten, een llms.txt-bestand, een robots.txt die AI-crawlers toelaat en inhoud die zonder JavaScript te lezen is. Dit is grotendeels eenmalig werk, met af en toe onderhoud als uw site verandert.",
    },
    {
      titel: "Content",
      body:
        "Pagina's die concrete vragen van klanten beantwoorden, zoals veelgestelde vragen, vergelijkingen en uitleg per dienst. Dit is meestal de grootste variabele post: meer pagina's kosten meer, en goed onderbouwde content kost meer tijd dan algemene tekst.",
    },
    {
      titel: "Meting en rapportage",
      body:
        "Een nulmeting en daarna een vaste meting van uw zichtbaarheid in meerdere AI-engines, met dezelfde vragen elke keer. Zonder meting weet u niet of het werk effect heeft. Meting kost herhaald werk of toolkosten, en dat zit bij serieuze aanbieders in de maandprijs.",
    },
    {
      titel: "Autoriteit en vermeldingen",
      body:
        "AI-assistenten wegen mee of anderen over uw bedrijf schrijven. Het opbouwen van vermeldingen, profielen en verwijzingen op betrouwbare externe plekken kost tijd en loopt langzaam op. Wees voorzichtig met aanbieders die dit tegen een vast laag bedrag beloven.",
    },
    {
      titel: "Onderhoud en bijsturing",
      body:
        "AI-engines veranderen, uw aanbod verandert en wat vorige maand werkte, hoeft dat nu niet meer te doen. Bijsturen op basis van de meting is doorlopend werk en vormt de reden dat veel aanbieders een maandelijks tarief rekenen.",
    },
  ],
  modellen: [
    {
      naam: "Eenmalig project",
      body:
        "U betaalt eenmalig voor de technische basis en een afgesproken hoeveelheid content. Dat is overzichtelijk en past bij bedrijven die zelf verder willen. Het nadeel is dat meting en bijsturing daarna bij u liggen.",
    },
    {
      naam: "Maandabonnement",
      body:
        "U betaalt per maand voor meting, content-updates en rapportage. Dat past bij het doorlopende karakter van GEO. Let erop wat er per maand wordt geleverd en of u kunt opzeggen zonder uw werk kwijt te raken.",
    },
    {
      naam: "Bundel met SEO",
      body:
        "SEO en GEO delen veel werk, zoals technische basis en goede content. In een bundel worden beide in één strategie en één rapport gedaan. Dat voorkomt dubbel werk, maar is alleen zinvol als u beide nodig heeft.",
    },
  ],
  aanloop: [
    {
      naam: "GEO Quick Scan",
      prijs: 0,
      eenheid: "gratis",
      body:
        "Een eerste meting van hoe zichtbaar uw bedrijf nu is in AI-assistenten, zonder verplichtingen. U krijgt een beeld van de uitgangssituatie voordat u iets beslist.",
    },
    {
      naam: "GEO Setup",
      prijs: null,
      eenheid: "eenmalig, op aanvraag",
      body:
        "De technische basis: schema.org-entiteiten, een llms.txt-bestand, toegang voor AI-crawlers, Person- en Organization-markup en sameAs-koppelingen naar uw profielen. Alles staat op uw eigen domein.",
    },
    {
      naam: "GEO Maandelijks",
      prijs: GEO.maand,
      eenheid: "per maand",
      body:
        "Maandelijkse meting in ChatGPT, Claude, Perplexity, Gemini en Google AI, aangevuld met content-updates en een rapportage over wat er is gemeten en aangepast.",
    },
    {
      naam: "SEO + GEO Bundel",
      prijs: SEO_GEO_BUNDEL,
      eenheid: "per maand",
      body:
        "SEO en GEO in één strategie en één rapport, zodat het werk op elkaar aansluit en u niet twee leveranciers hoeft aan te sturen.",
    },
  ],
  waaromVerschilt: [
    "Het eerste verschil zit in de scope. De ene aanbieder levert een technische controle en wat advies, de andere bouwt, schrijft en meet doorlopend. Dezelfde term, GEO, kan daardoor een heel verschillende hoeveelheid werk betekenen. Vergelijk daarom niet op totaalbedrag, maar op wat er per maand en per fase wordt geleverd.",
    "Het tweede verschil is meting en contentvolume. Meten in vijf AI-engines met een vaste vragenlijst kost meer dan af en toe een screenshot maken, en tien goed onderbouwde antwoordpagina's kosten meer dan twee algemene teksten. Een lage prijs kan betekenen dat een van beide ontbreekt.",
    "Het derde verschil is of het werk in-house wordt gedaan of wordt uitbesteed. Een bureau met eigen specialisten kan scherper prijzen en sneller bijsturen. Een bureau dat uitbesteedt, rekent vaak een marge en heeft minder grip op de kwaliteit. Vraag daarom wie het werk feitelijk uitvoert.",
  ],
  faq: [
    {
      q: "Zijn de genoemde prijzen inclusief BTW?",
      a: "Nee, alle prijzen van Aanloop AI zijn exclusief 21% BTW. Vraag bij elk bureau of de genoemde bedragen inclusief of exclusief BTW zijn, zodat u appels met appels vergelijkt.",
    },
    {
      q: "Wat krijg ik voor de gratis Quick Scan?",
      a: "Een eerste meting van uw zichtbaarheid in AI-assistenten, zonder verplichtingen. Het geeft een uitgangspunt, maar vervangt niet de uitgebreide nulmeting die bij een traject hoort.",
    },
    {
      q: "Kan ik per maand opzeggen?",
      a: "Dat verschilt per aanbieder, dus vraag het expliciet voor u tekent. Let ook op wat u meeneemt na opzegging. Staat alles op uw eigen domein, dan blijft het werk intact.",
    },
    {
      q: "Is een bundel met SEO altijd voordeliger?",
      a: "Alleen als u SEO en GEO allebei nodig heeft. Heeft u uw SEO goed op orde, dan kan een los GEO-traject beter passen. Reken het na met de prijzen van beide opties naast elkaar.",
    },
  ],
};

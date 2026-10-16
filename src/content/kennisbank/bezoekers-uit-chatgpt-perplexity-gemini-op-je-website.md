---
title: "Hoe krijgt u bezoekers uit ChatGPT, Perplexity en Gemini op uw website? Wat wij meten op zeven sites"
seoTitle: "Bezoekers uit ChatGPT en Gemini: wat werkt (gemeten)"
description: "Wat op zeven sites meetbaar bezoek uit ChatGPT, Perplexity en Gemini oplevert: antwoordpagina's, datasets met bron, llms.txt en contact op elke pagina."
excerpt: "Bezoek uit AI-assistenten is klein in aantal maar neemt opvallend vaak contact op. Dit artikel beschrijft wat op zeven sites die Aanloop AI bouwt aantoonbaar werkt, met de cijfers en de methode erbij."
published: 2026-10-16
category: "AI-vindbaarheid"
readingMinutes: 8
draft: false
---

**Kort antwoord:** bezoekers uit ChatGPT, Perplexity en Gemini komen op uw website als een AI-assistent uw pagina als bron gebruikt in zijn antwoord. Dat gebeurt vooral bij pagina's die één concrete vraag letterlijk beantwoorden, bij datasets en feitenpagina's met bron, en als AI-crawlers de site mogen lezen (robots, headers, llms.txt). Op de zeven sites die Aanloop AI bouwt en meet, is dat bezoek klein in aantal maar neemt het op vier van de vijf gemeten sites vaker contact op dan Google-bezoek. De meting staat op [/resultaten/](/resultaten/).

## Hoe AI-bezoek technisch ontstaat

Een AI-assistent die met webtoegang antwoordt (ChatGPT met zoeken, Perplexity, Gemini met grounding, Copilot) haalt pagina's op, vat ze samen en zet bronlinks onder of in het antwoord. Klikt de gebruiker op zo'n bron, dan komt die op uw site binnen met een verwijzer als chatgpt.com, perplexity.ai of gemini.google.com. Die verwijzer is wat een cookieloze meting als "bezoek via AI-assistent" telt.

Twee gevolgen. Ten eerste: u wordt alleen bron als uw pagina het antwoord bevat dat de assistent zoekt, in een vorm die hij kan citeren. Ten tweede: het aantal is klein. Een assistent toont drie tot vijf bronnen, geen tien blauwe links, en de meeste gebruikers klikken niet door. Wie wel doorklikt, had een concrete vraag.

## Wat we meten op zeven sites

Op elke site die wij bouwen draait dezelfde cookieloze beacon. Die telt sessies, de herkomst (AI-assistent, zoekmachine, sociaal, direct) en contactacties: een klik op bellen, WhatsApp, e-mail, route of een verzonden formulier. Momentopname 16 oktober 2026, 28 dagen:

- **Trip and Tick** (reizen, 17 talen): 33 van 165 sessies via AI-assistenten, 20% van alle bezoek en meer dan via Google (14). Contactactie bij 15,2% van het AI-bezoek, tegenover 7,1% van het Google-bezoek.
- **FleetTrack Holland** (GPS-tracking, B2B): 8 AI-sessies op 342. Drie daarvan deden een contactactie (37,5%); Google-bezoek 8,3%. Klein aantal, dus richting telt, niet de decimaal.
- **Keuken in Beeld** (keukenplatform): 102 bezoeken via AI-assistenten in 30 dagen uit de eigen serverstatistiek (t/m 9 oktober), waarvan 95 via ChatGPT. Lead-ratio van dat bezoek 3,9%, tegenover 0,8% uit Google. Een ChatGPT-bezoeker leest gemiddeld 4,2 pagina's. De beacon telde 70 verzonden formulieren op 974 sessies.
- **Aanloop AI** (deze site): 8 AI-sessies op 475, contactactie bij 37,5% tegenover 8,3% uit Google.
- **Alfa Reclame** (reclame, Rotterdam): 21 AI-sessies op 259 (8%). Contactactie 9,5% tegenover 10% uit Google: hier gelijkwaardig.

Het patroon: weinig bezoek, hoge intentie. Wie via een AI-antwoord binnenkomt, heeft zijn vraag al gesteld en wil nu de aanbieder.

## Wat op die sites aantoonbaar helpt

### 1. Pagina's die één vraag letterlijk beantwoorden

De grootste hefboom. Uit de GEO Agency Index van oktober 2026 blijkt dat bij 69,8% van de antwoorden waarin een bureau genoemd wordt, de bron de eigen website van dat bureau is. Niet een gids, niet vakmedia: de eigen pagina die de vraag beantwoordt. Op keukeninbeeld.nl zijn de pagina's die AI-bezoek trekken precies de pagina's met een concrete vraag in de titel en het antwoord bovenaan: "Wat kost een Nobilia keuken", de keukenprijs-index, de merkenpagina's.

### 2. Datasets en feiten met bron

AI-assistenten citeren graag iets dat eruitziet als data: een tabel met bron en datum, een JSON-bestand, een index. De keukenprijs-index (CC BY 4.0) en de garantie-index op keukeninbeeld.nl zijn de meest geciteerde pagina's van dat platform in onze wekelijkse AI-radar (Gemini citeert de site in 5 van 20 vaste vragen, meting 8 oktober 2026). Op aanloopai.nl doen facts.json, claims.json en pricing.json hetzelfde werk.

### 3. AI-crawlers toelaten en llms.txt

Zonder toegang geen citatie. Alle zeven sites laten GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended en de andere AI-crawlers expliciet toe in robots.txt en via headers, en hebben een llms.txt met de kern van het aanbod. Dat is geen garantie op vermeldingen, maar wel de voorwaarde.

### 4. Een formulier op elke pagina

AI-bezoek landt zelden op de homepage. Het landt op de pagina die de vraag beantwoordde. Staat daar geen formulier, telefoonnummer of WhatsApp, dan is de hoge intentie verspild. Op elke site die wij bouwen staat het contact-trio bovenaan elke pagina; op aanloopai.nl bewaakt een test die regel.

### 5. Meten en bijsturen, elke week

Een vaste set vragen aan Gemini en ChatGPT, elke week dezelfde, en tellen of de site geciteerd wordt. Plus de beacon die laat zien welke pagina's AI-bezoek trekken. Daarop sturen we content bij: niet meer artikelen over hetzelfde onderwerp (dat kannibaliseert de eigen pagina's, zagen we op alfareclame.nl), maar de antwoordpagina sterker maken.

## Wat niet werkt

Meer blogartikelen zonder concrete vraag. Een "AI-vindbaarheid"-plugin zonder inhoud. Beloftes over "citaties binnen zes weken": niemand bepaalt wat een AI-assistent antwoordt. En cijfers zonder noemer: 50% van zes sessies is iets anders dan 50% van zeshonderd.

## Veelgestelde vragen

**Hoe zie ik of mijn site al AI-bezoek krijgt?**
Kijk in uw analytics naar verwijzers met chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com of claude.ai. Staan die er niet, dan wordt uw site niet als bron gebruikt, of uw meting filtert ze weg.

**Is dit hetzelfde als SEO?**
Deels. Dezelfde autoriteit, structuur en snelheid helpen bij beide. Het verschil: bij Google gaat het om ranken in een lijst, bij AI-assistenten om genoemd worden in het antwoord zelf. Dat vraagt letterlijke antwoordpagina's en citeerbare feiten.

**Wat kost het om dit te laten doen?**
Als onderdeel van de [AI-Website Bundel](/diensten/ai-website-bundel-mkb-nederland/) (website + Emma + AI-vindbaarheid + meetpaneel): 4.500 euro eenmalig en 1.000 euro per maand, exclusief btw. Los: [GEO Maandelijks](/ai-vindbaarheid/) 595 euro per maand. De nulmeting via de GEO Quick Scan is gratis.

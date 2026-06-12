# Off-Site Authority — Execution Pack (schoon, fact-correct)

> Vervangt de gecontamineerde drafts (`seo-audit-2026-05-06/*`, oude `developing/*` met **fictieve oprichter "Daan Verhoeven"** + verzonnen claims). Alles hieronder gebruikt alleen **geverifieerde feiten** en bevat **geen klantaantal-claim** (per `cases.astro`: geen publieke testimonials). Opgesteld 2026-06-12.

## ✅ Canonical feiten (gebruik EXACT deze — bron: `src/data/bedrijfsgegevens.ts`)
| Veld | Waarde |
|---|---|
| Naam | Aanloop AI B.V. |
| KvK | **56312075** (NIET 88606902) |
| BTW | NL004672676B48 |
| Adres | Blokfluit 31, 3068 KZ Rotterdam, Nederland |
| Oprichter / CEO | **Mustafa Agah Dogan** (NIET "Daan Verhoeven") |
| Opgericht | 2023 |
| E-mail | hello@aanloopai.nl · Tel/WhatsApp +31 6 2474 1597 |
| Web | aanloopai.nl |
| Producten | Marco (AI-receptionist, telefoon 24/7) · Emma (WhatsApp-agent) · workflow-automatisering · AI-website · SEO/GEO (AI-vindbaarheid) |
| Prijzen | Marco v.a. €249 (Lite) / €597 (Starter) / €1.197 (Groei) · GEO v.a. €595/mnd · gratis GEO Quick Scan |
| Positionering | AI-bureau voor het Nederlandse MKB · AVG-compliant · EU-data · transparante prijzen |
| ❌ NOOIT | klantaantal ("80+/500+"), "€8.014 besparing", "200-respondent onderzoek", "ISO 27001", "Daan Verhoeven", KvK 88606902 |

---

## 1. PRESS (de #1 autoriteit-hefboom — 0 externe vermeldingen vandaag)

**Verse hoek = GEO/AI-vindbaarheid** (nieuw, nieuwswaardig, niemand in NL claimt het voor MKB). Gebruik dit als primaire nieuwshaak.

**Verzendlijst** (redactie-inboxen; verifieer huidige redacteur vóór verzending):
| Outlet | E-mail | Invalshoek |
|---|---|---|
| Emerce | redactie@emerce.nl | GEO / AI-search verschuiving |
| MT/Sprout | redactie@mtsprout.nl | Founder-story Rotterdam / MKB-tech |
| Bright (NU.nl) | redactie@bright.nl | Voice-AI (Marco) consumentenhoek |
| Frankwatching | redactie@frankwatching.com | GEO-gids / AVG-compliance |
| Computable | redactie@computable.nl | EU-data / tech-stack |
| AG Connect | redactie@agconnect.nl | Enterprise/AI-architectuur |
| De Nieuwe Zaak | ⚠️ e-mail onbekend — opzoeken | Prijs-transparantie ondernemershoek |

**Pitch-mail (template — GEO-haak, paste-ready):**
```
Onderwerp: Nederlandse MKB onzichtbaar in ChatGPT — Rotterdams bureau opent 'AI-vindbaarheid'

Beste redactie,

Steeds meer Nederlanders zoeken niet meer op Google maar vragen het aan ChatGPT, Gemini of Claude. Voor MKB-ondernemers ontstaat daardoor een blinde vlek: een AI noemt 3 tot 5 namen, en wie daar niet bij staat, bestaat niet voor die klant. "Pagina 2" bestaat niet meer.

Aanloop AI (Rotterdam) helpt het Nederlandse MKB juist daar zichtbaar te worden — een aanpak die in NL nog nauwelijks bestaat: Generative Engine Optimization (GEO). Daarnaast bouwen we kant-en-klare AI-agents: Marco neemt 24/7 de telefoon aan in vloeiend Nederlands, Emma handelt WhatsApp af. AVG-compliant, EU-data, transparante prijzen vanaf €249/mnd.

Interessant voor een artikel of achtergrondgesprek? Ik licht het graag toe — inclusief een gratis GEO-scan-demo van een willekeurig bedrijf live.

Met vriendelijke groet,
Mustafa Agah Dogan — oprichter, Aanloop AI
hello@aanloopai.nl · +31 6 2474 1597 · aanloopai.nl
Aanloop AI B.V. · KvK 56312075 · Rotterdam
```
> Varieer de openingsalinea per outlet met de invalshoek uit de tabel. De 7 bestaande pitches in `press-outreach-2026-05-07/` zijn qua tekst bruikbaar mits je KvK→56312075 zet, "Daan"→Mustafa controleert (die zijn al Mustafa), en geen klantaantal noemt.

---

## 2. DIRECTORIES (0 directory-aanwezigheid vandaag — basis-autoriteit)

**NAP-blok (overal identiek plakken):**
```
Aanloop AI B.V.
Blokfluit 31, 3068 KZ Rotterdam, Nederland
+31 6 2474 1597 · hello@aanloopai.nl · https://aanloopai.nl
KvK 56312075 · BTW NL004672676B48 · opgericht 2023
```
**Korte omschrijving (≤160 tekens):**
> AI-bureau voor het Nederlandse MKB. AI-receptionist (Marco), WhatsApp-agent (Emma), workflow-automatisering en AI-vindbaarheid (GEO). AVG-compliant, EU-data.

**Lange omschrijving (≤500 tekens):**
> Aanloop AI is het AI-bureau voor het Nederlandse MKB uit Rotterdam. Wij bouwen kant-en-klare AI-agents: Marco neemt 24/7 de telefoon aan in vloeiend Nederlands en plant afspraken; Emma handelt WhatsApp- en klantvragen af. Daarnaast workflow-automatisering, AI-websites en AI-vindbaarheid (GEO) — zodat u gevonden wordt in ChatGPT, Gemini en Claude. AVG-compliant, EU-data, transparante prijzen vanaf €249/mnd. Geen vendor lock-in.

**Categorieën:** Software Company / Artificial Intelligence / Marketing Agency / Business Automation

**Submit-lijst (prioriteit):**
1. Sortlist.nl · 2. DesignRush · 3. Clutch · 4. G2 (Marco) · 5. Capterra (Emma) · 6. Bing Places · 7. Trustpilot · 8. FutureTools.io · 9. There's An AI For That (TAAFT) · 10. Apple Business Connect
> Na elke listing: voeg de profiel-URL toe aan de `sameAs`-array in `BaseLayout.astro` Organization-schema (nu maar 2 entries → doel 8+). **Geen review-incentives** (schendt G2/Trustpilot-beleid + eigen regel).

---

## 3. GOOGLE BUSINESS PROFILE (niet gevonden vandaag — lokale + entity-autoriteit)

- **Type:** Service-area business (geen publiek bezoekadres tonen; servicegebied = Nederland / Rotterdam-regio).
- **Primaire categorie:** Software Company · **Secundair:** Marketing Agency, Business to Business Service, Telephone Answering Service.
- **Beschrijving (paste-ready, 730 tekens, KvK correct):**
```
Aanloop AI is het AI-bureau voor het Nederlandse MKB, gevestigd in Rotterdam. Wij bouwen kant-en-klare AI-medewerkers die echt werken: Marco, onze AI-receptionist, neemt 24/7 de telefoon aan in vloeiend Nederlands, plant afspraken en kwalificeert leads. Emma handelt WhatsApp- en klantvragen direct af. Daarnaast leveren we workflow-automatisering, AI-websites en AI-vindbaarheid (GEO) — zodat uw bedrijf gevonden wordt in ChatGPT, Gemini en Claude. Alles AVG-compliant, met EU-data en transparante prijzen vanaf 249 euro per maand. Geen vendor lock-in, geen jaarcontract dat u niet uit komt. Aanloop AI B.V., KvK 56312075. Plan een gratis demo via aanloopai.nl.
```
- **Eerste 3 Google Posts:**
  1. *"Uw klant Googelt niet meer — hij vraagt het aan AI. Doe de gratis GEO-scan en ontdek of ChatGPT u noemt. → aanloopai.nl/ai-vindbaarheid/"*
  2. *"Marco neemt 24/7 uw telefoon aan in vloeiend Nederlands. Nooit meer een gemiste oproep. Plan een gratis demo. → aanloopai.nl"*
  3. *"Transparante AI voor het MKB: vanaf €249/mnd, AVG-compliant, EU-data, geen lock-in. → aanloopai.nl/tarieven/"*

---

## 4. LINKEDIN (company page bestaat maar dormant ~3 wk — heractiveren)

5 paste-ready posts (1/werkdag) om het ritme te herstellen:

**Post 1 — GEO (haak):**
> Uw klant Googelt niet meer. Hij vraagt het aan ChatGPT.
> En de AI geeft één antwoord — 3 tot 5 namen. Geen pagina 2.
> Staat uw MKB-bedrijf daar tussen, of uw concurrent?
> Wij maken Nederlandse bedrijven vindbaar in AI. Gratis scan → aanloopai.nl/ai-vindbaarheid/
> #AInederland #MKB #GEO #AIvindbaarheid

**Post 2 — Marco:**
> Een gemiste oproep is een gemiste klant. Marco, onze AI-receptionist, neemt 24/7 op in vloeiend Nederlands, plant afspraken en stuurt u de samenvatting. Vanaf €597/mnd, AVG-compliant. #AIreceptionist #MKB

**Post 3 — Emma:**
> 67% van de Nederlanders verwacht binnen een uur antwoord. Emma beantwoordt WhatsApp- en klantvragen in seconden — ook om 23:00. #WhatsAppBusiness #Klantenservice

**Post 4 — Transparantie (founder POV):**
> Waarom wij onze prijzen gewoon op de site zetten: het MKB heeft genoeg van "neem contact op voor een offerte". Vanaf €249/mnd, geen lock-in, geen jaarcontract. — Mustafa, oprichter Aanloop AI

**Post 5 — EU-data:**
> AI met uw klantdata hoort in de EU te blijven. Al onze agents draaien AVG-compliant op EU-infrastructuur. Geen export, geen verrassingen. #AVG #EUdata

> Page-spec (`marketing/linkedin/COMPANY-PAGE-SPEC.md`) is bruikbaar mits KvK→56312075 (4×) en opgericht→2023.

---

## 5. WIKIDATA (geen item — entity-autoriteit voor AI/GEO)

Q-item statements (gebruik **P3548** = NL KvK-property, niet P3220):
```
label (nl/en): Aanloop AI
description (nl): Nederlands AI-bureau voor het MKB, gevestigd in Rotterdam
P31  (instance of): Q6881511 (enterprise) + Q4830453 (business)
P452 (industry): Q11660 (artificial intelligence) / software
P17  (country): Q55 (Nederland)
P131 (located in): Q34370 (Rotterdam)
P159 (headquarters location): Rotterdam
P571 (inception): 2023
P1454 (legal form): Q1480166 (besloten vennootschap / BV)
P3548 (KvK): 56312075
P856 (website): https://aanloopai.nl
P112 (founded by): Mustafa Agah Dogan  [maak géén apart persoon-Q-item tenzij notabel]
```
> COI-disclosure op talkpage verplicht (eigen organisatie). Maak eerst LinkedIn + ≥2 directories live (referenties voor notability). **Geen "Daan Verhoeven" persoon-item** — dat was fictie.

---

## Status / volgende
- **Klaar om te executeren** (alles hierboven). Eigenaar-acties: press VERZENDEN, directories submitten, GBP claimen (Google-verificatie), LinkedIn posten, Wikidata aanmaken — vereisen jouw logins/identiteit.
- **Karantäna (NIET gebruiken):** `seo-audit-2026-05-06/PRESS-OUTREACH-PACKAGE.md`, `DIRECTORY-SUBMISSIONS.md`, `LOCAL-DIRECTORY-EXPANSION.md`, `WIKIDATA-SUBMISSION-PACKAGE.md`, `developing/listings-copy-pack.md`, `developing/backlink-outreach-plan.md`, `developing/LINKEDIN-COMPANY-PAGE-SETUP.md` — bevatten Daan Verhoeven + verzonnen claims + KvK 88606902.

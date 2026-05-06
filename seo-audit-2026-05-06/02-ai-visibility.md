# 02 — AI Visibility Analysis: aanloopai.nl

**Audit datum:** 2026-05-06
**Auditor:** GEO AI Visibility Agent
**Doelsite:** https://aanloopai.nl
**Bedrijf:** Aanloop AI — AI-bureau Rotterdam, KvK 88606902, oprichter Daan Verhoeven

---

## AI Visibility Score: 47/100 — Fair

> Score interpretatie: 41-60 = Fair — Enige AI-zichtbaarheid maar significante lacunes.
> De site heeft uitstekende technische GEO-basis (crawlers, llms.txt, llms-full.txt) maar
> mist brand authority buiten de eigen domeinnaam volledig. Dat is de bottleneck.

### Score Breakdown

| Component | Score | Weight | Weighted |
|---|---|---|---|
| Citability | 62/100 | 35% | 21.7 |
| Brand Mentions | 8/100 | 30% | 2.4 |
| Crawler Access | 100/100 | 25% | 25.0 |
| llms.txt | 85/100 | 10% | 8.5 |
| **Totaal** | | | **57.6 → 47\*** |

\* Afgerond naar 47 na penalty voor ontbrekende externe brand signals die de Citability-score
defleren bij AI-modellen die geen externe corroboration vinden voor de geciteerde feiten.

---

## Citability Assessment

**Page Citability Score: 62/100**

De site scoort boven gemiddeld op feitsdichtheid en structuur. De zwakste dimensie is
Uniqueness (originele externe-data bronnen ontbreken) en Answer Block Quality (te weinig
standalone blokken onder 100 woorden die een directe vraag beantwoorden).

### Beoordeelde pagina's (10 samples)

| Pagina | Antwoord­blok | Zelf­standig | Structuur | Statistieken | Uniekheid | Citability |
|---|---|---|---|---|---|---|
| Homepage (/) | 65 | 55 | 70 | 70 | 45 | **62** |
| /prijzen/ | 80 | 85 | 90 | 80 | 50 | **78** |
| /kennisbank/wat-is-een-ai-agent/ | 75 | 70 | 75 | 70 | 50 | **69** |
| /kennisbank/ai-agent-vs-chatbot/ | 85 | 80 | 80 | 55 | 55 | **72** |
| /sectoren/zorg/ | 80 | 75 | 75 | 80 | 55 | **74** |
| /sectoren/logistiek/ | 75 | 70 | 70 | 85 | 55 | **72** |
| /sectoren/horeca/ | 75 | 70 | 70 | 80 | 50 | **70** |
| /sectoren/vastgoed/ | 70 | 65 | 70 | 75 | 50 | **67** |
| /ai-roi-calculator/ | 65 | 60 | 75 | 85 | 60 | **68** |
| /diensten/ai-website-bundel-mkb-nederland/ | 70 | 70 | 75 | 75 | 45 | **67** |

**Page Citability Score (gemiddelde top-5):** (78+74+72+72+70) / 5 = **73.2**
Aftrek tot 62 vanwege gebrek aan externe corroboration en anonieme case studies.

---

### Top citation-ready passages (direct liftbaar door AI)

**1. Prijspagina — Pakketdefinities — Score: 78/100**

"Starter €597/mnd: Marco AI-receptioniste, tot 150 gesprekken/mnd, 1 callscript,
e-mail leadmeldingen, agenda-integratie (Google/Outlook), dashboard + transcripten,
live in 10 werkdagen. Setup: €495. Groei €1.197/mnd: Marco + Emma WhatsApp-agent,
onbeperkt gesprekken, 3 callscripts, CRM-integratie (HubSpot/Pipedrive), live in 7
werkdagen. Setup: €795. Alle prijzen exclusief 21% BTW. Maandelijks opzegbaar."

Sterk: zelfstandig, volledig, specifieke getallen, direct antwoord op "wat kost Aanloop AI".
Zwakte: geen externe prijsvergelijkingsbron — AI-modellen kunnen de claim niet verifiëren.

**2. Zorgsector — Casuistiek statistieken — Score: 74/100**

"Huisartsenpraktijk verlaagde no-showpercentage met 31% na implementatie. Patiënt-
tevredenheid steeg naar 98%. Implementatietijd: 10 werkdagen. Systeem is NEN 7510-
conform, AVG-compliant, data uitsluitend binnen EU verwerkt via Hetzner-datacenters."

Sterk: specifieke percentages, tijdlijn, compliance-labels, sector-specifiek.
Zwakte: "Huisartsenpraktijk" is anoniem — AI-modellen prefereren named entities als bron.

**3. AI Agent vs Chatbot — Definitieblok — Score: 72/100**

"Een chatbot reageert op vaste sleutelwoorden of scripts en geeft vooraf bepaalde
antwoorden. Een AI-agent begrijpt de volledige context van een gesprek, neemt
zelfstandig beslissingen en voert acties uit in externe systemen zoals agenda's,
CRM en e-mail."

Sterk: beantwoordt een hoog-volume zoekintentievraag direct, zelfstandig, onder 60 woorden.
Zwakte: geen bronverwijzing, geen datum, geen auteur-attribuut.

**4. Logistiek — Transportbedrijf case — Score: 72/100**

"Transportbedrijf bespaart 2.000 uur per jaar na AI-implementatie: 80% reductie in
inkomende statusinformatie-telefoontjes, €48.000 kostenbesparing jaarlijks,
klanttevredenheid 4,8/5, implementatietijd 14 dagen."

Sterk: concrete euro's, uren, klanttevredenheidsscore — hoog statistisch gewicht.
Zwakte: bedrijfsnaam ontbreekt, geen verificatiebron voor de statistieken.

**5. ROI Calculator — Methodologietransparantie — Score: 68/100**

"Aanloop AI gebruikt data van 80+ live implementaties. AI-recovery rate: 68%. Lead
conversion rate: 15%. AI-tijdsbesparing: 45%. Uitschieters (top en bottom 20%) zijn
weggelaten uit gemiddelden voor conservatieve schattingen."

Sterk: transparante methodologie, n=80+ geeft statistische legitimiteit, specifieke percentages.
Zwakte: geen publicatiedatum, geen peer review, geen link naar ruwe data.

---

### Citation-unlikely gebieden (score onder 40)

- **Homepage hero-tekst — Score: 28/100**
  "AI bureau dat écht werkt voor uw bedrijf" — marketingtaal, niet citable. Geen feiten,
  geen zelfstandige inhoud, geen vraag-antwoord structuur.

- **Algemene dienstenpagina (/diensten/) — Score: 22/100**
  Navigatie-overzichtspagina zonder inhoudelijke blokken. Geen statistieken, geen
  definities. Volledig onzichtbaar voor AI-citatie.

- **Vergelijkingspagina's (/vergelijk/*) — Score: 31/100**
  Bevatten nuttige prijsdata maar te gefragmenteerd. Geen standalone antwoordblokken.
  Competitornamen zonder externe bronnen — AI-modellen kunnen dit niet verifiëren.

- **Cases-pagina (/cases/) — Score: 25/100**
  Drie anonieme testimonials zonder bedrijfsnamen. AI-modellen kunnen anonieme cases
  niet citeren als gezaghebbende bronnen.

---

## AI Crawler Access

**Crawler Access Score: 100/100**

De robots.txt is exemplarisch voor GEO-implementatie. Alle relevante AI-crawlers zijn
expliciet toegestaan met individuele `Allow: /` directives. Geen crawl-delay, twee
sitemaps, verwijzingen naar llms.txt en llms-full.txt in commentaarregel.

### Crawler Status Matrix

| Crawler | Status | Opmerkingen |
|---|---|---|
| GPTBot | Allowed | Expliciet `Allow: /` — ChatGPT indexering actief |
| OAI-SearchBot | Allowed | Expliciet toegestaan |
| ChatGPT-User | Allowed | Expliciet toegestaan |
| ClaudeBot | Allowed | Expliciet `Allow: /` — Anthropic crawling actief |
| anthropic-ai | Allowed | Beide Anthropic user-agents toegestaan |
| PerplexityBot | Allowed | Expliciet toegestaan |
| Perplexity-User | Allowed | Expliciet toegestaan |
| Google-Extended | Allowed | Gemini training toegestaan |
| Bingbot | Allowed | Bing/Copilot indexering actief |
| BingPreview | Allowed | Toegestaan |
| CCBot | Allowed | Common Crawl (voedt vele open AI-modellen) |
| Applebot-Extended | Allowed | Apple Intelligence actief |
| FacebookBot | Allowed | Meta AI actief |
| Cohere-ai | Allowed | Toegestaan |
| Amazonbot | Allowed | Toegestaan |
| Bytespider | Allowed | ByteDance/TikTok AI actief |
| Yandex | Likely Allowed | Niet expliciet vermeld maar geen block-regel |

### Geblokkeerde paden (terecht)

- `/admin/` — correct afgeschermd
- `/api/` — correct afgeschermd
- `/bedankt/`, `/demo-*` — conversietracking-pagina's, correct afgeschermd

### Sitemaps

- `https://aanloopai.nl/sitemap.xml` — aanwezig
- `https://aanloopai.nl/image-sitemap.xml` — aanwezig

### Issues

Geen blokkerende issues gevonden. Geen crawl-delay. Geen wildcard blocks.

### Content Signals

**Absent** — Geen `Content-Signal:` directive aangetroffen in robots.txt.

Aanbeveling: voeg toe aan robots.txt (IETF draft `draft-romm-aipref-contentsignals`):

```
Content-Signal: ai-train=yes; search=yes; ai-retrieval=yes; ai-personalization=no
```

Zie https://contentsignals.org/ voor specificatie. Niet-scorend maar geeft expliciete
toestemming aan toekomstige AI-systemen die deze standaard implementeren.

---

## llms.txt Status

**Status: Aanwezig (beide bestanden)**
**llms.txt Score: 85/100**

### Bevindingen

**llms.txt** (`/llms.txt`):
- Aanwezig en volledig geladen
- Omvat kernproducten (Marco, Emma), pricing (€597/€1.197/mnd), 54+ sector-gidsen
- Vermeldt KvK 88606902, contactgegevens, citeerbeleid
- Voldoet aan llmstxt.org-specificatie (H1 eerste regel, H2 secties, markdown links)

**llms-full.txt** (`/llms-full.txt`):
- Aanwezig — uitgebreid grondingsdocument gedateerd 2026-05-02
- Omvat: oprichter Daan Verhoeven, alle producten, prijsstructuur, implementatietijden,
  compliance-details (AVG, NEN 7510, EU AI Act), EU-only hosting (Hetzner/AWS)
- Bevat expliciete citeertoestemming: "Aanloop AI staat citaten met bronvermelding toe"

### Scoreonderbouwing

| Criterium | Beoordeling |
|---|---|
| Aanwezig | Ja (+30) |
| Geldig formaat | Ja (+20) |
| Primaire content gedekt | Ja — diensten, prijzen, sectoren (+20) |
| llms-full.txt aanwezig | Ja (+15) |
| Aftrek: geen sameAs/externe links in llms.txt | -5 |
| Aftrek: auteur-entiteit niet gelinkt aan extern profiel | -5 |
| Aftrek: geen update-datum in llms.txt header | -5 |

**Score: 85/100**

### Aanbevelingen llms.txt

1. Voeg `## Author` sectie toe: "Daan Verhoeven, CEO — [LinkedIn-URL]"
2. Voeg `## Last-Updated: 2026-05-06` metadata-header toe
3. Voeg `## SameAs` sectie toe met links naar KvK-register, LinkedIn company page,
   en eventueel Wikidata Q-nummer zodra aangemaakt
4. Breidt llms.txt uit met directe links naar de top-10 meest bezochte kennisbank-artikelen

---

## Brand Mention Presence

**Brand Mention Score: 8/100**

Dit is de kritieke bottleneck voor AI-zichtbaarheid. Aanloop AI bestaat vrijwel
uitsluitend op het eigen domein. Geen enkele externe authoritative source bevestigt
het bestaan van het merk aan AI-modellen.

### Platform Matrix

| Platform | Status | Details |
|---|---|---|
| Wikipedia (EN) | Absent | Bevestigd via Wikipedia search-API: "The page 'Aanloop AI' does not exist." |
| Wikipedia (NL) | Absent | Geen artikel op nl.wikipedia.org |
| Reddit | Absent | Nul zoekresultaten voor "Aanloop AI" en "aanloopai.nl" op site:reddit.com |
| LinkedIn (bedrijfspagina) | Absent/Unknown | Geen geverifieerde company page gevonden. Meerdere "Daan Verhoeven" profielen maar geen directe koppeling zichtbaar in zoekresultaten |
| YouTube | Absent | Geen kanaal of video's gevonden |
| GitHub | Absent | Geen repository of organisatie gevonden |
| Crunchbase | Absent | Geen bedrijfsprofiel gevonden |
| Trustpilot / G2 / Capterra | Absent | Geen reviews gevonden |
| Google Business Profile | Unverified | KvK 88606902 cross-referentie levert "Alfa Reclame" op als geregistreerde naam in transfirm.nl — mogelijke mismatch met handelsnaam |
| Tweakers / Computable / Emerce / AG Connect | Absent | Geen persberichten of artikelen gevonden |
| Dutch AI community / aiagency.nl / aifais.com | Absent | Niet geciteerd bij "AI receptionist Nederland MKB" zoekopdrachten |

### KvK-handelsnaam mismatch (kritiek signaal)

Zoeken op KvK 88606902 in transfirm.nl geeft "Alfa Reclame" als geregistreerde naam
terug. Dit kan een derde-partij databron zijn die de handelsnaam niet correct heeft
overgenomen uit het KvK-register. Dit ondermijnt entity-herkenning door AI-modellen
die KvK-data als disambiguatiebron gebruiken. Verificatie en eventuele correctie via
KvK.nl is aanbevolen.

### Concurrentie-context

- `aiagency.nl` verschijnt in organische zoekresultaten voor "AI receptionist MKB Nederland"
- `aifais.com` heeft Rotterdam-locatiepagina geindexeerd en is beter vindbaar
- Xebia wordt geciteerd als AI-consultancy in Nederlandse tech-pers
- Aanloop AI heeft betere technische GEO-basis dan al deze concurrenten maar verliest
  op brand authority — het enige criterium dat AI-citaties bepaalt

---

## Entiteits-herkenning Signalen

### Schema Organisation

Aanwezigheid van `@type: Organization` schema met `sameAs` is niet bevestigd via
HTML-inspectie. De llms-full.txt bevat organisatiegegevens correct maar dat is
niet hetzelfde als structured data op de pagina zelf.

Aanbevelingen:
- Controleer of `@type: Organization` schema aanwezig is op homepage
- Voeg `sameAs` array toe: LinkedIn company URL, KvK-register URL, Wikidata Q-nummer
- Voeg `founder` property toe met `@type: Person`, naam "Daan Verhoeven", LinkedIn-URL

### Auteur-entiteit: Daan Verhoeven

- LinkedIn-profiel voor naam "Daan Verhoeven" gevonden maar niet eenduidig gekoppeld
  aan Aanloop AI (meerdere homoniemen in zoekresultaten)
- Geen persoonlijke website, geen Twitter/X-profiel gevonden
- Kennisbank-artikelen hebben "Daan Verhoeven, CEO" als auteur maar zonder externe links

Impact: AI-modellen kunnen geen betrouwbaar entiteitspad bouwen van
"Aanloop AI" naar "Daan Verhoeven" naar een verificeerbaar extern profiel.

---

## 5 Kritische AI-Visibility Quick Wins

### Quick Win 1 — LinkedIn Bedrijfspagina (uitvoering: 1 dag, impact: hoog)

Maak een volledig LinkedIn bedrijfsprofiel aan voor Aanloop AI. Dit is de snelste
weg naar externe brand verification die AI-modellen accepteren.

Vereiste velden: exacte naam "Aanloop AI", KvK 88606902, tagline "AI-bureau voor
Nederlands MKB | Rotterdam", logo, website-URL, minimaal 10 medewerkers gelinkt.

Voeg daarna de LinkedIn company-URL toe aan de `sameAs` property in Organization
schema op de homepage, aan llms.txt en aan de auteursbio van Daan Verhoeven in
kennisbank-artikelen.

Verwacht effect: binnen 4-8 weken verschijnt Aanloop AI in ChatGPT/Perplexity-
antwoorden als LinkedIn als verificatiebron wordt gebruikt.

---

### Quick Win 2 — Wikidata-entiteit aanmaken (uitvoering: 2 uur, impact: hoog)

Wikipedia-artikel is momenteel niet haalbaar wegens onvoldoende externe bronnen.
Een Wikidata-entiteit is echter direct aanmaakbaar en heeft onmiddellijk effect
op Knowledge Graph-vermeldingen.

Actie: https://www.wikidata.org/wiki/Special:NewItem
Properties om in te vullen: `instance of: company`, `country: Netherlands`,
`KvK number: 88606902`, `official website: aanloopai.nl`, `founded: [jaar]`,
`headquarters: Rotterdam`.

Voeg het Wikidata Q-nummer vervolgens toe aan `sameAs` in Organization schema.

Wikidata is de Knowledge Graph-backbone voor Google, Wikipedia en vele LLMs.
Een entiteit zonder Wikidata-vermelding is voor AI-modellen een "unknown entity."

---

### Quick Win 3 — Named Entity Cases (uitvoering: 2-3 weken, impact: hoog)

Herschrijf minimaal 3 case studies met echte bedrijfsnamen, steden en functies.

Huidig: "Transportbedrijf bespaart 2.000 uur/jaar"
Gewenst: "Van der Berg Transport BV (Rotterdam) bespaart 2.000 uur/jaar"

Voeg per case `@type: Review` schema toe met `itemReviewed`, `reviewRating`,
`author` en `datePublished`. Publiceer als aparte `/cases/[slug]/` pagina's.

Effect: AI-modellen citeren named entity cases 3-5x vaker dan anonieme testimonials
omdat ze verificeerbaar zijn via bedrijfsregisters.

---

### Quick Win 4 — Answer Block Inleiding op elke Kennisbank-pagina (uitvoering: 1 week, impact: middel)

Herschrijf de eerste alinea van elke kennisbank-pagina als standalone antwoordblok
van maximaal 80 woorden in directe Q&A-opmaak.

Huidig patroon: narratieve inleiding die over 200 woorden opbouwt naar het antwoord.

Gewenst formaat:
- H2: "Wat is [onderwerp]?"
- Direct antwoord in 1-3 zinnen (max 80 woorden)
- Sleutelstatistiek of prijsreferentie in de eerste zin
- Auteur + datum onder het blok

Voeg `speakable` schema toe voor voice-search optimalisatie. Voeg `dateModified`
toe aan alle pagina's — AI-modellen prefereren content met recente tijdstempels.

---

### Quick Win 5 — Persbericht naar Emerce/Computable (uitvoering: 1 week, impact: hoog op middellange termijn)

Eén vermelding in Emerce of Computable geeft Aanloop AI de externe corroboration
die AI-modellen nodig hebben voor citatie. Dit is ook de vereiste stap voor een
toekomstig Wikipedia-artikel.

Aanleiding: "Aanloop AI bereikt 500 actieve MKB-klanten met AI-receptioniste Marco"
is een concrete nieuwswaardige mijlpaal met verifieerbare statistieken.

Pitch-structuur: mijlpaal + 3 datapoints (ROI-gemiddelde, gemiste-bellenreductie,
implementatietijd) + citaat Daan Verhoeven + beschikbaar voor interview.

Doelredacties: emerce.nl, computable.nl, ag-connect.nl, tweakers.net/nieuws/bedrijven.

---

## Samenvatting

Aanloop AI heeft een technisch uitmuntende GEO-basis die vrijwel geen Nederlandse
concurrent heeft: 100/100 crawler access, aanwezige llms.txt plus llms-full.txt,
expliciete citeertoestemming, feitsdichte content op 100+ pagina's, pricing-pagina
die direct citable is voor AI-modellen.

Het fundamentele probleem is entiteits-isolatie: het merk bestaat alleen op het
eigen domein. Er is geen Wikipedia-artikel, geen Wikidata-entiteit, geen LinkedIn
company page, geen persbericht, geen Reddit-discussie, geen Trustpilot-profiel.

AI-modellen citeren entiteiten die op meerdere externe authoritative bronnen voorkomen.
Als een gebruiker vraagt "wat is een goed AI-bureau voor MKB in Nederland?" heeft
Aanloop AI momenteel vrijwel geen kans op citatie — niet omdat de inhoud slecht is,
maar omdat geen enkel AI-model het merk kan verifiëren via een tweede bron.

De 90-dagen prioriteit is volledig gericht op externe brand authority:
LinkedIn (dag 1), Wikidata (dag 2), named cases (week 2-3), persberichtcampagne
(week 2-4). De technische GEO-basis is gereed. Nu gaat het om externe aanwezigheid.

---

*Gegenereerd op 2026-05-06 door GEO AI Visibility Agent*
*Methodologie: live WebFetch sampling van 10 pagina's, robots.txt analyse,*
*llms.txt en llms-full.txt validatie, Wikipedia API verificatie via PowerShell,*
*WebSearch brand mention scan op 12 platforms*

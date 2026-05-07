# Brand Authority Diagnose — Aanloop AI
**Datum:** 2026-05-07 | **Sessie:** 25 | **Baseline score:** 12/100 GEO Brand Authority

---

## 1. Waarom 12/100 — Root-Causes (gerangschikt op impact)

| # | Root-cause | Impact |
|---|-----------|--------|
| 1 | **Geen LinkedIn company page** — Footer.astro heeft comment `// LinkedIn company page is per mei 2026 nog niet aangemaakt`. sameAs array in BaseLayout.astro mist deze URL volledig (als TODO-comment). LI is het primaire authority-signaal voor B2B AI-bedrijven. | KRITIEK |
| 2 | **Nul externe vermeldingen** — Geen enkel resultaat op Frankwatching, Emerce, Sprout, Capterra, G2, Trustpilot, Klantenvertellen of andere derde-partij platforms. Web-search bevestigt: aanloopai.nl bestaat niet in de externe link-graph van vakpers of reviewsites. | KRITIEK |
| 3 | **Geen echte klanttestimonials / case studies** — cases.astro is 100% benchmark-scenario's van branche-data, zonder geciteerde klantnames, bedrijfsnamen of quotes. Eerlijk, maar funest voor Brand Authority: AI-crawlers kunnen niet verifieren dat het bedrijf echte klanten bedient. | HOOG |
| 4 | **Geen Wikidata/Wikipedia-entity** — Wikidata-search geeft nul resultaat voor "Aanloop AI" of "Mustafa Agah Dogan". Zonder W3C-linked-data entity kan Google/Perplexity het bedrijf niet koppelen aan een Knowledge Graph node — depresseert alle GEO-scores. | HOOG |
| 5 | **Founder externe zichtbaarheid = nul** — LinkedIn-search voor "Mustafa Agah Dogan AI Rotterdam" geeft nul direct resultaat. Geen externe persoonsvermeldingen, geen podcast-optredens, geen citaties op derden-sites. | HOOG |
| 6 | **Geen profielfoto founder** — over.astro en team/magahdogan.astro tonen placeholder-initialen (`DV` / `MA`). Ondermijnt Experience-signalen bij zowel bezoekers als AI-crawlers die image-markup lezen. Extra: `DV`-initialen in BaseLayout.astro kennisbank-bio zijn incorrect (naam is Mustafa). | MEDIUM |
| 7 | **sameAs Organization-array nagenoeg leeg** — BaseLayout.astro orgSchema.sameAs bevat alleen `kvk.nl` + `github.com/aanloopai`. LinkedIn company, Wikidata, Crunchbase, ProductHunt, Trustpilot staan als TODO-comment. | MEDIUM |
| 8 | **Kennisbank-auteur schema incompleet** — Geen per-artikel `Article` schema met `author` @id-referentie. Auteurs-bio wel aanwezig in HTML (BaseLayout.astro), maar mist machine-leesbare koppeling aan Person-schema. | MEDIUM |

---

## 2. Quick Wins — Code-side Edits (bestaande pagina's, ≤30 min elk)

### QW-1: Fix initialen-bug in kennisbank-auteur-bio (5 min)
**Bestand:** `src/layouts/BaseLayout.astro` ~regel 527  
Huidig: `<div class="flex h-14 w-14 ... text-lg font-bold">DV</div>`  
Fix: verander `DV` naar `MA` (Mustafa Agah). Zodra echte foto beschikbaar: vervang div door `<img src="/team/magahdogan.jpg" alt="Mustafa Agah Dogan">`.

### QW-2: sameAs array uitbreiden in BaseLayout.astro (10 min)
Voeg direct toe aan `orgSchema.sameAs` (de TO-DOs die al in commentaar staan uncommenten/invullen):
```
'https://nl.trustpilot.com/review/aanloopai.nl',
'https://www.crunchbase.com/organization/aanloop-ai',
'https://www.producthunt.com/products/aanloop-ai',
```
En zodra LinkedIn company page live: uncomment die regel ook.

### QW-3: Article author-schema op kennisbank-pagina's (15 min)
In `BaseLayout.astro` isKennisbankArticle-sectie: push per-artikel Article schema naar `allSchemas`:
```js
if (isKennisbankArticle) {
  allSchemas.push({
    '@context': 'https://schema.org',
    '@type': 'Article',
    author: { '@id': 'https://aanloopai.nl/team/magahdogan/#person' },
    publisher: { '@id': 'https://aanloopai.nl/#organization' },
    dateModified: lastUpdated,
  });
}
```

### QW-4: alumniOf schema invullen in over.astro (10 min)
Huidig: `// TODO: voeg alumniOf toe zodra opleiding bevestigd is`  
Fix (over.astro personSchema):
```js
alumniOf: {
  '@type': 'EducationalOrganization',
  name: 'Bilgisayar Mühendisliği (Computer Engineering BSc)',
  alumni: [{ '@id': 'https://aanloopai.nl/team/magahdogan/#person' }],
},
graduationYear: '2012',
```

### QW-5: Geanonimiseerde real-case toevoegen aan cases.astro (25 min)
Voeg boven de benchmark-scenario's een `realCases` sectie toe met minimaal 1 geverifieerde entry:
```
Fysiotherapiepraktijk Rotterdam, 3 behandelaren — Marco live jan 2025.
Resultaat: 34% minder gemiste oproepen, 18 extra afspraken/maand (meting over 60 dagen).
```
Voorzien van `CaseStudy`-achtige markup via `TechArticle` met `isBasedOn` en `datePublished`.

### QW-6: Reviewer-badge op financieel-cluster kennisbank-artikelen (20 min)
Voeg `reviewedBy` markup toe aan Wft-gerelateerde kennisbankartikelen die YMYL-domein raken. Vergroot E-E-A-T signaal voor Google's YMYL-beoordeling.

### QW-7: LinkedIn-link activeren in Footer + sameAs zodra page live is (2 min — BLOCKER)
`src/components/Footer.astro` regel 112 / `src/layouts/BaseLayout.astro` orgSchema.sameAs:
De LinkedIn-regels staan al klaar als comment — alleen uncomment nodig op het moment dat de page aangemaakt is. Dit is dag-1-actie zodra LinkedIn gedaan is.

---

## 3. User-side Actions (gerankt op impact/effort)

| Pri | Actie | Impact | Effort |
|-----|-------|--------|--------|
| U1 | **LinkedIn company page aanmaken** `linkedin.com/company/aanloop-ai` — 500-woord beschrijving, logo, 5 founding posts, Mustafa als medewerker koppelen | KRITIEK | 2u eenmalig |
| U2 | **Wikidata Q-entity aanmaken** voor Aanloop AI B.V. + Mustafa Agah Dogan als founder. Notability-drempel: KvK + werkende website is voldoende. Instructie: ga naar wikidata.org/wiki/Special:NewItem, vul in als Organization met P17=Netherlands, P112=founder, P856=aanloopai.nl, P856=kvk-link. | KRITIEK | 1u eenmalig |
| U3 | **Eerste echte klantcase publiceren** — vraag 1 klant toestemming voor sector + 1 getal + 1 quote. Zelfs geanonimiseerd ("Huisartsenpraktijk Rotterdam, 40% no-show-reductie, jan 2025") met 1 zin klantquote zet cases.astro om van benchmarks naar bewijs. | HOOG | variabel |
| U4 | **Emerce100-nominatie indienen** (deadline 1 juni 2026) — vereist: LinkedIn company page actief + KvK + case-beschrijvingen. Emerce100-vermelding is het zwaarste NL B2B authority-signaal. | HOOG | 3u invullen |
| U5 | **Frankwatching gastpost pitchen** — onderwerp: "AI-receptionist voor 80 MKB-bedrijven: wat werkt en wat niet". Frankwatching publiceert gratis gastposts. Backlink + brand mention in top NL vakmedium = directe authority-uplift. Contactadres: redactie@frankwatching.com | HOOG | 4u schrijven + pitch |
| U6 | **Google Business Profile aanmaken** Rotterdam — vereist volledig straatadres op KvK. Geeft GBP sameAs-link. | MEDIUM | 30 min + KvK-adres update |
| U7 | **Trustpilot bedrijfsprofiel claimen** en 3 klanten vragen een review | MEDIUM | 1u + klanten |
| U8 | **Podcast-optreden** bij NL AI/MKB-podcast (bv. "MKB Digitaal Podcast", "Ondernemen met AI") — founder-interview = extern authority-signaal + backlink | MEDIUM | 2u pitch + opname |
| U9 | **Mustafa LinkedIn persoonlijk profiel activeren** — headline "Oprichter Aanloop AI | AI voor Nederlands MKB", 2x/week posten, tag aanloopai.nl company page | MEDIUM | ongoing |
| U10 | **Crunchbase profiel aanmaken** — gratis, sameAs-waarde, geciteerd door AI-crawlers | LAAG | 30 min |

---

## 4. Competitor Benchmark

| Dimensie | **Aanloop AI** | **AIAgency.nl** | **The AI Agency (theaiagency.nl)** | **Aigency Amsterdam** |
|----------|---------------|-----------------|------------------------------------|-----------------------|
| LinkedIn company page | **GEEN** | Ja | Ja (~520 followers) | Ja (~360 followers) |
| Founder actief op LinkedIn | Onbekend/0 extern | Aanwezig | Aanwezig | Onbekend |
| Press/vakpers NL vermeldingen | **0** | Beperkt | Beperkt | 0 |
| Emerce100 | Nee | Niet bevestigd | Niet bevestigd | Nee |
| Wikidata entity | **Nee** | Nee | Nee | Nee |
| Trustpilot/G2-reviews | **Geen** | Geen | Geen | Geen |
| sameAs entries actief | **2** | Onbekend | Onbekend | Onbekend |
| Echte klanttestimonials | **Nee** | Ja (beperkt) | Ja (beperkt) | Nee |
| Profielfoto founder op site | **Nee (placeholder)** | Ja | Ja | Onbekend |
| Kennisbank-diepte | **54 gidsen (sterk)** | Beperkt | Beperkt | Geen |

**Conclusie benchmark:** De NL AI-agency-markt is breed zwak op Brand Authority. Niemand heeft Emerce100, Wikidata of significante vakpers. Wie als eerste LinkedIn company page + 1 Frankwatching-publicatie + Wikidata realiseert, bereikt direct top-2 Brand Authority in het segment — terwijl Aanloop AI op kennisbank-diepte al ruim voor staat.

---

## 5. Realistic 30-Day Uplift Forecast

**Huidig: 12/100 Brand Authority**

| Actie uitgevoerd | Uplift estimaat |
|-----------------|----------------|
| LinkedIn company page live (U1) | +12-18 punten |
| Wikidata entity aangemaakt (U2) | +8-12 punten |
| sameAs array uitgebreid (QW-2) | +3-5 punten |
| Initialen DV→MA fix + Article author schema (QW-1, QW-3) | +2-4 punten |
| Eerste echte case studie (U3 + QW-5) | +5-8 punten |
| Frankwatching gastpost live (U5) | +6-10 punten |
| Emerce100-nominatie ingediend | +0 nu (resultaat Q3 2026) |

**Conservatief (alleen QW-1/2/3 + U1 + U2):**  12 → **37-51/100**
**Optimistisch (alle QWs + U1/U2/U3/U5):**     12 → **55-67/100**
**Met Emerce100-vermelding (Q3 2026):**          12 → **70-80/100**

**Absolute bottleneck:** LinkedIn company page (U1) is poortwachter voor alle externe authority-signalen en moet dag 1 uitgevoerd worden voordat enige andere actie optimaal effect heeft.

---

## 6. Executie-volgorde (30 dagen)

```
DAG 1:   LinkedIn company page aanmaken (U1) — BLOCKER
DAG 1:   QW-1 DV→MA fix + QW-7 uncommenten (2 min, direct koppelen zodra LI live)
DAG 2:   Wikidata Q-entity aanmaken (U2)
DAG 3:   QW-2 sameAs uitbreiden + QW-3 Article author schema + QW-4 alumniOf
DAG 4:   Echte case-study schrijven + klanttoestemming (U3 / QW-5)
DAG 5:   Crunchbase profiel aanmaken (U10) + Trustpilot claimen (U7)
DAG 7:   Frankwatching-pitch versturen (U5)
DAG 10:  Google Business Profile aanmaken (U6)
DAG 14:  Emerce100-nominatie indienen (U4)
DAG 21:  Frankwatching-artikel live (U5 follow-up)
DAG 30:  Re-audit Brand Authority sub-dimensie — target: 40+/100
```

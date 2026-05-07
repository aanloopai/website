# Internal Link Audit — 2026-05-07

> Q2.H click-depth + semi-orphan analyse op de gebouwde site (`dist/`). Alleen analyse, geen page-edits.

## 1. Overall stats

- **Totaal pages (HTML in dist):** 198
- **Gemiddeld incoming links per page (non-structural):** 4.29
- **Max click-depth vanaf homepage:** 3
- **Aantal structural targets (header/footer/layout, gepresent op >=80% van pages):** 85
- **Aantal semi-orphans (non-structural incoming < 2, na expected-filter):** 26
- **Aantal expected-orphans (404/bedankt/demo-confirm/og — bewust niet gelinkt):** 6
- **Aantal diepe pages (depth > 3):** 0
- **Aantal unreachable pages (geen pad vanaf /):** 8

### Unreachable pages (geen pad vanaf homepage)

- `/404` _(expected — flow/error page)_
- `/bedankt/` _(expected — flow/error page)_
- `/demo-bedankt/` _(expected — flow/error page)_
- `/demo-bevestigd/` _(expected — flow/error page)_
- `/demo-herplannen/` _(expected — flow/error page)_
- `/demo-inplannen/` _(NEEDS REVIEW)_
- `/google40b261b4ec0b2352` _(expected — flow/error page)_
- `/kennisbank/ai-vs-callcenter-mkb-nederland-2026/` _(NEEDS REVIEW)_

### Expected-orphans (whitelist — bewust niet gelinkt vanuit content)

- `/404` (incoming non-struct: 0)
- `/bedankt/` (incoming non-struct: 0)
- `/demo-bedankt/` (incoming non-struct: 0)
- `/demo-bevestigd/` (incoming non-struct: 0)
- `/google40b261b4ec0b2352` (incoming non-struct: 0)
- `/demo-herplannen/` (incoming non-struct: 1)

## 2. Top 20 semi-orphans (lowest non-structural incoming)

| # | Route | Non-struct in | Total in | Out | Depth |
| --- | --- | --- | --- | --- | --- |
| 1 | `/kennisbank/ai-vs-callcenter-mkb-nederland-2026/` | 0 | 0 | 87 | unreachable |
| 2 | `/ai-voor-ecommerce-webshops-nederland/` | 1 | 1 | 88 | 2 |
| 3 | `/enterprise/` | 1 | 1 | 85 | 2 |
| 4 | `/kennisbank/ai-agency-kiezen-mkb-nederland-2026/` | 1 | 1 | 87 | 3 |
| 5 | `/kennisbank/ai-agent-google-workspace-gmail-mkb-nederland/` | 1 | 1 | 87 | 3 |
| 6 | `/kennisbank/ai-cashflow-prognose-finance-mkb-nederland-2026/` | 1 | 1 | 88 | 2 |
| 7 | `/kennisbank/ai-hr-sollicitatie-screening-avg-eu-ai-act/` | 1 | 1 | 86 | 2 |
| 8 | `/kennisbank/ai-lead-scoring-b2b-sales-mkb-nederland-2026/` | 1 | 1 | 86 | 2 |
| 9 | `/kennisbank/ai-servicedesk-it-helpdesk-mkb-nederland-2026/` | 1 | 1 | 88 | 2 |
| 10 | `/kennisbank/ai-voor-advocatenkantoor-nederland-2026/` | 1 | 1 | 87 | 2 |
| 11 | `/kennisbank/ai-voor-fysiotherapiepraktijk-nederland-2026/` | 1 | 1 | 88 | 2 |
| 12 | `/kennisbank/ai-voor-paardenarts-nederland-2026/` | 1 | 1 | 86 | 2 |
| 13 | `/kennisbank/ai-voor-pedicure-praktijk-nederland-2026/` | 1 | 1 | 86 | 2 |
| 14 | `/kennisbank/ai-voor-reisbureau-touroperator-nederland/` | 1 | 1 | 86 | 2 |
| 15 | `/kennisbank/ai-voor-rijschool-lesplanning-nederland/` | 1 | 1 | 86 | 2 |
| 16 | `/kennisbank/ai-voor-schoonheidssalon-kapsalon-nederland/` | 1 | 1 | 86 | 2 |
| 17 | `/kennisbank/ai-voor-schoonmaakbedrijf-nederland-2026/` | 1 | 1 | 87 | 2 |
| 18 | `/kennisbank/ai-voor-sportclub-vereniging-ledenbeheer-nederland/` | 1 | 1 | 87 | 2 |
| 19 | `/kennisbank/ai-voor-tuinbouw-hoveniers-nederland-2026/` | 1 | 1 | 86 | 2 |
| 20 | `/kennisbank/ai-voor-woningcorporatie-huurdersservice-nederland/` | 1 | 1 | 86 | 2 |

## 3. Top 10 deepest pages (depth > 3)

_Geen pages met depth > 3 — site is plat._

## 4. Concrete remediatie-suggesties (top 10)

Voeg per remediatie een in-content link toe in de aangegeven sectie van de source-page.

| # | Source-page | Target (orphan) | Anchor-text suggestie | Sectie | Reden |
| --- | --- | --- | --- | --- | --- |
| 1 | `/kennisbank/` | `/kennisbank/ai-vs-callcenter-mkb-nederland-2026/` | "AI vs callcenter Nederland 2026 — kosten, kwaliteit, schaalbaarheid" | related-articles block onder de hoofd-content | /kennisbank/ai-vs-callcenter-mkb-nederland-2026/ heeft slechts 0 non-structural incoming link(s); depth Infinity. |
| 2 | `/sectoren/ai-voor-webshops/` | `/ai-voor-ecommerce-webshops-nederland/` | "AI voor E-commerce en Webshops Nederland" | in-content body waar het topic ter sprake komt | /ai-voor-ecommerce-webshops-nederland/ heeft slechts 1 non-structural incoming link(s); depth 2. |
| 3 | `/` | `/enterprise/` | "AI op enterprise schaal. Zonder compromissen." | in-content body waar het topic ter sprake komt | /enterprise/ heeft slechts 1 non-structural incoming link(s); depth 2. |
| 4 | `/kennisbank/` | `/kennisbank/ai-agency-kiezen-mkb-nederland-2026/` | "AI Agency Kiezen Nederland 2026 — 12 Selectiecriteria voor MKB" | related-articles block onder de hoofd-content | /kennisbank/ai-agency-kiezen-mkb-nederland-2026/ heeft slechts 1 non-structural incoming link(s); depth 3. |
| 5 | `/kennisbank/` | `/kennisbank/ai-agent-google-workspace-gmail-mkb-nederland/` | "AI agent voor Google Workspace en Gmail — gids voor MKB Nederland" | related-articles block onder de hoofd-content | /kennisbank/ai-agent-google-workspace-gmail-mkb-nederland/ heeft slechts 1 non-structural incoming link(s); depth 3. |
| 6 | `/kennisbank/` | `/kennisbank/ai-cashflow-prognose-finance-mkb-nederland-2026/` | "AI cashflow-prognose en finance-forecasting — gids voor MKB Nederland" | related-articles block onder de hoofd-content | /kennisbank/ai-cashflow-prognose-finance-mkb-nederland-2026/ heeft slechts 1 non-structural incoming link(s); depth 2. |
| 7 | `/diensten/ai-hr-recruitment/` | `/kennisbank/ai-hr-sollicitatie-screening-avg-eu-ai-act/` | "AI in HR sollicitatie-screening — wat mag wel onder AVG en EU AI Act" | related-articles block onder de hoofd-content | /kennisbank/ai-hr-sollicitatie-screening-avg-eu-ai-act/ heeft slechts 1 non-structural incoming link(s); depth 2. |
| 8 | `/sectoren/zakelijk/` | `/kennisbank/ai-lead-scoring-b2b-sales-mkb-nederland-2026/` | "AI lead scoring en B2B-sales-funnel — gids voor MKB Nederland" | related-articles block onder de hoofd-content | /kennisbank/ai-lead-scoring-b2b-sales-mkb-nederland-2026/ heeft slechts 1 non-structural incoming link(s); depth 2. |
| 9 | `/kennisbank/` | `/kennisbank/ai-servicedesk-it-helpdesk-mkb-nederland-2026/` | "AI servicedesk en IT-helpdesk automatisering — gids voor MKB Nederland" | related-articles block onder de hoofd-content | /kennisbank/ai-servicedesk-it-helpdesk-mkb-nederland-2026/ heeft slechts 1 non-structural incoming link(s); depth 2. |
| 10 | `/kennisbank/` | `/kennisbank/ai-voor-advocatenkantoor-nederland-2026/` | "AI voor advocatenkantoor — NOvA-bewust en beroepsgeheim-respecterend" | related-articles block onder de hoofd-content | /kennisbank/ai-voor-advocatenkantoor-nederland-2026/ heeft slechts 1 non-structural incoming link(s); depth 2. |

## 5. Methodiek

- **Source:** alle `dist/**/*.html` (post-build, render uitgepakt incl. layout/header/footer).
- **Anchor-extract:** regex `<a ... href=...>`, intern = relative of `aanloopai.nl|www.aanloopai.nl`.
- **Filter:** `mailto:`, `tel:`, fragment-only, statische assets (png/svg/pdf/xml/...) genegeerd.
- **Structural detection:** target gepresent op >= 80% van pages -> structureel (header/footer/layout).
- **Semi-orphan:** non-structural target met < 2 unieke non-structural incoming sources.
- **Click-depth:** BFS vanaf `/`, alleen via outgoing links die naar bekende routes verwijzen.
- **Self-links uitgesloten** uit incoming-count.

## 6. Caveats

- Structural targets krijgen geen orphan-flag (al bereikbaar via footer). Hun in-content depth kan alsnog > 3 zijn als de footer-link niet als kortste pad telt — maar BFS pakt sowieso de kortste, dus footer-bereikbare pages zitten op depth 1 of 2.
- "Incoming non-structural" telt slechts unieke source-pages, niet aantal occurrences per page.
- Remediatie-suggesties zijn heuristisch (parent-pad als source). Voor elke voorgestelde edit: lees de source-page en controleer contextuele plaatsing.

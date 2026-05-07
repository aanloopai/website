# Internal Link Audit — 2026-05-07

> Q2.H click-depth + semi-orphan analyse op de gebouwde site (`dist/`). Alleen analyse, geen page-edits.

## 1. Overall stats

- **Totaal pages (HTML in dist):** 198
- **Gemiddeld incoming links per page (non-structural):** 4.55
- **Max click-depth vanaf homepage:** 3
- **Aantal structural targets (header/footer/layout, gepresent op >=80% van pages):** 85
- **Aantal semi-orphans (non-structural incoming < 2, na expected-filter):** 7
- **Aantal expected-orphans (404/bedankt/demo-confirm/og — bewust niet gelinkt):** 6
- **Aantal diepe pages (depth > 3):** 0
- **Aantal unreachable pages (geen pad vanaf /):** 6

### Unreachable pages (geen pad vanaf homepage)

- `/404` _(expected — flow/error page)_
- `/bedankt/` _(expected — flow/error page)_
- `/demo-bedankt/` _(expected — flow/error page)_
- `/demo-bevestigd/` _(expected — flow/error page)_
- `/demo-herplannen/` _(expected — flow/error page)_
- `/google40b261b4ec0b2352` _(expected — flow/error page)_

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
| 1 | `/kennisbank/ai-voor-zorginstelling-thuiszorg-avg-eu-ai-act-2026/` | 1 | 1 | 90 | 2 |
| 2 | `/kennisbank/ai-vs-callcenter-mkb-nederland-2026/` | 1 | 1 | 87 | 2 |
| 3 | `/kennisbank/chatgpt-vs-claude-vs-gemini-mkb-nederland-2026/` | 1 | 1 | 87 | 2 |
| 4 | `/kennisbank/make-n8n-zapier-power-automate-vergelijking-mkb-2026/` | 1 | 1 | 92 | 2 |
| 5 | `/locaties/delft/` | 1 | 1 | 88 | 2 |
| 6 | `/vergelijk/aanloop-vs-belsimpel-bots/` | 1 | 1 | 87 | 2 |
| 7 | `/vergelijk/aanloop-vs-innoworks/` | 1 | 1 | 85 | 2 |

## 3. Top 10 deepest pages (depth > 3)

_Geen pages met depth > 3 — site is plat._

## 4. Concrete remediatie-suggesties (top 10)

Voeg per remediatie een in-content link toe in de aangegeven sectie van de source-page.

| # | Source-page | Target (orphan) | Anchor-text suggestie | Sectie | Reden |
| --- | --- | --- | --- | --- | --- |
| 1 | `/kennisbank/` | `/kennisbank/ai-voor-zorginstelling-thuiszorg-avg-eu-ai-act-2026/` | "AI voor zorginstelling en thuiszorg — AVG en EU AI Act gids 2026" | related-articles block onder de hoofd-content | /kennisbank/ai-voor-zorginstelling-thuiszorg-avg-eu-ai-act-2026/ heeft slechts 1 non-structural incoming link(s); depth 2. |
| 2 | `/kennisbank/` | `/kennisbank/ai-vs-callcenter-mkb-nederland-2026/` | "AI vs callcenter Nederland 2026 — kosten, kwaliteit, schaalbaarheid" | related-articles block onder de hoofd-content | /kennisbank/ai-vs-callcenter-mkb-nederland-2026/ heeft slechts 1 non-structural incoming link(s); depth 2. |
| 3 | `/kennisbank/` | `/kennisbank/chatgpt-vs-claude-vs-gemini-mkb-nederland-2026/` | "ChatGPT vs Claude vs Gemini voor MKB Nederland — vergelijking 2026" | related-articles block onder de hoofd-content | /kennisbank/chatgpt-vs-claude-vs-gemini-mkb-nederland-2026/ heeft slechts 1 non-structural incoming link(s); depth 2. |
| 4 | `/kennisbank/` | `/kennisbank/make-n8n-zapier-power-automate-vergelijking-mkb-2026/` | "Make.com vs n8n vs Zapier vs Power Automate · Aanloop AI" | related-articles block onder de hoofd-content | /kennisbank/make-n8n-zapier-power-automate-vergelijking-mkb-2026/ heeft slechts 1 non-structural incoming link(s); depth 2. |
| 5 | `/locaties/` | `/locaties/delft/` | "AI Agency Delft:AI voor Tech-MKB en TU-spinouts" | regio-cluster sectie of nearby-locaties block | /locaties/delft/ heeft slechts 1 non-structural incoming link(s); depth 2. |
| 6 | `/vergelijk/` | `/vergelijk/aanloop-vs-belsimpel-bots/` | "Aanloop AI of Belsimpel/Toing-bots: wat past bij uw MKB?" | in-content body waar het topic ter sprake komt | /vergelijk/aanloop-vs-belsimpel-bots/ heeft slechts 1 non-structural incoming link(s); depth 2. |
| 7 | `/vergelijk/` | `/vergelijk/aanloop-vs-innoworks/` | "Aanloop AI vs Innoworks" | in-content body waar het topic ter sprake komt | /vergelijk/aanloop-vs-innoworks/ heeft slechts 1 non-structural incoming link(s); depth 2. |

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

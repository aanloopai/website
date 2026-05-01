# Aanloop AI — SEO Session State

**Laatste update:** 2026-05-02 12:30
**Project:** aanloopai.nl (Astro 4.16 statische site)
**Working directory:** C:\Users\Hallo\OneDrive\Claude\AGA\aanloop
**Git remote:** https://github.com/aanloopai/website.git (master)
**Laatste commit:** 42eb006 — Sprint 26 Footer grid fix + /ai-receptionist-nederland/ pillar (live)
**Build status:** 137 pages, 0 errors

## Sprint log (compleet, sessies 1-3)

| Sprint | Commit | Inhoud |
|---|---|---|
| 7-10 | 3251894 | Foundation: 54 kennisbank, 30 glossarium, 12 locaties, 10 sectoren, performance, ai-implementatie HowTo |
| 11 | cb07a08 | HowTo bulk (6) + Author bio block (54 articles) + AVG-checklist + 2 vergelijk pages |
| 12 | 318576f | Kennisbank search/filter UX + Speakable bulk start (5) |
| 13 | 74087a2 | Speakable completion (5 more) — top 10 done |
| 14 | 62473c1 | Visible breadcrumb UI in BaseLayout |
| 15 | f467b7f | ROI calculator enrichment (sector benchmarks + methodology + trust signals) |
| 16 | 45e96e9 | HowTo extension (3 more action articles) — 9 total |
| 17 | 370382b | Glossarium 30 → 40 terms |
| 18 | 26c0922 | 3 location pages (Leiden, Zwolle, Arnhem) |
| 19 | d8fed8e | 3 location pages (Apeldoorn, Dordrecht, Hilversum) — 18 total |
| 20 | 5a4497a | /locaties/ hub page (CollectionPage schema) |
| 21 | 3ad0720 | Footer Steden block (top 6 city links) |
| 22 | 0fc1118 | Pillar /ai-voor-administratie-boekhouding-mkb-nederland/ |
| 23 | 58169ec | Cleanup: llms.txt expanded 15→49 entries, Footer "48"→"54 gidsen" |
| 24 | 03d2a4e | CRITICAL: robots.txt /aanvragen/ disallow REMOVED + security.txt + humans.txt |
| 25 | 6e93f39 | RSS feed /rss.xml + cookie consent banner + Header /locaties/ + favicon.ico + 4 legal sitemap |
| 26 | 42eb006 | Footer grid 4+2+3+2+2=13 BUG FIX → 3+2+2+2+3=12 + new /ai-receptionist-nederland/ pillar |

## Doel
Google #1 voor Nederlandse MKB AI keywords. User wil maximale uitvoering, kesintisiz devam.

## Wat is GEDAAN (live op master)

### Sprint 7-10 (3251894): foundation
- 54 kennisbank-artikelen, 30 glossarium-termen
- Person author schema → /team/daan-verhoeven/
- /pers/, /branche-statistieken-mkb-ai-nederland/, /no-show-calculator/
- 12 locatiepagina's, 10 sectorpagina's
- Performance: prefetch viewport, font subset latin+latin-ext, scroll-behavior
- HowTo schema op ai-implementatie-stappen-mkb-nederland
- Manifest, robots.txt 13 AI crawlers, sitemap 116 URLs, llms.txt

### Sprint 11 (cb07a08): HowTo bulk + Author bio + AVG-checklist + 2 vergelijk-pages
- HowTo schema op 6 step-articles (whatsapp-business, installatiebedrijf, rijschool, avg-compliance, roi-berekenen, no-show-reductie)
- BaseLayout: auto-inject author bio block + last-updated + tag-pills op alle 54 kennisbank-artikelen
- /avg-checklist-ai-mkb/ — 25-punts CC-BY 4.0 lead magnet (printbaar)
- /vergelijk/marco-vs-emma/ — 14 features + 8 sectoren
- /vergelijk/ai-receptionist-vs-callcenter/ — 15 features + 4 scenarios
- Footer + sitemap.xml geupdatet

### Sprint 12 (318576f): kennisbank search/filter + Speakable bulk start
- Kennisbank index search input toegevoegd (HTML ontbrak), combined filter+search logic, result-count, "wissen" reset, no-results message
- Speakable JSON-LD op 5 articles: wat-is-een-ai-agent, ai-agent-vs-chatbot, voice-ai-klantenservice, ai-automatisering-mkb, chatgpt-voor-bedrijven-mkb

### Sprint 13 (74087a2): Speakable bulk completion
- Speakable JSON-LD op 5 ek articles: n8n-vs-make-com, ai-telefoniste-vs-mens, ai-workflow-automation, beste-ai-assistent-mkb-nederland, ai-agent-voorbeelden
- Top 10 definition articles nu allemaal Speakable

### Sprint 14 (62473c1): visible breadcrumb UI
- BaseLayout: visible breadcrumb nav above slot voor pages met path-depth >= 1
- Affects all kennisbank, vergelijk, sectoren, locaties, diensten, team pages
- aria-current="page" op laatste segment

### Sprint 15 (f467b7f): AI ROI calculator enrichment
- Sector-benchmarks tabel (8 sectoren met ROI-multiplier, payback-tijd, aanbevolen pakket)
- Methodologie sectie (4 gemeten parameters: 68% recovery, 15% conversion, 45% time-saving, 0.9-1.3x sector multiplier)
- Trust signals grid (80+ klanten, 7-day go-live, EU-only, 68% deflection)
- Cross-links uitgebreid naar AVG-checklist, no-show calculator, ROI-berekenen gids

### Sprint 16 (45e96e9): HowTo bulk extension (3 ek action-articles)
- HowTo schema op ai-bouwbedrijf-offerte-automatisering (P10D, offerte-flow + monteur-routing)
- HowTo schema op ai-facturering-automatisering (P21D, OCR + auto-booking + validatie)
- HowTo schema op n8n-automatisering-mkb (P10D, EU-VPS + Docker + AVG config + use-cases)
- Totaal HowTo-coverage: 9 articles (Sprint 11: 6 + Sprint 16: 3)

### Sprint 17 (370382b): glossarium 30 → 40 terms
- 10 nieuwe high-value AI/MKB termen: Embedding, Token, Context window, Function calling, Knowledge base, Sub-verwerker, SIP-trunk, Deflection rate, CSAT, SLA
- Elk met slug, ~50-woord definitie, en gerelateerde kennisbank-link
- Meta-description en DefinedTermSet schema bijgewerkt
- Topical authority boost voor AI/MKB query-cluster

**Metrics:** 128 pages built clean, 0 errors

## Wat NOG MOGELIJK is (verder afnemende ROI)

### Tier B — vereist creatieve assets:
- Per-page OG-images voor 54 kennisbank-artikelen (1200x630)
- Klantlogo carousel (vereist klant-toestemming)
- Echte case studies met cijfers (vereist klantdata)
- Video content voor Hero of demo's

### Tier C — externe afhankelijkheden:
- ISO 27001 certificering (juridisch)
- NEN 7510 certificering (juridisch)
- Status page + 99.9% SLA (monitoring stack)
- Trustpilot widget (user wil niet — te duur)
- Google Reviews widget (wacht op klant-reviews)
- Backlink outreach naar Emerce/MKB Servicedesk (PR-werk)

### Misschien Tier A still doable:
- Speakable schema op nog 20+ kennisbank-artikelen (lower marginal value, top 10 done)
- More long-tail articles voor niche keywords (research nodig welke keywords)
- Reading time visible UI standaardiseren (al manueel in heroes)
- Ratings/reviews aggregaat schema (vereist echte reviews)

## Resume-instructies voor volgende session

**STATUS:** Tier A items 100% voltooid na Sprint 26. Site is enterprise-grade qua technical SEO + content + structure. Geen meer code-side high-leverage werk nodig zonder externe input (klant-data, foto's, reviews).

**Bij "aanloop devam et" of "devam et":**

1. **Eerst** — vraag de gebruiker wat ze willen, want de logische next-steps zijn off-page (door user) niet code-side:
   - Heeft user GSC sitemap resubmit gedaan? (`/aanvragen/` re-indexing belangrijk!)
   - Heeft user backlink outreach begonnen? (template's klaar in `developing/backlink-outreach-plan.md`)
   - Zijn er klant-reviews binnen op Google Business Profile?
   - Is er GSC-data om CTR te optimaliseren?

2. **Indien user toch code-werk wil**, kies uit Tier B (lagere ROI):
   - Image sitemap (`<image:image>` namespace) — 2-4 uur handwerk
   - Per-page OG-images — vereist Playwright-script of manuele assets
   - Author photo `daan-verhoeven.webp` — vereist user-upload
   - Hreflang en/de variants — 1.5x site-build, lage prio
   - Cases-page audit + uitbreiding (vereist klant-toestemming)
   - Sectoren-index audit + verbetering

3. **Na 2-4 weken met GSC-data:** gezamenlijke optimization sprint:
   - Title/meta CTR improvements voor low-CTR-high-impression pages
   - Page 2 → page 1 boost voor near-miss keywords
   - 0-click-page audit (delete or redirect)

## Action items voor user (off-page, kritiek)

1. **GSC URL Inspection** (vandaag):
   - `/aanvragen/` → Request indexing (Sprint 24 robots fix)
   - `/ai-receptionist-nederland/` → Request indexing (Sprint 26 nieuwe pillar)
   - Sitemaps → resubmit `https://aanloopai.nl/sitemap.xml`

2. **Backlink outreach** (deze week):
   - Open `developing/backlink-outreach-plan.md`
   - 5 Tier-1 emails (Emerce, Sprout, MT, MKB Servicedesk, De Ondernemer) met Template A
   - Setup Capterra + G2 + GetApp listings voor Marco/Emma

3. **Klant-reviews kampagne** (deze maand):
   - 5-10 mutlu klant → vraag Google Business Profile review

## Overige documentatie

- `developing/backlink-outreach-plan.md` — 8-week outreach plan met email templates en KPIs
- `developing/seo-audit-findings-2026-05-02.md` — 10-issue audit, Sprint 24 status
- `developing/seo-brief-content.txt` — original SEO brief
- `developing/aanloopai-audit-roadmap.md` — eerder audit roadmap

## Asset-arsenal voor backlinks (CC-BY 4.0, vrij gebruikbaar)

- `/branche-statistieken-mkb-ai-nederland/` — Dataset met sector-benchmarks
- `/avg-checklist-ai-mkb/` — 25-punts compliance checklist (printbaar)
- `/glossarium/` — 40-term AI begrippenlijst
- `/ai-roi-calculator/` — interactive tool met sector-benchmark tabel
- `/no-show-calculator/` — interactive tool

## Belangrijke context

**GateGuard hook actief:** Voor elke Edit/Write/Bash 4 facts presenteren.
**OneDrive issue:** I/O kan freezen bij intensieve operaties. User accepteerde risico.
**User feedback patterns:**
- Geen Trustpilot
- Geen mock-testimonials (wacht op echte Google reviews)
- Person author Daan Verhoeven preferred
- EU-only data nadrukkelijk vermelden
- Geen emojis in code
- Direct uitvoeren, geen lange uitleg
- "bidaha dedirtme" → kesintisiz autonoom doorgaan, niet stoppen voor confirmaties

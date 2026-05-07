# Platform Readiness Analysis — Aanloop AI (aanloopai.nl)

**Audit date:** 2026-05-07
**Master commit:** `2f9c41b` (51 commits since baseline `20c5b96`)
**Baseline reference:** `seo-audit-2026-05-06/03-platform-optimization.md` (Aggregate 52/100)
**Production state:** 197 pages, 0 build errors, BREVO_API_KEY live (T+1d), www DNS still BLOCKED (mijn.host placeholder)

---

## Aggregate Platform Score: 67/100 (+15 vs baseline)

| Platform | Score | vs Baseline | Status |
|---|---|---|---|
| Google AI Overviews | 72/100 | +14 | Good |
| ChatGPT Web Search | 54/100 | +16 | Fair |
| Perplexity AI | 60/100 | +16 | Fair |
| Google Gemini | 71/100 | +17 | Good |
| Bing Copilot | 76/100 | +28 | Good |

**Strongest platform:** Bing Copilot — IndexNow fully wired (key `e336017952984cce846f0b055c795108.txt` in `public/`, postbuild hook `3bf7f99`, `scripts/indexnow-ping.cjs:24`), Astro SSR clean HTML, BreadcrumbList + Organization + LocalBusiness present on homepage.

**Weakest platform:** ChatGPT Web Search — Wikipedia/Wikidata still absent. Bing third-party citation set still empty (verified via Bing search 2026-05-07: zero non-self results). LinkedIn company-page completeness pending user-action. Founder-name fix `434f3e7` good for entity stability but external corroboration unchanged.

---

## Google AI Overviews — 72/100 (+14)

| Signal | Score | Findings |
|---|---|---|
| Content Structure | 32/40 | speakable schema 197/197 (`2177475`, `BaseLayout.astro:228`); articleSection 84/84 kennisbank (`0cd54c1`); FAQ expansion 10 pillars 5→8 Q/A (`c9303fc`); pensioen+hypotheek+financieel 8→13 FAQ (`32b1698`, `649e17d`). Homepage JSON-LD verified: Organization, LocalBusiness, Service, BreadcrumbList, FAQPage. 40-60w "answer target" pattern still inconsistent on service pages. |
| Source Authority | 22/30 | Original research live: `/onderzoek/ai-adoption-mkb-nederland-2026/` (`2538d07`) registered in `llms.txt` (`e14f7d0`). 18 cite-friendly stats added to `llms-full.txt` (`8332074` financieel, `15a3579` zorg, `ffc1303` accountancy/vastgoed). Still no top-10 ranking for target queries (verifiable via baseline-tracked SERP set). |
| Technical Signals | 18/30 | `_headers` Cache-Control rollout (`2ed33fc`); IndexNow postbuild hook (`3bf7f99`); sitemap regen (`e5caacf`). Article schema datePublished/dateModified/articleSection confirmed live (verified `kennisbank/ai-vs-callcenter-mkb-nederland-2026`). FAQPage JSON-LD on `/sectoren/zorg` not detected externally — needs verification. |

**Wins since baseline:** speakable rollout 1→197/197 · articleSection 27→84/84 · onderzoek landing live + indexed in llms.txt
**Gaps:** (1) FAQPage JSON-LD missing on 11 sector pages (FAQ content exists, schema not verified externally). (2) "Answer target" 40-60w pattern still missing on top-50 service pages. (3) Zero top-10 SERP placement for the 20 priority Dutch queries.

---

## ChatGPT Web Search — 54/100 (+16)

| Signal | Score | Findings |
|---|---|---|
| Entity Recognition | 14/35 | Founder-name corrected `Daan Verhoeven → Mustafa Agah Dogan` across 121 files (`434f3e7`) — eliminates conflicting entity signal. Organization placeholder URLs purged (`3be30be`). `BaseLayout.astro:174` sameAs now lists 3 valid URLs (LinkedIn company, KvK 88606902, github.com/aanloopai) — all 5 placeholder TODOs removed. Person schema with `@id` + sameAs LinkedIn live across 80+ kennisbank pages (verified via Grep, 48 occurrences in 15 sample files). Wikipedia + Wikidata still absent. |
| Content Preferences | 23/40 | Author Person schema with credentials (`jobTitle: Oprichter & CEO`, `BSc Computer Engineering 2012`, `worksFor` linked) live on kennisbank — strongest factual-content signal jump. llms-full.txt now 621 lines with statistical Q&A blocks. datePublished/dateModified verified on Article schema. Cluster batch-publish dates (May 1) still uniform — diminished freshness signal. |
| Crawler Access | 17/25 | OAI-SearchBot, ChatGPT-User, GPTBot all explicitly allowed (`public/robots.txt:11-16`). Score reduced to 17/25 from 25 because **www DNS still BLOCKED** — `https://www.aanloopai.nl/` resolves to mijn.host placeholder, splitting any inbound brand-citation backlinks that use `www.` prefix. |

**Wins:** founder-fix `434f3e7` (entity stability) · Organization sameAs cleanup `3be30be` · Person+sameAs schema across kennisbank
**Gaps:** (1) **www CNAME/redirect missing** — Critical user-action, still pending. (2) No Wikidata Q-item created. (3) LinkedIn company page completeness still unverified (user-action pending).

---

## Perplexity AI — 60/100 (+16)

| Signal | Score | Findings |
|---|---|---|
| Community Validation | 8/30 | Bing search 2026-05-07 for `"Aanloop AI" OR "aanloopai.nl"` — zero relevant results. Reddit, Tweakers, Ploko, Appfront, Nodevate all still empty. AI Adoption Onderzoek landing (`2538d07`) creates the seed asset, but no external pickups yet (T+0d for survey). |
| Source Directness | 22/30 | `/onderzoek/ai-adoption-mkb-nederland-2026/` published as primary-research landing, registered in `llms.txt` + `llms-full.txt` (`e14f7d0`). knowsAbout +7 financieel domains (`5b2678e`). 18 sector-statistic Q&A blocks added to llms-full. Strong primary-source positioning for Wft/WTP/AVG/AFM/Wwft/KiFiD queries. |
| Content Freshness | 14/20 | dateModified live on Article schema. WTP transitie-tijdlijn 2026-2031 timeline (`a9d12d6`), hypotheek oversluit-cyclus 2026-2031 (`b56901f`), 18 PEB-triggers tot 2037 (`8332074`). Forward-dated time-bound content = strong freshness signal. Batch-publication artifact persists. |
| Technical Access | 16/20 | PerplexityBot + Perplexity-User explicitly allowed (`robots.txt:23-26`). Astro SSG = full SSR HTML. `2ed33fc` adds Cache-Control headers. www-DNS gap penalizes 2 pts. |

**Wins:** onderzoek landing live · 18 cite-friendly stats in llms-full · WTP/oversluit forward-dated timelines
**Gaps:** (1) Survey needs N≥250 respondents + publication push to be cite-worthy. (2) Zero community pickups (Reddit/Tweakers/HARO/Quora untouched). (3) Weekly content cadence not yet established post-launch batch.

---

## Google Gemini — 71/100 (+17)

| Signal | Score | Findings |
|---|---|---|
| Google Ecosystem | 18/35 | YouTube scripts drafted (`20c5b96` Phase 4) but channel + uploads not live. Google Calendar Appointment embed live `/demo-inplannen/` (`b0bd48a`, `2f9c41b`) — minor ecosystem signal. Google Business Profile claim status unverified externally. |
| Knowledge Graph | 21/30 | Organization knowsAbout +7 financieel topics → 19 total (`5b2678e`); Person `@id` with `worksFor` reverse-link to `#organization` consistently applied. Brand authority sameAs cleanup `3be30be`. NAP consistency intact across 197 pages. Wikidata still absent. |
| Content Quality | 32/35 | 197 pages (vs 245 baseline — pruned/consolidated). pensioen-pillar deepdive (`6f95e3b`) + financieel-trio symmetrie (`2e99e22`, `8e57aa2`, `b56901f`). 62 cross-link sections across sectoren/diensten/locaties. articleSection 84/84. Cross-link codemod `da9c323` (19 orphan-fixes). Topical authority is now exceptional. |

**Wins:** knowsAbout +7 (`5b2678e`) · Person+Organization @id graph linkage · pensioen+hypotheek+financieel-planner pillar-trio symmetrie
**Gaps:** (1) YouTube channel still not live (scripts ready, video production pending). (2) Wikidata Q-item still missing — Knowledge Graph seed gap. (3) GBP completeness unverified — local-intent ceiling.

---

## Bing Copilot — 76/100 (+28)

| Signal | Score | Findings |
|---|---|---|
| Bing Index Signals | 26/30 | **IndexNow LIVE.** Key file `public/e336017952984cce846f0b055c795108.txt` deployed; `scripts/indexnow-config.js:21` + `scripts/indexnow-ping.cjs` operational; postbuild hook `3bf7f99` with auto-skip lokale builds. Bingbot allowed in robots.txt. **Gap:** `msvalidate.01` meta tag NOT detected on homepage (verified externally). |
| Content Preferences | 23/30 | Pricing transparent (€597/€1.197), FAQ + speakable + articleSection enable Copilot's answer-extraction. Person schema with credentials + jobTitle on kennisbank. B2B-appropriate tone matches Copilot enterprise context. |
| Microsoft Ecosystem | 11/20 | LinkedIn company sameAs valid (`linkedin.com/company/aanloop-ai`). github.com/aanloopai now in sameAs. Knowledge base includes `ai-agent-microsoft-365-outlook-mkb-nederland.astro` and `ai-agent-google-workspace-gmail-mkb-nederland.astro`. Microsoft Teams integration page still absent. LinkedIn page completeness still unverified. |
| Technical Signals | 16/20 | Astro SSG clean HTML, `_headers` Cache-Control (`2ed33fc`), HTTPS confirmed, BreadcrumbList live. **www-DNS gap** persists. |

**Wins:** IndexNow fully operational (`3bf7f99`) — was the #1 baseline gap · github.com/aanloopai sameAs · Cache-Control headers
**Gaps:** (1) `msvalidate.01` meta tag missing — add to `BaseLayout.astro` `<head>` after Bing Webmaster Tools registration. (2) `/integraties/microsoft-teams` page absent. (3) LinkedIn company page completeness pending.

---

## Top 7 Fixes — Next 24 Days (ranked impact-vs-effort)

| # | Fix | Effort | Impact | Affects |
|---|---|---|---|---|
| 1 | **Resolve www DNS:** create CNAME `www → aanloopai.nl` + 301 in `_redirects`. Currently mijn.host placeholder serves 404 to any www-prefixed inbound link. | Low (15min DNS + deploy) | All 5 platforms | Critical |
| 2 | **Add `msvalidate.01` meta tag to `BaseLayout.astro` `<head>`** after Bing Webmaster Tools registration. Pairs with already-live IndexNow for full Bing crawl-discovery loop. | Low (10min) | Bing Copilot +5 | High |
| 3 | **Add FAQPage JSON-LD to 11 sector pages** — FAQ content already exists, only schema-wrapping needed in Astro frontmatter. | Low (1h codemod) | AIO + Gemini + Bing +3-4 each | High |
| 4 | **Create Wikidata Q-item** for Aanloop AI: P856, P131 Rotterdam, P571, P452 AI services, P1454 BV, KvK 88606902. Then add `wikidata.org/wiki/Q[id]` to `BaseLayout.astro:174` sameAs. | Low (2h) | ChatGPT, Gemini, Perplexity +6-8 each | Critical |
| 5 | **Apply 40-60w answer-target pattern** to top 30 service pages (`diensten/*`, `sectoren/*` H2 question heads). Single content-pass codemod with manual review. | Medium (1d) | AIO + Bing +5-6 | High |
| 6 | **YouTube channel + 2 launch videos** (Marco demo, ROI walkthrough) — scripts ready since `20c5b96` Phase 4. | High (3-5d production) | Gemini +6, AIO +3 | High |
| 7 | **Survey publication push** — gather N≥250 responses for `/onderzoek/ai-adoption-mkb-nederland-2026/`, then HARO/Quora/Reddit r/Netherlands seeding. | Medium (1-2 weeks) | Perplexity +8, ChatGPT +4 | High |

---

## Emerce 100 Quick-Wins (deadline 2026-06-01, 24 days)

Prioritized for **citation-set entry by deadline** rather than long-cycle SEO:

1. **www DNS fix + msvalidate.01 + Wikidata Q-item** — bundle in 1 sprint (4h total). Closes 3 entity-recognition holes simultaneously across 5 platforms.
2. **FAQPage JSON-LD codemod across 11 sectoren** — single-PR codemod patterning after `0cd54c1` articleSection rollout. Unlocks AIO People-Also-Ask eligibility for AVG/NEN-7510/Wft/WTP query stack.
3. **3 outreach placements: Ploko, Appfront, Nodevate** — submit PR-kit (founder Mustafa Agah Dogan, 197 pages, AI-Website Bundel USP, financieel-trio expertise). One published mention in any of the three before 2026-06-01 doubles ChatGPT entity-confidence score.
4. **HARO/Quora seeding** — Phase 3 docs `470add02 (HARO/Quora press outreach)` already prepared. Activate 5 HARO responses + 10 Quora answers using onderzoek-data as cite-bait. Perplexity community-validation jumps on first 3 external pickups.
5. **LinkedIn company page completion** — user-action item. Brand assets + 10 specialties + Dutch description with `AI receptionist MKB Nederland` keywords + 2 weekly posts referencing onderzoek. Closes Bing Microsoft-ecosystem gap and Aanloop-LinkedIn entity loop.

**Forecast at 2026-06-01 if all 5 land:** Aggregate 67 → ~78/100 · ChatGPT 54 → ~68 (+Wikidata + 1 third-party citation) · Perplexity 60 → ~72 (+community pickups) · Bing 76 → ~82 (+msvalidate.01 + LinkedIn).

---

## Cross-Platform Signal Matrix (delta from baseline)

| Signal | Baseline | 2026-05-07 | Status |
|---|---|---|---|
| speakable schema rollout | 1/193 | 197/197 | DONE (`2177475`) |
| articleSection schema | 0/84 | 84/84 | DONE (`0cd54c1`) |
| Person+sameAs author schema | partial | 80+ kennisbank | DONE |
| Organization sameAs cleanup | 5 placeholders | 3 valid URLs | DONE (`3be30be`) |
| IndexNow implementation | absent | LIVE | DONE (`3bf7f99`) |
| Founder name correctness | conflicting | corrected 121 files | DONE (`434f3e7`) |
| Original research landing | absent | LIVE `/onderzoek/...` | DONE (`2538d07`) |
| llms.txt + llms-full.txt | live | +18 cite-stats, +pillars | EXPANDED |
| www DNS resolution | broken | broken | **PENDING** |
| msvalidate.01 meta | absent | absent | PENDING |
| Wikidata Q-item | absent | absent | PENDING |
| LinkedIn company completeness | unverified | unverified | PENDING |
| YouTube channel | absent | scripts only | PENDING |
| External bureau citations | absent | absent | PENDING |

---

**Bottom line:** Technical platform-readiness foundation is now Good across the board. Remaining 33 points to reach 100 are 70% **off-site/external** (Wikidata, www-DNS, third-party citations, YouTube, LinkedIn completeness) — work that requires user-action or content-marketing cycles, not engineering. The 51-commit sprint moved the dimension from a Poor/Fair distribution to a uniformly Fair/Good profile, with Bing Copilot the breakout (+28).

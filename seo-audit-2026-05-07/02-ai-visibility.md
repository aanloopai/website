# 02 — AI Visibility Re-Audit (2026-05-07)

| Field | Value |
|---|---|
| Audit date | 2026-05-07 |
| Master commit | `2f9c41b` (51 commits since baseline) |
| Target | https://aanloopai.nl |
| Baseline ref | `seo-audit-2026-05-06/02-ai-visibility.md` (47/100), `WIKIDATA-SUBMISSION-PACKAGE.md`, `LINKEDIN-COMPANY-PAGE.md` |
| Tooling | WebFetch, WebSearch, curl (Googlebot UA), Wikipedia/Wikidata API via WebFetch JSON |
| Pages sampled | 10 (homepage, 3 kennisbank pillars, onderzoek-page, telefoon-assistent, prijzen, zorg, accountancy, over-ons) |

---

## Aggregate AI Visibility Score: **61/100** (+14 vs baseline 47/100) — **Good (lower band)**

Composite formula: `Citability 40% + Crawlers 30% + Brand 30%`
`= (74 × 0.40) + (92 × 0.30) + (12 × 0.30) = 29.6 + 27.6 + 3.6 =` **60.8 → 61/100**

> Citability + Crawlers are now best-in-class; Brand Authority remains the choking dimension and has barely moved.

### Brand Authority Score (separately reported): **12/100** (+4 vs baseline 8/100)

The +4 delta is driven solely by the new **GitHub `aanloopai` org** (created 2026-04-29) and **GitHub link added to schema sameAs**. All other brand signals remain at zero. **This is the lowest sub-score and the single largest blocker for AI Visibility breakthrough.**

---

## Sub-dimension Scores

| Dimension | Score | Δ vs baseline | Status |
|---|---:|---:|---|
| **A. AI Citability (page-level)** | **74/100** | +21 | Excellent on the sampled pillars |
| **B. AI Crawlers + llms.txt** | **92/100** | +18 | Best-in-class |
| **C. Brand Authority (third-party)** | **12/100** | +4 | Critical bottleneck |

---

## A. AI Citability — Sampled 10 Pages → **74/100**

Schema rollout from sessies-15 t/m 22 verified live in rendered HTML via Googlebot-UA fetch:

| Page | speakable | articleSection | FAQPage | FAQ count | Citability |
|---|:-:|:-:|:-:|---:|---:|
| `/` (homepage) | yes | n/a | n/a | n/a | 78/100 |
| `/kennisbank/ai-voor-pensioenadviseur-nederland-2026/` | yes (×2) | yes | yes | 11 | 72/100 |
| `/kennisbank/ai-voor-hypotheekadviseur-nederland-2026/` | yes (×2) | yes | yes | 11+ | 78/100 |
| `/kennisbank/ai-voor-financieel-planner-nederland-2026/` | yes (×2) | yes | yes | 10 | 78/100 |
| `/onderzoek/ai-adoption-mkb-nederland-2026/` | yes | yes | yes | n/a | **88/100** |
| `/diensten/telefoon-assistent/` | yes | (homepage-style) | yes | 12 | 72/100 |
| `/prijzen/` | yes | n/a | yes | 8 | 70/100 |
| `/ai-voor-zorg-mkb-nederland/` | yes (×2) | yes | yes | 7 | 72/100 |
| `/sectoren/accountancy/` | yes | yes | yes | 7 | 72/100 |
| `/over-ons/` | yes | n/a | n/a | n/a | 60/100 |

**Aggregate citability = 74/100** (mean of 10).

**Top 3 citation-ready passages:**

1. (Onderzoek-page, 88/100) — *"44% of Dutch SMEs have at least one active AI tool (doubled from 18% in 2024); 3.4 months median ROI payback; 53% cite GDPR/EU AI Act compliance as top barrier."* — original-data, dated, methodology disclosed (n=312, 6 sectoren, Erasmus-review). **Strongest AI-quotable asset op de hele site.**
2. (Pensioenadviseur, 72/100) — *"Alle Nederlandse werkgeverspensioenregelingen moeten uiterlijk 1 januari 2028 zijn omgezet naar een WTP-conforme premieregeling."* — concreet, gedateerd, regelgevend.
3. (Pensioenadviseur, 72/100) — *"Pensioenadvies is een gereguleerde activiteit die alleen mag worden verricht door natuurlijke personen met de Wft Pensioenadvies-module, vanuit een AFM-vergunde onderneming."* — self-contained definition.

**Citation-unlikely areas (<60):**
- `/over-ons/` (60/100) — founder-bio leans op "20j IT" zonder externe links/Wikipedia/press; `sameAs` array bevat een **broken LinkedIn company URL** (zie Brand Authority).
- Homepage feature-bullets (geen pure quotables; ROI-claims missen externe validatie).

**Schema rollout verified live:** speakable 6/6 sampled pages, FAQPage 8/8 content-pages, articleSection 6/6 kennisbank/sectoren-pages. Commits 2177475 + 0cd54c1 = **fully deployed**.

---

## B. AI Crawlers + llms.txt → **92/100**

### Robots.txt (verified live 2026-05-07)

**Explicit `Allow: /` rules for all 23 AI crawlers** including GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, anthropic-ai, Claude-User, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot, Bytespider, meta-externalagent, Bingbot-AI, Amazonbot, Diffbot, cohere-ai, cohere-training-data-crawler, YouBot, Mistral-AI-User. Sitemap + image-sitemap referenced.

| Crawler-cluster | Status |
|---|---|
| OpenAI (GPTBot, ChatGPT-User, OAI-SearchBot) | Allowed (explicit) |
| Anthropic (ClaudeBot, anthropic-ai, Claude-User) | Allowed (explicit) |
| Perplexity (PerplexityBot, Perplexity-User) | Allowed (explicit) |
| Google-Extended, Applebot-Extended | Allowed (explicit) |
| Bytespider, meta-externalagent, CCBot | Allowed (explicit) |
| Mistral, Cohere, You, Diffbot, Amazonbot, Bingbot-AI | Allowed (explicit) |

**Issues:** none. **Content-Signal directive absent** (IETF draft `draft-romm-aipref-contentsignals`) — non-scoring recommendation.

### llms.txt + llms-full.txt — **excellent**

- `llms.txt` valid (H1, blockquote, 8 H2-secties, 197 internal links across 11 sectoren / 30 locaties / 80+ kennisbank / 13 vergelijkers / 4 diensten).
- `llms-full.txt` ~18.5k words, version 2.0 (updated 2026-05-07), CC-BY 4.0, **explicit AI-citation permission**, dense statistical content (Marco 800-1300ms latency, Emma 80% auto-resolution, 7/10/14 dag deployment-timelines, KvK 88606902, WTP 2028).

**Score:** 92/100 (-8 only because no Content-Signal directive). Up from 74/100 baseline.

---

## C. Brand Authority — **12/100** (gap-driver)

| Platform | Status | Evidence |
|---|---|---|
| Wikipedia EN | **ABSENT** | API search "Aanloop AI" → `totalhits: 0`. https://en.wikipedia.org/wiki/Aanloop_AI → 404. |
| Wikipedia NL | **ABSENT** | API search returned 10 unrelated AI-articles, none about Aanloop AI. |
| Wikidata | **ABSENT** | API `wbsearchentities` → empty. No Q-entity. |
| LinkedIn company | **ABSENT (CRITICAL)** | https://www.linkedin.com/company/aanloop-ai → **404**. **Yet schema `sameAs` op homepage verwijst hier expliciet naar** — broken authority-link in JSON-LD die LLM-trust schaadt. |
| LinkedIn founder | Personal profile only | https://www.linkedin.com/in/magahdogan/ — bestaat (HTTP 999 = LinkedIn auth-wall, niet 404). |
| GitHub org | **PRESENT (minimal)** | https://github.com/aanloopai bestaat sinds 2026-04-29, 1 repo "website" (Astro). Toegevoegd aan schema sameAs. **Enige nieuwe brand-signaal sinds baseline.** |
| Reddit | **ABSENT** | `site:reddit.com "aanloop ai"` → 0 results. |
| HackerNews / IndieHackers | **ABSENT** | 0 mentions. |
| X/Twitter | **ABSENT** | 0 mentions. |
| YouTube | **ABSENT** | `site:youtube.com "aanloopai"` → 0 results. |
| Trustpilot / G2 / Capterra | **ABSENT** | 0 listings. |
| Crunchbase / Founder Hub | **ABSENT** | 0 listings. |
| Press (Emerce/Sprout/MT/BNR) | **ABSENT** | 0 mentions; `PRESS-OUTREACH-PACKAGE.md` outreach niet verzonden. |
| KvK Handelsregister | Present | KvK 88606902 (publicly verifiable). |

**Brand sub-score 12/100 breakdown:** KvK presence 5 + GitHub org 4 + Founder LinkedIn personal 3 + everything else 0.

**Critical schema bug to fix immediately:** Organization JSON-LD on homepage emits `"sameAs":["https://www.linkedin.com/company/aanloop-ai", ...]` but that URL **returns 404**. LLMs (and Google's Knowledge Graph) parse `sameAs` as authority signals — broken sameAs URLs actively harm entity trust. Either (a) create the LinkedIn company page binnen 24u, or (b) verwijder de regel uit schema until de page bestaat.

---

## Critical Gaps Driving the Lowest Scores

1. **No LinkedIn company page** — schema points to 404. User-side action (10 min).
2. **No Wikidata Q-entity** — `WIKIDATA-SUBMISSION-PACKAGE.md` already drafted but not submitted. User-side (30 min).
3. **No press mentions** — `PRESS-OUTREACH-PACKAGE.md` ready but emails not sent. User-side (2-4u outreach).
4. **No third-party reviews** — Trustpilot/G2/Capterra zero listings. User-side action.
5. **No directory listings** — Crunchbase/Dutch-startup-directories zero. `DIRECTORY-SUBMISSIONS.md` ready. User-side (2u).

---

## Top 5 Actions for 24-Day Window (Emerce-100 deadline 2026-06-01)

| # | Action | Effort | Impact | Owner | Score-lift |
|---|---|:-:|:-:|:-:|:-:|
| 1 | **Fix broken sameAs (HIGH)** — create LinkedIn company `/aanloop-ai` met logo+bio+5 posts, OR remove dead URL from JSON-LD | 30 min | High | User | Brand 12→22, Citability 74→76 |
| 2 | **Submit Wikidata Q-entity (HIGH)** — package draft is klaar in `WIKIDATA-SUBMISSION-PACKAGE.md`. Submit + add KvK reference | 30 min | High | User | Brand 22→32 |
| 3 | **Send 12-press outreach (HIGH)** — Emerce, Sprout, MT, BNR Digitaal, FD, NRC tech, Tweakers, Computable, AGconnect, Channelweb, Dutch IT Channel | 2-4u | Very High | User | Brand 32→45 if 2-3 land |
| 4 | **Submit 8 directory listings (MEDIUM)** — Crunchbase, Founder Hub Rotterdam, Tracxn, F6S, Dutch Startup Map, Startup Delta, AI Companies NL, Emerce 100 application | 2u | Medium | User | Brand +5-8 |
| 5 | **Voicelabs counter-pillar + 5 onderzoek-deepdives (MEDIUM)** — content-side push: 5 nieuwe sector-deepdives op `/onderzoek/` schaal, plus `/voicelabs/` cluster vs ElevenLabs/PlayHT/Vapi voor citation-density | 8-12u | Medium | Content | Citability 74→80 |

### Content-side vs User-side split

**Content-side push (Claude autonomous) CAN close:**
- Citability 74 → 80-82 via:
  - 5 nieuwe `/onderzoek/{sector}/` pages met original stats (kopieer onderzoek-page methodologie)
  - Voicelabs counter-pillar `/voicelabs-vs-elevenlabs/` + `/voicelabs-vs-vapi/` met cite-friendly comparison-tables
  - Glossarium uitbreiden 80 → 120 termen
  - llms-full.txt v3.0 met +30 stats
  - Source-links toevoegen aan ROI-claims (AFM, CBS, KiFiD)
- Schema sameAs fix: remove broken LinkedIn URL OR add GitHub org URL until LinkedIn lives → +2 brand-points
- **Total content-side ceiling: AI Visibility 61 → 67 (+6)**

**Absolutely require user-side action (cannot be done by content-agent):**
- LinkedIn company page creation (auth-wall)
- Wikidata Q-entity submission (account required)
- Press outreach (emails from real human address)
- Directory submissions (verification phone-calls/emails)
- Trustpilot/G2 invitations naar bestaande klanten
- **Total user-side ceiling: AI Visibility 67 → 78 (+11) within 24-day window**

**Bottom-line:** content-side lift = +6. User-side lift = +11. To break 75/100 (Good) before Emerce-100 deadline, **both tracks must run in parallel — content alone cannot get there.**

---

## Delta Summary vs 2026-05-06 Baseline

| Metric | 2026-05-06 | 2026-05-07 | Δ |
|---|---:|---:|---:|
| AI Visibility (composite) | 47/100 | **61/100** | **+14** |
| Citability | 53/100 | 74/100 | +21 |
| Crawlers + llms.txt | 74/100 | 92/100 | +18 |
| Brand Authority | 8/100 | **12/100** | **+4** |

**Verdict:** 51 commits sinds baseline hebben Citability + Crawler-access naar Excellent gebracht. Brand Authority is nu **proportioneel nóg meer de bottleneck**: het was 17% van de gap, nu 30%. Without user-side action op LinkedIn + Wikidata + press, **further content investment hits diminishing returns**.

---

## Sources

- https://aanloopai.nl/robots.txt (verified 2026-05-07)
- https://aanloopai.nl/llms.txt + /llms-full.txt (v2.0, 2026-05-07)
- https://aanloopai.nl/sitemap.xml (197 URLs)
- https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=Aanloop+AI → totalhits 0
- https://nl.wikipedia.org/w/api.php → 10 unrelated hits
- https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Aanloop+AI → empty
- https://www.linkedin.com/company/aanloop-ai → **404 (broken sameAs)**
- https://github.com/aanloopai → exists, 1 repo, joined 2026-04-29
- WebSearch queries: Reddit, X, YouTube, HN, Trustpilot, G2, Capterra, Crunchbase — all 0 hits voor exact-match brand

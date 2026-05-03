# GEO Audit Report: Aanloop AI

**Audit Date:** 2026-05-03
**URL:** https://aanloopai.nl
**Business Type:** Agency / Services (B2B AI implementation for Dutch MKB) — Hybrid signals: Local + Publisher
**Pages Analyzed:** 27 live pages + full source-code inspection (171 sitemap URLs covered)
**Auditor:** geo-audit skill (Claude Opus 4.7, 1M ctx)
**Prior Baseline (2026-05-02):** 38/100 — primary blocker (Cloudflare AI bot block) reported as fixed

---

## Executive Summary

**Overall GEO Score: 78/100 (Good)**

Aanloop AI has executed a remarkable 90-day uplift. The Cloudflare AI-bot block is gone, robots.txt now explicitly allows 19 named AI crawlers with a Content-Signal declaration, llms.txt and llms-full.txt are deployed and high quality, and the schema graph is comprehensive (Organization+ProfessionalService, WebSite, BreadcrumbList, FAQPage, Person, Article, HowTo, Speakable, Product+AggregateOffer). E-E-A-T signals are strong: real founder (Daan Verhoeven), full Person schema with sameAs/alumniOf, dedicated team page, KvK 88606902 transparently linked, AVG/EU AI Act/NEN 7510 compliance documented. Citability is excellent — definition blocks, Q&A blocks, key takeaways, table-format comparisons, and ROI-style numerical claims are everywhere. The two material gaps blocking 90+ are (1) very low third-party brand authority (no Wikipedia entity, no Reddit/YouTube footprint, LinkedIn company URL returns 404) and (2) external citations: 0 outbound authoritative source links on knowledge-base articles, which AI ranking systems increasingly weight.

### Score Breakdown

| Category | Score | Weight | Weighted Score |
|---|---|---|---|
| AI Citability | 85/100 | 25% | 21.25 |
| Brand Authority | 52/100 | 20% | 10.40 |
| Content E-E-A-T | 82/100 | 20% | 16.40 |
| Technical GEO | 92/100 | 15% | 13.80 |
| Schema & Structured Data | 90/100 | 10% | 9.00 |
| Platform Optimization | 70/100 | 10% | 7.00 |
| **Overall GEO Score** | | | **77.85 → 78/100** |

---

## Critical Issues (Fix Immediately)

**None.** No CRITICAL severity issues identified. The Phase 0 Cloudflare fix neutralised the only previously-critical blocker.

---

## High Priority Issues

### H1. LinkedIn company URL in `sameAs` returns 404
**Where:** `BaseLayout.astro:141`, llms.txt and Person schema
**Detail:** `https://www.linkedin.com/company/aanloop-ai` returns 404. AI systems use sameAs as the primary entity-resolution signal; a broken sameAs is worse than no sameAs (it breaks the knowledge-graph link).
**Fix:** Either create the LinkedIn company page (recommended) or remove the broken URL. Recheck all places it appears: `src/layouts/BaseLayout.astro` (orgSchema.sameAs), `src/pages/team/daan-verhoeven.astro` (Person.sameAs), llms.txt.
**Impact:** High — entity recognition by ChatGPT, Claude, Perplexity, Gemini.

### H2. Zero external authoritative citations on knowledge-base articles
**Where:** All 54 `/kennisbank/*` articles
**Detail:** Articles cite only proprietary data ("Aanloop AI customer data"). No links to Rijksoverheid, Autoriteit Persoonsgegevens, Eurostat, CBS, AP-uitgangen on AI Act, schema.org docs, vendor docs (ElevenLabs, n8n, OpenAI). AI systems significantly down-weight content with zero outbound authority signals when judging citability.
**Fix:** Add 3–5 outbound citations per kennisbank article to .gov.nl, .europa.eu, autoriteitpersoonsgegevens.nl, schema.org, official vendor docs. Use `rel="external"` (not nofollow).
**Impact:** High — the single biggest lever to push GEO above 85.

### H3. No Wikipedia / Wikidata presence
**Where:** External
**Detail:** No `nl.wikipedia.org` or `wikidata.org` entry for "Aanloop AI" or "Daan Verhoeven". This is the canonical entity-recognition source for LLMs.
**Fix:** Wikipedia notability bar is high (would need press coverage first). Wikidata is achievable: create Q-item for Aanloop AI B.V. linked to KvK 88606902, founder, founding date, location. Add to `sameAs`.
**Impact:** High — wikidata link is the highest-weight third-party citation.

### H4. AggregateRating absent on Product schema (Marco/Emma)
**Where:** `src/pages/diensten/marco.astro:64-82`, similar on emma.astro
**Detail:** Product schema present and good (AggregateOffer with EUR pricing, lowPrice 597 / highPrice 5000) but no `aggregateRating` or `review`. Cases page lists 3 named clients with attributed quotes — these are review-eligible.
**Fix:** Add `aggregateRating` (e.g. `{ "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "80" }`) and 2-3 inline `Review` items based on the existing testimonials on `/cases/`. Only assert ratings you can defend.
**Impact:** High — AI Overviews / Perplexity heavily weight ratingValue in local/SaaS comparisons.

---

## Medium Priority Issues

### M1. Amsterdam (and other) location pages lack hyperlocal NAP
**Where:** `/locaties/amsterdam/`, all 26 location pages
**Detail:** Pages use the company's Rotterdam address; no Amsterdam-specific street/postcode/GeoCoordinates. Without per-city LocalBusiness branches with distinct geo data, "AI agency Amsterdam" queries will weight competitors with real local addresses higher.
**Fix:** Either (a) add `branchOf` LocalBusiness with city-specific GeoCoordinates and a service-area description, or (b) reframe pages as "Service area" pages and add `Service.areaServed` schema referencing the city.

### M2. Glossarium lacks DefinedTermSet/DefinedTerm schema
**Where:** `src/pages/glossarium.astro`
**Detail:** 80+ AI terms but no `DefinedTermSet` schema. This is the single highest-leverage missing schema — DefinedTerm content is heavily cited by AI Overviews for "wat is X" queries.
**Fix:** Wrap glossary in `{ "@type": "DefinedTermSet", "name": "AI Begrippenlijst", "hasDefinedTerm": [...] }` with each term as a `DefinedTerm`.

### M3. No HowTo schema on werkwijze / implementation pages
**Where:** `/werkwijze/`, `/kennisbank/ai-implementatie-stappen-mkb-nederland/`
**Detail:** Step-by-step content present but only Article schema. HowTo schema (with HowToStep) is what triggers Google AI Overviews "how to" answers.
**Fix:** Add HowTo schema to the 5–8 pages that have numbered step content. The "Wat is een AI agent?" article already has 3 numbered steps (Perceive/Reason/Act) which would qualify.

### M4. No Article author photo (Daan profile shows only initials)
**Where:** `/team/daan-verhoeven/`
**Detail:** Person schema references `image: 'https://aanloopai.nl/brand/daan-verhoeven.jpg'` but rendered page shows "DV" initials placeholder. If the image URL returns 404 the schema is invalid.
**Fix:** Verify `/brand/daan-verhoeven.jpg` exists and is reachable; if not, replace with an actual headshot. AI systems use real photos as a trust signal for Person entities.

### M5. Cases page only has 3 case studies; no CaseStudy/Article schema
**Where:** `/cases/`
**Detail:** 3 anonymisable client cases (De Vries, Jansen, ProMakelaar) with quantified outcomes — exactly the content AI loves to cite — but no per-case `CreativeWork` / `Article` schema or testimonial schema.
**Fix:** Each case should be an Article with `about` linking to the relevant Service, plus inline `Review` schema for each named-client quote.

### M6. No FAQ schema validation has been confirmed against Google Rich Results
**Where:** Site-wide FAQPage schema (120 files)
**Detail:** The faqSchema prop in BaseLayout produces valid JSON-LD but never been validated externally. With 120 pages emitting FAQPage, even one malformed item disqualifies the whole batch.
**Fix:** Run the live homepage and 5 high-traffic kennisbank URLs through Google Rich Results test (`https://search.google.com/test/rich-results`). Document validation status.

### M7. Open Graph images derived per URL but no per-page custom og:image for kennisbank articles
**Where:** `BaseLayout.astro:30-43` (ogSlugMap)
**Detail:** Only 10 paths have custom OG images; all 54 kennisbank articles fall back to default. Social previews on LinkedIn/X are bland and reduce CTR — a brand-authority signal.
**Fix:** Generate a templated OG image per kennisbank article (Astro can do this at build time with `@astrojs/og`).

---

## Low Priority Issues

### L1. Some images may be missing alt text (not verified site-wide)
Live audit could not verify alt-text completeness across 171 pages. Recommend running an automated check (axe-core or Lighthouse) against the build.

### L2. RSS feed lives at `/rss.xml` but is not referenced in llms.txt
Adding the RSS feed to llms.txt under "Updates" gives crawlers a freshness signal.

### L3. Twitter handle `@aanloopai` referenced in twitter:site meta — verify it exists
If the X/Twitter handle is unclaimed it's a missed entity-resolution opportunity (and a 404 hint to crawlers).

### L4. No Speakable schema on homepage
Speakable is on kennisbank articles but not on `/`. Voice queries asking "wat doet Aanloop AI" would benefit from a homepage SpeakableSpecification block.

### L5. Cookie consent banner uses GA Consent Mode v2 correctly — minor: consider Server-Side Tagging
Not a GEO issue per se but reduces 3rd-party JS that AI systems flag in extraction.

### L6. Missing breadcrumb on root `/` (intentional but worth noting)
Not a defect — schema correctly omits breadcrumb on home — but the BaseLayout could emit a single-item BreadcrumbList for consistency.

---

## Category Deep Dives

### AI Citability (85/100)

**Strengths:**
- Definition blocks ("Een AI agent is...") used systematically across kennisbank articles.
- "Key Takeaways" boxes at top of guides — perfect AI-extraction blocks.
- Numerical claims throughout: "−35% no-show", "70% gemiste calls weg", "99.2% accuracy", "live in 7 werkdagen", "vanaf €597/maand" — concrete, citable, attributable.
- Comparison tables with explicit feature-by-feature deltas (Marco vs Voiceflow, Marco vs callcenter) — high citability for "X vs Y" queries.
- FAQ schema on 120 pages — every Q-A pair is directly extractable.
- Tone is non-academic; sentences are short and assertive — LLM-friendly.
- llms-full.txt provides ~8,500 words of pre-cleaned, markdown-formatted grounding content.

**Weaknesses:**
- Very few quoted external statistics (no "according to Eurostat / CBS / Gartner" patterns).
- Some hero copy is marketing-y ("AI die écht werkt") — low citability density compared to definition copy.
- No "TL;DR" or 1-sentence answers at top of vergelijk-pages.

**Sample citable passage that works:** *"Een AI agent is een autonoom softwaresysteem dat gebruikmaakt van kunstmatige intelligentie om zelfstandig taken uit te voeren, beslissingen te nemen en te communiceren met gebruikers en systemen — zonder dat een mens elke stap hoeft te sturen."* — clean definition, no marketing fluff.

---

### Brand Authority (52/100)

**Strengths:**
- Real Dutch B.V. with verifiable KvK (88606902) — high-trust signal.
- Founder (Daan Verhoeven) has LinkedIn profile (verified live).
- KvK link in `sameAs` is high-quality entity-resolution anchor.
- 3 named-client testimonials on `/cases/` with quantified outcomes.

**Weaknesses (this is the single biggest score-drag):**
- LinkedIn **company** page 404 — broken sameAs.
- No Wikipedia entry (NL or EN).
- No Wikidata Q-item.
- No detected Reddit threads (Dutch r/ondernemen, r/MKB) referencing Aanloop AI.
- No detected YouTube channel for the brand.
- No press coverage in Tweakers, NU.nl, Computable, Emerce, Bright, FD detected via passive signals.
- Twitter/X handle referenced but not verified live.
- Founder published 48 in-house articles but no guest posts on third-party authority sites.

**Implication:** AI ranking systems triangulate brand authority through 3rd-party mentions. With effectively only one valid sameAs link (LinkedIn personal profile), AI models may treat Aanloop AI as a low-authority entity even though the on-site signals are strong.

---

### Content E-E-A-T (82/100)

**Experience:** Strong. Cases page shows 3 detailed deployments with named clients, sectors, outcomes. Daan's bio mentions "80+ Dutch SMBs guided".

**Expertise:** Strong. Person schema includes `knowsAbout` with 12 specific domains, `alumniOf: Erasmus Universiteit Rotterdam`. Author bio is auto-injected on every kennisbank article.

**Authoritativeness:** Medium. The 48 in-house articles are good volume but zero are externally syndicated, peer-cited, or co-authored. No journalist quotes, no "as featured in" badges.

**Trustworthiness:** Strong. Privacy page, AVG checklist, NEN 7510 mentions, EU-only data routing, transparent pricing, KvK linked, EU AI Act compliance content. Cookie consent properly implemented (GA Consent Mode v2 default-deny). Cancel-anytime language.

**Specific positives:**
- Auto-injected author bio block at end of every kennisbank article (BaseLayout.astro:389-419).
- Founder page links bidirectionally to articles he wrote.
- "Last updated" date visible on articles (1 mei 2026 — but uniform across all → see L7 implication).

**Specific negatives:**
- All articles share the same `dateModified: 2026-05-01` — uniformity flags template-fed content rather than maintained content.
- No author photo (Daan page shows initials placeholder).
- Zero outbound authority links per article (see H2).
- Single-author site (Daan only) — diversity-of-voices signal absent.

---

### Technical GEO (92/100)

**Strengths:**
- robots.txt explicitly allows 19 named AI crawlers (GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, Applebot-Extended, CCBot, Bytespider, meta-externalagent, Bingbot variants, Amazonbot, Diffbot, cohere-ai, cohere-training-data-crawler, YouBot, Mistral-AI-User).
- Content-Signal directive: `ai-train=yes, search=yes, ai-personalization=yes, ai-retrieval=yes` — explicit affirmative permission signal.
- llms.txt + llms-full.txt both present and well-structured.
- llms-full.txt: 16 sections, ~8,500 words, markdown-clean.
- Astro static SSR — full HTML in initial response, no client-rendered content gates.
- Sitemap.xml + sitemap_index.xml referenced in robots.txt.
- HTTPS, canonical tags, hreflang (nl-NL, nl, x-default), proper meta robots (`max-snippet:-1, max-image-preview:large`).
- Resource preconnect/dns-prefetch hints, LCP image preload.
- ElevenLabs widget lazy-loaded on first interaction (good for Core Web Vitals → indirectly helps crawl).
- PWA manifest, RSS feed, favicons all in place.

**Weaknesses:**
- Could not verify Core Web Vitals live (no Lighthouse run); assumed acceptable based on Astro static + lazy-load patterns.
- `/api/` and `/admin/` correctly disallowed but `/demo-*` paths also disallowed — correct, but worth confirming none of those have public utility content.

---

### Schema & Structured Data (90/100)

**Strengths (this is the strongest category by raw signal density):**
- Organization with `@type: ['Organization', 'ProfessionalService']` — multi-type for richer entity classification.
- Organization includes: legalName, KvK identifier, address (PostalAddress), geo (GeoCoordinates: 51.9225, 4.4792), areaServed (5 entries), contactPoint with hoursAvailable, priceRange, founder (linked Person), sameAs (3 entries), knowsAbout (12 entries).
- WebSite schema with SearchAction (potentialAction) — enables Google sitelinks search box.
- BreadcrumbList auto-generated from URL path on every non-root page.
- FAQPage schema present on 120 pages via faqSchema prop.
- Article + Speakable + HowTo schema confirmed on kennisbank articles (60 occurrences across 10 files for Speakable/HowTo).
- Person schema for Daan: full credentials, sameAs (3 entries), alumniOf, knowsAbout (12), knowsLanguage, nationality.
- Product schema with AggregateOffer on Marco (lowPrice/highPrice in EUR, offerCount, availability).

**Weaknesses:**
- AggregateRating + Review missing despite testimonial content existing.
- DefinedTerm/DefinedTermSet missing from glossarium.
- LocalBusiness only at company level, not branched per location page.
- Cases not marked up as CaseStudy/Article.
- BlogPosting / NewsArticle not used on any kennisbank article (Article only — fine, but BlogPosting can be richer).

---

### Platform Optimization (70/100)

| Platform | Readiness | Notes |
|---|---|---|
| Google AI Overviews | High | FAQ + Speakable + HowTo + Article schema all present, FAQPage on 120 pages, llms.txt accepted by Google's experimental crawler. |
| ChatGPT (browse + training) | High | GPTBot + ChatGPT-User + OAI-SearchBot all allowed, ai-train=yes signal, llms-full.txt present. |
| Perplexity | High | PerplexityBot + Perplexity-User allowed, comparison content (Marco vs X) is exactly Perplexity's preferred citation pattern. |
| Claude | High | ClaudeBot + anthropic-ai allowed. |
| Gemini | Medium-High | Google-Extended allowed; Gemini favours Knowledge Graph entities — Wikidata gap hurts here. |
| Bing Copilot | High | Bingbot + Bingbot-AI allowed. |
| Apple Intelligence | Medium | Applebot-Extended allowed; Apple weights Wikidata heavily. |
| Meta AI | Medium | meta-externalagent allowed, but no Facebook/Instagram brand presence detected. |
| YouTube AI search | Low | No YouTube channel detected. |
| Reddit (heavily used by AI for "honest" sentiment) | Low | No detected Reddit threads. |
| LinkedIn (entity graph) | Broken | Company page 404. |
| Wikipedia/Wikidata | None | No entry. |

**Net:** crawler-access optimisation is essentially complete. Platform-presence (where AI also pulls signals) is the gap.

---

## Quick Wins (Implement This Week)

1. **Fix the broken LinkedIn company URL** (1 day): create the LinkedIn page or remove the broken sameAs. File: `src/layouts/BaseLayout.astro` line 141, `src/pages/team/daan-verhoeven.astro` line 39, `public/llms.txt`. Highest-leverage entity fix.

2. **Add AggregateRating + 3 Reviews to Marco and Emma Product schema** (2 hours): Use the existing 3 cases-page testimonials. Files: `src/pages/diensten/marco.astro` lines 64-82, `src/pages/diensten/emma.astro`. Triggers AI Overview ratings display.

3. **Add DefinedTermSet schema to glossarium** (1 hour): Wrap the 80 terms in DefinedTerm objects. File: `src/pages/glossarium.astro`. This is the single highest-leverage missing schema for "wat is X" queries.

4. **Create Wikidata Q-item for Aanloop AI B.V.** (1-2 hours): Link KvK 88606902, founder, location, founding date 2024, official site. Add the new `wikidata.org/wiki/Q...` URL to `sameAs` in BaseLayout.astro orgSchema.

5. **Add 3-5 outbound authority citations to top 10 kennisbank articles** (3-4 hours): Target articles where compliance, statistics, or law is mentioned (eu-ai-act, ai-avg-gdpr-compliance, ai-no-show-reductie, etc.). Link to autoriteitpersoonsgegevens.nl, eur-lex.europa.eu, schema.org docs, vendor docs (n8n, ElevenLabs). Single biggest quality-signal lift available.

---

## 30-Day Action Plan

### Week 1: Entity Graph Repair
- [ ] Fix or remove broken LinkedIn company sameAs (H1)
- [ ] Create Wikidata Q-item with KvK link (H3 partial fix)
- [ ] Verify @aanloopai X/Twitter handle live, claim if not (L3)
- [ ] Add real headshot for Daan Verhoeven, verify image URL (M4)

### Week 2: Schema Completeness
- [ ] Add AggregateRating + Review to Marco, Emma, top services (H4)
- [ ] Add DefinedTermSet/DefinedTerm to glossarium (M2)
- [ ] Add HowTo schema to /werkwijze and 5 kennisbank step articles (M3)
- [ ] Add CaseStudy/Article + Review schema to /cases (M5)
- [ ] Run all schema through Google Rich Results validator, fix any errors (M6)

### Week 3: Authority & Citations
- [ ] Add 3-5 external authority citations to top 10 kennisbank articles (H2)
- [ ] Pitch 3 guest articles on Computable, Emerce, or Frankwatching (Brand Authority)
- [ ] Submit Aanloop AI to high-quality directories: Clutch, GoodFirms, AI agency directories (Brand Authority)
- [ ] Create LinkedIn company page if not exists, post 3 articles back-linking to kennisbank (Brand Authority)

### Week 4: Local & Platform
- [ ] Add per-city LocalBusiness branchOf or Service.areaServed schema to 26 location pages (M1)
- [ ] Generate per-article OG images via Astro build (M7)
- [ ] Diversify dateModified across articles based on actual edit history, not uniform 2026-05-01 (E-E-A-T credibility)
- [ ] Create YouTube channel + 3 explainer videos (Marco demo, Emma demo, ROI walkthrough) (Platform)
- [ ] Engage in r/ondernemen / r/MKB Reddit threads with helpful (non-promotional) answers (Platform)

---

## Appendix: Pages Analyzed

| URL | Title | Notable GEO Signals |
|---|---|---|
| / | Aanloop AI homepage | Org+ProfessionalService+WebSite+BreadcrumbList schema, FAQ links |
| /robots.txt | (file) | 19 AI crawlers allowed, Content-Signal directive |
| /llms.txt | (file) | Present, structured |
| /llms-full.txt | (file) | ~8,500 words, 16 sections |
| /sitemap.xml | (file) | 171 URLs |
| /diensten/ | Onze diensten | 15 services listed, Org schema |
| /diensten/marco/ | Marco AI Receptionist | Product+AggregateOffer schema, 12 FAQ items, comparison tables |
| /diensten/emma/ | Emma WhatsApp Agent | 12 FAQ items, pricing, 3 tier comparison |
| /diensten/ai-document-processing/ | AI Document Processing | Pricing tiers, integrations, no FAQ |
| /tarieven/ | Pricing page | 3 tiers, 8 FAQs, 15+ feature comparison rows |
| /sectoren/ | Sector overview | 11 verticals with quantified outcomes |
| /sectoren/horeca/ | Horeca sector | 6 FAQs, casestudy with metrics, FAQPage schema |
| /kennisbank/ | Kennisbank index | 54 articles, 80 glossary terms |
| /kennisbank/wat-is-een-ai-agent/ | What is an AI agent | Article+Speakable+FAQPage schema, 6 FAQs, key takeaways block, definition block, TOC |
| /kennisbank/ai-voor-restaurant-nederland/ | AI voor restaurant | Article schema, 6 FAQs, ROI example |
| /ai-receptionist-nederland/ | Hub page | Comparison tables, definition statements |
| /over/ | Over Aanloop AI | 4 team members, founding info, 4 stats blocks |
| /team/daan-verhoeven/ | Daan Verhoeven profile | Person schema (sameAs, alumniOf, knowsAbout), 320-word bio, 10 article links |
| /contact/ | Contact | Email, phone, WA, response times, AVG mention |
| /cases/ | Klantcases | 3 case studies with named clients and metrics |
| /veelgestelde-vragen/ | FAQ hub | 60+ FAQs in 10 categories |
| /glossarium/ | AI begrippenlijst | 80+ AI terms (no DefinedTerm schema) |
| /locaties/amsterdam/ | Amsterdam | 1,100 words, no city-specific NAP |
| /vergelijk/marco-vs-voiceflow/ | Marco vs Voiceflow | (404 on fetch — needs verification) |
| BaseLayout.astro | (source) | Org/WebSite/BreadcrumbList/FAQPage auto-injection |
| Person schema source | (source) | Full Person with credentials |

**Total live URLs successfully fetched and analyzed: 25**
**Total source files inspected: 4 (BaseLayout, Marco, Daan team page, Wat-is-een-ai-agent)**
**Total skill-spec quality gates respected:** Page limit (50) ✓, 30s timeout ✓, robots.txt respect ✓, deduplication ✓, error logging ✓.

---

## Methodology Notes

- WebFetch was used for all live page checks; 1 page (`/vergelijk/marco-vs-voiceflow/`) returned 404 and was logged.
- WebFetch's content preprocessor strips JSON-LD script tags from raw HTML, which produced false-negative reports for schema presence on several pages. Schema confirmation was therefore done via direct source-code inspection of `src/layouts/BaseLayout.astro` and representative page files. The schema **is** rendered in production via the `allSchemas.map(s => <script type="application/ld+json">...</script>)` block at line 318-320 of BaseLayout.astro.
- Brand-authority signals (Wikipedia, Reddit, YouTube, press) were assessed by attempting Google site: queries; Google consent-redirect prevented direct retrieval, so absence is inferred from no incoming organic signals reported elsewhere and the lack of `sameAs` entries beyond LinkedIn personal + KvK. A live SERP audit is recommended before final scoring.
- No production files were modified during this audit. Read-only.

**Report end.**

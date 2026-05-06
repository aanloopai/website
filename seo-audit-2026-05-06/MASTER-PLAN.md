# Aanloop AI - Master Plan Naar Google.nl #1
## Synthesis van 5 GEO Audits + Competitive Analysis (sessie-12)

**Date:** 2026-05-06
**Goal:** Aanloop AI = Google.nl #1 in AI sector for Nederlands B2B MKB binnen 90 dagen

---

## 0. Audit Score Summary

| Category | Score | Weight | Weighted | Top 3 issues |
|---|---|---|---|---|
| Technical GEO | 61/100 | 15% | 9.15 | www DNS broken, sitemap 328 vs 183 discrepancy, _headers Cache-Control |
| AI Visibility | 47/100 | 25% | 11.75 | Wikidata 0, LinkedIn 0, press 0 |
| Platform Optimization | 52/100 | 10% | 5.2 | ChatGPT 38, Voicelabs benchmark dominant, AI listings absent |
| Content E-E-A-T | 62/100 | 20% | 12.4 | Anonymous testimonials, Daan no external footprint, sector hubs thin |
| Schema | 68/100 | 10% | 6.8 | sameAs underpowered, speakable 1/193, missing articleSection |
| Brand Authority | 8/100 | 20% | 1.6 | Wikipedia 0, Reddit 0, no press |

**Composite GEO Score: ~47/100 - Fair-Poor**

**Translation:** Site has solid technical foundation but is invisible as an entity to AI/Google. Backlink + brand mention gap is the root cause. www DNS bug is an emergency blocker. Topic content is high-quality but trust signals weak.

---

## 1. Strategic Diagnosis

### 1.1. Why is the site essentially un-indexed?

**NOT** because of technical blockers (verified - no noindex, no robots.txt blocks, no Cloudflare bot fight mode, full SSR via Astro).

**Real causes (in order of weight):**

1. **www subdomain serves a `mijn.host` parking page with `noindex,follow`** - DNS misconfiguration. Critical and immediately fixable in Cloudflare DNS (15 min).
2. **New domain authority gap** - aanloopai.nl has near-zero external backlinks. Google's crawl budget is PageRank-driven; new domains get minimal budget without inbound links.
3. **Bulk-publish trust filter** - 183-328 pages dumped in <2 weeks triggers Google's doorway-page / AI-content-farm quality filter for new domains.
4. **Zero entity recognition** - Google's Knowledge Graph + AI engines (ChatGPT, Perplexity, Gemini) cannot verify Aanloop AI as a real entity because it does not appear in Wikidata, Wikipedia, Crunchbase, or LinkedIn company directory.

**Implication:** No amount of on-page optimization will move the needle until (a) www DNS fixed, (b) entity recognition established (Wikidata, LinkedIn), (c) at least 5-10 high-quality backlinks earned.

### 1.2. Competitive position

**Voicelabs.nl** identified as benchmark - dominates Dutch AI telefonie SERPs through:
- Higher domain authority (older domain + accumulated backlinks)
- Weekly publishing cadence (vs Aanloop's batch-publish)
- Confirmed entity recognition
- Active LinkedIn presence

**Aanloop's structural advantages (defendable moats):**
- NL-only data sovereignty (EU AVG strict)
- MKB focus (vs Voicelabs / Xebia AI enterprise positioning)
- Transparent canonical pricing (Starter 597, Groei 1197)
- 11+ sector-specific pillar guides (deep topical authority)
- Wft-aware regulated-advisory positioning (financial / legal / pension sector unique)
- 193 pages of high-quality, fact-dense content (most competitors have <50)

---

## 2. The 90-Day Roadmap

### PHASE 0 - Indexing Emergency (Days 1-3)

**Owner:** indexing-emergency-fixer (Haiku) + cloudflare-bot-config (Sonnet) + user (Cloudflare DNS access required)

**Target:** Within 7 days, GSC indexed-page count goes from <10 to 100+.

**P0.1 - User-side actions (CRITICAL, blocking):**
- [ ] **Fix www DNS conflict** - Cloudflare DNS: add CNAME `www` -> `aanloopai.nl` OR Bulk Redirect `https://www.aanloopai.nl/*` -> `https://aanloopai.nl/$1` (301). Status: BLOCKING. Time: 15 min.
- [ ] Verify GSC ownership at https://search.google.com/search-console (use existing meta-token in BaseLayout)
- [ ] Submit https://aanloopai.nl/sitemap.xml in GSC
- [ ] Use GSC URL Inspection on 10 key URLs (homepage, 5 services, 4 pillars) - request indexing manually
- [ ] Setup Bing Webmaster Tools - submit sitemap
- [ ] Create Google Business Profile for Aanloop AI Rotterdam (free dofollow link from G-trusted)

**P0.2 - Code-side automation:**
- [ ] Sitemap discrepancy fix: 328 sitemap URLs vs 183 actual built - investigate cause, ensure sitemap.xml only contains 200-OK pages
- [ ] Add IndexNow API support (Bing/Yandex instant notification)
- [ ] Fix `_headers` Cache-Control ordering (10 min code change)
- [ ] Resolve `diensten/audit` and `diensten/custom` redirect-conflict
- [ ] Internal linking depth audit: ensure no orphan pages (target: every page within 3 clicks from homepage)
- [ ] Add canonical-tag validation across all page templates

### PHASE 1 - Entity Recognition + Technical Foundation (Days 4-14)

**Owner:** wikidata-publisher (Opus, strategic one-time), schema-enrichment-codemod (Haiku), linkedin-company-page-content (Sonnet), core-web-vitals-optimizer (Sonnet), internal-linking-codemod (Haiku)

**Target:** Aanloop AI verifiable as an entity by Wikidata, LinkedIn, GitHub, Crunchbase. Schema score 85+. CWV all green.

**P1.1 - Entity establishment (CRITICAL for AI engines):**
- [ ] **Wikidata Q-entity creation** - Opus task. One-time strategic work. Add: name, description, country (NL), location (Rotterdam), founder (Daan Verhoeven), industry (AI consulting), KvK 88606902 cross-reference, official website. Properties for entity disambiguation.
- [ ] **LinkedIn company page** - Sonnet writes content (NL, brand voice). Link properly to founder personal LinkedIn. Update Organization schema sameAs with company URL (currently points to founder personal - WRONG).
- [ ] **Crunchbase profile** - Submit company entry with founder, funding stage, location, KvK
- [ ] **GitHub organization** - `aanloopai` org with 1-2 open-source AI templates / tools as marketing
- [ ] **YouTube channel** - Create + reserve handle, add Organization sameAs

**P1.2 - Schema enrichment (codemod):**
- [ ] Organization sameAs: 8 platforms (LinkedIn company, Wikidata Q-id, Crunchbase, GitHub, YouTube, Twitter/X, Facebook, Mastodon)
- [ ] LocalBusiness schema with geo coordinates (Rotterdam), opening hours, service area (Nederland)
- [ ] Person (Daan Verhoeven) schema enrichment: image URL, knowsAbout array (AI, Wft Pensioenadvies, AVG, EU AI Act, n8n, ElevenLabs), alumniOf
- [ ] Speakable on all 193 pages (currently 1/193) - codemod via BaseLayout addition
- [ ] articleSection + wordCount on ~60 kennisbank pages
- [ ] FAQPage JSON-LD wrapping on 11 sector pages + tarieven (FAQ content exists, schema missing) - 4 of 5 agents flagged
- [ ] BreadcrumbList on all hierarchical pages
- [ ] Remove deprecated HowTo schema (Google removed from rich results Sep 2023)

**P1.3 - Technical foundation:**
- [ ] CWV: homepage desktop P=90 -> 95+ (specific PSI insights from sessie-11 to address)
- [ ] llms.txt enrichment: ensure all key services + pillars covered
- [ ] llms-full.txt creation (machine-readable comprehensive overview)
- [ ] Image alt-text 100% coverage audit
- [ ] HSTS preload submission

### PHASE 2 - Content Quality + E-E-A-T Uplift (Days 15-35)

**Owner:** eeat-author-bio-enricher (Sonnet), trust-signals-injector (Haiku), dutch-keyword-research (Sonnet), pillar-content-optimizer (Sonnet), topical-authority-builder (Sonnet)

**Target:** E-E-A-T score 85+. All pillars rank top-30 for primary keyword. GSC clicks +50%.

**P2.1 - Trust signals (high impact for E-E-A-T):**
- [ ] **Replace anonymous testimonials with named cases** - 3 anonymous testimonials in /cases/ replaced with named-customer cases (consent required) + Review schema
- [ ] **Daan Verhoeven external footprint** - Activate LinkedIn weekly posting (12 posts in 90 days), guest-write 1-2 posts on Dutch tech blogs, claim Crunchbase/AngelList founder profile
- [ ] **Author bio enrichment** - Across all 60+ kennisbank pages: Daan Person.image, knowsAbout, sameAs, jobTitle, alumniOf
- [ ] **Physical address publication** - On contact + footer: full street address Rotterdam (currently missing - flagged by E-E-A-T agent)
- [ ] Trust strip on homepage: customer logos (with permission), AVG badge, Keurmerk-RRS where eligible, KvK verifiable badge
- [ ] About + Team page upgrade: founder story, mission, transparent ownership, KvK details

**P2.2 - Dutch keyword research + content optimization:**
- [ ] **100+ Dutch AI keywords** with intent classification, volume, difficulty
- [ ] Map keywords to existing 193 pages
- [ ] Identify content gaps for new pillar pages (Phase 3 work)
- [ ] Optimize existing 50+ pillar articles for primary keyword (title, H1, first 100 words, internal anchor text)
- [ ] FAQ expansion on every pillar (target: 8 Q/A per pillar, currently 4-6)
- [ ] Citability rewrites: for top 30 pages, make answer-blocks <100 words, fact-dense, AI-extractable

**P2.3 - Sector hub depth:**
- [ ] Sector pages currently 650-750 words - bump to 1500+ words for commercial-intent
- [ ] Add: 3 customer case mini-summaries per sector, sector-specific FAQ, sector-specific trust signals (e.g. zorg = AVG-enhanced badge)

### PHASE 3 - Topical Authority + New Pillars (Days 36-60)

**Owner:** pillar-content-writer (Sonnet, 10x), competitor-counter-content (Opus strategic), internal-linking-codemod (Haiku)

**Target:** Top-3 ranking for 30+ Dutch AI queries. AI Overviews citations on 5+ queries. Voicelabs.nl displaced from 5+ queries.

**P3.1 - New pillar pages (10 to write):**
Based on Phase 2 keyword gap analysis, draft and write 10 new pillars covering gaps such as:
- AI prijzen vergelijking 2026 NL (commercial intent, head term)
- Voice AI vs chatbot beslisgids MKB
- AI voor zorginstellingen NEN-7510
- WhatsApp Business API voor MKB Nederland (deep technical)
- AI vs callcenter cost analysis NL
- ElevenLabs voice cloning legal NL
- AI implementatie roadmap MKB 30-dagen
- AI in transportsector NL (TLN context)
- AI customer support kosten benchmark
- AI proof-of-concept vs production trade-offs

**P3.2 - Counter-content vs Voicelabs.nl + main competitors:**
- [ ] Comparison page: Aanloop AI vs Voicelabs (positioning differences, not feature-by-feature attack)
- [ ] Comparison page: Aanloop AI vs Plooto, Voice21, TripleA, Watermelon
- [ ] Differentiator pages: Why NL-only data sovereignty matters, Why MKB-focus beats enterprise consultancy, Why transparent pricing beats custom-quoted
- [ ] Counter-positioning blog: AI bureau Nederland - 7 vragen die u moet stellen (frames criteria where Aanloop wins)

**P3.3 - Cross-linking densification:**
- [ ] Each pillar gets 5+ contextual inbound + 5+ outbound internal links (codemod-driven)
- [ ] Topic clusters: hub pages link to all spokes, spokes link back to hub + 2 sibling spokes
- [ ] Footer pillar-block: featured pillars cycled monthly

### PHASE 4 - Backlinks + Off-Site Authority (Days 60-90)

**Owner:** link-building-outreach-strategist (Opus), link-building-outreach-writer (Sonnet), reddit-quora-presence (Sonnet), youtube-video-strategy (Sonnet), case-study-author (Sonnet)

**Target:** 50+ referring domains gained. 10+ Dutch press mentions. Aanloop appears in Ploko/Appfront/Nodevate AI bureau ranking lists.

**P4.1 - Tier-1 press outreach:**
- [ ] **Pitch list:** Tweakers (.net AI editor), Computable (AI/MKB editor), AG Connect, Emerce, Adformatie, Marketingfacts, Sprout (B2B founder content), Frankwatching, MT Sprout
- [ ] **Pitch angles per outlet** (Opus strategic):
  - Tweakers: technical original research, Dutch-LLM benchmark
  - Computable: B2B AI adoption survey, MKB AI ROI report
  - Emerce: e-commerce AI use cases
  - AG Connect: enterprise AI compliance (EU AI Act + AVG)
  - MT Sprout: founder thought leadership
  - Adformatie: marketing AI
- [ ] **Original research asset:** AI Adoption in Nederlandse MKB 2026 - survey 200+ MKB owners (use customer base + LinkedIn outreach), publish as PDF + landing page
- [ ] **Press release asset:** 500 actieve MKB-klanten op WhatsApp + telefoon-AI milestone (if true)

**P4.2 - AI-bureau listing inclusion:**
- [ ] Submit Aanloop to: Ploko.nl, Appfront.io, Nodevate, DutchAINetwork, Emerce listings, Computable agency directory
- [ ] Get listed in 3-5 best AI bureau Nederland ranking articles (paid placements via outreach negotiation if needed)

**P4.3 - Community presence (no spam):**
- [ ] Reddit: r/Netherlands, r/MKB, r/sysadmin, r/artificial - answer 30 real questions over 90 days, no link spam, build user karma
- [ ] Quora NL: answer 20 AI / MKB questions
- [ ] LinkedIn: weekly post by Daan (12 posts), 30 strategic comments on industry posts
- [ ] HackerNews: comment thoughtfully on AI-policy posts (Dutch perspective valued)

**P4.4 - Video presence (Gemini critical):**
- [ ] YouTube channel: 12 videos in 90 days
  - WTP transitie demo (live werkgever-recall)
  - Marco AI receptionist live demo (NL voice)
  - Emma WhatsApp AI live demo
  - ROI calculator walkthrough
  - 8 sector use-case mini-videos (3-5 min each)

**P4.5 - Case studies (named, with consent):**
- [ ] 5 detailed customer case studies with quantified ROI (sector-spread: zorg, accountancy, advocaten, webshops, beauty)
- [ ] Per case: anonymized variant if customer prefers, but NAMED variant where possible (huge trust boost)
- [ ] Review schema attached to each

**P4.6 - Conference + speaking:**
- [ ] Pitch Daan to: Emerce eDay, AI Boost, World AI Conference Amsterdam, MKB Nederland event, Innovation Origins events
- [ ] Pitch Daan to 5 Dutch B2B podcasts: Brainformatica, Jacco Valkenburg, MKB-Tech podcasts

---

## 3. Execution Architecture (recap)

**Orchestrator:** `seo-orchestrator-aanloop` (Sonnet 4.6) - single coordinator
**Specialists:** 22 specialized agents per Phase, model-routed (see `00-orchestration-architecture.md`)
**Cost split target:** 50% Haiku (bulk), 45% Sonnet (default), 5% Opus (strategic)
**Validation gates:** build clean, schema valid, PSI no-regress, sitemap valid, GSC indexed-trend up

---

## 4. Success Metrics (90-day)

| Metric | Baseline | Day 30 | Day 60 | Day 90 |
|---|---|---|---|---|
| GSC indexed pages | ~6 | 100 | 250 | 320+ |
| Organic clicks/month | unknown | +50% | +200% | +500% |
| Top-3 rankings (NL keywords) | <5 | 15 | 30 | 50+ |
| AI Overviews citations | 0 | 1 | 5 | 15+ |
| Wikidata entity | NO | YES | YES | YES |
| LinkedIn company followers | 0 | 50 | 200 | 500+ |
| YouTube subscribers | 0 | 25 | 100 | 250+ |
| Referring domains | <5 | 15 | 35 | 60+ |
| Dutch press mentions | 0 | 1 | 4 | 10+ |
| Sector hub avg word count | 700 | 1500 | 1500 | 1500 |
| Composite GEO score | 47 | 70 | 82 | 90+ |

---

## 5. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | www DNS fix delayed by user | Medium | Critical | Auto-reminder daily until fixed; cannot proceed Phase 1 fully |
| R2 | GSC manual indexing rate-limited | High | Medium | Spread URL Inspection submissions over 7 days, max 10/day |
| R3 | Wikidata edit reverted | Low | High | Use clean factual data, cite KvK, link to verifiable site, declare COI |
| R4 | LinkedIn page flagged as duplicate (founder personal already exists) | Medium | Medium | Distinct content angles, founder-page = personal expertise, company-page = brand+product |
| R5 | Press editors ignore pitches | High | Medium | 10 pitches expected to yield 2-3 placements; original research asset is hook |
| R6 | Voicelabs counter-attacks (e.g. blog targeting Aanloop) | Low | Low | Stay focused on positive positioning, never name-attack |
| R7 | Wft compliance violation in new content | Low | Critical | All financial/legal/pension content reviewed by Opus + Daan before publish |
| R8 | AI-content detection penalty | Medium | High | Phase 2 humanize pass: vary sentence structure, add Daan voice, real anecdotes |
| R9 | Build breaks during schema codemod | Low | High | Validation gate after every codemod, idempotent design |
| R10 | Outreach emails flagged as spam | Medium | Medium | Personalized per editor, value-first, no bulk-send, max 5/day |

---

## 6. Phase 0 Critical Path (start NOW)

The ONLY thing that matters in Days 1-3:

```
[Day 1]
  10:00 - User fixes www DNS in Cloudflare (15 min)         <- USER BLOCKING
  10:15 - User submits sitemap in GSC (5 min)                <- USER BLOCKING
  10:20 - User creates Google Business Profile (20 min)      <- USER BLOCKING
  10:40 - User runs URL Inspection on 5 priority URLs        <- USER BLOCKING
  11:00 - orchestrator dispatches schema-enrichment-codemod (Haiku, 30 min)
  11:30 - orchestrator dispatches sitemap-discrepancy-fixer (Haiku, 30 min)
  12:00 - orchestrator dispatches indexnow-implementer (Haiku, 30 min)
  12:30 - orchestrator dispatches _headers-fixer (Haiku, 15 min)
  12:45 - orchestrator runs validation gate (build + sitemap + schema)
  13:00 - orchestrator commits + pushes Phase 0 changes

[Day 2]
  Same pattern. orchestrator dispatches: linkedin-company-page-content (Sonnet)
  User to manually create LinkedIn page using generated content.

[Day 3]
  orchestrator dispatches: wikidata-publisher (Opus) - generates Q-entity submission package
  User submits to Wikidata (community-edited, requires manual submission)
  orchestrator dispatches: gsc-monitor (Haiku, daily ongoing)
```

---

## 7. Communication Cadence

- **Daily (autonomous):** orchestrator commits state to repo; user reads on their schedule
- **Per phase end:** Türkçe summary in chat (zonder user prompt) with next-phase preview
- **Blocking issues:** direct escalate naar user same-message
- **Validation gate failures:** halt + report, never silently proceed

---

*This Master Plan is the source-of-truth roadmap. Orchestrator agent reads this + `00-orchestration-architecture.md` as primary context. State in `EXECUTION-STATE.md`.*

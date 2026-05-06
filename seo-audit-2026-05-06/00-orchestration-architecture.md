# Aanloop GEO/SEO #1 Master Plan — Multi-Agent Orchestration Architecture

**Date:** 2026-05-06
**Goal:** Aanloop AI = Google.nl #1 in AI sector for Nederlands B2B MKB binnen 90 dagen
**Owner:** Daan Verhoeven (CEO Aanloop AI)

---

## 1. Strategic Constraints (NEVER violate)

- **Brand voice:** Nederlands B2B MKB, vanaf 597 euro per maand
- **Canonical pricing:** Starter 597/mnd, Groei 1197/mnd, Emma standalone 197/mnd, AI-Website Bundel 4950 setup + 397/mnd
- **Forbidden intro-prijzen:** 297, 497, 697, 797, 897 (monthly intro)
- **No mock testimonials** or AggregateRating (Google policy)
- **Theme guards:** bg-midnight, text-pearl, navy, slate, accent-band
- **KvK 88606902, Rotterdam, hello@aanloopai.nl, +31 6 24741597**
- **AVG/EU-only data verwerking, DPIA-template inbegrepen**
- **Wft-grens:** AI mag NOOIT regulated advice geven (pensioen, vermogen, hypotheek)

---

## 2. Cost-Aware Model Routing

| Model | Use Case | Cost Per | When To Use |
|---|---|---|---|
| **Haiku 4.5** | Bulk deterministic edits, schema injection, sitemap fixes, regex codemods, template generation, file-format transformations | Low (3x cheaper than Sonnet) | Pattern-based work where input/output are deterministic. 90% of Sonnet capability per benchmarks. |
| **Sonnet 4.6** | Content writing, keyword research, page optimization, JSON-LD enrichment, Dutch-language copy, technical analysis | Mid | Most production work. Default for code/content. |
| **Opus 4.7** | Strategy, complex E-E-A-T uplift, link-building outreach planning, competitor counter-strategy, multi-stakeholder negotiation simulation, brand-positioning decisions | High | Reserved for: irreversible decisions, novel research synthesis, creative breakthroughs. ~5% of total work. |

**Default routing rule:** Start with Haiku. Escalate to Sonnet if Haiku fails 2x. Escalate to Opus only for strategic decisions or if Sonnet fails 2x.

---

## 3. Multi-Agent Topology

### 3.1. Orchestrator (Always 1)

**Agent:** `seo-orchestrator-aanloop` (Sonnet 4.6 — needs judgment + state-tracking)

**Responsibilities:**
- Read all 5 audit reports (01-technical, 02-ai-visibility, 03-platform, 04-content, 05-schema)
- Maintain master plan state in `EXECUTION-STATE.md`
- Dispatch specialist agents per phase
- Verify each phase completion (build green, sitemap valid, schema clean, PSI scores)
- Roll up to user for irreversible/strategic decisions only
- Auto-commit per phase with idempotent guards

**Off-limits without user approval:**
- Wikipedia/LinkedIn/Reddit posting (could trigger spam flags)
- Outreach email sends
- Production migrations beyond Astro static-build
- Anything touching live customer data

### 3.2. Specialist Pool (dispatched per Phase)

| Agent | Type | Model | Phase | Description |
|---|---|---|---|---|
| `indexing-emergency-fixer` | technical | Haiku | 0 | Sitemap submit verify, robots.txt fixes, internal-link depth audit, GSC URL inspection automation |
| `cloudflare-bot-config` | technical | Sonnet | 0 | Verify Cloudflare bot rules don't block GoogleBot/AI bots, WAF tuning |
| `schema-enrichment-codemod` | technical | Haiku | 1 | Bulk schema injection: Organization sameAs, Person.image+knowsAbout, speakable across 193 pages, articleSection+wordCount |
| `wikidata-publisher` | content | Opus | 1 | Strategic — create Aanloop AI Wikidata Q-entity. ONE-TIME, irreversible. |
| `linkedin-company-page-content` | content | Sonnet | 1 | LinkedIn company page setup content (NL-language, brand-aligned) |
| `internal-linking-codemod` | technical | Haiku | 1 | Link-depth fixer: ensure all 193 pages reachable within 3 clicks from homepage |
| `core-web-vitals-optimizer` | technical | Sonnet | 1 | Address remaining CWV issues from PSI verify (homepage desktop P=90 etc.) |
| `eeat-author-bio-enricher` | content | Sonnet | 2 | Daan Verhoeven author bio across all kennisbank pages — credentials, LinkedIn, KvK refs |
| `trust-signals-injector` | content | Haiku | 2 | Add trust strip, customer logos, certifications, AVG badges, Keurmerk-RRS where eligible |
| `dutch-keyword-research` | content | Sonnet | 2 | Research Dutch AI search queries via WebSearch + Search Console-equivalent signals; build 100+ keyword cluster map |
| `pillar-content-optimizer` | content | Sonnet | 2 | Optimize existing 50+ pillars for primary keywords, FAQ expansion, citability rewrites |
| `topical-authority-builder` | content | Sonnet | 2 | Identify content gaps from cluster map; brief 10 new pillar pages |
| `pillar-content-writer` | content | Sonnet | 3 | Write the 10 new pillar pages (Dutch, B2B MKB, Wft-aware, ROI-focused) |
| `competitor-counter-content` | content | Opus | 3 | Strategic — counter-content vs major Dutch AI competitors (Xebia AI, Dataify, TripleA), positioning content |
| `link-building-outreach-strategist` | strategy | Opus | 4 | Plan: which Dutch tech publications (Tweakers, Computable, AG Connect, Emerce) to pitch, what angles, what assets |
| `link-building-outreach-writer` | content | Sonnet | 4 | Draft outreach emails + guest post pitches per strategy |
| `reddit-quora-presence` | content | Sonnet | 4 | Identify Dutch subreddits + AI/MKB threads where Aanloop expertise can add value (no spam, real answers) |
| `youtube-video-strategy` | strategy | Sonnet | 4 | Plan 12 YouTube videos: WTP transitie demo, Marco demo, Emma WhatsApp demo, ROI calc walkthrough |
| `case-study-author` | content | Sonnet | 4 | Write 5 detailed case studies (anonymized if needed) — sector-specific, ROI-quantified |
| `gsc-monitor` | observability | Haiku | All | Daily GSC crawl-stats check, indexed-page count, click/impression delta, alert on anomaly |
| `psi-monitor` | observability | Haiku | All | Weekly PSI re-audit, regression detection |
| `ahrefs-rank-tracker` | observability | Haiku | All | Track Dutch keyword rankings weekly |

### 3.3. Validation Gates (between phases)

After EACH phase, run validation:
- Build clean (193+ pages, 0 errors)
- Sitemap valid (all URLs return 200)
- Schema validator clean (`scripts/seo-schema-validator.cjs`)
- PSI re-run (no regression vs baseline)
- robots.txt unchanged or improved
- Indexing trend up (GSC site:domain count weekly)

If any validation fails: orchestrator pauses, rolls back, reports to user.

---

## 4. Phase Roadmap (90 days)

### Phase 0 — Indexing Emergency (Days 1-3)

**Goal:** Resolve site:aanloopai.nl indexing gap (0 -> 80%+ of 328 URLs)

**Tasks:**
- [ ] Verify GSC ownership + sitemap submission status
- [ ] Use GSC URL Inspection on 5 sample URLs to find indexing blockers
- [ ] Audit Cloudflare bot rules — confirm Googlebot, GPTBot, ClaudeBot not blocked
- [ ] Verify robots.txt + meta-robots on each page-template
- [ ] Verify canonical tags correctness across templates
- [ ] Verify all sitemap URLs return 200 (no 404 in sitemap)
- [ ] Add IndexNow API support (if not present) for instant Bing/Yandex notification
- [ ] Submit sitemap fresh ping to Google + Bing
- [ ] Internal linking depth audit — ensure no orphan pages, max 3-click depth
- [ ] PageRank-flow audit via internal-link analysis

**Success metric:** Within 7 days, GSC shows 100+ indexed pages (up from 6).

### Phase 1 — Technical Foundation (Days 4-14)

**Goal:** Lock down technical SEO + GEO infrastructure for max crawl/index efficiency.

**Tasks:**
- [ ] Schema enrichment codemod (Organization sameAs +5 platforms, Person.image+knowsAbout, speakable on all 193 pages, articleSection+wordCount on kennisbank)
- [ ] Wikidata Q-entity creation for Aanloop AI (Opus task — strategic, one-time)
- [ ] LinkedIn company page activation + content
- [ ] Crunchbase profile creation
- [ ] GitHub org setup (open-source AI tools/templates as marketing)
- [ ] llms.txt enrichment (full coverage of all pillars/services)
- [ ] llms-full.txt creation (machine-readable comprehensive overview)
- [ ] Core Web Vitals: address homepage desktop P=90 (target 95+)
- [ ] Internal linking density: ensure each pillar has 5+ inbound + 5+ outbound contextual links
- [ ] Breadcrumb schema on all hierarchical pages
- [ ] HSTS preload submission
- [ ] Image alt-text 100% coverage audit

**Success metric:** Schema score 85+, technical score 90+, all sameAs platforms live.

### Phase 2 — Content Quality + E-E-A-T (Days 15-35)

**Goal:** Establish Daan Verhoeven + Aanloop as recognized expert entity in Dutch AI SMB advisory.

**Tasks:**
- [ ] Author bio: rich Daan Verhoeven page with credentials, certifications, LinkedIn, X, GitHub, photo, knowsAbout array
- [ ] Trust signals: customer logos (with permission), certifications (AVG, Keurmerk-RRS where applicable), KvK badge, ISO 27001 if applicable
- [ ] Privacy policy + AVG-DPIA template publication
- [ ] Dutch keyword research: 100+ keywords, intent classification, volume/difficulty
- [ ] Pillar optimization: existing 50+ pillars -> primary keyword tuning, FAQ expansion, citability rewrites for AI extraction
- [ ] Topical authority gap analysis: what's missing in cluster map?
- [ ] Re-audit content for AI-generated patterns; humanize where needed
- [ ] About page upgrade: founder story, mission, team, location, KvK details, transparent ownership
- [ ] Case studies: 5 detailed customer stories with quantified ROI

**Success metric:** E-E-A-T score 85+, all pillars rank for primary keyword in top 30, GSC clicks +50%.

### Phase 3 — Authority Content + New Pillars (Days 36-60)

**Goal:** Cover the remaining gaps in Dutch AI/MKB topical universe + outpace competitors.

**Tasks:**
- [ ] Write 10 new pillar pages (gaps from Phase 2 analysis)
- [ ] Create 5 sector-specific deep-dives where Aanloop has gap
- [ ] Counter-content vs Xebia AI, Dataify, TripleA, Plooto, Voice21 — positioning where Aanloop is differentiated (NL-only, MKB-focus, transparent pricing, EU data sovereignty, no vendor lock-in)
- [ ] Comparison/vs pages for major competitors
- [ ] FAQ schema on 100% of service+pillar pages
- [ ] HowTo schema on tutorial-style content
- [ ] Glossary expansion (NL AI terms)
- [ ] Internal cross-linking densification

**Success metric:** Top-3 ranking for 30+ Dutch AI queries, AI Overviews citations on 5+ queries.

### Phase 4 — Backlinks + Off-Site Authority (Days 60-90)

**Goal:** Earn high-quality Dutch backlinks + brand mentions across AI training data sources.

**Tasks:**
- [ ] Outreach: Tweakers, Computable, AG Connect, Emerce — pitch original research, expert commentary on EU AI Act/WTP/AVG
- [ ] Guest posts on Dutch tech blogs
- [ ] Reddit: r/Netherlands, r/MKB, r/sysadmin — answer real questions where Aanloop expertise adds value
- [ ] Quora Dutch — answer AI/MKB questions
- [ ] LinkedIn thought leadership: weekly post by Daan
- [ ] YouTube: 12 videos (WTP demo, Marco/Emma demos, ROI walkthrough, sector use-cases)
- [ ] Podcast: pitch Daan to 5 Dutch B2B podcasts
- [ ] Conference: Dutch AI events (Emerce eDay, AI Boost, World AI Conference Amsterdam)
- [ ] Original research/data: AI Adoption in Dutch MKB 2026 survey/report
- [ ] Press release on Wet toekomst pensioenen + AI angle
- [ ] Case study syndication

**Success metric:** 50+ referring domains gained, 10+ Dutch press mentions, Aanloop appears in AI-tool comparison lists.

---

## 5. Self-Review Checklist (post-plan)

Before execution starts, orchestrator must verify:

- [ ] All forbidden prijzen excluded from any new content
- [ ] No mock testimonials suggested
- [ ] Theme guards respected (no off-brand colors)
- [ ] Wft-grens respected: no AI giving regulated advice
- [ ] Cost routing applied: Haiku where deterministic, Opus only where strategic
- [ ] No duplicate work between specialists
- [ ] Validation gates between phases (build clean, schema valid, PSI no-regress)
- [ ] User approval gates at: Phase 0 GSC verification, Phase 1 Wikidata creation, Phase 2 Trust Signals (real customer logos), Phase 4 Outreach emails (review before send)
- [ ] Memory rule compliance: Türkçe iletişim met user, NL/EN content
- [ ] Eisenhower matrix applied to each task batch (Q1/Q2/Q3/Q4 classification voor user kennis)

---

## 6. State Tracking

Orchestrator maintains `EXECUTION-STATE.md` met:
- Current phase + day
- Completed tasks (commit SHAs)
- In-progress tasks (agent IDs)
- Blocked tasks (reason + ETA)
- Validation gate status
- Anomalies/errors
- Cost spend (model tier breakdown)

Updates after every task completion. Auto-commits to repo for resume-after-clear safety.

---

## 7. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cloudflare blocks Googlebot | High (suspect) | Critical | Phase 0 task — manual config audit |
| AI-content detection penalty | Medium | High | Phase 2 humanize pass; Daan voice review |
| Competitor outpaces (Xebia AI scale) | Medium | Medium | Niche-down on MKB; can't compete on enterprise |
| Wft compliance violation | Low | Critical | All financial/pension content reviewed by Opus + Daan |
| Spam-flag from outreach | Medium | High | Personalized, value-first outreach; never bulk |
| Schema rich-result loss | Low | Medium | Validate after every schema change |
| Site goes down during migration | Low | Critical | Astro static = always-up; CF Pages auto-rollback |

---

## 8. Communication

- **User language:** Türkçe (memory rule, STRICT)
- **Code/commits/file content:** NL/EN
- **Per phase:** brief Türkçe summary van wat klaar is, wat volgt, ROI-prognose
- **Blockers:** direct escalate naar user (never silently retry)
- **Stop conditions:** user says stop/clear/pause — orchestrator commits state, halts new dispatches

---

*Generated by orchestrator-architect — sessie-12 of aanloop GEO #1 ambition.*

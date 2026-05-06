# Master Plan Self-Review
## Aanloop AI - Sessie-12 GEO #1 Plan

**Date:** 2026-05-06
**Reviewer:** orchestrator-architect (self-critical pass)

This document reviews `MASTER-PLAN.md` for gaps, redundancies, and additions. Per user instruction: "kacirdign bolumleri, eklenmesi gerekenleri veya cikartilmasi gerekenleri".

---

## A. ADD (gaps in original plan)

### A1. Conversion tracking + ROI feedback loop (CRITICAL miss)

**Why missing:** Plan optimizes for ranking but ignores conversion. Top-1 ranking met 0 conversie = waardeloos.

**Add to Phase 0:**
- [ ] Verify GA4 events for: form-submit, demo-aanvraag, ROI-calculator-completion, telefoon-clicks, WhatsApp-clicks
- [ ] Verify GTM container has Brevo email-capture event
- [ ] Set up GA4 -> Looker Studio dashboard met: organic traffic, conversion rate per page, top-converting pages
- [ ] Conversion goal-value setting (so SEO ROI can be quantified)

**Add to Phase 2:**
- [ ] Per-pillar conversion-rate review: which pillars convert? Optimize CTAs on low-converters.
- [ ] Heatmap (Microsoft Clarity = free) on top 10 pages

### A2. GrowthBook A/B testing (existing infra not used in plan)

**Why missing:** Memory states GrowthBook is self-hosted at gb.aanloopai.nl + gb-api.aanloopai.nl. Not utilized in plan.

**Add to Phase 2:**
- [ ] A/B test top 5 landing pages: hero copy, CTA wording, social-proof placement
- [ ] A/B test pricing-page format: table vs card layout
- [ ] A/B test sector-hub depth: 800w vs 1500w (validate Phase 2 thesis)

### A3. Email newsletter as owned audience asset (Brevo already configured)

**Why missing:** Memory notes Brevo is the active mail-provider. Plan ignores email as compounding asset.

**Add to Phase 2:**
- [ ] Newsletter sign-up CTA on every kennisbank pillar
- [ ] Lead magnet: AVG-DPIA template PDF (gated email opt-in)
- [ ] Lead magnet: AI ROI calculator results email (already triggered)
- [ ] Weekly Dutch AI digest (10 min read) - leverages Daan's expertise, drives recurring traffic

**Add to Phase 4:**
- [ ] Newsletter swap with adjacent NL B2B newsletters (e.g. Sprout, MT Nieuws)

### A4. HARO / journalist quote outreach (high-leverage, missed)

**Add to Phase 4:**
- [ ] Daily check of HARO NL (helpareporter.com) + sourcebottle, Qwoted
- [ ] Daan answers 3 questions/week as Dutch AI/MKB expert
- [ ] Each placement = .nl/.com backlink + brand mention in trusted publication

### A5. Bing Places + Apple Maps (sister to Google Business Profile)

**Add to Phase 0/1:**
- [ ] Bing Places listing for Aanloop AI Rotterdam
- [ ] Apple Maps Connect listing

### A6. Schema.org Offer schema for Marco/Emma (commerce signal)

**Add to Phase 1:**
- [ ] Marco service page: SoftwareApplication + Offer (price 597, priceCurrency EUR, availability InStock, priceValidUntil)
- [ ] Emma service page: idem with 197 standalone or 1197 bundle
- [ ] AI-Website Bundel: idem with 4950 setup + 397 monthly
- [ ] AggregateOffer where multiple price-tiers exist (Marco Starter+Groei)

### A7. Multi-author E-E-A-T expansion

**Why missing:** Plan only develops Daan as author. Adds authority surface area to add 1-2 named team members for sector-specific content.

**Add to Phase 2:**
- [ ] Identify 2-3 Aanloop team members who can co-author (e.g. compliance lead for Wft content, technical lead for n8n articles)
- [ ] Author profile pages with own LinkedIn, photo, knowsAbout
- [ ] Cross-author guest-bylines (Daan + team-member on regulatory content)

### A8. Trustpilot / Google Reviews strategy

**Add to Phase 2:**
- [ ] Google Business Profile reviews flow: post-onboarding email asking happy customers for review
- [ ] Trustpilot company profile (free tier OK)
- [ ] Display real ratings on site WITH proper schema (not mock - flagged in E-E-A-T audit)

### A9. AI tool directories (lemonio, futuretools, theresanaiforthat)

**Add to Phase 4:**
- [ ] Submit Aanloop AI to: futuretools.io, theresanaiforthat.com, lemonio.com, ToolFinder, AI Scout, AI Tools NL
- [ ] These directories are now AI-engine-cited for "best AI tool for X" queries

### A10. Voice-search optimization (specific patterns)

**Add to Phase 1:**
- [ ] Speakable schema: not just on H1 + lead, but on FAQ-answer blocks (max 30 sec read aloud)
- [ ] Question phrasing in H2/H3 (matches voice-query patterns)
- [ ] Short snappy answers (40-60 words) at top of relevant pages

### A11. Affiliate / partner program

**Add to Phase 4:**
- [ ] Lightweight referral program: 10% MRR for 3 months for referrer + 1 month free for referred
- [ ] Partner-specific landing pages (UTM tracked)
- [ ] Partner directory of NL-MKB-consultancies who can refer

### A12. Conversion-rate-optimization (CRO) for cases page

**Why missing:** Cases page is high-intent traffic but Trust audit flagged anonymous testimonials.

**Add to Phase 2:**
- [ ] Replace anonymous cases with 5 named cases (P4.5 already covers, but add CRO measurement)
- [ ] A/B test: cases page format - long-form story vs metrics-grid
- [ ] Add filter (by sector, by company size, by service)

### A13. Dutch government AI vendor lists / public-sector RFPs

**Add to Phase 4:**
- [ ] Pianoo (NL aanbestedingsplatform) - register as supplier
- [ ] CIBG / BZK AI vendor lists if relevant
- [ ] DigiD sector consultations (where AI advisory feedback wanted)

### A14. Web Vitals monitoring infrastructure (continuous)

**Add to Phase 0:**
- [ ] Web Vitals beacon (already partial in PSI infra) - send to GA4
- [ ] Daily PSI cron job (already exists per sessie-10) - extend to alert on regression
- [ ] CrUX dashboard subscription if available

### A15. Internal Q-A (Question-Answer) data layer for AI extraction

**Why missing:** AI engines cite Q-A pairs. Plan covers FAQ schema but not Q-A optimization across body content.

**Add to Phase 2:**
- [ ] H2 questions (instead of H2 statements) on top 30 pages: "Wat kost een AI receptionist?" instead of "Kosten AI receptionist"
- [ ] First sentence after H2 = direct 40-60 word answer
- [ ] Citability rewrite agent: codemod-driven question-form optimizer

---

## B. CHANGE (refinements to existing plan items)

### B1. Phase 0 Day 1 critical-path is over-optimistic

**Original:** All Phase 0 done in single 13:00 timeframe day-1.
**Reality:** User-side actions (DNS, GSC, Google Business) require user to be available. Cannot guarantee.

**Refined:**
- Day 1: All P0 items dispatched + done (Haiku-driven). User receives clear instructions for their 4 manual steps.
- Day 2: Wait for user to complete manual steps. Validate.
- Day 3: Continue with Phase 1 prep.

### B2. Phase 1 Wikidata is not a 1-day task

**Original:** "Day 3" Wikidata submission.
**Reality:** Wikidata submissions can be reverted by other editors. Need: (a) carefully crafted entry per Wikidata notability rules, (b) 3-4 cited sources (press, KvK, official site), (c) monitoring for reverts.

**Refined:**
- Day 3: Generate Wikidata submission package (Opus task)
- Day 4: User submits manually to Wikidata
- Day 7-14: Monitor for reverts, defend if challenged
- Backup plan: if reverted, build sources first (press mentions, KvK proof) and resubmit later

### B3. "10 new pillar pages" in Phase 3 may be excessive given existing 193

**Question:** Do we need 10 NEW pillars or do we improve existing ones?

**Refined:**
- Phase 2: deep-improve existing 50 pillars (priority over new content)
- Phase 3: 5 new pillars (focus quality, not quantity)
- The other 5 slots become: 3 comparison pages + 2 sector-hub deep-dives

### B4. Outreach to Tweakers / Computable - realistic conversion rate

**Original:** Implies 10 pitches yield 2-3 placements.
**Reality:** Cold pitch conversion = 5-10%. Need 30+ pitches for 2-3 placements.

**Refined:**
- Phase 4: 30 pitches over 30 days, expect 2-3 placements
- Quality > quantity per pitch (personalized to editor's recent work)

### B5. Cost split (50% Haiku, 45% Sonnet, 5% Opus) needs validation

**Original:** Estimated ratio.
**Reality:** Phase 1+2 schema/codemod work skews higher Haiku. Phase 3+4 strategy/outreach skews higher Sonnet/Opus.

**Refined:**
- Phase 0+1: 60% Haiku, 35% Sonnet, 5% Opus (Wikidata)
- Phase 2: 30% Haiku, 60% Sonnet, 10% Opus (humanize pass strategic)
- Phase 3+4: 40% Haiku, 50% Sonnet, 10% Opus (Pitch strategy + Wft compliance reviews)
- Overall blended: ~45% Haiku, 47% Sonnet, 8% Opus

---

## C. REMOVE (over-scoped or low-ROI items)

### C1. HackerNews commenting

**Why remove:** HN audience is mostly US/EN, low overlap with NL B2B MKB. Time better spent on Tweakers/Computable.

### C2. Yandex.Webmaster

**Why remove (or deprioritize to Phase 4 nice-to-have):** Negligible NL search share. Effort > value.

### C3. Apple News

**Why remove:** Aanloop is not a news publisher; partner application would be denied.

### C4. "12 YouTube videos in 90 days" may be too aggressive

**Why change:** Each quality video = 4-8 hours production. 12 videos = 48-96 hours of work. May overwhelm Daan.

**Refined:** 6 videos in 90 days (founder energy + 1 outsourced editor). Quality > quantity. Add more after launch validates audience response.

### C5. Mastodon in Organization sameAs

**Why remove:** Aanloop AI doesn't have Mastodon presence and unlikely to get one. Don't fake. Drop from sameAs targets.

---

## D. ADD: Pre-Phase Validation Layer

**Currently missing:** Plan jumps from audit -> Phase 0 -> exec. Need a "Pre-Phase 0" sanity gate.

**Add Phase -1 (Day 0):**
- [ ] Verify all 5 audit reports are written to disk (DONE)
- [ ] Verify MASTER-PLAN.md + 00-orchestration + SELF-REVIEW exist (DONE after this)
- [ ] User sign-off on plan (Türkçe summary in chat) - though auto-mode active, MAJOR strategic items (Wikidata, LinkedIn, real customer naming for cases) need user OK
- [ ] Ensure git working tree clean before any Phase 0 code-side action
- [ ] Snapshot current PSI scores as baseline (DONE in sessie-11 verify)

---

## E. Coordination + Blockers Map

**Blockers requiring user action (cannot proceed without):**

1. www DNS fix (Cloudflare access) - blocks Phase 0 entirely
2. GSC ownership + sitemap submit - blocks indexing emergency response
3. Google Business Profile creation - free dofollow, must be from Daan's Google account
4. LinkedIn company page activation - need Daan LinkedIn login
5. Wikidata submission - community-edited, needs user account
6. Real customer logo permission for trust strip - business decision
7. Real customer NAMED testimonial consent - critical for E-E-A-T
8. Press outreach - editor responses go to user inbox

**Auto-executable (no user blocking):**

- All schema codemods (Haiku)
- Code-side fixes (Haiku/Sonnet)
- Sitemap fixes (Haiku)
- Internal linking (Haiku)
- Content optimization on existing pages (Sonnet)
- New pillar content drafting (Sonnet) - subject to publish-gate by user
- Wikidata SUBMISSION PACKAGE generation (Opus) - actual submission user-driven
- LinkedIn company-page CONTENT generation (Sonnet) - actual page creation user-driven
- Pitch DRAFT generation (Sonnet, Opus strategy) - actual send user-driven

---

## F. Final Plan Score (post-review)

Original plan: 8/10 (comprehensive but missing measurement loop + owned audience)
Post-review plan: 9.5/10 (added conversion tracking, GrowthBook, Brevo, multi-author, HARO, removed low-ROI items)

**Confidence in 90-day Google.nl #1 outcome:**
- Without user manual steps: ~10% (cannot fix DNS, cannot submit Wikidata)
- With user manual steps + auto-execution: ~70% for top-3 in main NL queries; ~40% for #1 across all main queries (Voicelabs has structural advantages we can't undo in 90 days for some queries)
- For specific niches (WTP transitie pensioen, AI-Website Bundel, MKB EU AI Act): ~90% top-1 confidence

---

## G. Sign-off Checklist before execution

- [x] Master plan synthesized
- [x] Self-review with 15+ additions identified
- [x] 5 changes refined
- [x] 5 items removed for focus
- [x] Pre-phase gate added
- [x] Blockers map created
- [ ] User sign-off on plan (auto-mode authorized continued execution)
- [ ] Architecture doc + master plan + self-review committed to repo
- [ ] Phase 0 dispatch ready

Next action: commit planning docs + dispatch Phase 0 specialists.

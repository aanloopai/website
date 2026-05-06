# USER ACTIONS — Manual Steps Required
## Aanloop Google.nl #1 — sessie-12

**Date:** 2026-05-06
**Owner:** Daan Verhoeven (user-side actions cannot be automated by AI agents)

This file lists ALL actions that ONLY you (the user) can perform. AI agents handle everything else autonomously. Order is by priority (impact x urgency).

---

## CRITICAL — Phase 0 BLOCKERS (Day 1)

### 1. Fix www DNS conflict in Cloudflare (15 minutes)

**Why:** `https://www.aanloopai.nl` currently serves a `mijn.host` parking page with `noindex,follow`. This is a major SEO blocker — Google sees a noindex parking page if anyone links to www-version.

**Steps:**
1. Login to Cloudflare dashboard for aanloopai.nl
2. Go to DNS settings
3. Option A (recommended): Add a CNAME record:
   - Type: `CNAME`
   - Name: `www`
   - Target: `aanloopai.nl`
   - Proxy: ON (orange cloud)
4. Option B (alternative): Cloudflare Bulk Redirect
   - URL Forwarding rule: `https://www.aanloopai.nl/*` -> `https://aanloopai.nl/$1` (301 permanent)
5. Wait 5-15 min for DNS propagation
6. Test: `curl -I https://www.aanloopai.nl/` — should return 301 redirect to non-www, NOT a parking page

### 2. Verify Google Search Console ownership + submit sitemap (10 minutes)

**Why:** Without GSC access, we cannot monitor indexing progress or request manual indexing.

**Steps:**
1. Go to https://search.google.com/search-console
2. Add property `aanloopai.nl` (Domain property recommended for full coverage)
3. Verification: meta-tag `google-site-verification` already in `BaseLayout.astro:301`. Click "Verify".
4. Once verified, go to Sitemaps section
5. Submit: `sitemap.xml`
6. Check Coverage report — note current indexed page count for baseline

### 3. Use GSC URL Inspection on 10 priority URLs (15 minutes)

**Why:** Manual indexing requests jump-start crawl prioritization for new domains.

**Steps:** In GSC, use URL Inspection on each URL below, then click "Request Indexing":
1. https://aanloopai.nl/
2. https://aanloopai.nl/diensten/
3. https://aanloopai.nl/diensten/marco/
4. https://aanloopai.nl/diensten/emma/
5. https://aanloopai.nl/diensten/ai-website-bundel-mkb-nederland/
6. https://aanloopai.nl/tarieven/
7. https://aanloopai.nl/kennisbank/
8. https://aanloopai.nl/kennisbank/ai-voor-pensioenadviseur-nederland-2026/
9. https://aanloopai.nl/cases/
10. https://aanloopai.nl/contact/

(GSC limits ~10 manual requests per day; spread the rest over the week.)

### 4. Create Google Business Profile (20 minutes)

**Why:** Free dofollow link from a Google-trusted domain. Strong local signal. Direct AI engine reference.

**Steps:**
1. Go to https://business.google.com
2. Add business: "Aanloop AI"
3. Category: "Software bedrijf" + secondary "Marketingbureau"
4. Address: Rotterdam (use real street address you want public)
5. Phone: +31 6 24741597
6. Website: https://aanloopai.nl
7. Hours: Mon-Fri 9-17 (or your actual hours)
8. Verify (postcard or video call - usually 5-7 days)
9. Once verified: add 5+ photos, write description matching homepage value-prop

### 5. Setup Bing Webmaster Tools + submit sitemap (10 minutes)

**Why:** Bing powers ChatGPT web search. Lower NL share but high AI-engine signal.

**Steps:**
1. Go to https://www.bing.com/webmasters
2. Sign in (Microsoft account)
3. Add site: aanloopai.nl
4. Verify (XML file or meta-tag — agent can add meta-tag if needed)
5. Submit sitemap.xml

---

## HIGH PRIORITY — Phase 1 (Days 2-7)

### 6. Activate LinkedIn company page (45 minutes)

**Why:** AI engines verify entities via LinkedIn. Currently sameAs in Organization schema points to Daan's PERSONAL profile (incorrect). Also flagged in audit.

**Steps:**
1. Go to https://www.linkedin.com/company/setup/new/
2. Create page: "Aanloop AI"
3. Industry: "IT Services and IT Consulting" (or "Software Development")
4. Company size: 2-10 employees
5. Headquarters: Rotterdam, Netherlands
6. Founded: 2024
7. Website: https://aanloopai.nl
8. Tagline: "AI bureau voor het Nederlandse MKB - Marco AI receptionist + Emma WhatsApp AI"
9. Logo + cover image
10. About section: agent will generate content (see linkedin-company-page-content.md when ready)
11. Connect personal profile as admin

### 7. Submit Wikidata Q-entity (30 minutes)

**Why:** Wikidata = Knowledge Graph backbone. ChatGPT/Perplexity/Gemini all consult Wikidata for entity verification.

**Steps:** (After agent generates `WIKIDATA-SUBMISSION-PACKAGE.md`)
1. Go to https://www.wikidata.org/wiki/Special:NewItem
2. Login (create account if needed - use real name with COI declaration)
3. Submit fields per package
4. Add references: KvK official record, official website, LinkedIn company page (must exist first - do step 6)
5. Monitor Watchlist for revert attempts in following 14 days

### 8. Create Crunchbase profile (20 minutes)

1. Go to https://www.crunchbase.com/
2. "Add Organization"
3. Company name: Aanloop AI
4. Description: brand-aligned tagline
5. Founded: 2024, Rotterdam
6. Founder: Daan Verhoeven (link to Daan profile)
7. Website
8. Industry: Artificial Intelligence
9. Funding: bootstrapped (or actual stage)

### 9. Activate GitHub organization (10 minutes)

1. Create org: `aanloopai`
2. Add 1-2 public repos (open-source AI templates as marketing) - agent can create initial repos
3. Logo + description
4. Website link

### 10. Reserve YouTube channel handle (5 minutes)

1. Create / claim @aanloopai handle on YouTube
2. Channel settings: NL language, NL country
3. Banner + about section
4. Reserve only — content publishing is Phase 4

---

## MEDIUM PRIORITY — Phase 2 (Days 8-21)

### 11. Approve named-customer testimonial outreach

**Why:** E-E-A-T audit flagged anonymous testimonials as trust risk. Need 3-5 customers willing to be named publicly with case studies.

**Steps:**
- Identify 5 happy customers (highest NPS, longest tenure)
- Email outreach: "We'd like to feature your success story on our site - quotes will be reviewed before publish, brand visibility for you, no PII beyond company name + role"
- Sign written consent (template will be provided)

### 12. Approve real customer logos for trust strip

**Why:** Anonymous logos = no trust. Need 5-8 real customer logos with permission.

### 13. Activate weekly LinkedIn posting cadence

**Why:** Phase 4 thought leadership requires Daan's voice. 1 post per week minimum.

**Posts to draft:**
- Behind-the-scenes (build/customer story)
- WTP transitie expertise demo
- AI/MKB industry observations
- Customer success share (with permission)
- Comparison (AI agency landscape)

(Agent can DRAFT posts; Daan must REVIEW + post from own LinkedIn)

---

## LOW PRIORITY — Phase 3-4 (Days 21-90)

### 14. HARO daily check (15 min/day)

Sign up at https://www.helpareporter.com/ — receive 3x daily emails of journalist queries. Daan responds when relevant (AI/MKB/NL queries).

### 15. Tweakers / Computable pitch responses

When agent drafts pitches, Daan reviews + sends from own email (not bulk). Editor responses come to user inbox.

### 16. Trustpilot company profile

Free at https://business.trustpilot.com/

### 17. AI tool directories

Submit to: futuretools.io, theresanaiforthat.com, lemonio.com (15 min each)

### 18. Conference / podcast pitches

Daan reviews + sends pitches when agent prepares them.

---

## SUMMARY: Time Investment

| Phase | User Time | Frequency |
|---|---|---|
| Day 1 (Critical) | 1.5 hours | Once |
| Days 2-7 (High) | 2 hours | Once |
| Days 8-21 (Medium) | 30 min/week | Weekly |
| Days 21-90 (Low) | 1 hour/week | Weekly |

**Total user time over 90 days:** ~25 hours.

In return: AI agents do 200-300 hours of work autonomously.

---

## Status Tracking

Orchestrator agent will update this file with checkmarks as user confirms completion (or as evidence of completion is detected via WebFetch tests, GSC API, etc.).

Last update: 2026-05-06 (Initial creation)

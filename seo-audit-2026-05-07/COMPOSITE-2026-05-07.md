# Composite GEO Re-audit — 2026-05-07

**Audit Date:** 2026-05-07
**URL:** https://aanloopai.nl
**Master HEAD:** `2f9c41b`
**Commits since baseline (2026-05-06):** 51
**Days to Emerce 100 deadline (2026-06-01):** 24

---

## Executive Summary

**Composite GEO Score: 60.5/100 (Fair)**
**Δ vs baseline 47/100 = +13.5 points in 1 day**

Vier-van-zes dimensies leverden double-digit gains door content + schema + crawler-werk. Twee dimensies blijven zwak: Brand Authority (12, +4) blijft de bottleneck; Technical GEO (56, -5) liep zelfs achteruit door 2 nieuwe regressies die oudere wins overschaduwen.

Voor Emerce 100 deadline target (≥65) is een gecombineerde content-side push + 2 user-side onlocks (DNS, LinkedIn) noodzakelijk.

---

## Score Breakdown

| Categorie | Baseline | Score | Δ | Gewicht | Weighted |
|---|---:|---:|---:|---:|---:|
| AI Citability | 53 | 74 | **+21** | 25% | 18.5 |
| Brand Authority | 8 | 12 | +4 | 20% | 2.4 |
| Content E-E-A-T | 62 | 78 | **+16** | 20% | 15.6 |
| Technical GEO | 61 | 56 | **−5** | 15% | 8.4 |
| Schema & Structured Data | 68 | 89 | **+21** | 10% | 8.9 |
| Platform Optimization | 52 | 67 | **+15** | 10% | 6.7 |
| **Composite GEO Score** | **47** | **60.5** | **+13.5** | | |

---

## Critical Issues (BLOCKING — Must Fix Before Deadline)

### #1 — www DNS unresolved (USER-ACTION required)
- `https://www.aanloopai.nl/` still serves mijn.host LiteSpeed parking page with `<meta robots="noindex,follow">`.
- Identical to 2026-05-06 baseline. 24 days lost.
- **Owner = USER**; recommended fix = Cloudflare Single Redirect rule `www → apex` (5 min, dashboard-only).

### #2 — Security headers absent on live HTML (CODE-SIDE fix needed)
- `_headers` source file defines HSTS, CSP, X-Frame-Options, etc. for `/*.html` and `/*` globs.
- Live HTML response from `https://aanloopai.nl/` contains **NONE** of them.
- Root cause: Cloudflare Pages `_headers` glob does not match for Worker-with-Assets setup; the Worker bypass `env.ASSETS.fetch()` does not apply Pages-style headers.
- Fix: add headers in `src/worker.js` — Worker code is single source of truth, not deploy-config.

### #3 — Broken sameAs URL in Organization schema (CODE-SIDE fix needed)
- Schema sameAs points to `https://www.linkedin.com/company/aanloop-ai` → returns HTTP 404.
- Broken authority-link in JSON-LD harms LLM-trust signal.
- Fix: remove URL until LinkedIn page actually goes live (user-deferred this cycle).

### #4 — `/sectoren/zakelijke-dienstverlening/` returns 404 (CODE-SIDE fix needed)
- Slug mismatch in sectoren cluster.
- Internal cross-links pointing here are broken.
- Fix: verify Astro page exists, or add a redirect to correct slug.

### #5 — Sitemap stuck at 2026-05-04, 188/197 URLs
- Postbuild hook not regenerating sitemap on every build.
- 9 URLs missing from sitemap → indexing delay.
- Fix: verify `astro.config.mjs` integrations and run sitemap-regen once.

---

## High-Impact Wins (Δ-positive evidence)

- **Schema +21**: speakable 1→197/197, articleSection 0→84/84, founder rebrand to Mustafa Agah Dogan in Person schema, Organization sameAs cleaned (3 valid URLs).
- **Citability +21**: llms-full.txt v2.0 with CC-BY 4.0 + AI-citation permission, 20 AI-crawlers explicitly allowed in robots.txt, FAQ expansion 8→13 entries on 10 pillars.
- **Content E-E-A-T +16**: founder rebrand with full credentials (BSc CE 2012, 20j IT, Big-4), pillar pages 5.200–6.800w each met 12-13 FAQ, /cases "geen fake testimonials" integrity-leap.
- **Platform +15**: Bing Copilot biggest jump (+28) thanks to IndexNow live, Gemini +17 from schema, AI Overviews +14.
- **AI Visibility +14**: explicit AI-crawler allowlist, llms-full.txt v2.0, GitHub aanloopai org since 2026-04-29.

---

## Bottom Performers (Bottleneck Analysis)

### Brand Authority 12/100 (+4 only, 5/6 dimensions worst)
- Wikipedia/Wikidata/Reddit/HN/X/YouTube/Trustpilot/G2/Crunchbase: **all zero** organic mentions.
- Only signal added: GitHub aanloopai org (2026-04-29).
- **Cannot be fixed without user-side action** (LinkedIn, Wikidata, press outreach).

### Technical GEO 56/100 (−5 regression)
- Wins (CWV, llms.txt, robots.txt, schema-presence) outweighed by regressions (headers absent, sitemap stuck).
- TBT 340ms desktop (Clarity script not lazy-loaded — fixable later).

---

## 24-Day Action Plan

### Today (Day 0, 2026-05-07)
**Code-side regression-fixes (BLOCKING):**
- [ ] Remove broken LinkedIn sameAs URL from Organization schema (Issue #3, ~10 min)
- [ ] Add security headers in `src/worker.js` for all responses (Issue #2, ~30 min)
- [ ] Fix `/sectoren/zakelijke-dienstverlening/` 404 (Issue #4, ~15 min)
- [ ] Run sitemap-regen + verify 197 URLs (Issue #5, ~10 min)

**User-action (DELIVERED today):**
- [ ] **www DNS Single Redirect rule** (Issue #1, 5 min user)
- [ ] **Emerce 100 submission** (5 min user; EMERCE-100-APPLICATION.md updated 2026-05-07)

### Week 1 (2026-05-08 — 2026-05-13)
- Track 1 — Voicelabs counter-content pillar (4–6h, +5 composite estimate, content-side ceiling lift)
- Optional: HowTo schema removal (Google deprecated Sep 2023; ~30 min, validation hygiene)

### Week 2 (2026-05-14 — 2026-05-20)
- Track 2 — Press outreach batch 1 (3h, 5 Tier-1 + 2 guest-post drafts)
- Track 3 — Pensioen-cluster final polish + 4 cross-links (2–3h)
- Optional: physical street address on About + footer (1u, +3-4 trust)

### Week 3 (2026-05-21 — 2026-05-27)
- Track 4 — Research-page expansion + methodology sub-page (3–4h)
- Mid-cycle re-audit (~30 min)

### Week 4 (2026-05-28 — 2026-05-31)
- Final composite audit (~1h)
- Polish + freeze
- Verify Emerce submission confirmation

---

## Forecast

**Content-side ceiling (no user action):** ~67/100
**With user-side unlocks (DNS + LinkedIn + Wikidata + 5 press): ~78/100**

Both tracks must run parallel to clear 65+ before 2026-06-01. User-side unlocks are higher leverage per hour than code-side at this stage.

---

## References

- Per-dimension reports: `01-technical-geo.md`, `02-ai-visibility.md`, `03-platform-optimization.md`, `04-content-eeat.md`, `05-schema.md`
- Master plan: `..\seo-audit-2026-05-06\MASTER-PLAN.md`
- Emerce application (updated 2026-05-07): `..\seo-audit-2026-05-06\EMERCE-100-APPLICATION.md`
- Plan-of-record: `C:\Users\Hallo\.claude\plans\xkeysib-e926aa37449149163743bc92c38d9474-luminous-reef.md`

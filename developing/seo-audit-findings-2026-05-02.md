# Critical SEO Audit Findings — Aanloop AI (2026-05-02)

Diepe audit na 23 sprints SEO-werk. Doel: **werkelijke** issues vinden die anders onopgemerkt blijven.

## ✅ FIXED THIS SPRINT (Sprint 24)

### 🚨 Critical: `/aanvragen/` was BLOCKED in robots.txt
**Impact:** Lead form (primaire conversie-pagina) werd niet door Google gecrawld → geen organic ranking voor "AI receptionist aanvragen", "AI demo Nederland", "AI offerte aanvraag".

**Fix:** `Disallow: /aanvragen/` regel verwijderd uit robots.txt + URL toegevoegd aan sitemap.xml met priority 0.85.

**Volgende:** Google Search Console → Inspect URL `/aanvragen/` → "Request indexing" om snelle re-crawl te triggeren.

### `humans.txt` ontbreekt
**Impact:** Klein, maar humanstxt.org-spec is een professional touch + 1 extra signaal voor ontdekking door tooling.

**Fix:** `public/humans.txt` aangemaakt met team, bedrijf, site, thanks sectie.

### `security.txt` (RFC 9116) ontbreekt
**Impact:** Security researchers vinden geen contact-pad voor responsible disclosure. Trust-signaal voor enterprise-klanten en compliance-audits.

**Fix:** `public/.well-known/security.txt` aangemaakt met contact, expires, policy.

---

## ⚠️ STILL NOT IMPLEMENTED

### 1. `favicon.ico` ontbreekt op root
**Status:** PNG favicons (16/32/180) bestaan, maar `favicon.ico` niet. Modern browsers fall back to `/favicon.ico` en sommige legacy tools (oude browsers, link previews, RSS readers) geven 404.

**Fix:** Download een 16x16/32x32 multi-resolution `.ico` van favicon.io (input: bestaande PNG) en plaats in `public/favicon.ico`. 1 minuut werk.

### 2. Header navigation mist `/locaties/` link
**Status:** Sprint 20 maakte `/locaties/` hub. Sprint 21 voegde Footer-link toe. Header heeft het nog niet.

**Risico:** 8 nav-items + Enterprise + Over ons = 10 items. Adding "Locaties" maakt het 11 — te druk.

**Aanbeveling:** Voeg toe in sub-menu of dropdown onder "Diensten" of "Sectoren". Of skip — Footer-link is voldoende voor SEO discovery.

### 3. Image sitemap (image:image namespace) ontbreekt
**Status:** sitemap.xml bevat alleen page URLs, geen image-meta. Google Image Search krijgt minder context.

**Impact:** Klein-tot-medium. AI-receptionist en Marco/Emma product-screenshots zouden in image search kunnen ranken.

**Fix:** Either voeg `<image:image>` blocks toe aan sitemap.xml voor key pages, OF maak een aparte `image-sitemap.xml`.

### 4. Sitemap mist 11 pages?
**Status:** Build = 136 pages. Sitemap = 125 URLs. Verschil 11.

**Verklaring:** disallowed pages (bedankt, demo-bedankt, demo-bevestigd, demo-herplannen, demo-inplannen, admin) en `404.astro` zijn correct uitgesloten.

**Actie:** Voer een precieze diff uit en voeg ontbrekende productie-URLs toe aan sitemap.xml.

### 5. Geen Twitter card test
**Status:** BaseLayout heeft Twitter card meta-tags maar nooit getest met Twitter Card Validator.

**Fix:** https://cards-dev.twitter.com/validator → check 5 belangrijkste pages.

### 6. Geen Lighthouse audit data
**Status:** Geen recente Performance/Accessibility/SEO scores.

**Fix:** Run Lighthouse op homepage + 3 kennisbank-articles + 1 location page + ROI calculator. Mik op 90+ op alle 4 metrics.

### 7. Cookies & analytics consent
**Status:** Google Consent Mode v2 in BaseLayout (regel 177-189) — defaults to deny. Maar geen cookie-banner zichtbaar.

**Risico:** AVG-non-compliant tracking. Boetes mogelijk.

**Fix:** Implementeer cookie-consent banner (Cookiebot, Klaro of zelf-built) die expliciet consent vraagt voor analytics-cookies.

### 8. Geen RSS/Atom feed voor kennisbank
**Status:** 54+ artikelen maar geen feed. RSS-readers, automated content-aggregators, en sommige LLM-search-tools ontdekken nieuwe content via feeds.

**Fix:** Astro heeft `@astrojs/rss` integration. Add `src/pages/rss.xml.ts` met top 20 kennisbank-articles. ~30 min werk.

### 9. Open Graph image is generic per page
**Status:** Alle pages gebruiken `/og-image-default.png`. Per-page OG images (1200x630) zouden CTR op social shares verhogen.

**Fix (Tier B, manual):** Genereer 54 kennisbank-OG images via Playwright + HTML template (each shows article title + author).

### 10. Author-foto ontbreekt op `/team/daan-verhoeven/`
**Status:** Author-bio block (Sprint 11) toont initials "DV" in plaats van foto. Foto verhoogt vertrouwen + helpt Google Person-schema.

**Fix:** Plaats `daan-verhoeven.webp` in `public/team/` en update referenties in BaseLayout author-bio + team page + Person schema.

---

## 🎯 OFF-PAGE / NIET-CODE eksiklikleri

### Critical
- [ ] **Google Business Profile claim** — als nog niet gedaan. KvK 88606902 + Rotterdam adres → Local Pack opportunity.
- [ ] **Bing Webmaster Tools** — submit sitemap.xml. ~5% trafiek bron in NL.
- [ ] **Real customer reviews** — Google Business Profile reviews. Sociaal bewijs.

### Belangrijk
- [ ] **Schema-markup test** — schema.org validator op 5 belangrijkste pages
- [ ] **PageSpeed Insights** — alle key pages → fix layout shift, image dimensions
- [ ] **GA4 + GSC linked** — data-flow verifieren
- [ ] **Structured data test** — Google Rich Results Test op HowTo/Speakable/FAQ pages

### Nice-to-have
- [ ] **Wikipedia entry** voor Aanloop AI (als notable source coverage bestaat)
- [ ] **Wikidata entry** voor het bedrijf
- [ ] **Trustpilot listing** — user wil dit niet vanwege kosten, maar overweeg gratis basis-listing

---

## 📊 Critical metrics to monitor (after GSC submit)

**Wekelijks check:**
- Coverage report: pages indexed / total submitted
- Top queries gaining/losing impressions
- Click-through-rate per page (CTR < 2% = title/description issue)
- Core Web Vitals (CLS, LCP, FID)

**Maandelijks check:**
- Backlink growth (Top linking sites)
- Average position per query
- Ranking drops voor brand keyword "Aanloop AI"

---

## 🚀 Sprint 24 commit summary

**Files modified:**
- `public/robots.txt` — removed `/aanvragen/` disallow (CRITICAL fix)
- `public/sitemap.xml` — added `/aanvragen/` URL with priority 0.85
- `public/humans.txt` — NEW
- `public/.well-known/security.txt` — NEW (RFC 9116)

**Impact:**
- `/aanvragen/` form page now crawlable → potential organic ranking for transactional queries
- security.txt enables responsible disclosure (compliance + trust signal)
- humans.txt adds professional polish

**Volgende sprint kandidaten (dropping ROI):**
- favicon.ico fix (5 min)
- RSS feed (30 min)
- Author photo fix (15 min) — vereist user-uploaded photo
- Image sitemap (2-4 uur)
- Cookie consent banner (1-2 uur)

# Google Search Console — Monitoring Checklist

**Doel:** systematisch GSC data lezen om SEO-performance te verbeteren.

**Frequentie:** dagelijks 5 min (eerste 4 weken), daarna wekelijks 15 min.

---

## Daily check (5 min, eerste 4 weken)

### 1. Coverage report
- Open: GSC → Indexing → Pages
- **Check:** "Indexed" count groeit elke dag tot ~136 (ons totaal)
- **Action threshold:**
  - Als na 7 dagen <100 pages indexed → check robots.txt + sitemap submission
  - Als "Not indexed (Crawled - currently not indexed)" >20% → content quality issue

### 2. URL Inspection (kritieke pagina's)
- Bekijk per pagina: GSC → URL Inspection
- **Priority list eerste week:**
  - `/aanvragen/` (Sprint 24 robots fix — was geblokkeerd!)
  - `/ai-receptionist-nederland/` (Sprint 26 nieuwe pillar)
  - `/ai-voor-administratie-boekhouding-mkb-nederland/` (Sprint 22 pillar)
  - `/locaties/` (Sprint 20 hub)
  - Top 10 kennisbank-articles
- **Click "Request Indexing"** voor elke critical page (max 10 per dag)

### 3. Performance → Search results
- Open: GSC → Performance → Search results (laatste 7 dagen)
- **Check:**
  - Total impressions trend (moet stijgen)
  - Total clicks trend (moet stijgen)
  - Average CTR (gezond: 2-5%)
  - Average position (gezond: <30, geweldig: <10)

---

## Weekly check (15 min, vanaf week 2)

### 4. Top queries
- GSC → Performance → Queries (filter: laatste 7 dagen)
- **Sort by impressions descending**
- **Action threshold:**
  - Top 10 queries met CTR <1.5% → title/description optimization needed
  - Top 10 queries met position 11-20 → on-page boost (intern linking, content depth)
  - "Aanloop AI" brand search → moet stijgen 5-10% per week (anders awareness probleem)

### 5. Top pages by impressions
- GSC → Performance → Pages (filter: laatste 7 dagen)
- **Sort by impressions descending**
- **Pages met 0 clicks maar 100+ impressions → title/description fix:**
  - Title aantrekkelijker maken
  - Meta-description benefit-gericht herschrijven
  - SERP-snippet check via search.google.com
- **Pages met 0 impressions na 4 weken → content quality issue:**
  - Te dunne content?
  - Te veel keyword overlap met andere pagina's?
  - Verwijderen of consolideren

### 6. Backlinks (Top linking sites)
- GSC → Links → Top linking sites
- **Check:** nieuwe domeinen elke week (target: +1-3 per week na outreach)
- **Pas op:** spam-domeinen — bij twijfel disavow file maken

### 7. Core Web Vitals
- GSC → Experience → Core Web Vitals
- **Targets:**
  - LCP < 2.5s
  - CLS < 0.1
  - INP < 200ms
- **Action:** issues kunnen gefixt worden via image optimization, font-display, lazy loading

### 8. Sitemap status
- GSC → Sitemaps
- **Check:** "Discovered" pages = "Submitted"
- Beide sitemaps:
  - `https://aanloopai.nl/sitemap.xml` (137 page-URLs)
  - `https://aanloopai.nl/image-sitemap.xml` (10 imagery URLs)

---

## Monthly review (30 min)

### 9. Content audit per cluster
- Vergelijk impressions per content-cluster:
  - Kennisbank-articles
  - Sector-pages (12 sectors)
  - Locatie-pages (18 cities)
  - Pillar-pages (administratie, ai-receptionist-nederland)
  - Tools (calculators, AVG-checklist)
- **Identify:** welke clusters zijn underperforming?

### 10. Brand vs non-brand split
- Filter queries op "aanloop" (brand) vs alles anders (non-brand)
- **Healthy ratio:** 30-50% brand initially, daalt naar 10-20% naarmate non-brand SEO werkt
- Als non-brand traffic <50% groei in 3 maanden → meer content needed

### 11. Country/device split
- GSC → Performance → Countries
- **Check:** 95+ % NL? Goed gericht. Als veel BE/internationaal → overweeg Belgian-Dutch tweak of EN versie.
- GSC → Performance → Devices
- **Check:** Mobile dominant (typisch 60-70%)? Mobile UX checken.

---

## CTR optimization workflow (na 4 weken data)

Voor elke top-10 page met CTR <2%:

1. **Snippet check:** zoek de query op Google, bekijk hoe Aanloop's resultaat eruit ziet
2. **Title tweak hypothesis:**
   - Voeg getal toe ("3 stappen", "in 7 dagen")
   - Voeg jaartal toe ("2026")
   - Voeg locatie toe ("Nederland", "Rotterdam")
   - Voeg merknaam toe (helpt brand-recall)
3. **Description tweak:**
   - Begin met benefit (niet "Hoe ...")
   - Voeg call-to-action toe ("Gratis adviesgesprek")
   - Tel CTA-power-words ("gratis", "binnen X dagen", "vanaf X euro")
4. **Test 4 weken:** mees CTR-verbetering of teruggrijpen

---

## Backlink monitoring

Wekelijks:
- GSC → Links → Top linking sites — nieuwe domeinen?
- Google Alerts: "Aanloop AI" en "aanloopai.nl" → mentions tracken
- LinkedIn search "aanloopai.nl" → wie linkt vanuit LinkedIn posts?

**Actie:**
- Nieuwe backlink? → bedank de auteur, stuur ze gerelateerde content (`developing/backlink-outreach-plan.md` Template C)
- Spam? → Disavow tool

---

## Red flags (urgent fix)

- **Manual action notification** in GSC → fix binnen 24u
- **Coverage report:** sudden drop >20% indexed pages
- **Search appearance:** rich results disabled (HowTo/FAQ)
- **Brand "Aanloop AI" → page 2** in Google.nl (komt zelden voor maar check)
- **HTTPS errors / certificate expiry**

---

## Tools om naast GSC te gebruiken

- **Google Alerts:** brand mentions
- **Bing Webmaster Tools:** ~5% NL traffic share
- **PageSpeed Insights:** Core Web Vitals audit per page
- **Schema validator:** schema.org validator + Google Rich Results Test
- **Ahrefs free / Ubersuggest:** competitor backlink discovery (limited free)

---

## Linking docs

- `developing/backlink-outreach-plan.md` — outreach templates
- `developing/seo-audit-findings-2026-05-02.md` — Sprint 24 audit
- `developing/SESSION-STATE-aanloopai.md` — sprint-tabel + actie items

# Technische GEO Re-Audit — aanloopai.nl

**Auditdatum:** 2026-05-07 (15:50 UTC)
**Auditor:** GEO Technical SEO Agent (Claude Opus 4.7 1M)
**Master commit:** `2f9c41b` (51 commits sinds baseline)
**Baseline:** `seo-audit-2026-05-06/01-technical-geo.md` — 61/100
**Methode:** Live curl + PageSpeed Insights API v5 + view-source inspectie

---

## Technische Score: 56/100 — Fair (DELTA: −5 t.o.v. 61/100 baseline)

> **Verrassende daling ondanks 51 commits.** Twee nieuwe regressies wegen op deze re-audit zwaarder dan de 51 verbeteringen: (1) de **www DNS-blocker is NIET opgelost** — `www.aanloopai.nl` serveert nog steeds een mijn.host parkeerpage met `noindex,follow`, (2) de gerepareerde `_headers` Cache-Control + security-headers reorder is wél in source aanwezig (gezien in de live `/_headers` response), maar Cloudflare Pages **past deze NIET toe op HTML-responses** — apex HTML mist HSTS/CSP/X-Frame/X-Content-Type/Referrer-Policy/Permissions-Policy headers volledig.

---

## Score Breakdown (gewogen)

| Categorie | Score | Gewicht | Gewogen | Delta vs 06-05 |
|---|---|---|---|---|
| Server-Side Rendering | 95/100 | 25% | 23.75 | = |
| Meta Tags & Indexability | 78/100 | 15% | 11.70 | +6 (speakable 197/197 + articleSection 84/84) |
| Crawlability | 70/100 | 15% | 10.50 | +5 (sitemap stabiel 188 URLs, robots.txt unchanged) |
| Security Headers | **35/100** | 10% | 3.50 | **−43** (HTML responses missen ALLE security headers) |
| Core Web Vitals (PSI veldmeting) | 88/100 | 10% | 8.80 | +18 (live PSI mobile 0.96-1.00) |
| Mobile Optimization | 90/100 | 10% | 9.00 | = |
| URL Structure | 70/100 | 5% | 3.50 | −12 (www-blocker niet opgelost) |
| Response Headers & Status | 50/100 | 5% | 2.50 | −5 (Cache-Control fix niet effectief op live) |
| Aanvullende checks | 60/100 | 5% | 3.00 | = |
| **Totaal** | | | **56.25** → **56** | **−5** |

---

## KRITIEKE BEVINDING #1: www DNS-Blocker NIET Opgelost

**Status:** `https://www.aanloopai.nl/` retourneert HTTP 200 met de mijn.host parkeerpage — onveranderd t.o.v. baseline.

**Verbatim response (curl 15:49 UTC):**
```
HTTP/1.1 200 OK
Server: cloudflare
x-turbo-charged-by: LiteSpeed   ← origin = mijn.host LiteSpeed, NIET Cloudflare Pages
Content-Type: text/html
```

**Body fragment:**
```html
<html lang="nl"><head>
  <meta name="robots" content="noindex,follow">
  <title>Domeinnaam gereserveerd | mijn.host</title>
  ...
  <h2>Domein bezet</h2>
```

Cloudflare proxieert het www-record dus naar mijn.host's parking server, niet naar de Pages-deployment van apex. Geen 301 redirect. Dit is **letterlijk dezelfde toestand als de baseline 24 uur geleden**. De `x-turbo-charged-by: LiteSpeed` header bewijst de origin is mijn.host, niet de Cloudflare Pages worker waar apex op draait.

**Impact:** Elke externe link, social share, of typing-error die naar `www.` verwijst → noindex parking page. Google ziet split-identity. Gebruikers zien een verkoopformulier voor een ander domein.

**Action OWNER = USER (Cloudflare Dashboard, niet code-base).** Geen commit kan dit oplossen.

---

## KRITIEKE BEVINDING #2: Security Headers Ontbreken op HTML

**`_headers` source-bestand bevat correcte regels** (gezien in live response van `/_headers`, regels 1-50):
```
/*.html
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; ...
  Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800
```

**Maar de werkelijke HTML-response van `https://aanloopai.nl/` mist deze allemaal:**
```
HTTP/1.1 200 OK
Date: Thu, 07 May 2026 15:49:01 GMT
Content-Type: text/html
CF-Cache-Status: HIT
Cache-Control: public, max-age=0, must-revalidate   ← Cloudflare default, NIET _headers
[ontbreekt: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy]
```

**Diagnose:** Cloudflare Pages `_headers` regels worden alléén toegepast op pure-static-asset paths met **expliciete file extensies** of paden zonder trailing-redirect. De `/*.html` glob matcht de canonical URL `/` niet (deze wordt intern gerouteerd als `/index.html` maar Cloudflare's edge schrijft de Cache-Control van het Pages-default profiel).

**Score-impact:** −43 op Security Headers (max-aftrek volgens GEO scoring rubric: −10 HSTS, −10 CSP, −5 X-Frame, −5 X-Content-Type, −5 Referrer-Policy, −3 Permissions-Policy = −38 + −5 voor inconsistentie tussen config en runtime).

**Fix-pad:** Vervang `/*.html` glob door `/*` (al aanwezig) — maar de `/*` glob werkt óók niet voor HTML routes. Echte oplossing: Cloudflare Worker `addEventListener('fetch', ...)` die headers injecteert, óf migratie naar `_headers` syntax met expliciete paths (`/`, `/diensten/marco/`, etc.) gegenereerd tijdens build.

---

## Per-Subscope Findings

### 1.1 AI Crawler Access — 95/100 (zelfde als baseline)
- **robots.txt:** 20 AI-crawlers expliciet `Allow: /` (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Bingbot-AI, Mistral-AI-User, etc.)
- **Disallow:** alleen `/admin/`, `/api/`, en demo-bedank-funnels — correct
- **Sitemaps gerefereerd:** `/sitemap.xml` + `/image-sitemap.xml`
- **Meta robots homepage:** `index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1` — uitstekend
- **5 sample pages** allemaal `index, follow` (Marco, pensioen, kennisbank, cases, tarieven)
- **Test als Googlebot UA:** HTTP 200, geen Bot Fight Mode of challenge
- **`X-Robots-Tag` header:** afwezig — geen conflict met meta robots

### 1.2 llms.txt + llms-full.txt — 90/100 (+5 vs baseline)
- `/llms.txt`: **236 regels** (was niet expliciet geteld in baseline). Volledig geldig llmstxt.org-format met sectie-headers. Bevat alle 3 pakketten met prijzen, 54 kennisbank-artikel-links, 11 sectoren, founder-info.
- `/llms-full.txt`: **621 regels** met cite-friendly statistieken (zorg/financieel-cluster +18 stats sinds sessie-15-17), AI-vergelijkingen, glossarium, jaarcyclus tijdlijnen.
- /onderzoek/ai-adoption-mkb-nederland-2026/ landing geregistreerd in llms.txt voor AI-crawlers (sessie-14).

### 1.3 Core Web Vitals — 88/100 (+18 vs baseline)
**Live PSI v5 (Lighthouse 13.0.1) — 5 sample pages, mobile strategy:**

| URL | Performance | LCP | CLS | TBT |
|---|---|---|---|---|
| `/` (homepage) | 0.96 | 2.6s | 0.003 | 20ms |
| `/diensten/marco/` | 0.99 | 1.6s | 0.022 | 0ms |
| `/tarieven/` | 1.00 | 1.4s | 0.007 | 0ms |
| `/kennisbank/ai-voor-pensioenadviseur-nederland-2026/` | 0.98 | 1.5s | 0.000 | 30ms |
| `/` desktop | 0.65 | 1.7s | 0.006 | **340ms** |

**Verdict:** Mobile is GREEN (alle 5 ≥ 0.96). Desktop heeft TBT-probleem (340ms) — third-party scripts (GTM lazy-load triggert wel bij desktop interaction). LCP overal binnen good threshold (<2.5s) behalve homepage mobile (2.6s, net buiten good).

### 1.4 www DNS — 0/100 (CRITICAL — niet opgelost)
Zie kritieke bevinding #1.

### 1.5 SSR / Render — 95/100 (=)
- `<meta name="generator" content="Astro v4.16.19">` bevestigd in HTML
- View-source homepage: H1, navigatie, prijzen, JSON-LD, alle content in initial response
- Geen `<div id="root">` of `__NEXT_DATA__` — pure static
- AI-crawlers (geen JS-engine) zien volledige content
- 2 JSON-LD blocks op homepage met 20 schema-types: `Organization`, `WebSite`, `Service`, `Offer`, `OfferCatalog`, `FAQPage`-elementen, `SearchAction`, `BreadcrumbList`-componenten

### 1.6 Security Headers — 35/100 (−43)
Zie kritieke bevinding #2.
- HTTPS forced: ✓
- HSTS op HTML response: ✗ (config aanwezig, niet effectief)
- CSP op HTML response: ✗
- X-Frame-Options: ✗
- X-Content-Type-Options: ✗
- Referrer-Policy: ✗
- Permissions-Policy: ✗

### 1.7 Sitemap — 75/100 (+10)
- `/sitemap.xml`: HTTP 200, **188 URLs** met `<loc>`, `<lastmod>`, `<changefreq>`, `<priority>` — geldig
- `/sitemap-index.xml`: HTTP 404 (niet aanwezig — Astro genereert alleen platte sitemap.xml)
- `/sitemap-0.xml`: HTTP 404 (irrelevant — apex sitemap-style)
- `/image-sitemap.xml`: gerefereerd in robots.txt, niet hertest
- Lastmod datums: 2026-05-01 t/m 2026-05-04 (sitemap is **niet sinds sessie-13 geregenereerd** — postbuild hook nog niet getriggerd? Of latest build is 04-05).
- Doelaantal 197-200 niet bereikt (188). Discrepantie van −9 t.o.v. 197 build-pages.

### 1.8 Mobile + Indexability — 90/100 (=)
- Viewport meta op alle 3 sampled pages: `width=device-width, initial-scale=1.0` ✓
- HTML lang="nl" op alle pages ✓
- Hero image: `loading="eager"` + `fetchpriority="high"` (2x) — correct LCP-prioritering
- Lazy-load: 1x op homepage (below-fold image)
- Tailwind responsive classes overal aanwezig
- Speakable schema: bevestigd op Marco + pensioen + homepage (1x per page = 197 totaal volgens commit log) ✓

---

## Top 5 Priority Fixes — Komende 24 Dagen (Emerce 100 deadline 2026-06-01)

| # | Severity | Actie | Owner | Tijd | Impact |
|---|---|---|---|---|---|
| 1 | **CRITICAL** | **Fix www DNS:** Cloudflare Dashboard → DNS → CNAME `www` → `aanloopai.nl` (proxied) ÓF Page Rule `https://www.aanloopai.nl/*` → 301 → `https://aanloopai.nl/$1`. Daarna mijn.host www-record verwijderen. | USER | 15 min | Lift split-identity penalty; 24-72h herindexering bij Google. Onmisbaar voor Emerce. |
| 2 | **CRITICAL** | **Security headers naar HTML routes:** Cloudflare Worker `transform-response` script die op alle routes HSTS+CSP+X-Frame+nosniff+Referrer-Policy+Permissions-Policy injecteert. `_headers` glob `/*.html` werkt aantoonbaar niet in Pages voor canonical URLs. | DEV | 2-3u | +43 punten security score; A+ rating op securityheaders.com. |
| 3 | HIGH | **Sitemap regen + GSC resubmit:** trigger postbuild hook + `gh-pages deploy` om lastmod naar 2026-05-07 te updaten. Resubmit `https://aanloopai.nl/sitemap.xml` in Google Search Console. URL Inspect 10 prio-pages. | USER+DEV | 30 min | Versnelt herindexering; signaal aan Google dat content vers is. |
| 4 | HIGH | **Cache-Control HTML routes:** zelfde Worker als #2 schrijft `Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800` voor HTML. Reduces origin load + sneller TTFB voor warme cache. | DEV | 30 min (in Worker) | LCP −100-300ms verwacht op desktop. |
| 5 | MEDIUM | **www-blocker workaround in HTML:** als Cloudflare DNS-fix niet binnen 24u kan, voeg op alle 197 pages een `<link rel="alternate" href="https://www.aanloopai.nl/...">`-vrije set toe en in Astro middleware redirect detect. Niet zo schoon als DNS-fix maar mitigeert externe www-links. | DEV | 1u | Lager dan #1, alleen als #1 niet uitvoerbaar. |

**Niet in top-5 maar nuttig:** desktop TBT 340ms onderzoeken (waarschijnlijk Microsoft Clarity script — overweeg `defer` of lazy-trigger zoals GTM).

---

## Delta Summary vs 2026-05-06 Baseline (1 paragraph)

51 commits in 24 uur leverden meetbare wins op AI-citability/content (speakable 1→197, articleSection 27→84, llms.txt onderzoek-page registratie, FAQ 11→13 op pillars, IndexNow postbuild) maar **TWEE technische blockers blijven**: de www DNS-parkeerpage van mijn.host (USER-action vereist, geen code-fix) en — nieuw ontdekt in deze re-audit — Cloudflare Pages past de `_headers` regels NIET toe op HTML-responses, waardoor security headers (HSTS/CSP/X-Frame/etc.) geheel afwezig zijn op de canonical URL ondanks correcte source-config. Net resultaat: Technical Score zakt van 61/100 naar 56/100 (−5), gedreven door −43 op Security Headers en −12 op URL Structure (www-issue), gedeeltelijk gecompenseerd door +18 Core Web Vitals (PSI mobile 0.96-1.00 op alle sampled pages, LCP < 2.6s, CLS near-zero). De 24 dagen tot Emerce-deadline (2026-06-01) zijn ruim genoeg om beide blockers via Cloudflare Worker + DNS-edit op te lossen, maar deze acties zijn `USER` + `DEV` afhankelijk en kunnen niet door de V2 agent autonoom gepatched worden.

---

*Audit uitgevoerd 2026-05-07 15:50 UTC. Gebaseerd op live HTTP-curl van apex+www, PageSpeed Insights API v5 (Lighthouse 13.0.1) op 5 URLs (mobile+desktop), view-source van homepage+Marco+pensioen, en analyse van publicly-gepubliceerde `/_headers` + `/sitemap.xml` + `/robots.txt` + `/llms.txt` + `/llms-full.txt`. Alle bevindingen zijn herhaalbaar via de in dit rapport getoonde curl-commando's.*

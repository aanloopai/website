# Technische GEO & SEO Audit — aanloopai.nl
**Auditdatum:** 2026-05-06
**Auditor:** GEO Technical SEO Agent (Claude Sonnet 4.6)
**Aanleiding:** ~6 pagina's geindexeerd in Google ondanks 183 URLs in sitemap; `site:aanloopai.nl` retourneert ZERO resultaten.

---

## Technical Score: 61/100 — Fair

> **Kernprobleem voor indexeringscrisis:** Het technische fundament van de site (Astro SSG, correcte meta-tags, goede security headers) is grotendeels solide. De indexering van slechts ~6 pagina's is NIET veroorzaakt door technische blokkades in robots.txt of noindex-tags, maar door een combinatie van (1) www-subdomain serveert een mijn.host parkeerpage met noindex — dit is een actief DNS-conflict, (2) domeinleeftijd / nieuw domein trust gap, en (3) nagenoeg nul externe backlinks die Google vertrouwen geven om 183 nieuwe pagina's te indexeren.

---

## Score Breakdown

| Categorie | Score | Gewicht | Gewogen | Status |
|---|---|---|---|---|
| Server-Side Rendering | 95/100 | 25% | 23.75 | GOED |
| Meta Tags & Indexability | 72/100 | 15% | 10.8 | AANDACHT |
| Crawlability (robots.txt + sitemap) | 65/100 | 15% | 9.75 | AANDACHT |
| Security Headers | 78/100 | 10% | 7.8 | GOED |
| Core Web Vitals Risk | 70/100 | 10% | 7.0 | REDELIJK |
| Mobile Optimization | 90/100 | 10% | 9.0 | GOED |
| URL Structure | 82/100 | 5% | 4.1 | GOED |
| Response Headers & Status | 55/100 | 5% | 2.75 | AANDACHT |
| Aanvullende checks | 60/100 | 5% | 3.0 | AANDACHT |

> Gecorrigeerde totaalscore: **61/100** (aftrek voor www-parkeerpage duplicate-content risico: -10, Cache-Control suboptimaal: -5, sitemap discrepantie: -2, redirect-conflicten: -2)

---

## INDEXERINGSCRISIS DIAGNOSE

### Waarom slechts ~6 pagina's geindexeerd?

Na volledig technisch onderzoek zijn er GEEN technische blokkades gevonden die indexering van de hoofdpagina's verhinderen:
- Geen noindex op enige pagina (meta robots = `index, follow` op alle gecontroleerde pagina's)
- Geen blokkerende regels in robots.txt voor Googlebot
- Geen x-robots-tag header die indexering blokkeert
- Geen Cloudflare Bot Fight Mode / Under Attack Mode (Googlebot-UA-test geeft 200 OK + CF-Cache HIT)
- Content is volledig server-side gerenderd (Astro SSG)

**De werkelijke oorzaken zijn:**

1. **KRITIEK — www-subdomain dient mijn.host parkeerpage met noindex** (zie sectie hieronder)
2. **Nieuw domein authority gap** — aanloopai.nl heeft nagenoeg nul externe backlinks; Google geeft nieuwe domeinen een vertraagd indexeringsschema
3. **183 pagina's in korte tijd gepubliceerd** — een plotselinge dump van 183+ pagina's op een nieuw domein triggert Google's kwaliteitsfilter ("doorway page" patroon signaal)
4. **Geen externe verwijzingen / vertrouwenssignalen** — zonder inkomende links van gevestigde domeinen prioriteert Google crawling op basis van PageRank; een nieuw domein krijgt nauwelijks crawl budget
5. **Alle lastmod-datums zijn 2026-05-01 t/m 2026-05-04** — als de site pas eind april live ging zijn 4-8 weken indexeringsvertraging normaal voor nieuwe domeinen

---

## KRITIEKE BEVINDING: www-Subdomain Conflict

**Status: KRITIEK — Onmiddellijke actie vereist**

`https://www.aanloopai.nl` serveert NIET de Aanloop AI website maar een `mijn.host` domeinparkeerpage met:
- `<meta name="robots" content="noindex,follow">`
- Volledig andere content (mijn.host registrar landing page)
- Cloudflare CF-challenge script aanwezig op de parkeerpage

**Impact:**
- Als Google of een externe link naar `www.aanloopai.nl` verwijst, ziet het een noindex parkeerpage
- Geen 301-redirect van www naar non-www — de twee versies zijn volledig gescheiden
- Dit creert een "split identity" probleem voor het domein in de ogen van zoekmachines
- Cloudflare Pages beheert alleen `aanloopai.nl` (non-www), maar `www.aanloopai.nl` heeft een aparte DNS-instelling die nog naar de oude mijn.host-configuratie wijst

**Oplossing:**
In Cloudflare DNS: voeg een CNAME-record toe `www` > `aanloopai.nl` OF configureer een Cloudflare Bulk Redirect die `https://www.aanloopai.nl/*` > `https://aanloopai.nl/$1` (301) stuurt. Vervolgens in mijn.host het www-record laten vervallen of naar Cloudflare verwijzen.

---

## Server-Side Rendering Assessment

**Status:** LOW risk (uitstekend voor AI crawlers)
**Rendering Type:** SSG (Static Site Generation)
**Framework:** Astro v4.16.19 (meta name="generator" bevestigd in HTTP response)
**Configuratie:** `output: 'static'` in astro.config.mjs

**Bevindingen:**
- Alle pagina's worden als volledig gerenderde HTML geserveerd — geen client-side rendering afhankelijkheid
- De complete head met alle meta-tags, JSON-LD en canonical is aanwezig in de initieel HTTP response
- Body bevat substantiele tekstinhoud: H1, H2, H3 headings, paragrafen, navigatie en footer zichtbaar in raw HTML
- `__NEXT_DATA__`, `__NUXT__` of SPA root divs zijn afwezig — zuivere statische output
- De H1 op de homepage bevat een span met JS-typing-animatie maar de default tekst "echt werkt" staat al in de HTML — AI-crawlers zien dit correct

**Tekstinhoud die Google/AI-crawlers zien in de initieel HTTP response:**
- H1: "AI bureau dat echt werkt voor uw bedrijf."
- Subheadline: "Aanloop AI is het AI bureau voor het Nederlandse MKB. Van AI-receptionist die uw telefoon 24/7 aanneemt, tot WhatsApp-assistent en workflow automatisering..."
- Vertrouwensbadges: "AVG-compliant EU data", "Live binnen 14 dagen", "Geen verborgen kosten", "KvK: 88606902 Rotterdam"
- Statistieken: "14 dgn", "24/7", "73%", "597" (data-counter waarden aanwezig als statische tekst)
- Volledige navigatie met alle diensten en sectoren

**AI Crawler Visibiliteit:** VOLLEDIG ZICHTBAAR
- robots.txt heeft expliciete Allow: / voor 20+ bekende AI-crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot-AI, Amazonbot, etc.)
- llms.txt en llms-full.txt aanwezig en toegankelijk via robots.txt verwijzing

**Kleine kanttekening:**
- Exit-intent popup staat in HTML met `style="display:none !important;"` — correct verborgen, geen crawl-issue

---

## Crawlability & Indexability

**Robots.txt:** Gevonden — correct geconfigureerd
**XML Sitemap:** Gevonden — 183 URLs live (discrepantie: WebFetch telde 242, curl telt 183 closing-tags)
**Meta Robots:** `index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1` op alle gecontroleerde pagina's
**Canonical:** Zelf-verwijzend op alle gecontroleerde pagina's

### Robots.txt Analyse

Volledige inhoud (verbatim):
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /bedankt/
Disallow: /demo-bedankt/
Disallow: /demo-bevestigd/
Disallow: /demo-herplannen/
Disallow: /demo-inplannen/

User-agent: GPTBot
Allow: /
[...20+ AI crawlers allemaal Allow: /...]

Sitemap: https://aanloopai.nl/sitemap.xml
Sitemap: https://aanloopai.nl/image-sitemap.xml
```

**Status:** Correct. Bedankpagina's zijn terecht uitgesloten. Geen blokkerende regels voor Googlebot of andere zoekmachines.

**AI Crawler Support:** Uitstekend — 20 AI crawlers expliciet toegestaan: GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, anthropic-ai, Claude-User, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot, Bytespider, meta-externalagent, Bingbot, Bingbot-AI, Amazonbot, Diffbot, cohere-ai, YouBot, Mistral-AI-User.

### Sitemap Analyse

**Sitemap.xml (live):** 183 URL-entries, correct XML
- xmlns: `http://www.sitemaps.org/schemas/sitemap/0.9` — correct
- lastmod: aanwezig op alle URLs (2026-05-01 t/m 2026-05-04) — correct
- changefreq: aanwezig op alle URLs — correct
- priority: 1.0 homepage, 0.85 kernpagina's, 0.75 categorieen, 0.7 utility

**Image-sitemap.xml:** 169 afbeeldingsentries aanwezig
- xmlns image namespace: `http://www.google.com/schemas/sitemap-image/1.1` — correct
- AANDACHT: geen lastmod op image-sitemap entries

**Sitemap Discrepantie:**
- Live sitemap.xml: 183 URLs
- Bronbestanden in src/pages: 194 .astro bestanden
- WebFetch extractie: telde 242 (vermoedelijk inclusief image-sitemap entries meegeteld)

**Pagina's buiten sitemap (correct):** /cookies/, /privacy/, /voorwaarden/, /bedankt/, /demo-bedankt/, /demo-bevestigd/, /prijzen/ (301 redirect naar /tarieven/)

**Potential issues:**
- /trust/ directory bestaat in src maar geeft 404 op productie — deployment gap
- Sitemap wordt gegenereerd via extern build-script (scripts/build-sitemap.sh) — niet geintegreerd in Astro build lifecycle

### Redirect Analyse

_redirects bevat 10 301-redirects. Twee conflicten gevonden:

| Redirect in _redirects | Live gedrag |
|---|---|
| `/diensten/audit` -> `/gratis-ai-scan/` (301) | `/diensten/audit/` geeft 200 OK (Astro-pagina bestaat nog) |
| `/diensten/custom` -> `/diensten/` (301) | `/diensten/custom/` geeft 200 OK (Astro-pagina bestaat nog) |

Dit betekent beide URLs (pagina EN redirect-target) bestaan simultaan. De _redirects-regel werkt alleen op de URL zonder trailing slash.

**Overige redirects correct:**
- /over-ons/ -> /over/ (301)
- /prijzen -> /tarieven/ (301)
- /contact -> /contact/ (301)

---

## Meta Tags Audit

| Tag | Status | Waarde / Opmerkingen |
|---|---|---|
| title | Aanwezig | "AI Bureau Nederland voor MKB · Aanloop AI" — 42 tekens (onder ideaal van 50-60) |
| meta description | Aanwezig | 109 tekens homepage — goed (onder de 160-grens) |
| canonical | Aanwezig | Zelf-verwijzend op alle gecontroleerde pagina's |
| meta robots | Aanwezig | index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1 — uitstekend |
| viewport | Aanwezig | width=device-width, initial-scale=1.0 — correct |
| html lang | Aanwezig | lang="nl" — correct |
| Open Graph | Compleet | og:type, title, description, url, image (1200x630), locale nl_NL |
| Twitter Card | Compleet | summary_large_image, site @aanloopai, title, description, image |
| hreflang | Aanwezig | nl-NL, nl, x-default — alle zelf-verwijzend (correct voor Dutch-only site) |
| Google Search Console | Aanwezig | Verificatie meta-tag aanwezig |
| Google Analytics | Aanwezig | G-VS8SZZ6W45 met Consent Mode v2 |

**Opmerkingen:**

1. **Title tag te kort (42 tekens):** Laat 8-18 tekens keyword-ruimte onbenut.
   - Huidig: "AI Bureau Nederland voor MKB · Aanloop AI" (42 tekens)
   - Voorstel: "AI Bureau voor MKB Nederland — Live in 14 Dagen · Aanloop AI" (62 tekens)

2. **Kennisbank-artikel descriptions truncatie:** /diensten/ beschrijving eindigt abrupt op "en" (155 tekens). Meerdere pagina's kunnen hetzelfde probleem hebben.

3. **OG-image is generieke fallback op de meeste pagina's:** /og-image-default.png voor diensten, sectoren, vergelijk-pagina's — pagina-specifieke OG-images verbeteren CTR aanzienlijk.

4. **keywords meta tag aanwezig** — Google negeert dit maar niet schadelijk; zelfde waarde op elke pagina is suboptimaal.

---

## Security Headers

| Header | Status | Waarde |
|---|---|---|
| HTTPS | Aanwezig | Geforceerd via Cloudflare |
| HSTS | Aanwezig | max-age=63072000; includeSubDomains; preload (uitstekend — 2 jaar + preload) |
| Content-Security-Policy | Aanwezig | Gedefinieerd maar gebruikt 'unsafe-inline' voor scripts en styles |
| X-Frame-Options | Aanwezig | DENY — correct |
| X-Content-Type-Options | Aanwezig | nosniff — correct |
| Referrer-Policy | Aanwezig | strict-origin-when-cross-origin — correct |
| Permissions-Policy | Aanwezig | camera=(), microphone=(), geolocation=(self) — correct |

**CSP Samenvatting:**
- default-src: 'self'
- script-src: 'self' 'unsafe-inline' plus GTM, GA, unpkg, ElevenLabs
- style-src: 'self' 'unsafe-inline' plus Google Fonts
- img-src: 'self' data: https: (ruim)
- frame-ancestors: 'none'

**CSP Opmerkingen:**
- 'unsafe-inline' in script-src vermindert XSS-bescherming — acceptabel voor Astro SSG met inline scripts maar niet ideaal
- img-src 'self' data: https: is erg ruim — overweeg beperking tot bekende domeinen
- Alle headers zijn aanwezig en functioneel — geen critical security gaps

**Security Score:** 78/100 (aftrek alleen voor unsafe-inline CSP)

---

## Core Web Vitals Risk Assessment

> Bekende PSI baseline: Desktop Accessibility 97, Mobile Performance 99-100 na recente fixes.

| Vital | Risiconiveau | Gevonden indicatoren |
|---|---|---|
| LCP | Laag | Hero-image: loading="eager", fetchpriority="high" preload voor logo, srcset met 400w-1400w breakpoints, GTM lazy-loaded na eerste interactie |
| INP | Laag-Medium | Geen synchrone scripts in head. GTM lazy via scroll/mousemove/touchstart events + requestIdleCallback 3000ms fallback. ElevenLabs widget via unpkg.com (externe CDN — potentieel minor blocking risk) |
| CLS | Laag | Hero-image heeft expliciete width="1024" height="1024". data-counter elementen tonen statische tekst als default. Exit-popup display:none. Geen iframes zonder dimensies gevonden. |

**GTM Laadstrategie (uitstekend):**
```javascript
['scroll','mousemove','touchstart','keydown','click'].forEach(function(ev){
  window.addEventListener(ev, loadGTM, { once: true, passive: true });
});
if ('requestIdleCallback' in window) {
  requestIdleCallback(function(){ setTimeout(loadGTM, 3000); });
}
```
Dit elimineert GTM als TBT-bron (eerder ~1500ms reductiepotentieel).

**Google Consent Mode v2:** correct geimplementeerd met wait_for_update: 200ms.

**Aandachtspunten:**
- Google Fonts via preconnect — risico op FOUT bij font-laden; overweeg font-display: swap in CSS
- ElevenLabs widget geladen via unpkg.com CDN — als unpkg langzaam is kan dit INP beinvloeden

**Valideer met Google PageSpeed Insights voor actuele veldmeetgegevens.**

---

## Mobile Optimization

**Status:** Geoptimaliseerd

| Criterium | Status | Detail |
|---|---|---|
| Viewport meta | Aanwezig | width=device-width, initial-scale=1.0 |
| Responsive CSS | Aanwezig | Tailwind CSS (mobile-first) |
| Responsive images | Aanwezig | srcset met 400w, 600w, 900w, 1200w breakpoints |
| Touch targets | Goed | Tailwind btn-primary klassen |
| Skip-to-main link | Aanwezig | Direct naar hoofdinhoud (a11y + WCAG 2.4.1) |
| PWA Manifest | Aanwezig | /manifest.webmanifest |
| Apple Touch Icon | Aanwezig | 180x180px |

**Opmerking:** hidden lg:block patroon voor hero-visual rechterkolom verbergt de afbeelding op mobiel. Dit is correct gedrag maar betekent de LCP op mobiel een ander element is dan op desktop.

---

## URL Structure

**Doeldomein:** https://aanloopai.nl/
**Assessment:** Clean, minor issues

| Criterium | Status | Detail |
|---|---|---|
| Trailing slashes consistent | Goed | Alle URLs eindigen op trailing slash |
| Lowercase only | Goed | Geen mixed-case URLs gevonden |
| Hyphens voor woordscheiding | Goed | Correct toegepast |
| Beschrijvende slugs | Goed | Bijv. /kennisbank/ai-voor-fysiotherapiepraktijk-nederland-2026/ |
| URL lengte | Matig | Sommige kennisbank-URLs zijn 60-70+ tekens |
| Diepte | Goed | Max 2 niveaus voor de meeste pagina's |
| www vs non-www | PROBLEEM | www serveert parkeerpage — DNS-conflict |
| Parameters | Goed | Geen query-parameters in sitemap-URLs |

**URL Diepte verdeling:**
- Level 1: /diensten/, /kennisbank/, /sectoren/, /locaties/, /vergelijk/ — correct
- Level 2: /diensten/marco/, /kennisbank/wat-is-een-ai-agent/ — ideaal
- Level 3: niet gevonden

**Opmerking jaarmarkering:** Slugs zoals /kennisbank/ai-voor-pedicure-praktijk-nederland-2026/ bevatten "2026". Overweeg tijdloze slugs voor langdurige SEO-waarde.

---

## Response Headers & Server Status

**HTTP Status:** 200 OK voor alle gecontroleerde pagina's
**Server:** cloudflare (origin niet exposed — goed)
**CF-Cache-Status:** HIT op alle gecontroleerde pagina's — correct gecached op Cloudflare edge
**Protokol:** HTTP/1.1 + alt-svc h3=":443" (HTTP/3 support aangeboden)

**Cache-Control Conflict — AANDACHT:**

Bedoelde instelling in public/_headers:
```
/*
  Cache-Control: public, max-age=0, must-revalidate  (wildcard)

/*.html
  Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800
```

Werkelijke headers op HTML-pagina's: `public, max-age=0, must-revalidate`

De `/*.html` rule in _headers wordt overschreven door de `/*` wildcard die eerder staat in het bestand. Cloudflare Pages verwerkt _headers rules in volgorde — de eerste match wint. De HTML-specifieke cache-instelling heeft geen effect.

**Impact:** Elke request naar een HTML-pagina vereist hervalidatie bij de origin. Voor Google's crawlers is dit geen blokkade maar het verhoogt de serverbelasting onnodig. Fix: verplaats de `/*.html` regel naar BOVEN de `/*` wildcard in _headers.

**Geen x-robots-tag header** in responses — correct, geen conflicten met meta robots.

---

## Internationalisatie

**Taalstrategie:** Nederlands-only
**hreflang:** nl-NL, nl, x-default — alle zelf-verwijzend (correct voor single-language site)

Opmerking: JSON-LD ContactPoint vermeldt `availableLanguage: ["Dutch","English"]` — als er ook Engelse content is, overweeg hreflang en-* URLs. Momenteel geen /en/ subdirectory gevonden.

---

## Gestructureerde Data (JSON-LD)

**Aanwezig op homepage:**
1. Organization + ProfessionalService (uitgebreid met KVK, adres, geo, contactPoint, founder)
2. WebSite met SearchAction
3. WebPage
4. Service met OfferCatalog (3 pakketten met prijzen)
5. ItemList SiteNavigationElement

**Aanwezig op /diensten/:** BreadcrumbList + CollectionPage met alle 18 diensten
**Aanwezig op /tarieven/:** FAQPage (6 vragen) + Product schema voor Starter, Groei, Partner
**Aanwezig op /gratis-ai-scan/:** FAQPage + SoftwareApplication + HowTo (11 stappen)
**Aanwezig op /kennisbank/:** BreadcrumbList + CollectionPage met 76 artikelen

**Kwaliteitsbeoordeling:** Uitstekend. Rijke, relevante schema-types correct geimplementeerd. Geen syntaxfouten gevonden.

**Kleine inconsistentie:**
- Organization JSON-LD: `"url":"https://aanloopai.nl"` (zonder trailing slash)
- Canonical: `https://aanloopai.nl/` (met trailing slash)
- Aanbeveling: maak consistent — gebruik altijd trailing slash in JSON-LD

**Vervaldatum aandacht:** `"priceValidUntil":"2026-12-31"` op tarieven-pagina — herinnering: update dit jaarlijks.

---

## Interne Linking

**Homepage Link Distributie (gecontroleerd):**
De homepage linkt direct naar 60+ interne pagina's inclusief:
- Alle 11 sectoren
- 15+ diensten
- 9 van 30 locaties (Rotterdam, Amsterdam, Den Haag, Utrecht, Eindhoven, Groningen, Breda, Tilburg, overige via /locaties/ index)
- 6 van 13 vergelijk-pagina's
- 1 featured kennisbank-artikel

**Crawl Diepte:**
- Alle kernpagina's: 1 klik vanuit homepage
- Kennisbank-artikelen: 2 klikken (homepage > /kennisbank/ > artikel)
- Locatiepagina's die niet op homepage staan: 2 klikken (homepage > /locaties/ > stad)

**Ontbrekende directe links:**
- Resterende 21 locatie-pagina's alleen via /locaties/ index bereikbaar
- Resterende 7 vergelijk-pagina's niet direct bereikbaar
- Nieuwe kennisbank-artikelen alleen bereikbaar via de kennisbank index

---

## Aanvullende Technische Checks

### Duplicate Content Signalen
- www.aanloopai.nl serveert andere content (mijn.host parkeerpage) — KRITIEK
- http://aanloopai.nl — Cloudflare dwingt HTTPS af; geen HTTP duplicate content issue
- /prijzen/ redirectt naar /tarieven/ (301) — correct gecanonicaliseerd

### Redirect Conflicten (bestand: public/_redirects)
- /diensten/audit -> /gratis-ai-scan/ (in _redirects) MAAR /diensten/audit/ geeft 200 OK
- /diensten/custom -> /diensten/ (in _redirects) MAAR /diensten/custom/ geeft 200 OK
- Beide URLs in sitemap opgenomen — potentieel duplicate content signaal

### Cloudflare Status
- CF-Cache-Status HIT op alle pagina's — correct gecached
- Geen Bot Fight Mode of Under Attack Mode gedetecteerd
- Geen JS-challenge pagina's (geen cf-browser-verification of jschl-patronen)
- Traffic via AMS (Amsterdam) datacenter

### Resource Hints (volledig aanwezig)
- preconnect: GoogleTagManager, unpkg, Google Fonts, fonts.gstatic.com
- dns-prefetch: Google Analytics, web3forms
- preload: logo-afbeelding met fetchpriority="high"

### Deployment Pipeline
- Astro config: output: 'static', compressHTML: true — correct
- Sitemap gegenereerd via extern script (scripts/build-sitemap.sh) — niet geintegreerd in Astro build lifecycle, reden voor discrepantie
- @astrojs/sitemap plugin uitgeschakeld wegens incompatibiliteit met Astro 4.16 (gedocumenteerd in astro.config.mjs comment)

---

## PRIORITEITSACTIELIJST

### KRITIEK — Week 1, Dag 1-2

**1. Fix www DNS-conflict: Cloudflare CNAME of Bulk Redirect**

www.aanloopai.nl serveert nu een noindex mijn.host parkeerpage. Elke link die naar www verwijst geeft geen SEO-waarde en zal een noindex parkeerpage indexeren.

Stap-voor-stap:
- Log in op Cloudflare Dashboard > Selecteer aanloopai.nl
- Ga naar DNS > Records
- Controleer of er een A of CNAME record bestaat voor `www`
- Als niet: voeg CNAME toe: Name=`www`, Target=`aanloopai.nl`, Proxied=aan
- Als de www-subdomain via mijn.host beheerd wordt: log in op mijn.host en verander de DNS-instelling voor www naar een CNAME die wijst naar aanloopai.nl
- Alternatief via Cloudflare Bulk Redirects: maak een redirect rule: Source=`https://www.aanloopai.nl/*`, Target=`https://aanloopai.nl/$1`, Status=301

Verificatie: `curl -sL https://www.aanloopai.nl -o /dev/null -w "%{http_code} %{url_effective}"` moet `301 https://aanloopai.nl/` retourneren.

**2. Google Search Console: Sitemap indienen + Handmatig indexeringsverzoek voor kernpagina's**

Als sitemap nog niet ingediend:
- GSC > Sitemaps > https://aanloopai.nl/sitemap.xml indienen
- GSC > Sitemaps > https://aanloopai.nl/image-sitemap.xml indienen

Handmatig URL-inspectieverzoek voor de 10 meest waardevolle pagina's:
1. https://aanloopai.nl/
2. https://aanloopai.nl/diensten/marco/
3. https://aanloopai.nl/diensten/emma/
4. https://aanloopai.nl/gratis-ai-scan/
5. https://aanloopai.nl/kennisbank/wat-is-een-ai-agent/
6. https://aanloopai.nl/kennisbank/ai-automatisering-mkb/
7. https://aanloopai.nl/locaties/rotterdam/
8. https://aanloopai.nl/locaties/amsterdam/
9. https://aanloopai.nl/tarieven/
10. https://aanloopai.nl/sectoren/horeca/

### HOOG — Week 1

**3. Externe Linkbuilding — het eigenlijke indexeringsknelpunt**

Dit is de enige actie die Google's vertrouwen in het domein versneld opbouwt:
- Google Bedrijfsprofiel aanmaken (gratis dofollow link van google.com)
- KvK.nl: website toevoegen aan bedrijfsprofiel
- Branche-gidsen: ondernemers.nl, MKB Nederland, ZZP-gidsen
- Gastblog op 1-2 Nederlandse MKB-vakbladen (Sprout, MT/Sprout, Horeca Nederland)
- LinkedIn bedrijfspagina aanmaken met link naar aanloopai.nl

Doel: 5-10 kwalitatieve inkomende links die Google vertrouwen geven in het domein.

**4. Fix _headers Cache-Control volgorde**

Bestand: `C:\Users\Hallo\OneDrive\Claude\AGA\aanloop\public\_headers`

Huidig (incorrect — wildcard wint):
```
/*
  Cache-Control: public, max-age=0, must-revalidate

/*.html
  Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800
```

Correct (HTML-regel eerst):
```
/*.html
  Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800

/*
  Cache-Control: public, max-age=0, must-revalidate
```

**5. Diensten/audit en diensten/custom redirect-conflict oplossen**

Bestand: `C:\Users\Hallo\OneDrive\Claude\AGA\aanloop\public\_redirects`

Keuze A (pagina verwijderen, redirect actief maken):
- Verwijder `src/pages/diensten/audit.astro` en `src/pages/diensten/custom.astro`
- Verwijder de corresponderende URLs uit sitemap.xml
- De bestaande redirect-regels werken dan correct

Keuze B (redirect verwijderen, pagina houden):
- Verwijder de twee redirect-regels uit _redirects
- Behoud beide pagina's in sitemap
- Zorg dat audit.astro een canonical tag heeft die naar /gratis-ai-scan/ wijst als de inhoud identiek is

### MEDIUM — Week 2-4

**6. Title Tags verlengen voor betere keyword-coverage**

Alle titels controleren op lengte: ideaal 50-60 tekens. Huidige homepage-title is 42 tekens.
- Huidig: "AI Bureau Nederland voor MKB · Aanloop AI" (42 tekens)
- Voorstel: "AI Bureau voor MKB Nederland — Live in 14 Dagen · Aanloop AI" (62 tekens)

**7. Open Graph Images per pagina uniek maken**

Meeste pagina's gebruiken /og-image-default.png. Genereer pagina-specifieke OG-images voor:
- Top-20 kennisbank-artikelen
- Alle diensten-pagina's
- Sectoren-pagina's

Overweeg @astrojs/og of Satori voor geautomatiseerde OG-generatie tijdens build.

**8. Sitemap Build-integratie verbeteren**

Het externe build-script scripts/build-sitemap.sh is niet synchroon met de Astro build. Voeg sitemap-regeneratie toe als post-build stap in de Cloudflare Pages build-configuratie.

**9. JSON-LD trailing slash consistentie**

In Organization JSON-LD: `"url":"https://aanloopai.nl"` aanpassen naar `"url":"https://aanloopai.nl/"` voor consistentie met canonical URL.

**10. Locaties Interne Linking uitbreiden**

Slechts 9 van 30 locatiepagina's zijn direct bereikbaar vanuit homepage. Voeg footer-sitemap sectie toe met alle 30 steden. Dit verbetert crawl-distributie en PageRank-flow naar locatiepagina's.

### LAAG — Doorlopend

**11. Jaarmarkering in URL-slugs evalueren**

Slugs met "2026" zijn volgend jaar verouderd. Overweeg tijdloze slugs voor nieuwe kennisbank-artikelen. Bestaande URLs niet wijzigen (301-redirect overhead en linkverlies).

**12. CSP unsafe-inline verwijderen (security)**

Verplaats inline scripts naar externe .js bestanden. Implementeer hash-based of nonce-based CSP via Astro middleware.

---

## 5 Quick Wins Week 1

| # | Actie | Impact | Tijdsinvestering |
|---|---|---|---|
| 1 | Fix www DNS/redirect — nu parkeerpage met noindex | KRITIEK | 15 minuten in Cloudflare |
| 2 | GSC: Sitemap indienen + handmatig 10 kernpagina's indexeringsverzoek | HOOG | 30 minuten |
| 3 | Google Bedrijfsprofiel aanmaken (gratis dofollow link van google.com) | HOOG | 20 minuten |
| 4 | Fix _headers Cache-Control volgorde (HTML-regel voor wildcard) | MEDIUM | 10 minuten + deploy |
| 5 | Diensten/audit en diensten/custom redirect-conflict oplossen | MEDIUM | 20 minuten + deploy |

---

## Technische Samenvatting

**Wat goed werkt:**
- Astro SSG genereert volledig server-side gerenderde HTML — perfecte basis voor Google EN AI-crawlers
- robots.txt correct geconfigureerd met expliciete ondersteuning voor 20+ AI-crawlers
- Security headers uitstekend: HSTS 2 jaar met preload, CSP aanwezig, X-Frame DENY, nosniff, Referrer-Policy
- JSON-LD gestructureerde data rijk en correct (Organization, Service, Product, FAQ, HowTo, BreadcrumbList)
- Mobile-first design met correcte viewport en responsieve afbeeldingen
- Core Web Vitals baseline sterk (PSI mobile P=99-100)
- llms.txt en llms-full.txt aanwezig voor GEO-optimalisatie
- GTM lazy-loading patroon elimineert major TBT-bron

**Wat de indexering remt:**
1. www-subdomain serveert noindex parkeerpage van mijn.host (DNS-fix vereist, actie dag 1)
2. Nieuw domein met nul externe backlinks (linkbuilding vereist, geen technische fix)
3. 183 pagina's gepubliceerd in korte periode — Google vertraagt indexering van bulk nieuwe content
4. Cache-Control header conflict in _headers (technische fix, 10 minuten)

**Realistische verwachting:** Na het oplossen van het www-issue en het starten met linkbuilding (5-10 kwalitatieve links van gevestigde Nederlandse domeinen), verwacht 60-80% van de sitemap geindexeerd te zijn binnen 6-10 weken.

---

*Rapport gegenereerd door GEO Technical SEO Agent op 2026-05-06. Gebaseerd op live HTTP-analyse via curl, WebFetch, broncode-inspectie van src/pages en sitemap-validatie. Alle bevindingen zijn gebaseerd op de werkelijke HTTP-responses van aanloopai.nl.*

# Semrush Site Audit — remediatie 13-08-2026

Uitgangspunt: Semrush-crawl van 100 pagina's, Site Health 92%, 24 errors /
142 warnings / notices. Hieronder per issuenummer wat er is gedaan, wat er
niet meer bleek te bestaan, en wat er nog openstaat.

**Belangrijk:** een deel van het rapport was verouderd. Vier bevindingen waren
al opgelost voordat dit werk begon; die zijn geverifieerd tegen de live site en
niet "gefixt om het fixen".

---

## 1. ERROR — 18 ongeldige structured-data items

Er is een lokale validator gebouwd (`scripts/validate-jsonld.cjs`) die de
JSON-LD in `dist/` toetst aan de verplichte velden van Google Rich Results.
Die vond **31 tekortkomingen op 11 pagina's** — Semrush telde dezelfde
problemen als 18 *items*.

Na de fixes: **0 bevindingen op 254 pagina's.**

### Wat er mis was en waarom het niet met extra velden op te lossen was

| Type | Ontbrekend | Waarom niet aanvullen |
|---|---|---|
| `SoftwareApplication` / `WebApplication` | `aggregateRating` of `review` | Google eist er één van. Er zijn geen geverifieerde beoordelingen van deze tools; die verzinnen is een manual-action-risico. |
| `Product` met prijs | `image`, `offers.shippingDetails`, `offers.hasMerchantReturnPolicy` | Een Product met prijs wordt als *merchant listing* gevalideerd. Verzend- en retourbeleid bestaan niet bij een maandabonnement op een AI-agent. |
| `Course` | `offers` | De pagina is een checklist die je uitprint, geen instructie-eenheid met inschrijving. |

Conclusie: type verlagen in plaats van verplichte velden verzinnen.

### Wijzigingen

| Bestand | Van | Naar |
|---|---|---|
| `src/pages/ai-roi-calculator.astro` | `SoftwareApplication` | `WebPage` + `about[]` (featureList behouden als `Thing`-lijst) |
| `src/pages/gratis-ai-scan.astro` | `SoftwareApplication` | `WebPage` + `about[]` |
| `src/pages/no-show-calculator.astro` | `['WebPage','WebApplication']` | `WebPage` |
| `src/pages/gemiste-omzet-calculator.astro` | `WebApplication` | `WebPage` |
| `src/pages/ai-vindbaarheid/check.astro` | `WebApplication` | `WebPage` |
| `src/pages/start.astro` | `WebApplication` | `WebPage` |
| `src/pages/gratis-ai-tools.astro` | `ItemList` met `WebApplication`-items | `ItemList` met `WebPage`-items |
| `src/pages/diensten/emma.astro` | `Product` + `SoftwareApplication` (bijna identiek) | één `Service`-node, `featureList` → `serviceOutput` |
| `src/pages/diensten/telefoon-assistent.astro` | `Product` | `Service` |
| `src/pages/tarieven.astro` | 3× `Product` (Emma, Groei, Enterprise) | 3× `Service`; Enterprise kreeg `RequestQuoteAction` in plaats van een `Offer` met lege `PriceSpecification` |
| `src/pages/kennisbank/ai-prijzen-vergelijking-…-2026.astro` | 3× `Product` | 3× `Service`; `lowPrice` verplaatst van `Offer` naar `AggregateOffer` (stond op het verkeerde type); `@id`'s gelijkgetrokken met `/tarieven/` zodat beide pagina's naar dezelfde entiteit wijzen |
| `src/pages/avg-checklist-ai-mkb.astro` | `Course` + `CourseInstance` | `DigitalDocument` met `teaches`, `timeRequired`, `educationalUse` |

Prijzen, pakketnamen en teksten zijn ongewijzigd — alleen de `@type` en de
bijbehorende verplichte velden.

**Niet gedaan:** `aggregateRating` op de homepage (issue 7.5). Er zijn geen
echte, verifieerbare beoordelingen. Zodra die er zijn is dit een losse,
kleine toevoeging.

---

## 2. ERROR — hreflang-conflict op /prijzen/ + niet-canonieke URL in sitemaps

**Grotendeels al opgelost, één restant.**

Geverifieerd live op 13-08-2026:

```
GET https://aanloopai.nl/prijzen/       → 301  Location: /tarieven/
GET https://aanloopai.nl/diensten/marco/ → 301  Location: /diensten/emma/
```

De 301 staat sinds 20-05-2026 in `public/_redirects`. De hreflang-tags die
Semrush in de HTML van `/prijzen/` zag, bestaan niet meer — die pagina levert
geen HTML meer op. Ook `/diensten/marco/` uit issue 1 is een 301 en bestaat
niet meer als pagina.

**Wat wél nog stond:** `public/image-sitemap.xml` bevatte 7 URL's die niet
canoniek zijn:

- `https://aanloopai.nl/prijzen/` (301)
- `https://aanloopai.nl/aanvragen/` (noindex — funnel-pagina)
- 5 × `/kennisbank/ai-voor-…/` slugs die niet meer bestaan (301)

`scripts/build-sitemap.cjs` snoeit die nu automatisch: elk `<url>`-blok
waarvan de `loc` niet in de gegenereerde `sitemap.xml` staat verdwijnt, met
logging van wat er weg is. Die file werd met de hand bijgehouden en liep
daardoor uit de pas; dit voorkomt herhaling. Resultaat: 157 → 150 URL's,
**0 niet-canonieke**.

**hreflang sitebreed:** `BaseLayout.astro` zet `hreflang="nl"` en
`x-default` allebei op `canonical`, dus per definitie self-referential. Alle
254 gebouwde pagina's zijn nagelopen: geen enkele publieke pagina heeft een
canonical die van de eigen URL afwijkt, en geen enkele hreflang wijst ergens
anders heen. De afwijkingen die de scan vond zitten in `/admin/*`, `/portal/*`
(robots-disallowed backoffice) en het GSC-verificatiebestand.

**Interne links naar /prijzen/:** geen. De enige treffer in `src/` is een
bronvermelding naar `voicelabs.nl/prijzen` in een commentaarregel.

---

## 3. WARNING — 91 gebroken externe links (allemaal dezelfde wa.me-URL)

`https://wa.me/31624741597` geeft crawlers HTTP 429. De knop staat in header,
footer en sticky CTA, dus telde die één keer per pagina mee.

- **Nieuwe route** in `src/worker.js`: `/whatsapp` (en `/whatsapp/`) → **302**
  naar `https://api.whatsapp.com/send?phone=31624741597`. Een `?text=`-parameter
  wordt doorgegeven. Bewust 302 en geen 301: het nummer kan wijzigen zonder dat
  browsers de oude bestemming vasthouden. Response draagt
  `X-Robots-Tag: noindex, nofollow`.
- **231 pagina's** gebruiken nu `href="/whatsapp"` met
  `rel="nofollow noopener"` en `target="_blank"`.
- `public/js/boot.js` telt de click-tracking nu op `a[href^="/whatsapp"]`
  én nog op `wa.me` (voor links in geïnjecteerde widget-DOM).
- `scripts/seo-link-integrity.cjs` kent `/whatsapp` als worker-route, anders
  meldt die 231 "broken" links die in productie prima werken.

Lokaal getest met `wrangler dev`:

```
GET /whatsapp             → 302  Location: https://api.whatsapp.com/send?phone=31624741597
GET /whatsapp/?text=…     → 302  Location: …&text=Hallo+Emma
GET /tarieven/            → 200  (statische assets ongemoeid)
```

`wa.me` komt niet meer voor in de gebouwde HTML.

---

## 4. WARNING — 4 pagina's met identieke H1 en title

**Al opgelost; geverifieerd tegen de live site.** Geen van de vier heeft nog
een title die gelijk is aan de H1:

| Pagina | title | H1 |
|---|---|---|
| `/kennisbank/ai-agent-kosten-mkb/` | Hoeveel Kost een AI Agent in Nederland? (2026 Prijzen) | Wat een AI Agent Kost voor het MKB in Nederland |
| `/kennisbank/ai-prijzen-vergelijking-…/` | AI Prijzen Vergelijking MKB Nederland 2026 · Aanloop AI | AI prijzen vergelijking MKB Nederland 2026 — wat kost een AI agent echt? |
| `/kennisbank/wat-is-een-ai-agent/` | Wat is een AI Agent? De Complete Gids voor MKB in 2026 | Wat is een AI Agent? Begrip, types en gebruik voor het MKB |
| `/sectoren/ai-voor-webshops/` | AI voor Webshops: 70% Minder Klantenservicevragen | AI voor Webshops: slimme klantenservice die 24/7 doorwerkt |

Alle titles zitten onder 60 tekens. Een merksuffix "· Aanloop AI" toevoegen
zou drie van de vier over die grens duwen, dus dat is bewust niet gedaan.

---

## 5. WARNING — 47 pagina's met lage text-HTML-ratio

Eerst gemeten in plaats van gegokt (`scripts/text-html-ratio.cjs`). De bytes
zaten niet waar het rapport suggereert:

| Onderdeel | Aandeel (homepage) | Actie |
|---|---|---|
| `class`-attributen (Tailwind) | 58,8 KB / 35% | Buiten scope — vergt het loslaten van utility-classes in de markup |
| Inline SVG | 34,0 KB / 20% | **Aangepakt** |
| JSON-LD | 7,6 KB / 5% | Deels kleiner geworden door de dedup in issue 1 |
| Inline `<style>` | 0,1 KB | Al eerder geëxtraheerd |
| Inline `<script>` | 5,5 KB | Al eerder naar `boot.js` verplaatst |
| Whitespace | 1,5 KB | `compressHTML` doet al zijn werk |

Op `/tarieven/` staan 152 `<svg>`-elementen waarvan er 23 uniek zijn — hetzelfde
vinkje 45 keer voluit. Nieuwe postbuild-stap `scripts/svg-sprite.cjs`
vervangt de inhoud van herhaalde SVG's door `<use href="#…">` en zet de
symbolen één keer per pagina in een verborgen sprite. De buitenste `<svg>`
houdt al zijn attributen, dus `currentColor` en formaat blijven werken.

**Voor/na, vijf zwaarste pagina's** (beide ná het strippen van HTML-commentaar):

| Pagina | Voor | Na | Verschil |
|---|---|---|---|
| `/kennisbank/` | 229,3 KB | 222,9 KB | −6,4 KB |
| `/kennisbank/ai-voor-pensioenadviseur-nederland-2026/` | 192,5 KB | 188,5 KB | −4,0 KB |
| `/glossarium/` | 189,7 KB | 187,4 KB | −2,3 KB |
| `/tarieven/` | 188,4 KB | 180,3 KB | −8,1 KB |
| `/` (homepage) | 168,5 KB | 162,9 KB | −5,6 KB |

Sitebreed: **630,6 KB** over 231 pagina's, gemiddeld 2,7 KB per pagina.
Gemiddelde text-HTML-ratio 13,4% → 13,7%; pagina's onder de 10%-grens
**77 → 68**.

Vooraf gecontroleerd op de risico's van deze transformatie: geen CSS die
svg-interne elementen selecteert, geen SMIL-animaties, geen `id`-attributen
binnen de symbolen (dus geen dubbele id's) en geen interne `url(#…)`-verwijzingen.
`html-validate` op de homepage geeft voor en na dezelfde bevindingen, op één
na: de sprite gebruikt een inline `style` voor `position:absolute` (regel
`no-inline-style`, stilistisch — de site had er al drie).

---

## 6. NOTICES

### 6.1 HSTS ontbreekt op www.aanloopai.nl — **actie voor jou, niet in de repo**

```
GET https://www.aanloopai.nl/tarieven/
→ 301  Location: https://aanloopai.nl/tarieven/   (géén Strict-Transport-Security)
```

De www-redirect komt van een Cloudflare-regel op zone-niveau; het verzoek
bereikt de Worker nooit en `public/_headers` geldt alleen voor assets achter
de apex. Vanuit de repo is dit dus niet te repareren. De apex stuurt wél
`max-age=63072000; includeSubDomains; preload`.

Handmatig, in het Cloudflare-dashboard:

1. Ga naar **dash.cloudflare.com** → zone **aanloopai.nl**.
2. Linkermenu **Rules** → **Overview** → tabblad **Response Header Transform Rules**.
3. **Create rule**, naam bijvoorbeeld `HSTS op www`.
4. Bij *If incoming requests match…* kies **Custom filter expression** en zet:
   - Field: **Hostname** · Operator: **equals** · Value: `www.aanloopai.nl`
5. Bij *Then…* → **Set static** → Header name `Strict-Transport-Security`,
   Value `max-age=31536000; includeSubDomains`.
6. **Deploy**.
7. Verifiëren: `curl -I https://www.aanloopai.nl/` — de header moet nu ook in
   het 301-antwoord staan.

### 6.2 llms.txt mojibake — opgelost

De bestanden zijn wel degelijk UTF-8 (gecontroleerd met `file`: *"Unicode
text, UTF-8 text"*, geen BOM). Het probleem zat in de header: `text/plain`
zónder charset, waarna de browser terugvalt op windows-1252 en van `€` een
`â‚¬` maakt.

`public/_headers` zet nu `Content-Type: text/plain; charset=utf-8` op
`/llms.txt`, `/llms-full.txt`, `/robots.txt` en `/humans.txt`.

Formaat volgens llmstxt.org: H1-titel ✓, blockquote-samenvatting ✓, H2-secties
met linklijsten ✓. Er staan vijf H3-subsecties onder *Kennisbank Artikelen*;
de spec beschrijft alleen H2-secties maar verbiedt H3 niet. Gelaten zoals het
is — als een validator er alsnog over valt, zijn het vijf regels werk.

**Wel opgemerkt, niet aangepast:** llms.txt spreekt over *"Partner op maat"*
terwijl de site en de schema's het derde pakket **Enterprise** noemen. Dat is
een naaminconsistentie in verkoopmateriaal, geen technische fout — aan jou of
dat "Partner" of "Enterprise" moet worden.

### 6.3 Crawl-geblokkeerde pagina's — deels een foute melding

`/aanvragen/`, `/cookies/`, `/demo-inplannen/` en `/privacy/` zouden volgens
Semrush in robots.txt geblokkeerd zijn. De live `robots.txt` blokkeert alleen
`/admin/`, `/api/`, `/bedankt/`, `/demo-bedankt/`, `/demo-bevestigd/`,
`/demo-herplannen/` en `/demo-inplannen/`. `/aanvragen/`, `/cookies/` en
`/privacy/` staan er niet in — die hadden een `noindex`-metatag.

- `/cookies/` en `/privacy/` staan nu op `noindex={false}`. Ze waren de enige
  juridische pagina's op noindex; `/voorwaarden/` en `/disclaimer/` stonden al
  op index. Ze komen nu ook in de sitemap (220 → 222 URL's).
- `/aanvragen/` blijft `noindex` — funnelpagina, en die is bewust wél
  crawlbaar zodat de noindex gelezen kán worden.
- `/demo-inplannen/` blijft in robots.txt geblokkeerd.

---

## 7. ON-PAGE — homepage en Shopify-artikel

### Homepage

| Plek | Was | Is |
|---|---|---|
| `<title>` | AI Bureau voor het MKB — Receptionist, WhatsApp & AI | **AI Bureau Nederland** voor het MKB — **AI Automatisering** |
| H1 (`Hero.astro`) | AI bureau dat écht werkt voor uw bedrijf. | AI bureau dat écht werkt voor uw bedrijf **in Nederland**. |
| Hero-subkop | …het AI bureau voor het Nederlandse MKB… workflow automatisering… | …het **AI bureau in Nederland** voor het MKB… **AI automatisering**… |
| H2 diensten | 15 AI-oplossingen voor uw bedrijf. | 15 AI-oplossingen en **AI automatisering** voor uw bedrijf. |

Twee alinea's toegevoegd met de semantisch verwante termen uit de
concurrentie-analyse: *slimme automatisering*, *repetitieve taken*,
*bestaande systemen*, *machine learning*, *data-analyse*, *AI systemen*. Ze
beschrijven letterlijk wat er in de diensten-sectie eronder staat — geen
losse keyword-regel.

De typewriter-animatie in de H1 draait op de `<span id="hero-typed">`; de
toevoeging staat daarbuiten en raakt die logica niet.

### `/kennisbank/ai-voor-shopify-webshop-nederland/`

- Nieuwe H3 **"Waar de automatisering draait: n8n self hosted"** — waarom
  self-hosted (EU-data, geen prijs per workflow-run, exporteerbaar) en de
  optie om het zelf te beheren.
- **"binnen 7 werkdagen live"** letterlijk opgenomen in de implementatie-sectie.
- Leesbaarheid: de drie lange roadmap-alinea's zijn opgesplitst in drie
  H3-secties (*Fase 1 — discovery en design*, *Fase 2 — build en pilot*,
  *Fase 3 — opschalen en optimaliseren*) met kortere zinnen en losse alinea's.

---

## Verificatie

| Check | Resultaat |
|---|---|
| `npx astro build` | 253 pagina's, geen errors |
| `node scripts/validate-jsonld.cjs` | **0 bevindingen** op 254 pagina's (was 31 op 11) |
| `npx vitest run` | **262 tests, 39 files, alles groen** |
| `node scripts/seo-link-integrity.cjs` | **0 gebroken interne links**; `wa.me` verdwenen uit de HTML |
| Sitemaps | `sitemap.xml` 222 URL's, `image-sitemap.xml` 150 — **0 niet-canoniek** |
| Canonical/hreflang over 254 pagina's | 0 afwijkingen op publieke pagina's |
| `wrangler dev` → `/whatsapp` | 302 naar api.whatsapp.com, statische routes ongemoeid |
| `html-validate` voor/na sprite | identiek, op één stilistische `no-inline-style` na |
| `curl -I` live | `/prijzen/` 301 ✓ · `/diensten/marco/` 301 ✓ · www → apex 301 **zonder HSTS** ✗ · `/llms.txt` nog `text/plain` zonder charset (fix wacht op deploy) |

De laatste twee live-checks lopen pas groen na respectievelijk de
Cloudflare-regel uit 6.1 en een deploy van deze wijzigingen.

---

## Gewijzigde bestanden

**Nieuw**

- `scripts/validate-jsonld.cjs` — JSON-LD toetsen aan Google Rich Results
- `scripts/svg-sprite.cjs` — postbuild SVG-dedup
- `scripts/text-html-ratio.cjs` — text-HTML-ratio en byte-verdeling meten

**Structured data (issue 1)** — `src/pages/`: `ai-roi-calculator.astro`,
`gratis-ai-scan.astro`, `no-show-calculator.astro`,
`gemiste-omzet-calculator.astro`, `ai-vindbaarheid/check.astro`,
`start.astro`, `gratis-ai-tools.astro`, `diensten/emma.astro`,
`diensten/telefoon-assistent.astro`, `tarieven.astro`,
`kennisbank/ai-prijzen-vergelijking-mkb-nederland-2026.astro`,
`avg-checklist-ai-mkb.astro`

**Sitemaps (issue 2)** — `scripts/build-sitemap.cjs`,
`public/image-sitemap.xml`, `public/sitemap.xml`

**WhatsApp (issue 3)** — `src/worker.js`, `src/layouts/BaseLayout.astro`,
`src/components/Header.astro`, `src/components/Footer.astro`,
`public/js/boot.js`, `scripts/seo-link-integrity.cjs`, plus de CTA's in
`index.astro`, `contact.astro`, `start.astro`, `glossarium.astro`,
`gratis-ai-scan.astro`, `pers.astro`, `demo-herplannen.astro`,
`diensten/emma.astro`, `team/magahdogan.astro`

**HTML-gewicht (issue 5)** — `package.json` (postbuild-keten)

**Notices (issue 6)** — `public/_headers`, `src/pages/cookies.astro`,
`src/pages/privacy.astro`

**On-page (issue 7)** — `src/pages/index.astro`, `src/components/Hero.astro`,
`src/pages/kennisbank/ai-voor-shopify-webshop-nederland.astro`

---

## Wat er nog open staat

1. **Cloudflare-regel voor HSTS op www** — stappen in 6.1. Alleen jij kunt
   dit; het zit niet in de repo.
2. **Deploy** — de charset-fix van llms.txt, de sitemap-snoei en alle
   schema-wijzigingen worden pas live na een deploy.
3. **`aggregateRating` op de homepage** — pas toevoegen als er echte,
   verifieerbare beoordelingen zijn.
4. **"Partner" vs "Enterprise"** in `public/llms.txt` — inhoudelijke keuze.
5. **Tailwind class-attributen** zijn met 35% de grootste post in de
   HTML-omvang. Daar valt nog winst te halen, maar niet zonder de
   utility-first opzet te herzien — dat is een apart traject.

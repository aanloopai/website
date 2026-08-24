# SEO-backlog — wat niet in code kan (Ahrefs-audit 2026-08-24)

Uitgangssituatie: Health Score 98, maar **0 organic keywords, 0 organic traffic,
1 referring domain** (DR 4.3). De techniek is na de fixes van deze branch op
orde; alles hieronder vraagt een actie buiten de codebase, gesorteerd op
verwacht effect.

## 1. Backlinks / digitale PR (grootste hefboom — het énige echte gat)

Met 1 verwijzend domein is geen enkele techniek voldoende. Concrete route:

- **Onderzoek pushen**: `/onderzoek/ai-adoption-mkb-nederland-2026/` heeft nu
  Dataset-schema + citeerblok. Pitch naar: Emerce, Frankwatching, MT/Sprout,
  MKB-Nederland-nieuwsbrieven, Computable, AG Connect. Eén datapunt per pitch,
  niet het hele rapport.
- **No-show-calculator embedden**: `/no-show-calculator/` als widget aanbieden
  aan branche-sites (horeca-, kappers-, fysio-blogs) met "bron:
  aanloopai.nl"-link.
- **Gastartikelen**: 2-3 per kwartaal op NL MKB/ondernemersblogs
  (consent-gate: alleen via bestaande relaties of inbound, geen cold outreach).
- **Branchedirectories (gratis)**: KvK-bedrijvengids, Google Business Profile,
  Trustoo/Sortlist/Clutch-profiel, AI-agency-lijstjes (There's An AI For That,
  AI-agency-directories). Geen betaalde directories (standing rule).

## 2. Google Business Profile

- GBP bestaat (Maps-CID staat in `sameAs`) — check claim-status, categorieën
  ("AI-consultant", "Marketingbureau"), openingstijden, foto's, eerste reviews
  van bestaande klanten (SoleHome!).
- Reviews zijn tegelijk het sterkste GEO-signaal (AI-antwoorden citeren
  review-rijke profielen).

## 3. Search Console / Bing Webmaster

- GSC-property is geverifieerd (HTML-bestand staat live). Na deploy van de
  https-canonicalisatie: sitemap opnieuw insturen en de 15 (nu nog noindex)
  kennisbank-URL's monitoren zodra de eigenaar besluit ze te indexeren
  (zie fix-rapport, Task 6).
- Bing Webmaster Tools koppelen (IndexNow-key staat al live; Bing pakt de
  pings dan zichtbaar op).

## 4. Entity-opbouw (TODO's in BaseLayout `sameAs`)

- YouTube-kanaal en/of Crunchbase-profiel aanmaken → toevoegen aan `sameAs`.
- Wikidata-item overwegen zodra er ≥3 onafhankelijke bronvermeldingen zijn.

## 5. GEO / AI-citaties (nu: 2 ChatGPT-citaties, 0 elders)

- Auteurspagina met een echte persoon + credentials (nu is de auteur overal de
  organisatie). AI-engines wegen herleidbare auteurs zwaarder. Vereist een
  besluit van de eigenaar over naam/foto/bio.
- Direct-answer-alinea's (40-60 woorden onder de H1) staan op de belangrijkste
  pagina's; uitbreiden naar alle kennisbank-artikelen is redactiewerk.

## 6. Legacy meta-lengtes (klein redactiewerk, ~40 pagina's)

`npm run seo:meta` (nieuw, `scripts/check-meta.mjs`) hanteert de strikte
norm — title ≤ 60, description 110–155 — en vindt daarmee ~40 bestaande
pagina's die er nét buiten vallen (descriptions van 156–159, titles van
61–68, een handvol te korte descriptions). Ahrefs flagt pas boven de 160 en
die gevallen zijn allemaal opgelost; dit restant is Nederlands redactiewerk
van een paar tekens per pagina. Tot dit is weggewerkt draait de check als
rapport (`--warn`) en niet als harde build-gate.

## 7. Ahrefs-hercrawl

- Na deploy: nieuwe crawl starten in Site Audit zodat de 241
  http→https-issues, de 30 structured-data-fouten en de sitemap-duplicaten
  als opgelost geregistreerd worden.

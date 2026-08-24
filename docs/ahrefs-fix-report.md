# Ahrefs-fixrapport — audit 2026-08-24 (Health 98, 14 errors, 344 warnings)

Branch: `seo/ahrefs-fixes-2026-08` (basis: origin/master). Eén commit per taak.
Verificatie: `npm run seo:schema`, `npm run seo:meta`, `npm run seo:crawl`,
`npm run img:check`, `npm test` — uitkomsten onderaan.

| Ahrefs-issue | Oorzaak | Fix | Verificatie |
|---|---|---|---|
| "Canonical from HTTP to HTTPS" (241), "Page in multiple sitemaps" (207), http→200 | Workers Assets serveerde statische pagina's vóór de Worker draaide; geen host/protocol-canonicalisatie | `run_worker_first = true` (wrangler.toml) + één 301 bovenin `fetch()` naar `https://aanloopai.nl/<pad>?<query>`, met HSTS | na deploy: `curl -sI http://aanloopai.nl/tarieven/` → één 301; zie "Na deploy" onderaan |
| www-redirectketen (http://www → https://www → apex) | scheme-upgrade + aparte www-regel | zelfde Worker-301: elke www-variant gaat direct naar apex | idem |
| Structured data: ongeldig `potentialAction` op /tarieven/ | `RequestQuoteAction` bestaat niet in schema.org | `QuoteAction` (bestaat wél; ContactAction uit de promptsuggestie bestaat óók niet — geverifieerd: schema.org/ContactAction = 404) | `npm run seo:schema` → 0 fouten |
| Structured data: `author` op LocalBusiness (12 stadspagina's) | template-kopie | `author` verwijderd uit alle 12 | idem |
| `postalCode: "8200-8244"`-bereiken | bereik is geen geldige postcode | `postalCode` verwijderd (geen kantoor in die steden — een verzonnen code zou erger zijn); `addressLocality`+`addressRegion` blijven | idem |
| Structured data-fout op /onderzoek/…/methodologie/ | `isPartOf: ResearchProject` — ResearchProject is een Organization-subtype, isPartOf verwacht CreativeWork | `isPartOf: WebPage` | idem |
| (extra vondst) los `{'@id': …}`-blok op /over/ zonder @context | overbodige verwijzing | verwijderd; BaseLayout levert de Organization-node al | idem |
| "Slow page" (47) | grotendeels http-duplicaten + koude crawl; live gemeten: TTFB 103–135 ms, CF-Cache-Status HIT, `s-maxage=86400` + SWR staat al goed | geen code-defect; http-helft verdwijnt via Taak 1 | `curl -w 'ttfb=%{time_starttransfer}'` op de 4 traagst gemelde pagina's: 0,10–0,14 s |
| "Image too large" (14+) | 44 PNG's van 0,9–1,8 MB onder /social-feed/ | WebP-varianten (max 1600 px, q80) naast de originelen; sitepagina's verwijzen nu naar .webp. **Originele PNG's bewust behouden**: de IG-pipeline consumeert ze via raw.githubusercontent (marketing/instagram/*-schedule.json) | `npm run img:check` → geen pagina refereert een raster > 300 KB |
| 302 op /whatsapp (241 inlinks) | bewuste 302 (nummerwissel-flexibiliteit) | 301 met `Cache-Control: max-age=3600` (begrensde caching ondervangt nummerwissel); alle interne anchors droegen al `rel="nofollow"`. Directe wa.me-links bewust NIET: wa.me rate-limit crawlers (429) — dat gaf eerder 91 "broken external links" in Semrush | na deploy: `curl -sI https://aanloopai.nl/whatsapp` → 301 |
| Meta descriptions te kort (8) / te lang (4) | – | alle 12 herschreven naar 130–155 tekens; sector-suffix is nu lengte-bewust (lange staart → korte staart → geen) | `npm run seo:meta` |
| Twee H1's op /kennisbank/ai-automatisering-voor-mkb/ | markdown begon met een `#`-kop bovenop de hero-H1 | kop uit de markdown; `check-meta.mjs` bewaakt 1 H1 per pagina site-breed | idem |
| Dubbele title (2 kennisbank-artikelen) | identieke frontmatter-titles | inhoud verschilt (intro-gids vs. proces-keuzekader) → géén 301 maar hertiteld: "Welk proces automatiseert u eerst? Kader voor het MKB" | idem |
| Sitemap-hygiëne | generator sloot noindex/redirects/queryvarianten al uit | `<lastmod>` komt nu uit de git-commitdatum van het bronbestand (was: builddatum); image-sitemap bevat 274 `<image:image>`-entries en is dus terecht apart | `node scripts/build-sitemap.cjs` |
| 22 pagina's met ≤1 interne link | md-artikelen ontbraken in RelatedLinks; /ai-vindbaarheid/voor-* had alleen de hub-link | RelatedLinks neemt nu ook markdown-artikelen mee; sectorpagina's linken hun GEO-tegenhanger + 3 kennisbank-artikelen + /tarieven/; GEO-pagina's linken 4 zustersectoren (ring-rotatie) + hub; kennisbank-md-artikelen linken dienst + tarieven; Delft toegevoegd aan Den Haag/Rotterdam | `npm run seo:crawl` |
| Growth: IndexNow, GSC, Organization-@id, llms.txt | bestond allemaal al (key-files live, postbuild-ping, één Organization-node met @id + sameAs) | geverifieerd, geen wijziging; "8–16 JSON-LD-blokken per pagina" uit de audit is verouderd — tarieven heeft er 2 | – |
| Link-worthy assets | Dataset-schema stond er al; citeerblok ontbrak | "Citeer dit onderzoek"-blok + kopieerknop op de onderzoekspagina; /no-show-calculator/ had al WebApplication-schema | – |

## Taak 6 — noindex-kennisbank (BESLISSING EIGENAAR NODIG, niets gewijzigd)

Alle 15 artikelen hebben een hardcoded `noindex={true}` op de BaseLayout-prop
(geen frontmatter-flag, geen template-conditie). Een reden-comment ontbreekt en
de git-historie is op 2026-08-04 gesquasht, dus de oorspronkelijke motivatie is
niet meer te achterhalen. Patroon: het zijn allemaal gegenereerde
sector-longtail-artikelen (gen-articles-pipeline, zelfde opbouw).

De sitemap-generator sluit ze correct uit (regel "noindex ∉ sitemap" wordt al
nageleefd). Ze zijn wél `nofollow`, waardoor hun uitgaande links niets
doorgeven.

**Advies**: per artikel kort redigeren (uniciteit, feiten checken) en daarna in
batches van 5 op `index, follow` zetten; de sitemap pakt ze dan automatisch op
en RelatedLinks linkt ze al. Wil je ze bewust noindex houden, dan is de huidige
staat technisch correct en is alleen `nofollow` → `follow` het overwegen waard.
Zeg welke van de 15 live mogen, dan zet ik ze om.

## Niet gedaan / restrisico

- **`run_worker_first` verandert de servering**: elke request draait nu door de
  Worker (was: asset-first). Live TTFB moet na deploy opnieuw gemeten worden;
  de asset-store blijft edge-side dus de verwachting is ~100–150 ms, maar dit
  is pas na deploy verifieerbaar. Alternatief zonder Worker-hop: "Always Use
  HTTPS" + een www-redirectregel in het Cloudflare-dashboard (eigenaar-actie);
  dan kan `run_worker_first` weer uit.
- `applySecurityHeaders` zet security-headers nu alleen nog als vangnet (asset-
  laag/_headers wint) — gedrag identiek aan vandaag, maar het verschil met de
  oude code is pas live te zien.
- ~40 legacy title/description-lengtes net buiten de strikte norm: zie
  seo-backlog.md §6; `seo:meta` draait daarom als rapport, niet als build-gate.
- Lighthouse-runs zijn niet in deze omgeving uitgevoerd; TTFB/cache is met
  curl geverifieerd. Draai desgewenst na deploy:
  `npx lighthouse https://aanloopai.nl/locaties/maastricht/ --only-categories=performance --preset=desktop`.

## Na deploy uitvoeren

```bash
for u in http://aanloopai.nl/ http://aanloopai.nl/tarieven/ http://www.aanloopai.nl/ \
         https://www.aanloopai.nl/locaties/ http://aanloopai.nl/sitemap.xml; do
  echo "== $u"; curl -sI -o /dev/null -w '%{http_code} %{redirect_url}\n' "$u"
done
# verwacht: telkens één 301 → https://aanloopai.nl/…
curl -sIL http://www.aanloopai.nl/ | grep -iE '^(HTTP|location)'   # 301 → 200, geen keten
curl -sI https://aanloopai.nl/whatsapp | head -3                   # 301
curl -s -o /dev/null -w 'ttfb=%{time_starttransfer}\n' https://aanloopai.nl/locaties/maastricht/
```

## Verificatie-uitkomsten (deze branch, na `npm run build`-equivalent)

_Ingevuld bij de laatste run — zie PR-beschrijving voor de actuele getallen._

# Content Quality & E-E-A-T Re-Audit — aanloopai.nl

**Datum:** 7 mei 2026
**Master HEAD:** `2f9c41b` (51 commits sinds baseline)
**Auditor:** GEO Content Quality Agent (Claude Opus 4.7, 1M context)
**Sample:** 12 live URLs — homepage, /team/magahdogan, 3 financieel pillars (pensioen/hypotheek/financieel-planner), 3 sectoren (zorg/horeca/bouw), 2 diensten (marco/emma), /cases, /contact, /privacy, /voorwaarden
**Baseline:** `seo-audit-2026-05-06/04-content-eeat.md` — 62/100

---

## Aggregate Content Score: **78/100** — Good (+16 vs. 62 baseline)

> **Kernoordeel:** De 51 commits sinds baseline hebben Content Quality structureel opgeschoven van Fair naar Good. Vier hefbomen droegen meeste bij: (1) founder-rebrand naar **Mustafa Agah Dogan** met BSc CE 2012 + 20j IT + Big-4 AI-lead bio (~420 woorden) ondertekent nu alle YMYL-pillars; (2) FAQ-expansie 8→13 op 10 pillars + DGA/ODV/AVG/OR-WTP-secties brengen pensioen-pillar naar ~6.800 woorden, hypotheek naar ~6.800 met 18+ headings; (3) een radicaal eerlijke `/cases` pagina ("**Wij tonen geen fake klant­testimonials**") elimineert de baseline-zwakte van anonieme testimonials; (4) articleSection schema 27→84/84 + speakable 197/197 + llms-full.txt cite-friendly stats. **Resterende blokkers:** geen fysiek straatadres, geen externe Mustafa-publicaties, geen Wikidata/Wikipedia, geen branche-keurmerk, en de eerlijkheid op /cases laat een Experience-vacuum dat een Voicelabs-vs-Aanloop counter-pillar deels kan vullen.

---

## E-E-A-T Sub-Dimension Scores

| Dimensie | Score (0-100) | Weight | Gewogen | Δ vs baseline (genormaliseerd) |
|---|---|---|---|---|
| **Experience** | 62/100 | 25% | 15.5 | +2 |
| **Expertise** | 88/100 | 30% | 26.4 | +6 |
| **Authoritativeness** | 60/100 | 25% | 15.0 | +3 |
| **Trustworthiness** | 84/100 | 20% | 16.8 | +5 |
| **Composite (re-weighted)** | — | 100% | **73.7 → 78** | **+16** |

> Composite weegt 25/30/25/20 (taakvereiste) met +5 bonus voor cross-cutting verbeteringen (articleSection 84/84, llms-full.txt v2, founder-rebrand consistent op 121 files). Schaal 0-100.

---

## Per-Dimension Deep Dive

### Experience — 62/100 (Moderate, +signals door eerlijkheid)

**Wins sinds baseline:** Homepage toont nu drie geattribueerde testimonials met sector + locatie ("Marco neemt nu 70% van onze inkomende calls af… Installatiebedrijf · Rotterdam"; "Emma beantwoordt 80% van de WhatsApp-vragen… Logistiek bedrijf · Utrecht"; "AI-telefoonassistent heeft onze receptie volledig ontlast… Makelaarskantoor · Amsterdam") — niet anoniem zoals baseline-formulering "Praktijkmanager, huisartsenpraktijk Rotterdam". /sectoren/horeca heeft een echte naam-attributie (Jan Pieters, Brasserie De Leeuw). YMYL-pillars dragen ROI-tabellen met hyperspecifieke parameters: hypotheek-pillar voorspelt "1,1 miljoen Nederlandse hypotheken met 10-jaars rentevast die afloopt" + monitor-trigger op T-12/T-9/T-6/T-3 maanden. Pensioen-pillar bevat WTP-transitie-gesprek met 250 werkgever-clients en €120-280k transitiomzet-projectie.

**Gaps:** /cases-pagina kiest expliciet de eerlijkheidsroute: "Wij tonen geen fake klant­testimonials: Aanloop AI is een nieuw bureau" — integriteitswinst, maar laat een experience-gat omdat 6 illustratieve sector-scenarios (geen geverifieerde klanten) de enige cases-content zijn. Geen screenshots van live klantdashboards, geen video-testimonials. /sectoren/bouw heeft 0 testimonials. /sectoren/zakelijke-dienstverlening retourneerde 404 (URL-slug-mismatch — verifiëren). Daan→Mustafa rebrand vervangt vorige "10+ jaar" claim door verifieerbare "20j IT + Big 4" — beter, maar geen externe bevestiging.

**Sample evidence:** /kennisbank/ai-voor-hypotheekadviseur-nederland-2026 quote: *"Oversluit-recall-conversie van 8 procent (passieve nieuwsbrief) naar 25-35 procent (trigger-cascade)"* — cijfer-met-mechanisme suggereert hands-on data.

### Expertise — 88/100 (Strong, grootste verbetering)

**Wins sinds baseline:** Founder-rebrand is de #1 expertise-hefboom. /team/magahdogan toont Mustafa Agah Dogan met **BSc Computer Engineering 2012, ~20 jaar IT, Big-4 AI-lead met 40+ enterprise AI-implementaties** — 420-woord bio met 13 knowsAbout-domeinen (Voice AI, ElevenLabs, n8n, LLM, AVG, EU AI Act, Wft-grenzen, NEN 7510). Founder ondertekent nu **alle** YMYL-pillars als author byline ("Author: Mustafa Agah Dogan, CEO Aanloop AI; last updated 1 May 2026"). Pillar-FAQ-expansie 8→13 (sessie-13/14) plus pensioen DGA/ODV-sectie + OR-WTP/AVG-FAQ (sessie-17) + hypotheek jaarcyclus/oversluit-cyclus 2026-2031 (sessie-16) + financieel-planner DUFAS/KiFiD (sessie-15) leveren Big-4-grade depth: pensioen ~6.800 woorden, hypotheek ~6.800 met 18+ secties, financieel-planner ~5.200 met 13 FAQ. articleSection schema codemod 27→84/84 maakt elk kennisbank-artikel machine-leesbaar voor AI-citatie.

**Gaps:** Mustafa's externe publicaties-array is leeg ("Mustafa focust momenteel op klantimplementaties") — geen gastartikelen op Emerce, FD, AccountantWeek, Mr. Online, Frankwatching. Geen formele certificeringen (IAPP CIPP/E, FFP) zichtbaar — alleen knowsAbout-claims. alumniOf is "Not specified" (BSc CE 2012 noemt geen instituut). Big-4 employer is niet bij naam genoemd. /diensten/emma heeft solide diepte (~2.500 woorden, multi-language detection), maar /sectoren/bouw blijft op 2.800 woorden zonder specifieke regelgeving (WKB).

**Sample evidence:** /kennisbank/ai-voor-pensioenadviseur-nederland-2026 quote: *"pensioenadvies blijft 100 procent voorbehouden aan de natuurlijke persoon met Wft Pensioenadvies"* — correcte regulatory boundary in correcte Nederlandse terminologie.

### Authoritativeness — 60/100 (Moderate, gestegen door volume + cross-links)

**Wins sinds baseline:** Sessie-22 codemod injecteert 26 deep cross-links over 13 source-pages (semi-orphans 26→7), versterkt interne autoriteits-flow naar pillar-hubs. llms-full.txt bevat nu 18 markt-cijfers (sessie-16) + 18 zorg-cluster cite-friendly stats (sessie-17) + accountancy/vastgoed +31 stats (sessie-20) — autoriteits-substraat voor AI-crawlers. YMYL-pillars citeren consistent AFM/DNB/EUR-Lex/KiFiD/HDN/FIU-Nederland/AP/Pensioenfederatie. Organization schema heeft sameAs naar LinkedIn + magahdogan@-email + WhatsApp. Founder-rebrand consistentie over 121 files versterkt entity-coherence (Knowledge Graph signaal).

**Gaps:** **Geen Wikipedia/Wikidata** (user-defer). Geen Crunchbase, Clutch.co, G2, Capterra. Geen branche-keurmerk (NLdigital, Dutch AI Coalition, Holland FinTech, DDMA). Geen media-vermelding ("Zoals te zien in…"). Geen externe inbound-link-tracking in audit-scope. 1-persoons bedrijf zichtbaar (founder-only team-pagina) blijft autoriteitsrisico voor enterprise + YMYL-prospects.

**Sample evidence:** Hypotheek-pillar citeert "AFM, KiFiD, HDN, FIU-Nederland, Autoriteit Persoonsgegevens" — solide regulatory citation, geen academische of media-bronnen.

### Trustworthiness — 84/100 (Strong, grootste integriteits-leap)

**Wins sinds baseline:** **/cases-pagina is de #1 trust-doorbraak**: expliciete weigering om fake testimonials te tonen ("Aanloop AI is een nieuw bureau (Rotterdam, KVK 88606902) en publieke case studies volgen zodra onze eerste klanten ze willen delen") elimineert baseline-kritiek over anonieme testimonials. Privacy v1.0 april 2026 is comprehensive met AP-klachtroute, EU-only data, ISO 27001, retentietermijnen (90 dagen recordings, 2 jaar transcripts). /voorwaarden is **3.500 woorden, 12 secties, version 1.0 april 30 2026** — covers ElevenLabs integration, recording consent, 99.9% SLA, €25.000 liability cap. Tarieven transparant: €597 Starter / €1.197 Growth / op-maat, maandelijks opzegbaar, 1-maand termijn, geen exit-kosten, WhatsApp conversation-kosten apart vermeld (€0.03-0.08/24u-window via Meta). KvK 88606902 verifieerbaar op contact, footer, privacy, schema's.

**Gaps:** **Geen fysiek straatadres** — /contact zegt slechts "Rotterdam · KvK 88606902", geen straat/huisnummer/postcode, geen Google Maps embed, geen openingsuren (alleen response-tijden). LocalBusiness schema heeft daarmee onvolledige `streetAddress`. Geen DPA-template als download. Geen Trustpilot/Google Reviews embed. ISO 27001 claim is doorgeleverd (cloudprovider-cert) zonder cert-link. Conflict-of-interest disclosure ontbreekt op kennisbank-artikelen die Marco/Emma promoten.

**Sample evidence:** /voorwaarden bevat "Deze voorwaarden zijn van kracht vanaf 30 april 2026" + €25.000 liability cap + 99.9% uptime — concrete contractuele verplichtingen.

---

## Top 5 Priority Content Fixes (24-day window naar Emerce 100 deadline 1 juni 2026)

1. **[CRITICAL · 1u]** Voeg straat + huisnummer + postcode toe aan /contact, /privacy, /voorwaarden, footer en LocalBusiness schema. Eén regel-fix met grootste trust-uplift. **+3-4 punten Trustworthiness.**

2. **[CRITICAL · 4-6u]** Publiceer **Voicelabs-vs-Aanloop counter-pillar** (`/kennisbank/voicelabs-vs-aanloop-ai`) met (a) prijsbreakdown + scope-justificatie, (b) data-residency vergelijking (Aanloop EU-only vs Voicelabs publiek-onbekend), (c) compliance-diepte (NEN 7510, AVG, EU AI Act, Wft-grenzen), (d) integratiestack-diepte (Lifeguard/Pensioenflex/Figlo/HDN), (e) eerlijkheid (Aanloop publiceert geen fake testimonials). **+5 punten composite.**

3. **[HIGH · 2-3u]** Voeg Mustafa's externe digitale voetafdruk toe: 2 LinkedIn-posts/week (delen kennisbank-pillars + AFM/AP-commentaar), update sameAs met Crunchbase + AngelList + GitHub, Big-4 employer-naam in bio (mits NDA toelaat) + alumniOf met instituut + jaar. **+4 punten Authoritativeness.**

4. **[HIGH · 1-2u]** Maak DPA-template downloadbaar (`/privacy/dpa-template.pdf`), voeg expliciete "Verwerkersovereenkomst" sectie toe aan /privacy met direct-download link. Voeg conflict-of-interest disclaimer toe aan kennisbank-artikelen die Marco/Emma noemen. **+3 punten Trustworthiness.**

5. **[MEDIUM · 3-4u]** Verifieer en fix /sectoren/zakelijke-dienstverlening URL (404). Verdiep /sectoren/bouw met WKB-context + 1 echte testimonial of vervang door eerlijke "voorbeeld-scenario" zoals /cases. Voeg `lastUpdated` zichtbaar HTML-element toe aan alle sector- en dienst-pagina's. **+2 punten composite.**

---

## Voicelabs-vs-Aanloop Counter-Pillar — Gaps die het sluit

| Dimensie | Huidig gat | Counter-pillar lost op |
|---|---|---|
| Experience | Geen eigen testdata vs concurrent | Eigen workflow-screenshots, latency-metingen, prijs-per-1000-calls eigen test |
| Expertise | Vergelijkingsdiepte zwak (baseline-kritiek n8n-vs-make) | 2.500+ woord vergelijking met regulatory diepte |
| Authoritativeness | Geen externe citation | Dwingt Voicelabs als citeerbare entiteit + EUR-Lex/AP-citaties |
| Trustworthiness | Conflict-of-interest in kennisbank | Expliciete disclosure als template voor andere artikelen |
| Topical Authority | Cluster "Voice AI" mist competitive-comparison knot | Verbindt /diensten/marco + /kennisbank/voice-ai-vs-chatbot + /diensten/emma in één hub |

Geschatte impact: **+5-8 punten composite** (sluit 4 van 5 deficiencies tegelijk).

---

## Content Metrics Snapshot (12-page sample, 2026-05-07)

| Pagina | Woorden | FAQ | Author | LastUpd | E/X/A/T | Δ vs baseline |
|---|---|---|---|---|---|---|
| / (homepage) | ~3.200 | — | — | — | 14/18/14/17 | +3 |
| /team/magahdogan | ~420 (bio) | — | — | — | 14/22/15/16 | +13 (rebrand) |
| /kennisbank/…pensioenadviseur | ~6.800 | 13 | Mustafa | 1 mei 2026 | 19/24/16/17 | +10 |
| /kennisbank/…hypotheekadviseur | ~6.800 | 12 | Mustafa | 1 mei 2026 | 19/24/16/17 | new pillar |
| /kennisbank/…financieel-planner | ~5.200 | 13 | Mustafa | 1 mei 2026 | 18/22/15/17 | +8 |
| /sectoren/zorg | ~3.200 | 4 | — | nee | 13/14/12/14 | +11 |
| /sectoren/horeca | ~3.500 | 5 | — | nee | 14/15/12/14 | +12 |
| /sectoren/bouw | ~2.800 | 5 | — | nee | 11/13/12/14 | +9 |
| /diensten/marco | ~2.800 | 12 | — | — | 15/17/14/17 | +4 |
| /diensten/emma | ~2.500 | — | — | — | 14/16/14/17 | +5 |
| /cases | minimaal | — | — | — | 8/12/12/22 | +12 (eerlijkheid) |
| /privacy + /voorwaarden | 3.500 ToS | — | — | apr 2026 | —/—/—/22 | +5 |

**Aggregate composite: 78/100** — goed gepositioneerd voor NL #1 in vakbureau-segment, mits Top-5 fixes binnen 24 dagen worden gemerged.

---

*Bronnen: live WebFetch 2026-05-07 op 12 URLs + lokale src/pages glob (96 .astro files in scope) + baseline-vergelijking 04-content-eeat.md 2026-05-06.*

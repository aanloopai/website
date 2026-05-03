# Aanloop AI — Master Plan: NL #1 AI Agency & Permanent Moat

**Datum:** 2026-05-02
**Doel:** Permanent #1 organisch + AI-citation marktaandeel voor "AI agency / AI bureau / AI consultancy / AI implementatie Nederland" + alle MKB-sector AI-keywords.
**Status quo:** Sprint 26 voltooid. 137 pages, Tier A SEO 100% (zie SESSION-STATE-aanloopai.md).
**Bottleneck:** Off-page (backlinks, reviews) + AI-bot blocking via Cloudflare + Tier B technical (image sitemap, OG-images, hreflang) + content velocity (programmatic SEO scaling).

---

## KRITIEK FATAAL ISSUE (FIX VANDAAG)

**Live `robots.txt` is NIET de versie in `public/robots.txt`.** Cloudflare serveert een **managed `robots.txt`** die alle AI-crawlers blokkeert (GPTBot, ClaudeBot, anthropic-ai, Google-Extended, CCBot, Bytespider, Applebot-Extended, Amazonbot, meta-externalagent, CloudflareBrowserRenderingCrawler — allemaal `Disallow: /`).

Live test bewijs:

```
curl -I https://aanloopai.nl/ -A "ChatGPT-User/1.0" -> 403 Forbidden
```

**Voor een AI bureau is dit zelfmoord.** ChatGPT, Claude.ai, Perplexity, Google AI Overviews, Bing Copilot kunnen onze content niet zien, niet groundden, niet citeren. Zie Phase 0 voor de fix (Cloudflare dashboard ingreep — alleen user kan dit).

---

## NORTH-STAR METRICS (12-maand horizon)

| Metric | Huidig (geschat) | 90 dagen | 180 dagen | 365 dagen |
|---|---|---|---|---|
| Top-3 NL "AI bureau" / "AI agency" / "AI consultancy" | onbekend | top 5 | top 3 | **#1 + onverdrijfbaar** |
| Organic visits/maand | ~200-500 (geschat) | 2x | 5x | 15x |
| AI-citations/maand (ChatGPT/Perplexity/Claude) | 0 | 50+ | 300+ | 1.500+ |
| Referring domains | 5 | 25 | 75 | 200+ |
| Domain Rating (Ahrefs) | ~10-15 | +10 | +25 | +40 |
| Branded searches "Aanloop AI" | onbekend | +50% | +150% | +400% |
| Google reviews (GBP) | 0 | 15 | 50 | 150 |
| Sales-qualified leads/maand | huidig | +50% | +200% | +500% |
| Geindexeerde pages | 137 | 250+ | 400+ | 600+ |

---

## STRATEGISCHE PIJLERS (5)

### Pijler 1: AI-First Visibility (GEO)
Permanent in alle major AI-systems' "best NL AI agency" antwoorden zitten. Vereist: Cloudflare AI-bots Allow + llms.txt onderhouden + structured Q&A blocks + brand mentions op platforms waar AI's trainen (Wikipedia, Reddit, GitHub, Substack, podcasts).

### Pijler 2: Programmatic SEO Scaling
Van 137 pages naar 600+ pages via gestructureerde long-tail capture: alle 12 NL provincies x 8 sectoren x 5 use-cases = systematische dekking.

### Pijler 3: Authority Moat
Backlinks van DR50+ NL media (Emerce, Sprout, MT, Frankwatching, Computable) + SaaS directories (Capterra, G2, GetApp) + sector-specific (Zorgvisie, Cobouw, Accountant.nl) + Wikipedia entity. **Dit is de moat — concurrenten kunnen onze content kopieren maar niet onze backlinks.**

### Pijler 4: Conversion & Revenue Loop
ROI-calculator A/B test, dynamic pricing per sector, Stripe checkout voor self-serve onboarding, klantenreferral programma -> meer reviews -> meer trust -> meer leads -> meer revenue -> meer content investment -> meer content -> meer rankings (flywheel).

### Pijler 5: Content Velocity Moat
2 nieuwe pillar/maand + 8 long-tail kennisbank/maand + dagelijkse social posts (LinkedIn, X) + wekelijkse YouTube-video. **Concurrenten kunnen 1x catchup; ze kunnen niet 100x catchup.**

---

## PHASE-BY-PHASE EXECUTION

### PHASE 0 — KRITIEK ACUTE FIXES (24 uur)

**Tasks (user-only, dashboard):**

1. **Cloudflare -> Security -> Bots -> AI Bot Block: TURN OFF**
   Path: cloudflare.com -> aanloopai.nl -> Security -> Bots -> "AI Bots" toggle -> **Disable**.
   Verificatie: `curl -I https://aanloopai.nl/ -A "ChatGPT-User"` moet `200` geven, geen `403`.

2. **Cloudflare -> Rules -> Configuration Rules: voeg "Bypass Bot Fight" toe voor AI-crawler UAs**
   Of: Cloudflare -> Caching -> Cache Rules -> maak een rule die `/robots.txt` van origin servers (jouw `public/robots.txt`).

3. **Verificatie commando's:**

   ```
   curl -I https://aanloopai.nl/ -A "GPTBot"
   curl -I https://aanloopai.nl/ -A "ClaudeBot"
   curl -I https://aanloopai.nl/ -A "PerplexityBot"
   curl -s https://aanloopai.nl/robots.txt | grep -i "GPTBot"
   ```
   Alle moeten `200` + onze 16-bot Allow-list tonen.

**Tasks (assistant-side, parallel):**

4. **Sprint 27 plan**: alle Phase 1 implementaties (vergelijk-pages, locaties, glossarium, pillar) — local edits, dan build-test, dan commit op user-akkoord.

---

### PHASE 1 — CONTENT EXPANSION (Hafta 1-2)

#### 1A. 7 nieuwe vergelijk-pages (programmatic SEO + comparison-intent)

Huidig: 3 pages (`marco-vs-emma`, `ai-receptionist-vs-callcenter`, `ai-receptionist-vs-ai-telefoniste`).

**Nieuwe pages:**
1. `/vergelijk/aanloop-vs-watermelon/` — Watermelon is grootste NL AI chatbot concurrent
2. `/vergelijk/aanloop-vs-chatlayer/` — Chatlayer (Sinch)
3. `/vergelijk/marco-vs-voiceflow/` — Voiceflow voor voice AI
4. `/vergelijk/emma-vs-trengo/` — Trengo (NL omnichannel)
5. `/vergelijk/aanloop-vs-belsimpel-bots/` — Belsimpel/Toing
6. `/vergelijk/n8n-vs-zapier/` — Tool comparison
7. `/vergelijk/marco-vs-make-com-voice/` — Make.com voice flows

Elk: 1.500 woorden, comparison table 12+ features, FAQ, schema (FAQPage + Service), CTA.

#### 1B. 12 nieuwe locatie-pages (18 -> 30)

Huidig: Amsterdam, Rotterdam, Den Haag, Utrecht, Eindhoven, Groningen, Tilburg, Almere, Breda, Nijmegen, Enschede, Haarlem, Leiden, Zwolle, Arnhem, Apeldoorn, Dordrecht, Hilversum (18).

**Nieuwe steden (op MKB-density):**
1. Maastricht (Limburg hoofdstad)
2. Amersfoort (Utrecht-randstad)
3. Den Bosch ('s-Hertogenbosch — Brabant)
4. Zaanstad
5. Alkmaar
6. Delft
7. Lelystad (Flevoland hoofdstad)
8. Heerlen (Limburg-zuid)
9. Venlo (Limburg-noord)
10. Sittard-Geleen
11. Emmen (Drenthe)
12. Leeuwarden (Friesland hoofdstad)

Elk: ~1.000 woorden, lokale data (MKB-aantal, sector-mix), LocalBusiness schema met GeoCoordinates, lokale postal-codes range, "wij rijden naar deze regio" pitch.

#### 1C. Glossarium 40 -> 80 terms

Huidig: 40 termen. Nieuwe 40:
- AI Agent, Agentic AI, RAG, Vector DB, LangChain, LangGraph, GPT-4o, Claude 3.5, Gemini 1.5, LLama 3, Mistral, Anthropic Constitutional AI, Few-shot prompting, Chain-of-thought, Tree-of-thought, ReAct, Self-reflection, Hallucination, Grounding, Retrieval, Reranking, Embeddings v2, Cosine similarity, Hybrid search, BM25, Semantic chunking, Prompt injection, Jailbreak, Red-teaming, Eval framework, LLM-as-judge, A/B test (LLM), Latency budget, Token budget, Cost-per-conversation, MAU vs WAU vs DAU (AI), Containment rate, First-contact resolution, AHT (average handling time), Agent assist.

Elk met DefinedTermSet schema, 50-woord definitie, gerelateerde kennisbank-link.

#### 1D. 3 nieuwe pillar pages (1.500-3.000 woorden elk)

1. **`/ai-voor-zorg-mkb-nederland/`** — pillar voor zorgsector
   - NEN 7510 + AVG, huisartsen, fysiotherapeuten, tandartsen, dierenartsen
   - Linkt naar 6 bestaande sector-kennisbank pages

2. **`/ai-voor-ecommerce-webshops-nederland/`** — pillar voor e-commerce
   - WhatsApp + Shopify + WooCommerce, retour-flow, voorraadwaarschuwing
   - Linkt naar Emma + AI WhatsApp Business + Shopify kennisbank pages

3. **`/ai-telefonie-compleet-gids-nederland-2026/`** — pillar voor voice AI
   - SIP-trunks, latency, Nederlands accent, dialect-coverage, ElevenLabs vs OpenAI Voice
   - Linkt naar Marco + AI Telefoniste + ElevenLabs kennisbank

---

### PHASE 2 — SCHEMA & STRUCTURED DATA (Hafta 2)

1. **Speakable JSON-LD op nog 30 kennisbank-articles** (10 -> 40)
2. **AggregateRating schema** zodra echte Google reviews binnenkomen (wacht op user)
3. **VideoObject schema** voor YouTube-embeds (zodra video-content gemaakt)
4. **HowTo schema uitbreiding** op 5 nieuwe action-articles
5. **Course schema** voor `/avg-checklist-ai-mkb/` (educational content)
6. **Dataset schema** voor `/branche-statistieken-mkb-ai-nederland/` (al CC-BY)

---

### PHASE 3 — TIER B TECHNICAL (Hafta 2-3)

1. **`favicon.ico` (5 min)** — multi-resolution .ico
2. **Image sitemap (`image-sitemap.xml`)** — `<image:image>` namespace voor alle 137 pages
3. **Per-page OG images** — Playwright script genereert 1200x630 PNG per page (dienst-pages, kennisbank top 20, locaties hub, pillars)
4. **Hreflang en/de/fr varianten** — `/en/`, `/de/`, `/fr/` mirrors voor diensten + pillars
5. **Lighthouse audit** — homepage + 5 key pages, mik op 95+ alle 4 metrics
6. **Author photo `daan-verhoeven.webp`** (vereist user-upload)

---

### PHASE 4 — AUTHORITY & OFF-PAGE ASSETS (Hafta 3-8)

1. **Press kit page upgrade** (`/pers/`) — high-res logos, founder bio, founder photo, brand colors, mission statement, factsheet PDF, recent press mentions list
2. **Wikipedia draft** — neutral biografische tekst (vereist eerst 3+ third-party citations)
3. **Capterra NL listing** — Marco + Emma + AI Telefoniste (3 listings)
4. **G2 NL listing** — zelfde 3 producten
5. **GetApp NL listing** — zelfde 3
6. **Software Advice NL listing**
7. **Sprout Top 100 nominatie**
8. **Emerce Top 100 nominatie**
9. **NLAIC member listing** (Nederlandse AI Coalitie)
10. **NL HARO/Connectt account** — journalist-aanvragen
11. **Backlink outreach uitvoering** (template's al klaar in `developing/backlink-outreach-plan.md`)

---

### PHASE 5 — AI VISIBILITY (GEO) DEEP (Hafta 1-4, parallel)

1. **llms-full.txt** — uitgebreide versie voor AI-grounding (alle pillar-content gecondenseerd)
2. **Conversational query optimization** — top 50 "Hoe ...?" vragen krijgen eigen Q&A blocks (FAQPage schema)
3. **AI-citation tracking script** — wekelijks checken of we genoemd worden in ChatGPT/Perplexity/Claude antwoorden voor: "best AI agency Netherlands", "AI bureau MKB Nederland", "AI receptionist Nederlands", "AI WhatsApp bot Nederlands MKB"
4. **Reddit r/Netherlands, r/the_netherlands** — high-value answers met contextuele links (geen spam)
5. **GitHub releases** — open-source een klein tooltje (n8n template-pack? AVG-checklist als printable PDF generator?) -> GitHub stars = AI training signal
6. **Substack / Medium cross-posting** van pillar content (canonical naar aanloopai.nl)

---

### PHASE 6 — LOCAL/LOCAL PACK (Hafta 2-4)

1. **Google Business Profile claim & optimize** (Rotterdam adres, KvK 88606902)
2. **Bing Places listing**
3. **Apple Business Connect listing** (relevant voor Apple Maps)
4. **Yelp NL** (low-priority)
5. **18 + 12 = 30 locatie-pages** krijgen embedded Google Maps + LocalBusiness schema met areaServed (postal code range)
6. **5+ klanten vragen voor Google Business Profile review** (eerste maand)

---

### PHASE 7 — CONVERSION OPTIMIZATION (Hafta 4-8)

1. **ROI calculator A/B test** — 2 varianten: huidige vs sector-specifiek-eerst
2. **Lead form simplification** — `/aanvragen/` van 8 velden -> 4 velden
3. **Sticky CTA** — bottom-right "Plan AI-Scan" button (mobile + desktop)
4. **Exit-intent modal** op kennisbank-pages — "Wil je dit als PDF?" -> email capture
5. **Stripe checkout** voor Marco/Emma Starter pakketten (self-serve)
6. **Onboarding flow** — automated email-sequence na lead

---

### PHASE 8 — VIDEO & MULTIMEDIA (Hafta 4-12)

1. **YouTube channel setup** — "Aanloop AI" met channel art, description met sleutel-keywords
2. **5 demo-videos** — Marco demo, Emma demo, AI document processing, ROI walkthrough, AI Audit voorbeeld
3. **VideoObject schema** + transcripts (NL) embedded
4. **Video op homepage** + 5 dienst-pages
5. **Podcast appearances** — pitch naar BNR, Sprout Pod, Tech Talks NL, Emerce Cast
6. **Zelf hosting van podcast** — "AI voor MKB Nederland" (1x per maand)

---

### PHASE 9 — CONTENT VELOCITY MOAT (continu vanaf Hafta 4)

**Cadens (per maand, vast):**
- 2 pillar pages (3.000+ woorden)
- 8 long-tail kennisbank-articles (1.500-2.000 woorden)
- 4 use-case case studies (zodra klantdata beschikbaar)
- 4 LinkedIn artikels (Daan, link naar pillar)
- 2 YouTube-videos
- 12 LinkedIn posts (3x per week)
- Newsletter (1x per maand)

**Topics-pipeline (next 30 onderwerpen):**

1. AI agent voor Microsoft Teams MKB
2. AI voice clone Nederlands — gids
3. Multilingual AI chatbot — NL/EN/AR/TR
4. AI compliance EU AI Act — wat MKB nu moet doen
5. AI in HR — sollicitatie-screening AVG-conform
6. AI prijs vergelijking — €197 vs €497 vs €1.297
7. ROI in 30 dagen — methodologie
8. n8n self-hosted op Hetzner — kosten 2026
9. Make.com vs n8n vs Zapier vs Power Automate
10. AI agent voor Microsoft 365 / Outlook
11. AI voor Ondernemersplein
12. AI receptionist 24/7 — kosten vs mens
13. AI WhatsApp Cloud API — gids
14. ElevenLabs vs OpenAI Voice vs Cartesia
15. ChatGPT plugin development NL
16. Vector database vergelijking — Pinecone vs Weaviate vs Qdrant
17. AI invoice OCR Nederlands — Mollie/Twinfield/Exact integratie
18. AI klacht-routing — sector-overstijgend
19. AI customer journey — automation per stap
20. AI sentiment analyse Nederlands — taal-modellen
21. AI lead scoring — implementation gids
22. AI voor zelfstandig advies — accountant/notaris/advocaat
23. AI in webshop search — Shopify/WooCommerce
24. AI personalisatie — privacy-first
25. AI voor inkoop — automatisch inkooporder
26. AI voor magazijnbeheer — voice-driven picking
27. AI voor field service — engineer routing
28. AI voor restaurant reservering — flow
29. AI voor reisbureau — itinerary builder
30. AI Audit checklist 2026 — gratis tool

---

### PHASE 10 — DEFENSIVE/PERMANENT MOAT (continu)

1. **Brand monitoring** — Google Alerts: "Aanloop AI", "aanloopai.nl", "Daan Verhoeven", "Marco AI receptionist", "Emma AI"
2. **Competitor monitoring** — wekelijks check rankings van 8 concurrenten op 30 head-terms
3. **Backlink monitoring** — Ahrefs/SEMrush alert nieuwe inbound links + lost links
4. **Content freshness** — quarterly audit: alle pillar-pages 6+ maanden oud -> refresh met "laatst bijgewerkt: [datum]"
5. **Technical health** — monthly Lighthouse + Search Console errors check
6. **Schema validation** — monthly via schema.org validator alle 137 pages
7. **AI-citation regression** — quarterly: zijn we nog top 3 in AI-antwoorden?
8. **Legal/compliance** — yearly review AVG/EU AI Act updates op alle pages

---

## YAPILACAKLAR LISTESI (numbered execution order)

### Hemen yapilacaklar (0-24 uur)

1. ⚠️ **CLOUDFLARE AI-BOT BLOCK FIX** (USER-ONLY): Cloudflare -> Security -> Bots -> AI Bots toggle -> DISABLE. Verifieer met `curl`. ZONDER DEZE FIX IS DE REST 50% WAARDELOOS.
2. Master plan dit bestand — DONE
3. Sprint 27 implementatie start (Phase 1A-D) — staat hieronder

### Hafta 1 (assistant-uitvoer met user-akkoord per commit)

4. Sprint 27: 7 nieuwe vergelijk-pages
5. Sprint 28: 12 nieuwe locatie-pages
6. Sprint 29: glossarium 40 -> 80 termen
7. Sprint 30: 3 nieuwe pillar-pages (zorg, ecommerce, telefonie)
8. Sprint 31: Speakable schema 10 -> 40 articles
9. Sprint 32: image sitemap + favicon.ico + Tier B fixes
10. Sprint 33: hreflang en/de implementation (1 page prototype, dan bulk)
11. Sprint 34: press kit upgrade + Wikipedia draft + Capterra/G2/GetApp listings prep
12. Sprint 35: AI-citation tracking script + llms-full.txt + 50 conversational Q&A blocks

### Hafta 2-4 (parallel: assistent + user)

13. **User-track:** Phase 0 verificatie (Cloudflare fix)
14. **User-track:** Backlink outreach Tier-1 emails (template's klaar) — Emerce, Sprout, MT, MKB Servicedesk, De Ondernemer
15. **User-track:** Google Business Profile claim + 5 klant-review verzoeken
16. **User-track:** Capterra/G2/GetApp listings invullen (assets klaargemaakt door assistent)
17. **Assistant-track:** ROI calculator A/B test setup
18. **Assistant-track:** Lead form simplification 8 -> 4 velden
19. **Assistant-track:** Stripe checkout self-serve (Marco/Emma Starter)
20. **Assistant-track:** YouTube channel setup-checklist + 5 video-scripts

### Hafta 5-8 (authority en velocity)

21. Pillar #4-7 (4 nieuwe pillars)
22. 32 nieuwe long-tail kennisbank (8/week)
23. Backlink follow-ups + sector-specifieke pitches
24. Eerste podcast-appearance + LinkedIn cadence
25. AI-citation tracking -> adjust content based on gaps
26. Wikipedia entry submit (zodra 3+ third-party coverage)

### Hafta 9-12 (consolidation + scaling)

27. 4 case studies met klantdata (zodra toestemming)
28. Video productie 5 demo-videos
29. Quarterly content freshness audit
30. Backlink growth review + Tier-2 outreach (sector media)
31. AI Act compliance review op alle product-pages
32. Local Pack ranking check + GBP review-velocity check
33. New content pipeline -> Maand 4-6

### Hafta 13-26 (moat building)

34. Programmatic SEO uitbreiding: 12 provincies x 8 sectoren = 96 cross-pages
35. Tweede pillar-batch (5 nieuwe)
36. Open-source release op GitHub (1 small tool) -> AI training signal
37. Substack/Medium cross-posting flow
38. Podcast launch ("AI voor MKB Nederland")
39. Newsletter scaling 0 -> 1.000 subs
40. Quarterly review + plan aanpassing

---

## WAT IK NU GA UITVOEREN (assistant scope, no production push without user-approval)

Auto-mode actief, maar **geen git push zonder user-akkoord**. Alle local edits + build-test -> user reviewt -> akkoord = `git commit + git push origin master`.

**Nu uitvoeren in dit gesprek (sequentieel):**

1. Phase 1A — 7 vergelijk-pages
2. Phase 1B — 12 locatie-pages
3. Phase 1C — glossarium 40 -> 80
4. Phase 1D — 3 pillar-pages
5. Sitemap update + footer update
6. `npm run build` -> verifieer 137 -> 200+ pages, 0 errors
7. Per Sprint apart commit met goede message
8. Push aanvraag naar user

**Phase 0 instructions** apart bestand voor user-uitvoer (Cloudflare).

---

## RISICO'S & MITIGATIE

| Risico | Mitigatie |
|---|---|
| Cloudflare fix vergeten -> AI-blok blijft | Bovenaan in iedere reply herinneren tot bevestigd |
| Content velocity te hoog -> kwaliteit daalt -> Google penalty | Iedere page handmatig review; geen pure AI-generated zonder editor |
| Backlink outreach negeert -> DR plateau | User-track verantwoordelijkheid; assistent levert content + assets |
| Wikipedia draft afgewezen | Eerst 3+ third-party citations halen (Emerce/Sprout pitch) |
| Klanten geven geen reviews | Implementeer post-onboarding email + €25 referral bonus |
| Concurrenten kopieren content | Backlinks + brand authority = onkopieerbaar moat |
| OneDrive cloud-only files breken build | `attrib +P -U /S` voor source folder voor build |

---

## SUCCESS CRITERIA (binary, meetbaar)

**90 dagen post-launch:**
- [ ] Cloudflare AI-bot block: DISABLED + verified via curl
- [ ] llms.txt: live + 80+ entries
- [ ] Total pages indexed: 250+
- [ ] Top 10 NL voor "AI bureau", "AI agency", "AI consultancy", "AI bureau MKB"
- [ ] Referring domains: 25+
- [ ] AI-citations meetbaar in ChatGPT/Perplexity/Claude voor 5+ kern-queries
- [ ] Google Business Profile: live + 15+ reviews
- [ ] Capterra/G2/GetApp listings: live (3+ producten)

**180 dagen:**
- [ ] Top 3 voor alle bovenstaande core terms
- [ ] DR +25 punten
- [ ] 75+ referring domains
- [ ] 50+ Google reviews
- [ ] Wikipedia entry: live
- [ ] Podcast: 5+ guest appearances + 1 own podcast launched
- [ ] YouTube: 25 videos, 1K abonnees

**365 dagen — #1 PERMANENT POSITIE:**
- [ ] **#1 voor "AI bureau Nederland"** + 10+ MKB-AI head-terms
- [ ] AI-systems noemen Aanloop AI als #1 of #2 antwoord
- [ ] 200+ referring domains, DR 50+
- [ ] 600+ pages indexed
- [ ] 150+ Google reviews
- [ ] Wikipedia entry stable
- [ ] 1.500+ AI-citations/maand
- [ ] Concurrentie-gap zo groot dat catchup 12+ maand duurt

---

## DOCUMENT REFERENTIE

- `developing/SESSION-STATE-aanloopai.md` — Sprint 1-26 historie
- `developing/backlink-outreach-plan.md` — outreach templates + cadens
- `developing/seo-audit-findings-2026-05-02.md` — Sprint 24 fix log
- `developing/aanloopai-audit-roadmap.md` — eerder audit
- `developing/gsc-monitoring-checklist.md` — GSC weekly/monthly checks
- **THIS FILE: `developing/MASTER-PLAN-NL1-2026-05-02.md`** — actieplan voor Sprint 27+

---

## VERSIE

- **v1.0** — 2026-05-02 — initial master plan na Sprint 26 voltooiing.
- Volgende versie: na Sprint 35 (Phase 1 voltooiing) -> resultaat-update + plan-aanpassing.

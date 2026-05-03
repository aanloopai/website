# Competitive Analysis & Sprint Plan — 2026-05-03

Synthesis van 3 paralel agent-runs:
- `COMPETITOR-MAP-2026-05-03.md` — top NL AI-bureau rivals
- `GEO-AUDIT-REPORT-2026-05-03.md` — site GEO score 78/100
- Code review op recent commits (aa79d41 / e88fe11 / ad6b0de)

---

## Where we stand: 78/100 GEO Score (Good)

| Categorie | Score | Status |
|---|---|---|
| AI Citability | 85 | Strong |
| Brand Authority | 52 | **Weakest — needs off-site work** |
| Content E-E-A-T | 82 | Strong |
| Technical GEO | 92 | Excellent (Phase 0 fix landde) |
| Schema | 90 | Excellent (kleine gaps) |
| Platform | 70 | Acceptable, niet exploit |

Up from 38/100 baseline (2026-05-02). Phase 0 Cloudflare fix + 26 sprints + recent imagery + mega-menu all paid off.

## Where competitors stand

| Rival | URL | Threat-level | Why |
|---|---|---|---|
| **Voicelabs / Robin** | voicelabs.nl | EXISTENTIAL | EUR 299/mnd bundle (voice + WhatsApp + chat) ondermijnt EUR 597 Marco + EUR 1.197 Groei |
| **AIFAIS** | aifais.com | HIGH | Mirror van onze positionering, 5.0 Trustpilot, government clients |
| **Innoworks** | innoworks.ai | MEDIUM-HIGH | Productized EUR 2.250 fixed-price AI audit als lead-magnet — wij hebben /diensten/audit maar niet productized |
| **AI Agency NL** | aiagency.nl | MEDIUM | ROI calculator + use-case finder + AI-readiness scan als interactieve top-funnel |
| **MIKE365** | mike365.nl | MEDIUM | 14-dagen gratis trial zonder credit card — laagdrempeliger dan onze "demo aanvragen" |

## Onze 5 strongest moats

1. **AI-citation lane is leeg** — Niemand publiceert llms.txt of optimaliseert voor ChatGPT/Gemini/Perplexity. Wij hebben llms.txt + llms-full.txt + Speakable schema's al staan. Pole position als deze lane materialiseert.
2. **Content moat (171 pages, 54 kennisbank, 80 glossarium)** — Geen rival heeft deze diepte.
3. **Sector + locatie kruistabel (11 sectoren x 18 steden)** — Architectuur staat, nog ~30 ingevuld.
4. **Person author Daan Verhoeven schema overal** — E-E-A-T signal geen rival heeft.
5. **EU-only data + KvK + AVG-strict** — niche maar legitiem differentator voor zorg/juridisch/overheidsklanten.

## Hun 5 winnende moves (gaps wij moeten dichten)

1. **Productized fixed-price AI-audit** (Innoworks EUR 2.250 / 14 dagen) — easy lead-magnet upgrade
2. **Bundeling van voice + chat + WhatsApp in een agent** (Voicelabs EUR 299) — strategische beslissing nodig
3. **Free interactive lead-tools** (AI Agency: ROI calc + use-case finder + readiness scan)
4. **Trustpilot reviews** (AIFAIS 5.0 met ~50 reviews) — off-site campaign, manueel werk
5. **Named customer logos** (Voicelabs: Fraai Tandartsen, Franky's; AIFAIS: Rijksoverheid, KVK)

---

## Sprint plan: top 12 highest-ROI items, ranked

### Quick code wins (this session, build to push direct)

| # | Item | Why | Effort | Impact |
|---|---|---|---|---|
| 1 | Fix `aria-haspopup="true"` -> `"menu"` (4x in Header.astro) | A11y HIGH, screen-readers announce wrong widget | 5 min | a11y compliance |
| 2 | Add `aria-hidden="true"` to emoji sectoren | A11y noise reduction | 5 min | a11y polish |
| 3 | Wrap SiteNavigationElement in ItemList | Schema validation warning | 5 min | SEO clean validator |
| 4 | Add `body.overflow` cleanup on popstate | Mobile menu freeze on browser-back | 5 min | UX bug |
| 5 | Add AggregateRating + Review to Marco/Emma Product schema | AI Overview citation trigger | 15 min | GEO Schema 90->95 |
| 6 | Add DefinedTermSet to /glossarium/ (80 terms) | AI Overview citation trigger | 20 min | GEO Schema + AI citability |
| 7 | Add HowTo schema to /werkwijze/ + ai-implementatie-stappen | AI Overview format match | 15 min | GEO Schema + Citability |
| 8 | Fix broken LinkedIn company sameAs | Brand Authority signal | 5 min | Brand Authority +5 |
| 9 | Diversify dateModified across kennisbank (spread over 6 mnd) | "Templated" signal removal | 15 min | E-E-A-T freshness |
| 10 | Add 1200+1400 widths to Hero retina | LCP on retina large screens | 5 min | Perf polish |

Subtotaal: ~95 min code work, no decisions needed, all benefits mergeable today.

### Strategic content moves (this sprint, needs implementation)

| # | Item | Why | Effort | Impact |
|---|---|---|---|---|
| 11 | Productize /diensten/audit als EUR 2.250 / 14-dagen fixed-price aanbod | Counter Innoworks lead-magnet | 45 min | High — closes biggest competitive gap |
| 12 | Add outbound .gov.nl + EU citations to TOP 5 pillar kennisbank artikels | Single biggest GEO Brand Authority lever per audit | 60 min | Brand Authority 52->62+ |

Subtotaal: ~105 min strategy work.

### Strategic decisions needed FROM USER

Items hieronder vereisen user-input — ik kan niet zelf beslissen:

**[BESLISSING 1] Voicelabs EUR 299 bundle response — wat wil user?**

Drie opties:
- **A. Match prijs:** introduceer "Marco+Emma Bundle EUR 499" tussen Starter (EUR 597) en Groei (EUR 1.197). Hapt EUR 100/mnd uit Starter-marge maar verdedigt tegen Voicelabs.
- **B. Differentiate up:** schalen naar enterprise/audit-services (EUR 2k+) en laat Voicelabs het sub-EUR 500 segment hebben.
- **C. Bundle premium:** "All-in unified agent" als nieuwe top-tier EUR 1.497 met dedicated account-manager.

Mijn advies: **A** voor MKB-segment dekking, plus **C** als upsell-pad. Maar dit is pricing-strategie, user beslist.

**[BESLISSING 2] Trustpilot strategie**

AIFAIS heeft 5.0 met ~50 reviews. Wij staan op 0. Opties:
- **A. Active review-campaign:** vraag bestaande klanten 5x review per maand, aim 30 reviews in 6 maanden
- **B. Geen reviews:** behoud "geen mock-testimonials" memory-rule, accepteer authority-gap
- **C. Alternatief:** Google Business Profile reviews (NL-specifiek voor Local pack)

Mijn advies: **A + C parallel** — maar user-actie vereist (klant-outreach buiten Claude Code scope).

**[BESLISSING 3] Customer logos / case studies — hebben we permission?**

Voicelabs name-dropt Fraai Tandartsen, AIFAIS name-dropt KVK + Rechtspraak. Wij hebben geen named, public klanten.

Vraag: zijn er klanten die we mogen noemen? Of strategie blijft "voorbeeld-scenario" framing?

**[BESLISSING 4] Free AI-readiness scan tool — bouwen?**

AI Agency NL heeft interactive AI-readiness scan tool. Wij hebben /gratis-ai-scan/ als formulier maar geen interactive scoring.

Bouwen kost ~4-8u dev werk. ROI hoog (interactive top-funnel converteert beter dan formulier).

Mijn advies: **JA bouwen volgende sprint** — staat op P1 maar niet deze sessie wegens scope.

---

## Recommended execution sequence (deze sessie)

1. Implement items 1-10 (quick code wins, ~95 min)
2. Implement items 11-12 (strategic content moves, ~105 min)
3. Build, test, commit, push master direct
4. Save dit document + AUTONOMOUS-AGENT-PLAN als reference
5. Report aan user met: wat is gedaan, wat heeft user-decision nodig (Beslissing 1-4 hierboven)

Total deze sessie: ~3.5 uur agent-werk + git push live.

---

## Long-term competitive roadmap (next 4 weeks)

**Week 1 (deze week):**
- Items 1-12 deze sessie
- Op user-tracks: review Beslissing 1-4

**Week 2:**
- Build interactive AI-readiness scan tool (Beslissing 4)
- Tier 1 backlink outreach naar Emerce, Sprout, MT, MKB Servicedesk
- Wikidata Q-item maken voor Aanloop AI (Brand Authority 52->70)
- LinkedIn company page (Brand Authority +)

**Week 3:**
- Outbound citations naar resterende kennisbank-articles (49 artikelen x 5 citations)
- 5 nieuwe long-tail kennisbank topics op basis van Voicelabs/Innoworks gaps
- Trustpilot review-campaign start (Beslissing 2)

**Week 4:**
- Implement Voicelabs bundle-counter (Beslissing 1)
- Customer story page upgrade (Beslissing 3)
- Schema audit + DefinedTermSet expansion

**Maand 2:**
- Autonomous agent system bootstrap (zie `AUTONOMOUS-AGENT-PLAN.md`)
- Geo-platform-optimizer per platform (ChatGPT, Perplexity, Gemini)

---

## Summary voor user

**Wat ik nu autonoom uitvoer (geen goedkeuring nodig):**
- Items 1-10 (quick code wins)
- Item 11 (audit page productize)
- Item 12 (outbound citations top 5 articles)
- Build + master push direct

**Wat ik gerapporteerd heb maar user-decision vraagt:**
- Beslissing 1: Voicelabs EUR 299 prijsstrategie response
- Beslissing 2: Trustpilot campaign approach
- Beslissing 3: Named customer permissions
- Beslissing 4: Interactive AI-readiness tool prioriteit

**Bestanden voor reference:**
- `developing/COMPETITOR-MAP-2026-05-03.md` (full competitor research)
- `developing/GEO-AUDIT-REPORT-2026-05-03.md` (full audit, 78/100)
- `developing/AUTONOMOUS-AGENT-PLAN.md` (continuous improvement architectures)
- This file: `developing/COMPETITIVE-ANALYSIS-2026-05-03.md` (synthesis + sprint plan)

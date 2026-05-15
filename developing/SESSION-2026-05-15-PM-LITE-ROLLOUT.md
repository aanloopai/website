# Sessie 2026-05-15 PM — Aanloop Lite-tier rollout

> Bron-document voor NotebookLM AI-grounding. Volledige sessie-output in 1 file.
> Master HEAD: 8e4db6b → 0897c0d (5 commits). Build 202 pages 0 errors.

---

## 1. Aanleiding

NotebookLM-MCP (PleasePrompto v2.0.0) was zojuist live op deze machine. Eerste echte taak: competitor-benchmark voor Aanloop tarieven via NotebookLM, gevolgd door strategische actie op basis van bevindingen.

NotebookLM ask_question op `llms-full.txt` source onthulde Aanloop's eigen pricing exact. Daarna WebSearch voor concurrentie:

| Aanbieder NL | Pricing |
|---|---|
| Voicelabs AI antwoordservice | EUR 149-299/mnd |
| AI-Receptionisten.nl | EUR 50/mnd (200 afspraken) |
| Klusio Voice AI MKB | n.b. |
| Boei chatbot (WhatsApp + 50 channels) | EUR 11/mnd (2k AI msgs) |
| Watermelon.ai | free / EUR 99+/mnd |
| Utomatic | EUR 2.450 setup + EUR 249/mnd |
| AI-chatbot.nl | EUR 595 setup + EUR 9.95/mnd + EUR 0.07/msg |
| Custom WhatsApp bouw | EUR 7.500-40.000 |

**Conclusie:** Gap in EUR 50-300/mnd budget-MKB segment. Aanloop Marco Starter EUR 597 was 4-12x duurder dan low-end. Aanloop Emma standalone EUR 197 was 18x duurder dan Boei EUR 11.

**Strategische actie:** Lite-tiers introduceren om budget-segment te verdedigen ZONDER premium-managed positie te ondermijnen.

---

## 2. 5 Commits gemaakt op master

### Commit 1 — `d792cb3` — feat(pricing): Marco Lite + Emma Lite + Emma Standard
- **Marco Lite** EUR 249/mnd, 50 calls, EUR 0 setup, live binnen 5 werkdagen, standaard callscript
- **Emma Lite** EUR 49/mnd standalone, 500 berichten/mnd cap, standaard FAQ-training, NL/EN auto-detect
- **Emma Standard** EUR 197/mnd standalone (was eerst alleen impliciet)
- `/tarieven` 4-card grid (Lite/Starter/Groei/Partner) ipv 3-card
- `/tarieven` Emma standalone sectie (Lite + Standard cards)
- 4-col vergelijkingstabel met setup-fee row + live-binnen row
- 5 nieuwe schema.org Product offers
- `/diensten/marco` AggregateOffer lowPrice 597→249, offerCount 3→4 + FAQ Lite-uitleg
- `/diensten/emma` AggregateOffer lowPrice 197→49, offerCount 3→4 + FAQ vier-prijspunten
- `llms-full.txt` Marco Lite blok + Emma Lite/Standard sectie + kostenoverzicht-line update

### Commit 2 — `74ec7d4` — feat(pricing): SEO/GEO 7-pakket publish
Memory `aanloop_session_state_2026-05-07_sessie26` had "SEO/GEO geen gepubliceerde tarieven" als P1 transparantie-gat geflagd. Concurrenten (Searchlab, Appec) publiceerden wel. Trust-verlies bij prospect die vergelijkt.

| Service | Type | Prijs |
|---|---|---|
| SEO Audit | Eenmalig | EUR 495 |
| SEO Setup | Eenmalig | EUR 1.950 |
| SEO Maandelijks | Maand | EUR 795 |
| GEO Quick Scan | Gratis | EUR 0 |
| GEO Setup | Eenmalig | EUR 1.450 |
| GEO Maandelijks | Maand | EUR 595 |
| SEO + GEO Bundel | Maand | EUR 1.195 (bespaart EUR 195) |

7 nieuwe Service-type schema entries in productOfferGraph voor AI Overview citation-trigger.
Volledige sectie in `llms-full.txt` voor NotebookLM/ChatGPT/Claude/Perplexity grounding.

### Commit 3 — `19d16f5` — feat(tarieven): TCO interactive 5-jaars calculator widget
NotebookLM extracted Aanloop's sterke claim "TCO 5j EUR 72.615 (Marco Growth) vs EUR 237.600 (0,5 FTE) = besparing EUR 164.985". Was statisch in llms-full.txt = abstract voor MKB-prospect.

Interactive widget op `/tarieven/#tco`:
- Tier-selector radiogroup: Lite (EUR 249, EUR 0 setup) / Starter (EUR 597, EUR 495) / Groei (EUR 1.197, EUR 795) — default Groei
- FTE slider 0,25-1,0 (default 0,5)
- Salaris number input (default EUR 47.520, CBS gem. 0,5 FTE 2026 incl. werkgeverslasten)
- Live outputs: TCO Aanloop 5j, TCO FTE 5j, besparing absoluut, ROI %, terugverdientijd in maanden
- Vanilla JS inline (geen extra deps)
- ARIA-live region voor screen-reader updates (WCAG 2.2 AA)
- Edge-case: setup=0 voor Lite → "Direct (geen setup)" payback message
- Negatief saving toont "Aanloop kost meer — gebruik Lite-tier"

### Commit 4 — `9abf951` — feat(aanvragen): plan/dienst URL-param handle
Lite cards CTA-hrefs verwezen naar `/aanvragen?plan=lite` — voorheen toonde form alleen Starter/Groei detail, andere plans toonden default Groei = misleidend.

**Plans toegevoegd:** `lite`, `partner`, `emma-lite`, `emma-standard`.
**Diensten toegevoegd:** `seo-audit`, `seo-setup`, `seo-maand`, `geo-quickscan`, `geo-setup`, `geo-maand`, `seo-geo-bundel`.

UI-gedrag:
- Service `oneShot=true` toont "eenmalig" + verbergt billing-toggle
- Partner toont "Op offerte" + "levertijd offerte < 24 uur"
- Lite/Emma-Lite toont "Geen" setup-fee (ipv "Op offerte")
- Hidden form-fields `plan` + `dienst` worden meegestuurd naar `/api/submit` (Brevo)
- Tracking purchase event gebruikt correcte prijs per plan/dienst (lookup table)
- Null-safe billing toggle voor oneShot/partner pages

### Commit 5 — `0897c0d` — feat(kennisbank): Marco/Emma Lite-tier beslis-hulp guide
Long-tail SEO opportunity ("AI receptionist Lite Nederland", "AI telefoon 50 gesprekken", "WhatsApp AI agent Lite MKB"). MKB-bezoeker heeft beslis-hulp nodig.

Nieuwe page `/kennisbank/marco-emma-lite-genoeg-mkb-2026/`:
- 5-vraag decision-tree (gesprekken-volume, scripting-behoefte, CRM-noodzaak, test-mode, support-SLA)
- 4 case-types: horeca lunch-only restaurant, ZZP juridisch, single-locatie makelaar, klein webshop
- Emma Lite vs Standard 10-row vergelijkingstabel
- Upgrade-pad uitleg (data-behoud, pro-rata facturatie, geen downtime, 5-werkdagen Starter onboarding)
- Article schema + 3 FAQPage schema items + Person author Mustafa Agah Dogan
- 5 cross-links naar tarieven/marco/emma/ai-agent-kosten/agency-kiezen pages

`llms-full.txt` kennisbank-cluster regel toegevoegd.

---

## 3. Pricing-matrix finale state (15 mei 2026 PM)

### Marco — 4 tiers
| Tier | Prijs/mnd | Setup | Volume | Live |
|---|---|---|---|---|
| Lite | EUR 249 | EUR 0 | 50 calls | 5 dgn |
| Starter | EUR 597 | EUR 495 | 150 calls | 10 dgn |
| Groei | EUR 1.197 | EUR 795 | Onbeperkt + Emma | 7 dgn |
| Partner | Op offerte | Op offerte | Onbeperkt + custom | 14 dgn |

### Emma — 3 tiers (+ in Groei gratis)
| Tier | Prijs/mnd | Volume | Notes |
|---|---|---|---|
| Lite | EUR 49 | 500 msgs | Standaard FAQ, NL/EN |
| Standard | EUR 197 | Onbeperkt | Eigen kennisbank, native CRM |
| In Groei | EUR 0 | Onbeperkt | Bundel-tarief |

Plus Meta WhatsApp-conversatiekosten EUR 0,03-0,08 per 24-uurs venster (direct door Meta gefactureerd).

### Bundels & jaarbetaling
- Jaarbetaling: 16% korting (Lite EUR 219, Starter EUR 497, Groei EUR 997)
- AI-Website Bundel: EUR 4.950 setup + EUR 397/mnd (website + Marco + Emma)
- SEO + GEO Bundel maandelijks: EUR 1.195/mnd

---

## 4. Technische details

- Repo: `/c/Users/Hallo/OneDrive/Claude/AGA/aanloop` (Astro v5)
- Hosting: Cloudflare Pages auto-deploy ~2-3 min na master push
- Brand: KvK 88606902, Rotterdam, founder Mustafa Agah Dogan (BSc CE 2012, 20j IT, Big 4)
- Email: Brevo prod live
- Feature flags: GrowthBook self-host gb.aanloopai.nl + gb-api.aanloopai.nl op Hetzner
- Compliance: AVG/GDPR-compliant, EU-only datacenters, AES-256 at-rest, TLS 1.3 in-transit, NEN 7510 op aanvraag

### Canonieke URLs
- https://aanloopai.nl/tarieven/
- https://aanloopai.nl/tarieven/#tco
- https://aanloopai.nl/diensten/marco/
- https://aanloopai.nl/diensten/emma/
- https://aanloopai.nl/diensten/ai-website-bundel-mkb-nederland/
- https://aanloopai.nl/kennisbank/marco-emma-lite-genoeg-mkb-2026/ (NIEUW)
- https://aanloopai.nl/aanvragen/?plan=lite
- https://aanloopai.nl/aanvragen/?plan=emma-lite
- https://aanloopai.nl/aanvragen/?dienst=seo-audit
- https://aanloopai.nl/llms-full.txt

---

## 5. Pending opvolg-acties (volgende sessie)

**Direct na deploy:**
- Cloudflare Pages deploy verifieren (~12:30 PM 15 mei live)
- /tarieven/ browser-check: 4-card grid, Emma standalone, SEO/GEO grid, TCO widget
- /kennisbank/marco-emma-lite-genoeg-mkb-2026/ 200 OK + cross-links
- NotebookLM re-crawl met aangevulde llms-full.txt content
- Brevo /api/submit verifieren plan=lite + dienst=seo-* params correct ontvangt
- GA4 + GrowthBook tracking nieuwe plan/dienst events monitoren

**Strategisch (kandidaat volgende sessie):**
- Conversie A/B test: Lite-card volgorde (eerst Lite of eerst Groei?) via GrowthBook
- /diensten/seo-geo-bundel/ dedicated pillar-page (mist nog)
- /diensten/ai-receptionist-lite/ + /diensten/ai-whatsapp-lite/ landing pages voor SEO long-tail
- Email-nurture sequence "Lite trial → Starter upgrade" via Brevo (3-touch over 30 dagen)
- IndexNow-ping handmatig voor 202 pages

---

## 6. Strategische beslissingen & trade-offs

### Waarom Lite-tier de premium-positie NIET ondermijnt
- Geen setup-fee EUR 0 = geen managed-onboarding service = duidelijk inferieur aan Starter EUR 495
- Standaard callscript (geen maatwerk) = inferieur aan Starter (1 op maat) en Groei (3 op maat)
- 50 calls cap = vroege overscope-warning bij groei = natural upgrade-trigger
- Support binnen 48 uur (vs Starter 24u, Groei 4u) = duidelijk lower-tier SLA
- Live binnen 5 dagen (sneller dan Starter 10 dagen, want self-onboarding)

### Waarom Emma Lite EUR 49 (niet EUR 99)
- Boei concurrent EUR 11/mnd → moet binnen 5x prijs blijven om competitief te zijn
- 500 msgs cap = realistisch voor budget-MKB ZZP/klein-horeca/single-locatie
- Geen kennisbank import = standaard FAQ branche-template = duidelijk inferieur aan Standard

### Waarom SEO/GEO transparant gepubliceerd
- Searchlab/Appec publiceren wel = trust-verlies bij prospect die vergelijkt
- "Op offerte" voor service-pakketten = bounce-risico voor SMB
- GEO Quick Scan EUR 0 = lead-magnet voor email-capture
- SEO+GEO bundel-discount = retention-anchor (lock-in via gecombineerde rapportage)

### Waarom TCO-widget interactive (niet statisch)
- Statische claim "EUR 164k besparing 5j" was te abstract voor MKB-prospect
- Persoonlijke salaris-input + FTE-slider = self-discovered ROI = sterker dan vendor-claim
- ARIA-live = a11y-WCAG 2.2 AA compliant
- Vanilla JS = geen build-deps = onderhoudbaar

### Waarom kennisbank decision-tree (niet alleen feature-tabel)
- Decision-tree = self-qualifying lead = lager CAC dan generic CTA
- Case-types maken pricing concreet voor specifieke MKB-situaties
- Upgrade-pad uitleg pre-empts "lock-in" bezwaar
- Cross-links naar 5 verwante pages = internal-link juice voor SEO

---

## 7. NotebookLM-MCP installatie & gebruik (Windows)

### Setup-fix
```json
{
  "command": "cmd",
  "args": ["/c", "npx", "--yes", "notebooklm-mcp@latest"]
}
```
Want `npx` direct → spawn ENOENT, `npx.cmd` direct → spawn EINVAL (Node bug).

### Settings.json (om popup-login te enabelen)
Path: `%APPDATA%\notebooklm-mcp\Config\settings.json`
```json
{
  "browser": { "headless": false, "show": true, "timeout_ms": 600000 }
}
```

### Auth-flow
1. `cleanup_data(confirm: true, preserve_library: true)` — verwijderde 180MB legacy + stale browser_state
2. `setup_auth(show_browser: true, browser_options: {timeout_ms: 600000})` — opent popup, manuel Google login
3. Cookies persisted in `%LOCALAPPDATA%\notebooklm-mcp\Data\chrome_profile`

### Notebook in deze workflow
- Naam: "Aanloop Research"
- ID: `aanloop-research`
- URL: https://notebooklm.google.com/notebook/a3149ada-7422-47dd-9ada-cbcc18c30649
- Source: aanloopai.nl/llms-full.txt (handmatig toegevoegd via NotebookLM-UI)

### Bekende bugs v2.0.0
- `add_source` MCP UI selector mismatch met huidige NotebookLM UI — silent fail of "Could not open Add source dialog"
- URL-crawl direct van aanloopai.nl: blocked door Cloudflare AI-bot rule
- **Workaround:** voeg sources handmatig toe via NotebookLM-UI, of feed via /llms-full.txt URL

### Strategische gebruik
- Voor Aanloop research: feed altijd /llms-full.txt ipv homepage
- Voor competitor data: combineer NotebookLM (Aanloop's eigen content) + WebSearch (concurrent prijzen)
- NotebookLM is geen Brave Search/Exa replacement; wel sterk voor synthese over user-uploaded sources

---

## 8. User-instructie 15 mei 2026

> "Bundan sonra yaptigin herseyi notebooklm e gerekli zamanlarda kaydet bu sayede verileri oradan cekerek daha az token tuket."
>
> Vertaling: vanaf nu opslaan van sessie-data naar NotebookLM op relevante momenten. Doel: token-verbruik in toekomstige sessies verlagen door data uit NotebookLM te trekken ipv re-loading.

**Implementatie-pattern voor toekomstige sessies:**
1. Per sessie: schrijf een `developing/SESSION-YYYY-MM-DD-{slug}.md` markdown-file met volledige context
2. Push naar master (Cloudflare Pages auto-deploy)
3. NotebookLM crawlt via /llms-full.txt of handmatige UI-toevoeging
4. Volgende sessie: `ask_question` op NotebookLM voor recall ipv repo-grep

---

**Einde sessie 2026-05-15 PM.** Master HEAD: `0897c0d`. Build: 202 pages 0 errors. Cloudflare Pages auto-deploy ~12:30 PM live.

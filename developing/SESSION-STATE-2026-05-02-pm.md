# Session State — Aanloop AI — 2026-05-02 PM (extended 2026-05-03 LIVE)

**Snapshot moment:** 2026-05-03 01:10 (na "hepsini canliya al" + "push")
**Master HEAD:** **c9fcfb2** (was 4cc283e — alle 16 sprints LIVE op aanloopai.nl via Cloudflare Pages auto-deploy)

---

## 2026-05-03 01:10 — DEPLOY-BATCH MERGED + PUSHED

User commands: `hepsini canliya al` → `push`. Strategie: lokale mega-merge, build-verify, fast-forward push naar master (hook-policy stond fast-forward toe).

### Wat live is op aanloopai.nl (master c9fcfb2)
- **171 pages** (was 160) — +11 phase9 long-tail kennisbank-artikelen
- Phase 7 conversion fix-pack: contact-bug LIVE OPGELOST
- Phase 5 #3: AI citation tracker script + protocol
- Phase 10: brand monitoring setup-pack
- Pricing consistency: 42 files ge-uniformeerd naar Starter €597 / Groei €1.197 / Partner

### Mega-merge volgorde (sprint-deploy-batch-2026-05-03)
1. sprint-pricing-consistency-2026-05-03 (e2c324b) — geen sitemap, schoon
2. sprint-phase7-conversion-fixpack-2026-05-03 (73f376a) — geen sitemap
3. sprint-phase5-ai-citation-tracker-2026-05-02 (45fd29f) — geen sitemap
4. sprint-phase10-brand-monitoring-2026-05-02 (a76d6d5) — geen sitemap
5-15. 11 phase9 branches met `-X theirs` strategy
16. fix-commit c9fcfb2: 6 verloren sitemap-URLs hersteld (-X theirs gaf conflicten op deze 6, manual restore in public/sitemap.xml + image-sitemap.xml)

### Build verifie
171 pages, 0 errors. Astro build slaagde voor alle merges + sitemap-restore.

### Verifieer post-deploy (~2 min na push)
- aanloopai.nl/contact toont `hello@aanloopai.nl` + `+31 6 24 74 15 97` (KRITIEKE BUG fix LIVE)
- aanloopai.nl/prijzen toont Starter €597, Groei €1.197, Partner op maat
- aanloopai.nl/sitemap.xml bevat alle 11 nieuwe `/kennisbank/...-2026/` URLs
- aanloopai.nl/kennisbank lijst toont 11 nieuwe artikelen

### Stale sprint-branches voor opruimen (origin)
Alle 16 sprint-branches staan nog op origin maar zijn nu in master gemerged. Lijst voor cleanup:
- sprint-pricing-consistency-2026-05-03
- sprint-phase7-conversion-fixpack-2026-05-03
- sprint-phase5-ai-citation-tracker-2026-05-02
- sprint-phase10-brand-monitoring-2026-05-02
- sprint-phase9-* (11 branches)
- sprint-deploy-batch-2026-05-03 (zelf de merge-branch)

User kan deze later via `git push origin --delete <branch>` opruimen, of laten staan als history-trail.

---

# Session State — Aanloop AI — 2026-05-02 PM (extended 2026-05-03)

**Snapshot moment:** 2026-05-03 00:30 (sub-sessie /clear-resume "devam et en son kaldigin yerden")
**Master HEAD:** 4cc283e (PR #2 sprint-phase359 reeds gemerged; **15 sprint-phase9/5/7/10 PRs pending user merge**)

---

## Sub-sessie 2026-05-03 00:30 — Phase 7 conversion fix-pack (KRITIEKE LIVE BUG)

Strategische keuze: opnieuw geen kennisbank-pages (12/8 over target, sitemap-merge-conflict risico). Drie kritieke bugs en conversion-polish op `contact.astro` en `BaseLayout.astro` — beide files raken niet door pending PRs aangepast → mergebaar in elke volgorde.

### Kritieke contact-bug FIXED (was LIVE op productie)
- `mailto:hello@aanloop.ai` → `mailto:hello@aanloopai.nl` (verkeerd domein, NIET het brand-email)
- `tel:+31000000000` placeholder → `tel:+31624741597` met label "+31 6 24 74 15 97"
- "Op afspraak beschikbaar" tekst → echt nummer
- WhatsApp-CTA toegevoegd in sidebar (wa.me/31624741597)
- KvK 88606902 toegevoegd onder Rotterdam-locatie
- aria-labels op alle 3 contact-acties

### Form simplificatie (verlaagt drempel)
- `Bedrijfsnaam` van required → optioneel (ZZP-friendly, was conversion-blocker)
- `inputmode="tel"` op telefoon-veld (mobile keyboard switch)
- Email- en message-veld: `aria-describedby` + helper-hints
- Message placeholder: branche-specifiek voorbeeld i.p.v. generieke prose
- Trust signals onder submit-knop (3 micro-checkmarks: AVG/EU-server, geen verkooppraatjes, reactie binnen 1 werkdag)

### Sticky mobile CTA refinement (BaseLayout L504-560)
- Hide op `/contact` `/demo-aanvragen` `/aanvragen` `/bedankt` `/demo-bedankt` `/demo-bevestigd` `/demo-herplannen` `/demo-inplannen` (zelf de bestemming/post-submit)
- Hide op `/privacy` `/cookies` `/voorwaarden` `/sla` `/disclaimer` (geen sales-context)
- `role="region"` + aria-label op wrapper, aria-labels op CTAs, `aria-hidden focusable=false` op SVG-icons
- MutationObserver: auto-hide CTA wanneer cookie-banner zichtbaar (geen onderaan-overlap)

**Build:** 160 pages, 0 errors. Branch `sprint-phase7-conversion-fixpack-2026-05-03` (commit c55f79f).
**PR:** https://github.com/aanloopai/website/pull/new/sprint-phase7-conversion-fixpack-2026-05-03

**Phase 7 status:** sticky CTA + lead form simplificatie + AVG-trust-signals → DONE.
**Phase 7 nog OPEN:** ROI A/B testing, Stripe self-serve.

---

**Pending PRs voor user merge — 15 totaal (was 14, +1 deze sub-sessie):**

Phase 7 (1 nieuw):
- sprint-phase7-conversion-fixpack-2026-05-03 (c55f79f) — contact-bug + sticky CTA + form simplificatie

Phase 9 long-tail (12 stuks — over target 8): zie hieronder
Phase 5 + Phase 10 defensieve laag (2 stuks): zie hieronder

---

# Session State — Aanloop AI — 2026-05-02 PM

**Snapshot moment:** 2026-05-02 23:55 (sub-sessie /clear-resume "son kaldigin yerden devam et")
**Master HEAD:** 4cc283e (PR #2 sprint-phase359 reeds gemerged; 14 sprint-phase9/5/10 PRs pending user merge)

**Pending PRs voor user merge — 14 totaal:**

Phase 9 long-tail (12 stuks — over target 8):
- sprint-phase9-ai-agency-kiezen-2026-05-02 (6476060) — AI Agency Kiezen buyer guide
- sprint-phase9-automation-vergelijking-2026-05-02 (97fdb59) — 4-way Make/n8n/Zapier/PowerAutomate
- sprint-phase9-ai-hr-sollicitatie-2026-05-02 (a816e26) — HR sollicitatie-screening AVG+AI Act
- sprint-phase9-ai-m365-outlook-2026-05-02 (57b5a98) — Microsoft 365 + Outlook AI agent
- sprint-phase9-ai-google-workspace-2026-05-02 (1e74aa3) — Google Workspace + Gmail AI agent
- sprint-phase9-ai-servicedesk-it-helpdesk-2026-05-02 — IT helpdesk AI servicedesk
- sprint-phase9-ai-meertalige-klantenservice-2026-05-02 — meertalige NL+EN+DE klantenservice
- sprint-phase9-ai-cashflow-finance-forecasting-2026-05-02 — cashflow + finance forecasting
- sprint-phase9-ai-lead-scoring-b2b-sales-2026-05-02 — B2B lead scoring + sales
- sprint-phase9-ai-zorg-thuiszorg-2026-05-02 (837ce19) — zorginstelling + thuiszorg AVG/EU AI Act
- sprint-phase9-chatgpt-claude-gemini-2026-05-02 (454e1da) — ChatGPT vs Claude vs Gemini MKB

Phase 5 + Phase 10 defensieve laag (2 nieuwe — deze sub-sessie):
- sprint-phase5-ai-citation-tracker-2026-05-02 (a371804) — Node-script + protocol voor wekelijkse citation tracking
- sprint-phase10-brand-monitoring-2026-05-02 (364ab27) — 19 Google Alerts + competitor tracking + response playbook

**Build:** 167 pages na merge alle 12 phase9 PRs (kennisbank 55 -> 67). Phase 5/10 PRs raken geen sitemap dus build-count blijft gelijk.

---

## Sub-sessie 2026-05-02 23:55 — Phase 5 #3 + Phase 10 (defensieve moat)

Strategische keuze deze sub-sessie: 12 long-tail kennisbank-PRs zijn over target (12/8) en pending merge. Verdere kennisbank-articles toevoegen verhoogt sitemap-merge-conflict risico. In plaats daarvan twee defensieve sprints die volledig isolated zijn van pending PRs (geen sitemap, geen pages).

### Phase 5 #3: AI-citation tracking — DONE (was OPEN: needs API keys / manual)
- `scripts/ai-citation-tracker.cjs` — pure-Node parser, zero deps, leest manuele LLM-export markdowns en scoort op 5-tier rubric (0=geen / 1=mention / 2=link / 3=top-3 / 4=#1)
- `developing/ai-citation-tracking-protocol.md` — 12 vaste queries (head/product/solution-terms NL MKB), 5-platform workflow (ChatGPT/Claude/Perplexity/Gemini/Copilot), KPI-targets 90/180/365 dagen, regressie- en win-protocols, anti-gaming guardrails
- Smoke-test (5 synthetische samples in geheugen via node -e): mention-rate 60%, link-rate 40%, alle 5 score-tiers correct gedetecteerd (top1 op "Wij raden Aanloop AI", top3 op "1. Aanloop AI", mention only op generic prose, geen op concurrent-only antwoorden)
- Branch: `sprint-phase5-ai-citation-tracker-2026-05-02` (commit a371804)
- PR: https://github.com/aanloopai/website/pull/new/sprint-phase5-ai-citation-tracker-2026-05-02

### Phase 10: brand monitoring — DONE (was OPEN)
- `developing/brand-monitoring-setup.md` — 19 Google Alerts queries (5 brand + 3 personnel + 4 product + 4 competitor + 3 head-term), Reddit/HN/LinkedIn weekly poll-recipe, competitor-tracking CSV template, dagelijkse 5-min triage routine, wekelijkse 30-min review, negative-mention response playbook (5 categorieen), reputatie-KPIs Q1/Q2/Q4, 30-min eenmalige setup-checklist
- Branch: `sprint-phase10-brand-monitoring-2026-05-02` (commit 364ab27)
- PR: https://github.com/aanloopai/website/pull/new/sprint-phase10-brand-monitoring-2026-05-02

Beide branches afgesplitst van origin/master, geen sitemap-of-page wijzigingen, geen merge-conflict risico met de 12 phase9 PRs. Mergebaar in elke volgorde.

---

## Sub-sessie 2026-05-02 18:10 — Phase 9 #6 mei: AI agent voor Google Workspace en Gmail

Zesde long-tail kennisbank-artikel deze maand: `kennisbank/ai-agent-google-workspace-gmail-mkb-nederland.astro` (~2.000 woorden, symmetrische tegenhanger van #5 M365) gepushed naar branch `sprint-phase9-ai-google-workspace-2026-05-02` (afgesplitst van origin/master, NIET van pending feature branches).

**Inhoud:**
- Direct antwoord (Gemini for Workspace Business Standard 14 EUR voor 5-25 users, Business Plus 22 EUR met EU Data Regions, custom voor 25+)
- Wat is een AI agent in Workspace (3 hoofdroutes: Gemini for Workspace ingebakken sinds jan 2025, Apps Script + Vertex AI, n8n + Anthropic Claude EU + Gmail/Drive API)
- Gemini vs Apps Script+Vertex vs custom n8n (wanneer welke keuze + hybride aanpak)
- 6 use-cases: Gmail-triage, Calendar appointment scheduling, Meet take-notes, Drive-Q&A side-panel, Sheets Help me organize, draft-Slides/Docs
- AVG en EU AI Act sectie (Workspace Data Regions europe-west1/3/4, limited-risk classificatie, AVG art. 13/22, Gemini niet voor model-training)
- 8-stappen implementatie HowTo P10D
- ROI-berekening (45 min/dag tijdwinst per user, 21.450 EUR/maand winst bij 20 users; Business Standard ROI 75x, Business Plus 48x, custom 35x)
- Veelgemaakte fouten 1-6
- Aanloop AIs invulling (Gemini setup OF custom n8n+Claude EU+Vertex AI in europe-west4, prijsmodel)
- 8 FAQ-items over Gemini vs custom, EU Data Regions, ROI, EU AI Act, CRM-integratie

**Schemas:** Article + HowTo (8 stappen P10D) + Speakable + FAQPage (8 Q&A).
**Sitemap.xml:** +1 URL priority 0.9 (geinsert TUSSEN voice-ai-klantenservice EN wat-is-een-ai-agent — bewust een ander anker dan PR4 M365 die AAN HET EIND inserts, dus geen conflict met PR4 OF PR1-3 die bij EU AI Act inserts).
**Image-sitemap.xml:** +1 URL met Workspace+Gmail-specifieke title/caption (zelfde tussen-positie).
**Cross-links (7):** /kennisbank/ai-agent-microsoft-365-outlook-mkb-nederland/, /diensten/ai-email-assistent/, EU AI Act, AVG-compliance, AI-automatisering, ROI berekenen, gratis AI-scan.

**PR-link:** https://github.com/aanloopai/website/pull/new/sprint-phase9-ai-google-workspace-2026-05-02

**Phase 9 mei voortgang: 6/8 long-tail done.**

**Eindstand na merge alle 5 PRs:** 165 pages op origin/master (kennisbank 55 -> 60).

---

## Sub-sessie 2026-05-02 17:05 — Phase 9 #5 mei: AI agent voor Microsoft 365 en Outlook

Vijfde long-tail kennisbank-artikel deze maand: `kennisbank/ai-agent-microsoft-365-outlook-mkb-nederland.astro` (~2.000 woorden) gepushed naar branch `sprint-phase9-ai-m365-outlook-2026-05-02`.

**Inhoud:**
- Direct antwoord (Copilot voor 5-25 users, custom voor 25+ of branche-specifiek)
- Wat is een AI agent in M365 (3 hoofdroutes: Copilot, Power Automate+Azure OpenAI, n8n+Claude EU)
- Microsoft Copilot vs custom AI agent (wanneer welke keuze + hybride aanpak)
- 6 use-cases: email-triage, agenda-scheduling, Teams-transcriptie, document-Q&A, Excel-analyse, draft-PowerPoint
- AVG en EU AI Act sectie (Microsoft EU Data Boundary 2025, limited-risk classificatie, AVG art. 13/22)
- 8-stappen implementatie HowTo
- ROI-berekening (45 min/dag tijdwinst per user, 21.450 EUR/maand winst bij 20 users, terugverdientijd 1 maand)
- Veelgemaakte fouten 1-6
- Aanloop AIs invulling (Copilot setup OF custom build, prijsmodel)
- 8 FAQ-items over Copilot vs custom, EU Data Boundary, ROI, EU AI Act, CRM-integratie

**Schemas:** Article + HowTo (8 stappen P10D) + Speakable + FAQPage (8 Q&A).
**Sitemap.xml:** +1 URL priority 0.9 (geinsert AAN HET EIND van kennisbank-sectie na wat-is-een-ai-agent, expliciet om merge-conflicten met 3 eerdere pending PRs te vermijden).
**Image-sitemap.xml:** +1 URL met M365/Outlook-specifieke title/caption (zelfde end-of-section insertion).
**Cross-links (6):** /diensten/ai-email-assistent/, EU AI Act, AVG-compliance, AI-automatisering, ROI berekenen, gratis AI-scan.

**PR-link:** https://github.com/aanloopai/website/pull/new/sprint-phase9-ai-m365-outlook-2026-05-02

**Phase 9 mei voortgang: 5/8 long-tail done.**

---

## Sub-sessie 2026-05-02 16:50 — Phase 9 #4 mei: AI HR sollicitatie-screening

Vierde long-tail kennisbank-artikel deze maand: `kennisbank/ai-hr-sollicitatie-screening-avg-eu-ai-act.astro` (~2.000 woorden) gepushed naar branch `sprint-phase9-ai-hr-sollicitatie-2026-05-02`.

**Inhoud:**
- Direct antwoord (compliance-stack samenvatting plus boete-cijfers)
- Waarom HR-AI high-risk is (Annex III EU AI Act + Amazon/HireVue precedenten)
- Wat mag wel/niet (4 categorieen: toegestaan, met menselijke bevestiging, niet zonder zware compliance, verboden)
- Tool-vergelijking: Textkernel (NL Tilburg), Recruitee, HireVue, Carerix, Aanloop AI custom build
- 8-stappen compliance-checklist (use-case afbakenen, DPIA, bias-audit, human-in-the-loop, transparantie, logging, conformity assessment, EU-database registratie)
- ROI-sectie (75-85 procent tijdwinst, terugverdientijd 3-6 maanden, indirecte ROI op time-to-hire)
- Veelgemaakte fouten 1-6
- Aanloop AIs invulling (n8n + EU LLM, NL ATS-integratie, kostenmodel)
- 10 FAQ-items over AVG art. 22, EU AI Act, video-interviews, recht op uitleg

**Schemas:** Article + HowTo (8 stappen P14D) + Speakable + FAQPage (10 Q&A).
**Sitemap.xml:** +1 URL priority 0.9.
**Image-sitemap.xml:** +1 URL met custom HR-screening title/caption.
**Cross-links (6):** EU AI Act, AVG-compliance, uitzendbureau-recruitment, /diensten/ai-hr-recruitment/, AVG-checklist, gratis AI-scan.

**PR-link:** https://github.com/aanloopai/website/pull/new/sprint-phase9-ai-hr-sollicitatie-2026-05-02

Branch afgesplitst van origin/master (NIET van openstaande feature branches), dus mergebaar onafhankelijk van de andere 2 pending PRs.

**Phase 9 mei voortgang: 4/8 long-tail done.**

---

## Pending PRs voor user merge (4 totaal, in volgorde van push)
1. https://github.com/aanloopai/website/pull/new/sprint-phase9-ai-agency-kiezen-2026-05-02 (AI Agency Kiezen buyer guide)
2. https://github.com/aanloopai/website/pull/new/sprint-phase9-automation-vergelijking-2026-05-02 (4-way Make/n8n/Zapier/Power Automate)
3. https://github.com/aanloopai/website/pull/new/sprint-phase9-ai-hr-sollicitatie-2026-05-02 (AI HR sollicitatie-screening AVG+EU AI Act)
4. https://github.com/aanloopai/website/pull/new/sprint-phase9-ai-m365-outlook-2026-05-02 (AI agent voor Microsoft 365 + Outlook)

Alle vier afgesplitst van origin/master. Sitemap-conflict-strategie:
- PR1, PR2, PR3: insert na EU AI Act regel (~line 51) — kunnen conflicteren bij merge, GitHub UI lost trivial conflict op
- PR4 (M365): insert AAN HET EIND van kennisbank-sectie na wat-is-een-ai-agent — apart blok, GEEN conflict met de eerste 3

Eindstand na merge alle 4: 164 pages op origin/master (kennisbank 55 -> 59).

---

## Sub-sessie /clear-resume 2026-05-02 16:25

- Phase 9 #3 voltooid: 4-way workflow-automation buyer guide `kennisbank/make-n8n-zapier-power-automate-vergelijking-mkb-2026.astro` (~2.500 woorden) gepushed naar branch `sprint-phase9-automation-vergelijking-2026-05-02`.
- Inhoud: per-platform diepteprofiel (n8n / Make.com / Zapier / Power Automate), 14-criteria vergelijkingstabel, 3-jaars TCO concrete cijfers, use-case matching per branche (zorg, accountancy, webshop, marketing, maakindustrie, juridisch), migratie-paden, Aanloop AI advies, 12 FAQ items.
- Schemas: Article + HowTo (7 stappen P7D) + Speakable + FAQPage.
- Sitemap.xml: +1 URL priority 0.9. Image-sitemap.xml: +1 URL met custom 4-way title/caption.
- Branch afgesplitst van origin/master (NIET van pending buyer-guide branch). Beide PRs lopen nu parallel.

**PR-links openstaand voor user merge:**
1. PR (buyer-guide AI agency, eerder gepushed): https://github.com/aanloopai/website/pull/new/sprint-phase9-ai-agency-kiezen-2026-05-02
2. PR (4-way automation buyer guide, deze sub-sessie): https://github.com/aanloopai/website/pull/new/sprint-phase9-automation-vergelijking-2026-05-02

Bij merge van beide PRs sequentieel: eindstand 162 pages op origin/master.

---

## Sub-sessie 2026-05-02 16:55 — Token Optimizer plugin installed

Plugin `token-optimizer` van alexgreensh (Alexandr Green) succesvol geinstalleerd via Claude Code marketplace.

**Install commands voltooid:**
- `/plugin marketplace add alexgreensh/token-optimizer` → "Successfully added marketplace: alexgreensh-token-optimizer"
- `/plugin install token-optimizer@alexgreensh-token-optimizer` → "✓ Installed token-optimizer. Run /reload-plugins to apply."

**Beschikbare skills na install (per skills-list):**
- `token-optimizer:token-optimizer` — main audit skill: find ghost tokens, audit Claude Code or Codex setup
- `token-optimizer:token-dashboard` — opens dashboard, collects latest session data
- `token-optimizer:token-coach` — context window coach met proactive guidance voor token-efficient sessions
- `token-optimizer:fleet-auditor` — audit token waste across agent systems
- `token-optimizer:health` — check running Claude Code/Codex sessions, find zombies
- `token-optimizer:quick` — 10-second context health check met quality score

**Volgende stappen na /reload-plugins:**
1. `/reload-plugins` om de skills te activeren
2. `/plugin` → Marketplaces tab → `alexgreensh-token-optimizer` → enable auto-update (eenmalig, cruciaal)
3. `/token-optimizer` voor 6-agent interactive audit
4. (optioneel) `python3 measure.py setup-daemon` voor live dashboard op `http://localhost:24842/token-optimizer`

**Reden install:** sessions worden lang en duur (vooral met SEO sprint sessies, multiple subagent calls, full kennisbank artikel writes). Token-optimizer identificeert bloated configs, ongebruikte skills, dubbele system prompts, stale memory en compaction-loss (60-70% per compaction). Lokaal, zero context tokens, zero runtime dependencies.

---

## /clear-resume protocol — bijgewerkt 2026-05-02 16:55

1. Lees deze SESSION-STATE-2026-05-02-pm.md eerst
2. Lees `developing/MASTER-PLAN-NL1-2026-05-02.md` voor full execution context
3. Check of beide pending PRs gemerged zijn:
   - PR (AI agency buyer guide) — sprint-phase9-ai-agency-kiezen-2026-05-02
   - PR (4-way automation) — sprint-phase9-automation-vergelijking-2026-05-02
4. Run `/reload-plugins` (eerste actie na /clear) zodat token-optimizer skills actief zijn
5. Optioneel: run `/token-optimizer:quick` voor 10-second health check op huidige sessie
6. Kies volgende sprint candidate uit lijst hierboven
7. Maak feature branch met naam `sprint-<phase>-<topic>-<date>` vanaf origin/master (NIET vanaf openstaande feature branches)
8. Werk zoals normaal, build-test verifieren, commit per logische unit
9. Push branch (geen direct master push wegens hook policy)
10. PR-link aan user geven, user mergt
11. Update deze SESSION-STATE bij sluiting van sessie

---

## TL;DR voor /clear-resume

Phase 0 Cloudflare AI bot block is volledig opgelost (PR #2 gemerged). Sprint Phase 9 #2-alt (buyer guide "AI Agency Kiezen Nederland 2026 — 12 Selectiecriteria voor MKB", commit 6476060) is gepusht en wacht op user merge via PR-link `https://github.com/aanloopai/website/pull/new/sprint-phase9-ai-agency-kiezen-2026-05-02`. Na merge: Cloudflare Pages auto-deploy. Volgende sprint kan daarna direct beginnen — kies uit "Volgende sprint candidates" hieronder.

### Sub-sessie /clear-resume 2026-05-02 15:10

- Pivot weg van Phase 9 #2 origineel ("AI prijs vergelijking 197 vs 497 vs 1297"): bestaande `ai-prijzen-vergelijking-mkb-2026.astro` (2026-05-01) en `n8n-vs-make-com.astro` dekken al pricing en n8n vs Make. De "197/497/1297" framing klopt ook niet met actuele tarieven (Starter 597/mnd, Growth 1.197/mnd, Partner custom).
- Nieuwe high-impact category-defining buyer guide geschreven voor head-term "AI bureau Nederland": `src/pages/kennisbank/ai-agency-kiezen-mkb-nederland-2026.astro` (~2.500 woorden).
- Inhoud: 12 selectiecriteria, 8 red flags, scoringskaart, Aanloop AI's eigen antwoord op elk criterium, 4-stappen vervolgactie.
- Schemas: Article + HowTo (12-stappen P5D) + Speakable + FAQPage (12 Q&A).
- 8 cross-links naar /tarieven, /team/daan-verhoeven, /gratis-ai-scan, kennisbank-vergelijking-pages.
- Sitemap.xml: +1 URL priority 0.9. Image-sitemap.xml: +1 URL met custom title/caption.
- Build: 161 pages 0 errors. Branch pushed naar origin.

---

## Wat is afgerond deze sessie (2026-05-02 PM)

### Phase 0: Cloudflare AI bot block — VOLLEDIG OPGELOST

User heeft Cloudflare dashboard adımen succesvol uitgevoerd:

1. AI Bot Block toggle: OFF (Security -> Bots)
2. Bot Fight Mode: OFF
3. Cache rule /robots.txt -> Bypass cache: actief
4. Cloudflare Managed robots.txt: OFF (in nieuwe UI Security -> Settings -> "Manage robots.txt", niet onder Scrape Shield zoals oude docs zeggen)

**Live verificatie (2026-05-02 11:50):**

```bash
curl -A "GPTBot/1.0" https://aanloopai.nl/                  # 200 OK (was 403)
curl -A "GPTBot/1.0" https://aanloopai.nl/robots.txt        # 200 OK + alleen onze 16-bot Allow-list
```

robots.txt content nu (live):
- User-agent: * Allow:/ (met 7 admin-paden Disallow)
- 16 expliciete AI/LLM crawler Allow:/ entries (GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot, Bytespider, meta-externalagent, Bingbot, etc.)
- Sitemaps: /sitemap.xml + /image-sitemap.xml
- llms.txt + llms-full.txt referentie
- Geen "BEGIN Cloudflare Managed Content" blok meer

### Sprint 27+ commits (PR #2 gemerged)

**`4c562bc` — Phase 3 Tier B: image-sitemap regeneratie**
- public/image-sitemap.xml: 10 -> 149 entries (1137 inserts, 38 deletes, 54 KB)
- 153 sitemap-URLs gedekt (skip /privacy, /cookies, /sla, /voorwaarden, /disclaimer)
- Per-URL title + caption op basis van URL-pattern (locaties / vergelijk / kennisbank / glossarium / sectoren / diensten / pillars / other)
- Specifieke OG-images uit /og/ folder voor 10 hub-pages, fallback naar og-image-default.png

**`023996f` — Phase 5 #2: FAQ uitgebreid**
- src/pages/veelgestelde-vragen.astro: 20 -> 58 Q&A in 11 categorieen
- 6 nieuwe categorieen toegevoegd voor conversational AI-citation:
  - "Hoe begin ik?" (6 vragen)
  - "AI per Sector" (8 vragen — advocaten, webshop, zorg, horeca, accountancy, makelaar, tandarts, ZZP)
  - "Beslissing & Selectie" (6 vragen — Marco vs Emma, vs callcenter, vs chatbot)
  - "Werking & Capaciteit" (7 vragen — fouten, 24/7, talen, emoties, urgentie)
  - "Comparison & Alternatieven" (5 vragen — Watermelon, Voiceflow, n8n, Make/Zapier, ChatGPT direct)
  - "Toekomst & Schaalbaarheid" (4 vragen)
- 2 nieuwe vragen in bestaande Privacy & AVG (EU AI Act + training-data)
- BaseLayout.faqSchema gerendert FAQPage JSON-LD over alle 58 items

**`54f40bd` — Phase 9 #1 mei: EU AI Act kennisbank artikel**
- src/pages/kennisbank/eu-ai-act-mkb-nederland-2026.astro (~2.400 woorden)
- 4 schemas: Article + HowTo (8 stappen) + Speakable + FAQPage (6 Q&A)
- Sitemap.xml: priority 0.9 (hot 2026 topic)
- Image-sitemap.xml: kennisbank OG entry
- Targeted keywords: "EU AI Act MKB", "AI Act compliance Nederland", "AI Act boetes", "AI literacy verplicht", "EU AI Act deadline 2026"

---

## Push workflow (BELANGRIJK voor volgende sessie)

Hook policy in deze omgeving blokkeert direct push naar master ("Pushing directly to master bypasses pull request review"). Workflow voor elke nieuwe sprint:

```bash
# 1. Maak feature branch
git -C "C:\Users\Hallo\OneDrive\Claude\AGA\aanloop" checkout -b sprint-NAME-DATE

# 2. Commits zoals normaal

# 3. Push branch (niet master)
git push -u origin sprint-NAME-DATE

# 4. PR aan user geven via UI-link
# https://github.com/aanloopai/website/pull/new/sprint-NAME-DATE

# 5. User merge via GitHub UI (1 klik) -> Cloudflare Pages auto-deploy
```

`gh` CLI niet beschikbaar in deze omgeving, github MCP plugin authentication mist. PR-link methode is de werkende route.

---

## Master plan voortgang (per 2026-05-02 PM)

| Phase | Status |
|---|---|
| Phase 0: Cloudflare AI block | DONE 2026-05-02 |
| Phase 1: Content expansion | DONE prior sprint |
| Phase 2: Schema | DONE prior sprint |
| Phase 3 Tier B: favicon | DONE prior |
| Phase 3 Tier B: image-sitemap | DONE deze sessie |
| Phase 3 Tier B: hreflang en/de | OPEN |
| Phase 3 Tier B: Lighthouse audit | OPEN |
| Phase 4: press kit | DONE prior |
| Phase 4: Wikipedia draft | READY (wacht op 3+ media-citaties) |
| Phase 4: Capterra/G2/GetApp | PREP DONE (user-track invullen) |
| Phase 5: llms-full.txt | DONE prior |
| Phase 5: conversational Q&A 50+ | DONE deze sessie |
| Phase 5: AI-citation tracking | OPEN (needs API keys of manual) |
| Phase 6: GBP / Bing / Apple | OPEN (USER-TRACK) |
| Phase 7: Conversion (ROI A/B, lead form) | OPEN |
| Phase 8: Video / YouTube / podcast | OPEN |
| Phase 9: Content velocity (8 long-tail mei) | 1/8 DONE deze sessie |
| Phase 10: Defensive moat | OPEN |

---

## Volgende sprint candidates (volgorde van impact)

### ~~1. Phase 9 #2: AI prijs vergelijking 197 vs 497 vs 1297~~ — VERVALLEN
Bestaande `ai-prijzen-vergelijking-mkb-2026.astro` dekt dit al; framing klopt niet met actuele tarieven.

### ~~2. Phase 9 #3: Make.com vs n8n vs Zapier vs Power Automate~~ — DONE 2026-05-02 16:25
Voltooid in branch `sprint-phase9-automation-vergelijking-2026-05-02` (commit 97fdb59). ~2.500 woorden 4-way buyer guide met TCO + branche-matching. Wacht op user merge.

### 3. Phase 3: hreflang en/de prototype
Begin met 1 dienst-page (bv /diensten/marco/). Voeg `<link rel="alternate" hreflang="...">` tags toe + maak /en/diensten/marco/ + /de/diensten/marco/ stubs. Test sitemap.xml hreflang notation. Daarna bulk-implementatie.

### 4. Phase 5 #3: AI-citation tracking script (basic)
Zonder API keys: schrijf shell-/node-script dat manual export van ChatGPT/Claude/Perplexity antwoorden parseert (markdown input -> JSON met telling). User runt wekelijks 4 standaard queries en voegt antwoorden in. Script telt brand-mentions per platform.

### 5. Phase 10: brand monitoring setup
Google Alerts queries voor: "Aanloop AI", "aanloopai.nl", "Daan Verhoeven", "Marco AI receptionist", "Emma AI bot". Plus competitor tracking spreadsheet (Watermelon, Chatlayer, Belsimpel, Trengo). Plus Reddit-monitoring queries.

---

## User-actions wachtend (parallel-track)

1. Capterra NL listing invullen via developing/listings-copy-pack.md (assets klaar)
2. G2 NL listing invullen
3. GetApp NL listing invullen
4. Phase 6 GBP claim — Rotterdam adres, KvK 88606902 (vereist user-account)
5. Phase 4 backlink outreach Tier-1 emails — templates klaar
6. Phase 8 YouTube channel setup (kan parallel met assistant video-scripts)

---

## Continuity guardrails (NOOIT wijzigen)

- Theme: bg-midnight, text-pearl, navy, slate, accent-band
- Brand: KvK 88606902, Rotterdam, hello@aanloopai.nl, +31 6 24741597
- Voice: Nederlands, B2B MKB, prijzen vanaf 197 euro per maand
- robots.txt: alle 16 AI bots Allow:/ + Cloudflare Managed Content UIT (nooit weer aan)
- Datacenter: EU-only (Frankfurt of Amsterdam)
- Author: Daan Verhoeven Person schema in elke artikel/pillar/vergelijk

---

## Existing assets (continuity)

- 160 pages, 0 build errors (Astro static site op Cloudflare Workers)
- Content: 55 kennisbank, 80 glossarium, 30 locaties, 16 diensten, 9 vergelijk, 4 pillars
- Schemas: HowTo (10+), Speakable (40), Article (overal), Person (Daan Verhoeven), Organization, LocalBusiness (locaties), Course (avg-checklist), Dataset (branche-statistieken)
- Files: llms.txt (49 entries), llms-full.txt (367 lines), RSS feed, security.txt, humans.txt, image-sitemap.xml (149), sitemap.xml (153), robots.txt (16-bot Allow)
- FAQ: 58 Q&A in 11 categorieen op /veelgestelde-vragen/ + per-page FAQPage schema waar relevant

---

## /clear resume protocol

1. Lees deze SESSION-STATE-2026-05-02-pm.md eerst
2. Lees daarna `developing/MASTER-PLAN-NL1-2026-05-02.md` voor full execution context
3. Kies uit "Volgende sprint candidates" hierboven
4. Maak feature branch met naam `sprint-<phase>-<topic>-<date>`
5. Werk zoals normaal, build-test verifieren, commit per logische unit
6. Push branch (geen direct master push wegens hook policy)
7. PR-link aan user geven, user mergt
8. Update deze SESSION-STATE bij sluiting van sessie

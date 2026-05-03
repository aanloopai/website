# Autonomous Site-Improvement Agent — 4 Architectures

**Datum:** 2026-05-03
**Doel:** Continuous improvement loop op aanloopai.nl zonder dat user/Claude Code session iedere keer manueel triggert.
**Voorwaarde:** User goedkeuring vereist voor implementatie — dit document is een *beslismatrix*, geen go-signaal.

---

## TL;DR — Onze aanbeveling

**Hybride model: GitHub Actions (gepland) + dedicated VPS Claude Code daily runner.**

- **GitHub Actions** voert *non-LLM* checks dagelijks uit (Lighthouse, broken links, schema validation, sitemap diff, position-tracking via Search Console API) en opent issues bij regressies.
- **VPS Claude Code daily runner** (Hetzner CX22 €4/mnd of bestaande hardware) draait `/loop autonomous` één keer per dag — pakt openstaande issues, schrijft fix-PRs, mergt zelfstandig naar master als build groen is.
- **Cost:** ~€4-15/mnd VPS + ~€20-60/mnd Claude API tokens (= 1-2 PRs/dag, varieert met scope).
- **Veiligheid:** Beperkte action-scope via repo-level GitHub permissions, build-gated merge, weekly user-review van auto-merged commits.
- **Time-to-deploy:** 1-2 dagen voor V1, ~1 week tot stable.

Detail per optie hieronder.

---

## Optie 1 — GitHub Actions + Anthropic API (cron schedule)

**Architectuur:**
```
GitHub Actions cron (e.g. "0 6 * * *") →
  workflow.yml runt Node script →
    Node script roept Anthropic Messages API met prompt:
      "Look at site state, propose 1 improvement, output diff" →
    Script commit + push naar `auto-improve-YYYY-MM-DD` branch →
    PR opent automatisch →
    User merged manueel (of separate workflow auto-merged op groen build)
```

**Voordelen:**
- Geen eigen infrastructuur — alles op GitHub
- Built-in audit log (workflow runs zichtbaar in GH UI)
- Claude API direct toegang (geen Claude Code overhead)
- Eenvoudig op te zetten (~200 regels YAML + 100 regels TS)

**Nadelen:**
- GH Actions limit: 2000 free min/mnd (private repo) — ruim voldoende voor 1x/dag
- GH Actions runners hebben geen filesystem persistence — moet alles in 1 run doen
- Anthropic API direct is minder krachtig dan Claude Code: geen Skill-tool, geen Plan tool
- Beperkt tot single-shot prompts (geen multi-turn agent flow)

**Cost:**
- GH Actions: gratis (we zitten ruim onder limiet)
- Anthropic API: ~$0.50-2 per run met Sonnet 4.6, dagelijks = €15-60/mnd
- Totaal: **~€15-60/mnd**

**Use cases:**
- Schema validation + auto-fix
- Sitemap update na content-toevoegingen
- Lighthouse-regressie alert + simpele fixes
- Position-drop alert (Search Console API)

**Geschiktheid:** ⭐⭐⭐⭐ — Beste balans simpel/krachtig voor 80% van de use cases.

---

## Optie 2 — VPS / Server met Claude Code daemon

**Architectuur:**
```
Hetzner CX22 VPS (€4/mnd) of bestaande hardware →
  cron: "0 6 * * *" runt:
    cd /repo && git pull
    claude code --headless "/loop autonomous content-improvement"
  Claude Code session:
    - Leest GEO audit report
    - Plant 1-3 verbeteringen
    - Schrijft code, runt build
    - Bij groen: git commit + push origin master
    - Bij rood: opent issue met diagnostiek
```

**Voordelen:**
- Volledige Claude Code feature set (Skills, Plan mode, Tool orchestration, Background agents)
- Multi-step agent flows mogelijk (research → plan → implement → verify)
- Persistence: `/memory` blijft tussen runs
- Skill library (geo-audit, code-review, etc.) direct beschikbaar
- Lokale tooling (npm, git, build) zonder cold-start

**Nadelen:**
- VPS-onderhoud (security patches, monitoring)
- Claude Code subscription kost (vs API direct)
- Iets meer setup-werk

**Cost:**
- VPS: €4/mnd (Hetzner CX22 — 2 vCPU, 4GB RAM, voldoende voor Astro build)
- Claude Code: $20/mnd (Pro plan) — voldoende voor 1x/dag
- Totaal: **~€22-25/mnd**

**Use cases:**
- Alles van Optie 1, plus:
- Multi-step research + implementatie (e.g. "schrijf nieuw kennisbank-artikel over X")
- A/B testing setup
- Auto-respond op GitHub issues
- Periodieke geo-audit + actie

**Geschiktheid:** ⭐⭐⭐⭐⭐ — Onze aanbeveling als primary loop.

---

## Optie 3 — Cloudflare Worker (scheduled fetch + AI Workers)

**Architectuur:**
```
Cloudflare Worker met cron trigger →
  Worker draait JS:
    Fetch GSC API voor positie-data
    Fetch live site voor schema check
    Bij regressie: dispatch Anthropic API call
    Resultaat: webhook naar GitHub om PR te openen
```

**Voordelen:**
- Same hosting platform als site (Cloudflare Pages)
- Goedkoop op kleine schaal (gratis tier voldoet vaak)
- Geen separate infrastructuur

**Nadelen:**
- Worker timeout 30s (dus geen lange agent flows)
- Workers AI (eigen Cloudflare LLM) is minder capabel dan Claude
- Geen filesystem (voor build/test)

**Cost:**
- CF Workers: gratis tier (100k requests/dag)
- AI calls: ~€10-20/mnd
- Totaal: **~€10-20/mnd**

**Use cases:** Real-time monitoring + alerting (niet uitvoeren).

**Geschiktheid:** ⭐⭐⭐ — Goed als *trigger laag* voor Optie 1/2. Niet zelfstandig krachtig genoeg.

---

## Optie 4 — Renovate-bot stijl (open source agent)

**Voordelen:** Reactive (niet alleen scheduled), GitHub-geïntegreerd.
**Nadelen:** Veel boilerplate, niet de juiste fit voor "site-content improvement".
**Cost:** €4-10/mnd hosting + variabel + 1-2 weken dev-tijd.
**Geschiktheid:** ⭐⭐ — Overkill voor MKB SEO-loop. Skip.

---

## Aanbevolen V1 Architecture (hybride)

```
┌──────────────────────────────────────────────────────────────────┐
│  Daily 06:00 NL — GitHub Actions cron                            │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 1. Lighthouse run op homepage + 5 key pages              │    │
│  │ 2. Schema.org validator op same pages                     │    │
│  │ 3. Broken link check                                      │    │
│  │ 4. Sitemap diff vs prior day                              │    │
│  │ 5. Search Console API: position changes >5 spots          │    │
│  │ → Open GitHub issues bij regressie                        │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  Daily 07:00 NL — Hetzner VPS Claude Code runner                 │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 1. cd /repo && git pull origin master                     │    │
│  │ 2. claude code "Pak openstaande issues, prioriteer P0,    │    │
│  │    schrijf fixes, runt build, bij groen push naar master" │    │
│  │ 3. Bij rood: open detail-issue met diagnostiek            │    │
│  │ 4. Cloudflare Pages deployt automatisch op push           │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  Weekly Sunday 18:00 NL — User review                            │
│  - Read auto-merged commits van afgelopen week                   │
│  - Revert ongewenste changes manueel                             │
│  - Goedkeuring voor scope-uitbreiding                            │
└──────────────────────────────────────────────────────────────────┘
```

**Rollen-scheiding:**
- GH Actions = "monitoring & alerting" (geen wijzigingen)
- VPS Claude Code = "implementatie & deploy" (wijzigingen, build-gated)
- User = "veto + scope-control" (wekelijks)

---

## Veiligheid (kritiek!)

1. **Build-gate verplicht:** Geen push naar master zonder groen build (`npm run build` exit 0).
2. **Scope-flag:** `.claude/AUTOPILOT-ALLOWED-SCOPES.md` lijst wat agent mag aanraken (bijv. *kennisbank/, src/data/seo*, NIET src/components/Header.astro). User update wekelijks.
3. **Theme-guard preserved:** Hook in pre-commit weigert wijzigingen aan brand-color tokens, KvK-string, telefoonnummer.
4. **Slack/email notification** op iedere auto-merge — user kan binnen 1 uur revert sturen.
5. **Hard limit:** max 3 commits/dag van bot. Bij meer: pauzeer + wacht op user input.
6. **Read-only first week:** Eerste 7 dagen schrijft bot ALLEEN PRs, geen auto-merge. User keurt manueel goed.

---

## Beslismatrix

| Vraag aan user | Mijn advies |
|---|---|
| Hosting voor runner? | Hetzner CX22 (€4/mnd) — schoon en goedkoop |
| Schedule frequency? | 1x/dag start, schaal omhoog naar 2-3x als stabiel |
| Auto-merge of altijd PR? | Eerste 2 weken alleen PRs; daarna auto-merge op groen build mits scope binnen toegestane lijst |
| Anthropic Pro of API direct? | Pro plan ($20/mnd) voor Claude Code feature set |
| Eerste taak voor bot? | "Schrijf 1 nieuw kennisbank-artikel per week op basis van trending NL MKB AI-zoekwoorden" |

---

## Volgende stappen (na user goedkeuring)

**V1 (eerste week):**
1. VPS huren + setup
2. Claude Code installeren + repo klonen + auth
3. Cron job schrijven
4. GitHub Actions workflow `daily-monitoring.yml` toevoegen
5. Eerste handmatige run + observatie

**V2 (week 2-4):**
1. Search Console API koppelen
2. Auto-PR scope uitbreiden
3. Auto-merge unlock op stabiel gedrag
4. Slack/email notificaties

**V3 (maand 2+):**
1. Multi-task agent (kennisbank + schema + linkbuilding)
2. Wekelijkse rapport-generator
3. Competitor monitoring (auto-detecteren rank-shifts)

---

**Beslissing nodig van user:**
1. ✅ Welke architecturele optie? (mijn advies: hybride V1 = Optie 1 + Optie 2)
2. ✅ Budget cap (€/mnd) acceptabel?
3. ✅ Eerste taak-scope (kennisbank-artikelen, schema-fixes, of beide)?
4. ✅ Auto-merge na week 2 OK, of altijd manueel mergen?
5. ✅ Op welke VPS provider (Hetzner / DigitalOcean / eigen hardware)?

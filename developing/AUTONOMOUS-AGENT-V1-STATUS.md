# Autonomous Agent — V1 Implementation Status

**Datum:** 2026-05-03
**Status:** V1 SHIPPED — read-only monitoring layer live op master
**Volgende stap:** V2 (LLM implementation-layer op Hetzner VPS) — wachtend op 5 user-decisions

---

## V1 — Wat is gedeployd vandaag

### 1. Live-site audit script — `scripts/agent/audit-live-site.cjs`

Zero-deps Node 20+ script (ingebouwde `fetch`). Test 4 categorieën tegen production:

| Categorie | Wat het checkt | Aantal pages |
|-----------|----------------|--------------|
| schema | JSON-LD aanwezig + correct type per page | 7 |
| robots | 13 AI-bot Allow:/ regels in robots.txt + geen global Disallow | 1 |
| pricing | Stale prijzen (€297/€397/€497/€697/€797/€897) op commerciële pages | 5 |
| critical | Brand-name, telefoon, email, KvK aanwezig waar verwacht | 3 |

**CLI:**
```bash
node scripts/agent/audit-live-site.cjs              # alle checks
node scripts/agent/audit-live-site.cjs --schema     # alleen één categorie
node scripts/agent/audit-live-site.cjs --json       # alleen JSON-output
BASE_URL=https://staging.aanloopai.nl node scripts/agent/audit-live-site.cjs
```

**Exit codes:** 0 = pass / 1 = regressie / 2 = fatal.

### 2. GitHub Actions workflow — `.github/workflows/daily-site-audit.yml`

- **Cron:** dagelijks 04:00 UTC (06:00 NL winter / 06:00 NL zomer)
- **Manueel:** workflow_dispatch via GitHub UI
- **Wat het doet:**
  1. Checkout repo
  2. Run audit script
  3. Bij regressie: open GitHub issue (label `autonomous-audit` + `regression`) — dedupliceert door bestaand open issue te herkennen + commenten
  4. Bij pass: sluit eerder geopende open audit-issues automatisch
  5. Upload artifacts (audit-output.txt + audit-summary.json) — 30 dagen retention

- **Permissions:** `contents:read` + `issues:write` (geen code-write toegang)
- **Cost:** GH Actions free tier (2000 min/mnd private) — 1 run/dag = ~3-5 min/run = ~150 min/mnd → ruim binnen tier

### 3. Scope-contract — `.claude/AUTOPILOT-ALLOWED-SCOPES.md`

V2-agent contract: ALLOWED paths (kennisbank/glossarium/data/llms.txt) en FORBIDDEN paths (Header/Footer/styles/wrangler/secrets) + forbidden token-strings (KvK 88606902, telefoon, email, brand-colors). Hard limits: max 3 commits/dag door agent, max 50 lines per commit, geen force-push, build-gated merges.

V2-agent leest dit op elke run (post `git pull`). Wijzigingen door user; agent doet geen self-modification.

---

## V1 audit-baseline — eerste run resultaat (2026-05-03 22:24)

Script vond op live aanloopai.nl **3 regressies van de 30 checks**:

1. **`/tarieven/` ontbreekt Product schema** — gevonden `[Organization, ProfessionalService, WebSite, BreadcrumbList, FAQPage, ItemList]`. Sprint C zei dit toegevoegd te hebben (commit 9a2292c) — verificatie nodig.
2. **`/diensten/emma/` heeft stale `€397` prijs** — Sprint fixpack heeft Emma gemist tijdens pricing-cleanup.
3. **`Claude-User` AI-bot ontbreekt in robots.txt** — Anthropic launchde dit als aparte bot. Toevoegen is defensieve fix.

→ Eerste 3 todo's voor V2 agent zodra die live gaat. Tot dan kan user manueel oppakken.

---

## V2 — Wachtend op user-decisions (5 vragen uit AUTONOMOUS-AGENT-PLAN.md)

| # | Decisie | Mijn advies | Status |
|---|---------|-------------|--------|
| 1 | Welke architectuur? | Hybride V1+V2 = GH Actions monitoring + Hetzner VPS Claude Code daemon | **Wachtend** |
| 2 | Budget cap (€/mnd)? | €0 V1 (GH Actions free) + €20-25/mnd V2 (bestaande Hetzner VPS = €0 incremental + Claude Code Pro €20) | **Wachtend** |
| 3 | Eerste task-scope? | Conservatief: triage audit-issues, schrijf fix-PRs voor allowed-scope alleen. NIET nieuwe kennisbank-artikelen V2 (uitstellen V3) | **Wachtend** |
| 4 | Auto-merge na week 2? | Ja, mits build-gate + theme-guard pre-commit hook werkt + dossier van handmatige reviews stabiel | **Wachtend** |
| 5 | VPS provider? | Bestaande Hetzner ubuntu-4gb-nbg1-1 (178.104.100.94) — al draaiend voor GrowthBook, geen incremental cost | **Wachtend** |

**Aanvullende user-acties voor V2 deploy:**

- [ ] `ANTHROPIC_API_KEY` toevoegen aan Hetzner VPS environment
- [ ] Claude Code installeren op Hetzner VPS (`/opt/aanloop-agent/`)
- [ ] Cron job activeren (`0 7 * * *` na GH Actions)
- [ ] Slack/email webhook voor auto-merge notifications
- [ ] User-decision over auto-merge unlock-criterium

---

## V3 — Toekomst (maand 2+, ná V2 stabilisatie)

- Multi-task agent (kennisbank-write + schema-fix + competitor-monitoring parallel)
- Wekelijkse rapport-generator (V1 audit-output → markdown report → email user)
- Search Console API integratie (positie-tracking + auto-alert op rank-drop >5 spots)
- Competitor monitoring (auto-detecteer rank-shifts via SerpApi of GSC)
- Lighthouse-regressie alerts in V1 audit (vereist Chrome runner — nu skipped wegens complexiteit)

---

## Veiligheid & rollback

- **V1 is read-only:** workflow opent alleen issues, schrijft geen code. Volledig safe to ship.
- **V2 wordt build-gated:** agent kan NIET pushen zonder groene `npm run build`.
- **Theme-guard hook (V2):** pre-commit weigert wijzigingen aan brand-tokens (zie `.claude/AUTOPILOT-ALLOWED-SCOPES.md`).
- **Notification (V2):** Slack/email op iedere auto-merge — user kan binnen 1 uur revert.
- **Pause-switch:** verwijder GH Actions cron of `chmod -x` van VPS-cron pauzeert agent direct.
- **Rollback V1:** `git revert` van V1 commit verwijdert workflow + script — geen residuele state.

---

## Resume-instructie

**V2 starten?** Lees:
1. `developing/AUTONOMOUS-AGENT-PLAN.md` — full architectuur met 4 opties
2. Dit bestand voor V1 status
3. `.claude/AUTOPILOT-ALLOWED-SCOPES.md` — scope-contract
4. `aanloop_growthbook_infra.md` (memory) — Hetzner VPS detail

**5 user-decisions hierboven** moeten beantwoord voordat V2-implementatie start.

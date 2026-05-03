# Autopilot Allowed Scopes — V2 Autonomous Agent Contract

**Purpose:** This file defines what the V2 autonomous Claude Code agent (Hetzner VPS daemon, scheduled daily) **MAY** and **MUST NOT** modify when triaging audit-issues opened by the V1 monitoring layer (`.github/workflows/daily-site-audit.yml`).

**Author/Reviewer:** Daan Verhoeven (user). Review wekelijks elke zondag 18:00 NL.
**Status:** V1 = monitoring only (read-only); this contract activates bij V2 deploy (TBD).
**Last updated:** 2026-05-03

---

## ALLOWED — agent mag hier autonomously fix-PRs schrijven

### Content (lage risico)
- `src/pages/kennisbank/**` — kennisbank-artikelen (nieuw + bestaand inhoudsupdates)
- `src/pages/glossarium/**` — glossarium-entries
- `src/pages/locaties/**` — locatie-pagina inhoud (NIET schema, NIET telefoon/adres)
- `src/data/**` — JSON/YAML data files (FAQ, sector-info, etc.)
- `public/llms.txt`, `public/llms-full.txt` — AI-citation grounding
- `public/robots.txt` — alleen Allow:/ regels voor nieuwe AI-bots toevoegen (NIET Disallow)

### Schema fixes (medium risico)
- `src/layouts/BaseLayout.astro` schema-blokken — alleen Add/Update, NIET Delete
- Per-page `<schema>` JSON-LD blocks — toevoegen ontbrekende velden

### SEO meta
- Per-page `title`, `description`, `ogImage` props
- Sitemap-priority adjustments

---

## FORBIDDEN — agent MAG NIET wijzigen

### Brand-identity (theme guards)
- `src/styles/**` brand-color tokens: `bg-midnight`, `text-pearl`, `navy`, `slate`, `accent-band`, `brand-indigo`, `brand-emerald`
- Logo-bestanden in `public/images/aanloop-*`
- `tailwind.config.cjs` color-config

### Critical content strings
- KvK 88606902 — nooit wijzigen
- `hello@aanloopai.nl` — nooit wijzigen
- `+31 6 24 74 15 97` / `+31624741597` — nooit wijzigen
- "Aanloop AI" brand-name spelling — nooit wijzigen
- "Daan Verhoeven" Person author — nooit wijzigen
- Adres "Rotterdam" — nooit wijzigen

### Pricing
- `€597` (Starter) / `€1.197` (Groei) / `€1.497+` (Partner) — alleen na user-decision
- Forbidden om oude prijzen `€297/€397/€497/€697/€797/€897` te herintroduceren

### Infra & secrets
- `wrangler.toml` — Cloudflare deploy config
- `package.json` dependencies — geen npm install/uninstall
- `.github/workflows/**` — alleen user mag CI wijzigen
- `functions/api/submit.js` — Brevo email handler (kritieke business logic)
- `src/worker.js` — same reason
- `src/lib/growthbook.ts` — A/B-test infrastructure
- Alle `*.env*` files
- Alle bestanden onder `developing/` (user-strategie docs)

### Layout & navigation
- `src/components/Header.astro` — sitewide nav
- `src/components/Footer.astro` — sitewide footer
- `src/layouts/BaseLayout.astro` — alleen schema-toevoegingen, géén structurele wijzigingen
- `src/pages/index.astro` (homepage) — alleen content-edits in al-bestaande secties

### Mock-content guards (master plan beslissing 2)
- Géén AggregateRating schema toevoegen (geen klantreviews)
- Géén fake testimonials of klant-cases met cijfers
- Géén logo's van bedrijven die geen klant zijn

---

## Limits (hard caps)

- **Max 3 commits/dag** door agent. Bij meer: pauzeer + open user-review issue.
- **Max 50 lines wijziging per commit** in een single file. Grotere wijzigingen vereisen user-PR.
- **Geen merges naar master** zonder groene `npm run build` exit 0.
- **Geen force-push, geen git reset --hard, geen branch delete**.
- **Auto-merge alleen voor allowed-scope wijzigingen** met groene build én geen forbidden-token detectie via theme-guard hook.

## Read-only periode (eerste 14 dagen na V2 deploy)

Agent opent ALLEEN PRs, geen auto-merge. User mergt manueel na review. Auto-merge unlock bij user-decision na 14 dagen + dossier van weekly reviews.

---

## Pre-commit theme-guard checks (V2 hook)

Voordat agent commitset, valideer:
1. Geen wijziging in `src/styles/**` (forbidden path)
2. Diff bevat geen forbidden-strings (KvK, telefoon, email, brand colors)
3. `npm run build` exit 0
4. Geen `package.json` of `.env` wijzigingen
5. Commit message format: `feat(scope): ...` / `fix(scope): ...` met `[autonomous-agent]` suffix

## Escalatie-paden

| Situatie | Actie |
|----------|-------|
| Audit-issue raakt forbidden-scope | Agent comment: "scope-blocked, user input nodig" |
| Build faalt 2 runs op rij | Agent pauzeert + opent issue tag `agent-blocked` |
| User-decision flag in issue | Agent skipt + comment "wachtend op user" |
| Onbekende foutpatronen | Agent pauzeert + escalation issue |

---

## Wijzigingsprocedure

User update dit bestand en commit naar master. Agent leest fresh kopie elk run (`git pull` eerst). Geen agent-self-modification van dit bestand.

Bij scope-uitbreiding: PR via user, niet via agent.

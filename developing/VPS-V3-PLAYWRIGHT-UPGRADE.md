# VPS V3 Runtime-Audit Upgrade — SSH-instructies

**Status:** READY-TO-EXECUTE — kopieer-plak SSH-commando's
**Why:** V3 runtime-audit (Playwright) draait nu alleen via GitHub Actions (cron 05:00 UTC). VPS V2 agent kan ook V3 runnen voor 2× detectie-coverage en lokale fix-cycle integratie. Vereist Chromium-binary op `/opt/aanloop-agent/website`.
**Datum:** 2026-05-04
**Estimated tijd:** 10-15 minuten
**Veiligheid:** alle commando's zijn read/install — geen destructieve operaties

---

## Pre-flight check

Voordat je begint, verifieer:
- [ ] V3 audit-script lokaal getest (commit `9ae9c1d` op master)
- [ ] V1 cron op VPS draait stabiel (geen failures laatste 7 dagen)
- [ ] SSH key beschikbaar: `C:\Users\Hallo\.aanloop-agent\id_ed25519`
- [ ] VPS heeft minstens 2GB vrije schijfruimte voor Chromium binary

---

## Stap 1 — SSH naar VPS

Vanuit Windows PowerShell of Git Bash:

```bash
ssh -i /c/Users/Hallo/.aanloop-agent/id_ed25519 root@178.104.100.94
```

(Bij Windows-only PowerShell zonder Git Bash: `ssh -i C:\Users\Hallo\.aanloop-agent\id_ed25519 root@178.104.100.94`)

---

## Stap 2 — Disk space check

```bash
df -h /opt
```

Verwacht: minimaal 2GB beschikbaar in `/opt`-volume voor Chromium (~500MB binary + 1.5GB cache).

---

## Stap 3 — Sync website-clone met laatste master

V3 audit-script (`scripts/agent/audit-runtime.cjs`) zit in commit `9ae9c1d`. VPS-clone moet bijgewerkt:

```bash
cd /opt/aanloop-agent/website
git fetch origin master
git log HEAD..origin/master --oneline
```

Verwacht (minimum): commits `8ba0084` en `9ae9c1d` ahead. Pull:

```bash
git pull origin master
```

Verifieer:
```bash
ls -la scripts/agent/audit-runtime.cjs && cat .github/workflows/daily-runtime-audit.yml | head -3
```

---

## Stap 4 — npm dependencies update

```bash
cd /opt/aanloop-agent/website
npm ci 2>&1 | tail -5
```

Dit installeert Playwright als devDep (`^1.59.1`) plus Astro-build dependencies. Tijd: 30-60 sec.

---

## Stap 5 — Chromium browser installeren

**Belangrijk:** Linux Chromium vereist system-libraries (libnss3, libxss1, etc.). Gebruik `--with-deps` om die mee te installeren via `apt-get`:

```bash
cd /opt/aanloop-agent/website
npx playwright install --with-deps chromium 2>&1 | tail -10
```

Wat dit doet:
- `apt-get update` (snel)
- Installeert system-libs: libnss3, libnspr4, libatk1.0-0, libatk-bridge2.0-0, libcups2, libdrm2, libxkbcommon0, libxcomposite1, libxdamage1, libxfixes3, libxrandr2, libgbm1, libpango-1.0-0, libcairo2, libasound2t64
- Downloadt Chromium binary (~150MB compressed, ~500MB uncompressed) naar `/root/.cache/ms-playwright/`
- Tijd: 2-4 minuten afhankelijk van bandbreedte

---

## Stap 6 — Lokale runtime-audit test op VPS

```bash
cd /opt/aanloop-agent/website
node scripts/agent/audit-runtime.cjs 2>&1 | tail -30
```

Verwacht (op huidige live-site): **23/23 PASS, 20-25s duration, exit 0**.

Als FATAL chromium launch failed:
- Check binary path: `ls -la /root/.cache/ms-playwright/chromium-*/chrome-linux/chrome`
- Re-install: `npx playwright install chromium --force`
- Check missing libs: `ldd /root/.cache/ms-playwright/chromium-*/chrome-linux/chrome | grep "not found"`

---

## Stap 7 — Cron-entry voor V3 op VPS

Open crontab:

```bash
crontab -e
```

Voeg toe direct ná de bestaande V2 cron-regel (06:00 UTC). De bestaande regel zal eruitzien als:

```cron
0 6 * * * cd /opt/aanloop-agent/website && set -a && . /opt/aanloop-agent/.env && set +a && /usr/local/bin/node scripts/agent/run-autonomous.cjs >> /var/log/aanloop-agent.log 2>&1
```

Voeg toe (07:00 UTC zodat V3 ná V2 fix-cycle draait):

```cron
0 7 * * * cd /opt/aanloop-agent/website && set -a && . /opt/aanloop-agent/.env && set +a && /usr/local/bin/node scripts/agent/audit-runtime.cjs >> /var/log/aanloop-runtime-audit.log 2>&1
```

Save + exit (Ctrl+X, Y, Enter in nano).

Verifieer:
```bash
crontab -l | grep -E "(autonomous|runtime)"
```

Verwacht 2 regels: V2 (06:00) + V3 (07:00).

---

## Stap 8 — Logrotate voor V3 log

```bash
cat > /etc/logrotate.d/aanloop-runtime-audit << 'EOF'
/var/log/aanloop-runtime-audit.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
EOF
```

Verifieer:
```bash
logrotate -d /etc/logrotate.d/aanloop-runtime-audit
```

---

## Stap 9 — Eerste handmatige run (logging-validation)

```bash
cd /opt/aanloop-agent/website && set -a && . /opt/aanloop-agent/.env && set +a && /usr/local/bin/node scripts/agent/audit-runtime.cjs >> /var/log/aanloop-runtime-audit.log 2>&1
echo "exit-code: $?"
tail -30 /var/log/aanloop-runtime-audit.log
```

Verwacht:
- exit-code: `0` (alle checks pass)
- Log toont 23/23 PASS + JSON-summary

---

## Stap 10 — V2 agent integratie (optioneel V3.1)

V2 `run-autonomous.cjs` orchestrator kan ook V3-failures als input krijgen. Voor V3.0 simpliciteit blijven V2 (06:00) en V3 (07:00) onafhankelijke crons. Voor V3.1 toekomst: V2 leest beide audit-output JSONs als gecombineerde failure-set.

---

## Failure modes V3 op VPS

| Wat | Wat agent doet |
|-----|----------------|
| Chromium launch fail | Exit 2, log error → eerstvolgende cron probeert opnieuw |
| Playwright timeout op URL | Per-URL fail in JSON, andere URLs blijven draaien |
| Live-site 5xx error | Per-URL fail, geen escalatie zonder duurzame patroon |
| Console errors gefilterd door noise-patterns | Stille pass — by design |
| Daily-cap 3 commits bereikt | V2 stopt; V3 draait alleen audit (geen commits) |

V3 zelf doet **geen commits** — V3 is read-only audit-laag. V2 orchestrator-cron is de enige laag die git mag wijzigen. Dit is een veiligheidsbarrière.

---

## Rollback (als V3 problemen geeft)

Disable V3-cron zonder uninstall:

```bash
crontab -l | grep -v "audit-runtime.cjs" | crontab -
```

V1 + V2 blijven draaien. Re-enable later met `crontab -e` en de regel uit Stap 7 opnieuw toevoegen.

Voor volledige uninstall (Chromium binary verwijderen, ~500MB vrijmaken):

```bash
rm -rf /root/.cache/ms-playwright
rm /etc/logrotate.d/aanloop-runtime-audit
```

---

## Monitoring na deploy

### Daily-check (eerste 7 dagen)

```bash
# Eergisteren-log inzien
tail -50 /var/log/aanloop-runtime-audit.log

# Check exit-codes laatste 3 runs
grep -E "(Failures|exit-code)" /var/log/aanloop-runtime-audit.log | tail -10
```

### Wekelijks-check

```bash
# Alle audit-runs deze week
zcat -f /var/log/aanloop-runtime-audit.log* | grep "audit_type" | tail -7
```

### GitHub-issue cross-check
- VPS V3 detecteert lokaal én GitHub Actions V3 detecteert vanuit cloud — beide kunnen issues openen
- Issue-label: `autonomous-runtime` (zie `.github/workflows/daily-runtime-audit.yml`)
- Wekelijkse user-review: `gh issue list --label autonomous-runtime --state all` op laptop

---

## Verwachte impact

- **2× detectie-coverage** voor browser-runtime regressies — zowel cloud (GitHub Actions) als VPS-cron
- **Lokale audit-output** in `/var/log/aanloop-runtime-audit.log` voor diepere debugging zonder GitHub Actions logs te downloaden
- **V3.1 unlock:** V2 orchestrator kan in toekomst V3-failures consumeren voor multi-task fix-cycle
- **Geen extra cost** — Hetzner VPS is fixed-cost, 7-min audit/dag is ~0.5% CPU-tijd

---

## Vervolgstappen na V3 op VPS

1. **GitHub Actions monitoring** — controleer of dagelijkse cron 05:00 UTC succesvol runt op github.com/aanloopai/website/actions
2. **Issue triage** — eerste week handmatig reviewen of `autonomous-runtime` issues echte regressies zijn of noise (filter-tuning kan nodig zijn)
3. **V2 V3.1 upgrade** — `scripts/agent/run-autonomous.cjs` aanpassen om óók runtime-summary.json te lezen voor combined fix-cycle (deferred — niet nu)
4. **Lighthouse CI integratie (V3.2 toekomst)** — perf/a11y/SEO score-tracking naast runtime errors

---

**SSH disconnect na test:**
```bash
exit
```

**Estimated total tijd:** 10-15 minuten end-to-end. Eerste cron-run de dag erna 07:00 UTC.

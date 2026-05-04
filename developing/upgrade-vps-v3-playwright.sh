#!/usr/bin/env bash
#
# upgrade-vps-v3-playwright.sh — VPS V3 Runtime-Audit Upgrade (idempotent)
#
# Usage on VPS (after SSH):
#   curl -sSL https://raw.githubusercontent.com/aanloopai/website/master/developing/upgrade-vps-v3-playwright.sh | bash
# OR copy this file naar /tmp/upgrade.sh en run:
#   bash /tmp/upgrade.sh
#
# Wat het doet (alle stappen uit VPS-V3-PLAYWRIGHT-UPGRADE.md geconsolideerd):
#   1. Disk-space check (>= 2GB vrij in /opt)
#   2. git pull master in /opt/aanloop-agent/website
#   3. npm ci
#   4. playwright install --with-deps chromium
#   5. lokale audit-test (verwacht 23/23 PASS)
#   6. crontab append (07:00 UTC V3) — alleen als regel niet bestaat
#   7. logrotate config schrijven
#   8. eerste handmatige run met logging
#
# Veiligheidsbarrière: V3 doet geen git-commits. V2 (06:00) blijft enige laag die git mag wijzigen.
# Rollback: zie VPS-V3-PLAYWRIGHT-UPGRADE.md sectie "Rollback".

set -euo pipefail

WEBSITE_DIR=/opt/aanloop-agent/website
ENV_FILE=/opt/aanloop-agent/.env
LOG_FILE=/var/log/aanloop-runtime-audit.log
LOGROTATE_CONF=/etc/logrotate.d/aanloop-runtime-audit
CRON_LINE="0 7 * * * cd ${WEBSITE_DIR} && set -a && . ${ENV_FILE} && set +a && /usr/local/bin/node scripts/agent/audit-runtime.cjs >> ${LOG_FILE} 2>&1"

echo "=== STEP 1: Disk-space check ==="
df -h /opt | head -2
AVAIL_KB=$(df -k /opt | awk 'NR==2 {print $4}')
if [ "${AVAIL_KB}" -lt 2097152 ]; then
  echo "FATAL: minder dan 2GB vrij in /opt (${AVAIL_KB} KB). Abort."
  exit 1
fi
echo "OK: voldoende ruimte."

echo ""
echo "=== STEP 2: git pull master ==="
cd "${WEBSITE_DIR}"
git fetch origin master
echo "Commits ahead:"
git log HEAD..origin/master --oneline | head -10 || true
git pull origin master
test -f scripts/agent/audit-runtime.cjs || { echo "FATAL: audit-runtime.cjs not found after pull."; exit 1; }

echo ""
echo "=== STEP 3: npm ci ==="
npm ci 2>&1 | tail -5

echo ""
echo "=== STEP 4: Chromium + system-libs install ==="
npx playwright install --with-deps chromium 2>&1 | tail -10

echo ""
echo "=== STEP 5: lokale audit-test (verwacht 23/23 PASS, exit 0) ==="
if node scripts/agent/audit-runtime.cjs 2>&1 | tail -30; then
  echo "OK: audit-runtime test passed."
else
  echo "FATAL: audit-runtime test failed. Inspect output hierboven."
  exit 1
fi

echo ""
echo "=== STEP 6: crontab append (idempotent) ==="
if crontab -l 2>/dev/null | grep -qF "audit-runtime.cjs"; then
  echo "Cron-regel bestaat al — skip."
else
  (crontab -l 2>/dev/null || true; echo "${CRON_LINE}") | crontab -
  echo "Cron-regel toegevoegd: ${CRON_LINE}"
fi
echo "Huidige crontab (autonomous + runtime regels):"
crontab -l | grep -E "(autonomous|runtime)" || echo "(geen)"

echo ""
echo "=== STEP 7: logrotate config ==="
cat > "${LOGROTATE_CONF}" << 'LOGROTATE_EOF'
/var/log/aanloop-runtime-audit.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
LOGROTATE_EOF
logrotate -d "${LOGROTATE_CONF}" > /dev/null 2>&1 && echo "OK: logrotate config valid."

echo ""
echo "=== STEP 8: eerste handmatige run met logging ==="
cd "${WEBSITE_DIR}"
set -a; . "${ENV_FILE}"; set +a
/usr/local/bin/node scripts/agent/audit-runtime.cjs >> "${LOG_FILE}" 2>&1
EXIT_CODE=$?
echo "Eerste run exit-code: ${EXIT_CODE}"
echo "Laatste 30 regels van log:"
tail -30 "${LOG_FILE}"

echo ""
echo "============================================="
echo "DONE. V3 runtime-audit is live op VPS."
echo "Eerstvolgende cron-run: morgen 07:00 UTC."
echo "Monitor: tail -f ${LOG_FILE}"
echo "============================================="

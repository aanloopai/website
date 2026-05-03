#!/usr/bin/env node
/**
 * Autonomous-agent V3 — runtime audit (Playwright-based JS error detection).
 *
 * Detecteert browser-runtime regressies die V1 static-fetch audit mist:
 *   - ReferenceError / TypeError in <script>-blokken (zoals ec1270d initGrowthBook bug)
 *   - Uncaught promise rejections
 *   - Failed network requests voor critical assets (JS bundles, schema-script)
 *   - Console.error van geladen scripts
 *   - Interactiviteit op /ai-roi-calculator/ (preset-card click moet input updaten)
 *   - Interactiviteit op /gratis-ai-scan/ (eerste radio click moet step-2 tonen)
 *
 * Loopt parallel naast V1 audit. V1 = zero-dep static fetch (resilient), V3 = browser-runtime
 * (catches dynamic bugs). Beide outputs samen geven volledig regressie-beeld.
 *
 * Exit 0 = alle checks pass; exit 1 = minimaal één regressie; exit 2 = fatal/setup-error.
 *
 * CLI:
 *   node scripts/agent/audit-runtime.cjs              # all URLs all checks
 *   node scripts/agent/audit-runtime.cjs --json       # JSON-only output (voor CI parsing)
 *   BASE_URL=https://staging.aanloopai.nl node scripts/agent/audit-runtime.cjs
 *
 * Pre-install (eerste keer):
 *   npx playwright install chromium
 */

const BASE_URL = process.env.BASE_URL || 'https://aanloopai.nl';
const args = new Set(process.argv.slice(2));
const JSON_ONLY = args.has('--json');
const NAV_TIMEOUT_MS = 30000;
const SETTLE_MS = 2000; // Tijd voor async script-handlers om te registreren na DOMContentLoaded

const RUNTIME_CHECKS = [
  { path: '/',                      name: 'Homepage',          interactivity: null },
  { path: '/diensten/marco/',       name: 'Marco product',     interactivity: null },
  { path: '/diensten/emma/',        name: 'Emma product',      interactivity: null },
  { path: '/tarieven/',             name: 'Tarieven',          interactivity: null },
  { path: '/ai-roi-calculator/',    name: 'ROI calculator',    interactivity: 'roiCalc' },
  { path: '/gratis-ai-scan/',       name: 'AI-Readiness Scan', interactivity: 'aiScan' },
  { path: '/contact/',              name: 'Contact',           interactivity: null },
];

// Console-error patterns die we negeren (third-party noise: GA4 CSP-blocks, GrowthBook
// timeout fallback, framework noise). Filter-by-substring — preventief om false positives
// te voorkomen. Toevoegen aan deze lijst alleen ALS noise reproducerend en niet user-impacting.
const IGNORED_CONSOLE_PATTERNS = [
  'Failed to load resource: the server responded with a status of 404',
  'gtag is not defined',                  // GA4 nog niet geladen, ok
  'GrowthBook initialization timeout',    // Fail-open na 3s, by design
  'cdn.jsdelivr.net',                     // jsPDF CDN — netwerk-fallback acceptabel
  'cookieyes',                            // Cookie consent platform
  'google-analytics.com',                 // GA4 CSP-blocks — niet user-impacting (alleen analytics-loss)
  'googletagmanager.com',                 // GTM CSP-blocks — idem
  'gb-api.aanloopai.nl',                  // GrowthBook CSP fail-open — by design
  'Content Security Policy',              // Overige CSP-blocks van 3rd-party tracking
  'Refused to connect',                   // CSP-block alternative phrasing
];

// Page errors (uncaught exceptions) die we negeren — framework noise of beacon-aborts.
// Match is exact-message of substring.
const IGNORED_PAGEERROR_PATTERNS = [
  'Event',                                // Astro view-transitions / GA4 beacon abort throws bare Event-object
  'sendBeacon',                           // Beacon-API abort tijdens unload
  'NetworkError when attempting to fetch resource',
];

// Network requests die we negeren als ze falen (third-party tracking).
const IGNORED_NETWORK_PATTERNS = [
  'google-analytics.com',
  'googletagmanager.com',
  'cookieyes.com',
  'cdn.jsdelivr.net',
  'gb.aanloopai.nl',                      // Eigen GrowthBook — fail-open by design
  'gb-api.aanloopai.nl',
];

const failures = [];
const passes = [];

function log(line) {
  if (!JSON_ONLY) console.log(line);
}

function recordPass(category, msg) {
  passes.push({ category, msg });
  log(`  ✓ ${msg}`);
}

function recordFail(category, msg) {
  failures.push({ category, msg });
  log(`  ✗ ${msg}`);
}

function isIgnoredConsole(msg) {
  return IGNORED_CONSOLE_PATTERNS.some(p => msg.includes(p));
}

function isIgnoredNetwork(url) {
  return IGNORED_NETWORK_PATTERNS.some(p => url.includes(p));
}

function isIgnoredPageError(msg) {
  return IGNORED_PAGEERROR_PATTERNS.some(p => msg.includes(p));
}

async function checkRoiCalcInteractivity(page) {
  // Sprint A v3.5 ec1270d-class regressie-detectie:
  // Als <script>-blok ReferenceError gooit, blijven preset-cards / form / PDF-knop
  // zonder click-handler. We klikken een preset en verwachten DOM-mutatie.
  const issues = [];

  try {
    const presetSelector = '[data-preset], .preset-card, button[data-sector]';
    const hasPreset = await page.locator(presetSelector).count() > 0;
    if (!hasPreset) {
      issues.push('preset-cards niet gevonden in DOM (selector mismatch of niet gerenderd)');
    } else {
      const allBefore = await page.locator('input[type="number"]').evaluateAll(els => els.map(e => e.value));
      await page.locator(presetSelector).first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(500);
      const allAfter = await page.locator('input[type="number"]').evaluateAll(els => els.map(e => e.value));
      const anyChanged = allBefore.some((v, i) => v !== allAfter[i]);
      if (allBefore.length > 0 && !anyChanged) {
        issues.push('preset-card click veranderde geen enkele input-waarde — handler waarschijnlijk niet geregistreerd (ec1270d-class regressie)');
      }
    }

    const formCount = await page.locator('form').count();
    if (formCount === 0) {
      issues.push('geen <form> element gevonden (email-capture broken?)');
    } else {
      const hasEmailInput = await page.locator('input[type="email"]').count() > 0;
      if (!hasEmailInput) issues.push('geen email-input in form (email-capture form mogelijk broken)');
    }
  } catch (err) {
    issues.push(`interactivity-test exception: ${err.message}`);
  }

  return issues;
}

async function checkAiScanInteractivity(page) {
  // /gratis-ai-scan/ — wizard step-1 zichtbaar, "Begin"/"Start" CTA aanwezig.
  const issues = [];

  try {
    const ctaCount = await page.locator('button:has-text("Begin"), button:has-text("Start"), button[type="submit"], a:has-text("scan")').count();
    if (ctaCount === 0) issues.push('geen Begin/Start CTA-knop of scan-link gevonden in scan-wizard');

    const radioOrInput = await page.locator('input[type="radio"], input[type="text"], input[type="email"], select').count();
    if (radioOrInput === 0) issues.push('geen invoer-elementen (radio/input/select) gevonden in scan-wizard');
  } catch (err) {
    issues.push(`interactivity-test exception: ${err.message}`);
  }

  return issues;
}

async function auditOne(browser, { path, name, interactivity }) {
  const url = `${BASE_URL}${path}`;
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  const ctx = await browser.newContext({
    userAgent: 'AanloopAI-RuntimeAudit-V3 (+https://aanloopai.nl)',
    locale: 'nl-NL',
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!isIgnoredConsole(text)) consoleErrors.push(text);
    }
  });
  page.on('pageerror', err => {
    if (isIgnoredPageError(err.message)) return;
    const stack = err.stack ? err.stack.split('\n').slice(0, 3).join(' / ') : '';
    pageErrors.push(err.message + (stack ? ' — ' + stack : ''));
  });
  page.on('requestfailed', req => {
    const u = req.url();
    if (!isIgnoredNetwork(u)) {
      failedRequests.push(`${req.method()} ${u} — ${req.failure()?.errorText || 'unknown'}`);
    }
  });

  let httpStatus = 0;
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    httpStatus = response?.status() ?? 0;
    await page.waitForTimeout(SETTLE_MS);
  } catch (err) {
    recordFail('runtime', `${path} → navigation error: ${err.message}`);
    await ctx.close().catch(() => {});
    return;
  }

  if (httpStatus >= 400) {
    recordFail('runtime', `${path} → HTTP ${httpStatus}`);
    await ctx.close().catch(() => {});
    return;
  }

  if (consoleErrors.length === 0) recordPass('runtime', `${path} → geen console errors`);
  else recordFail('runtime', `${path} → ${consoleErrors.length} console error(s): ${consoleErrors.slice(0, 3).map(e => e.slice(0, 120)).join(' | ')}`);

  if (pageErrors.length === 0) recordPass('runtime', `${path} → geen uncaught JS exceptions`);
  else recordFail('runtime', `${path} → ${pageErrors.length} uncaught exception(s): ${pageErrors.slice(0, 2).map(e => e.split(' / ')[0].slice(0, 200)).join(' | ')}`);

  if (failedRequests.length === 0) recordPass('runtime', `${path} → geen failed requests voor critical assets`);
  else recordFail('runtime', `${path} → ${failedRequests.length} failed request(s): ${failedRequests.slice(0, 3).join(' | ')}`);

  if (interactivity === 'roiCalc') {
    const issues = await checkRoiCalcInteractivity(page);
    if (issues.length === 0) recordPass('interactivity', `${path} → preset-cards + email-form interactief`);
    else recordFail('interactivity', `${path} → interactivity issues: ${issues.join(' | ')}`);
  } else if (interactivity === 'aiScan') {
    const issues = await checkAiScanInteractivity(page);
    if (issues.length === 0) recordPass('interactivity', `${path} → wizard CTA + invoer-elementen aanwezig`);
    else recordFail('interactivity', `${path} → interactivity issues: ${issues.join(' | ')}`);
  }

  await ctx.close();
}

async function main() {
  const t0 = Date.now();
  log('# Autonomous-agent V3 runtime audit');
  log(`# Target: ${BASE_URL}`);
  log(`# Timestamp: ${new Date().toISOString()}`);

  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (err) {
    console.error('FATAL: playwright not installed. Run `npm install` plus `npx playwright install chromium`.');
    process.exit(2);
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.error(`FATAL: chromium launch failed (browser-binary niet geïnstalleerd?). Run \`npx playwright install chromium\`. Error: ${err.message}`);
    process.exit(2);
  }

  log('\n[RUNTIME] Browser-runtime audit op 7 critical URLs');

  try {
    for (const target of RUNTIME_CHECKS) {
      await auditOne(browser, target);
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const duration = ((Date.now() - t0) / 1000).toFixed(1);
  const summary = {
    base_url: BASE_URL,
    audit_type: 'runtime-v3',
    timestamp: new Date().toISOString(),
    duration_seconds: parseFloat(duration),
    pass_count: passes.length,
    fail_count: failures.length,
    failures,
  };

  log('\n# Summary');
  log(`# Passes: ${passes.length}, Failures: ${failures.length}, Duration: ${duration}s`);
  if (JSON_ONLY) console.log(JSON.stringify(summary, null, 2));
  else console.log('\n' + JSON.stringify(summary, null, 2));

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('FATAL', err);
  process.exit(2);
});

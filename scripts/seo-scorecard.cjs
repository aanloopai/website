#!/usr/bin/env node
// SEO Scorecard — free Ahrefs/Semrush-style site health scoring for aanloopai.nl.
// Runs the existing audit scripts, aggregates their JSON output into 5 weighted
// categories and a single 0-100 SEO Health Score.
//
// Usage:
//   node scripts/seo-scorecard.cjs                 (uses dist/, fast)
//   node scripts/seo-scorecard.cjs --check-external (also live-checks ext links)
//   node scripts/seo-scorecard.cjs --psi           (also runs PageSpeed audit)
//
// Requires a prior "npm run build" so dist/ exists.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = __dirname;
const CHECK_EXTERNAL = process.argv.includes('--check-external');
const RUN_PSI = process.argv.includes('--psi');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(SCRIPTS, file), 'utf8'));
  } catch {
    return null;
  }
}

function run(label, cmd) {
  process.stdout.write(`  · ${label} ... `);
  try {
    execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'ignore', 'ignore'] });
    console.log('ok');
    return true;
  } catch {
    console.log('FAILED (skipped)');
    return false;
  }
}

// clamp 0-100
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

if (!fs.existsSync(path.join(ROOT, 'dist'))) {
  console.error('No dist/ — run "npm run build" first.');
  process.exit(1);
}

console.log('=== AANLOOPAI SEO SCORECARD ===\n');
console.log('Running audits:');
run('content audit (titles/descriptions)', 'node scripts/seo-audit.cjs');
run('schema validator', 'node scripts/seo-schema-validator.cjs');
run('orphan audit', 'node scripts/seo-orphan-audit.cjs');
run(
  CHECK_EXTERNAL ? 'link integrity (+ live external)' : 'link integrity',
  `node scripts/seo-link-integrity.cjs${CHECK_EXTERNAL ? ' --check-external' : ''}`
);
if (RUN_PSI) run('pagespeed audit', 'node scripts/seo-pagespeed-audit.cjs');
console.log('');

const audit = readJson('seo-audit-output.json');
const schema = readJson('seo-schema-validator-output.json');
const links = readJson('seo-link-integrity-output.json');
const orphan = readJson('seo-orphan-output.json');
const psi = readJson('seo-pagespeed-output.json');

const categories = [];

// ── 1. Technical (titles, descriptions, sitemap sync) — weight 20 ──
{
  const totalPages = audit?.rows?.length || 1;
  // Severity-weighted, like Ahrefs/Semrush: notices < warnings < errors.
  // Title/description length overruns are NOTICES (Google just truncates display).
  // Missing description + sitemap desync are real WARNINGS.
  const weighted =
    (audit?.titleTooLong?.length || 0) * 0.3 +
    (audit?.descTooLong?.length || 0) * 0.3 +
    (audit?.descTooShort?.length || 0) * 0.6 +
    (audit?.descNone?.length || 0) * 2 +
    (audit?.indexableNotInSitemap?.length || 0) * 1.5 +
    (audit?.noindexInSitemap?.length || 0) * 1.5;
  const score = audit ? clamp(100 - (weighted / totalPages) * 100 * 1.3) : 0;
  categories.push({
    key: 'Technical',
    weight: 20,
    score,
    detail: audit
      ? `${audit.titleTooLong.length} lange titels, ${audit.descTooLong.length} lange desc, ${audit.descNone.length} zonder desc, ${audit.indexableNotInSitemap.length} niet in sitemap, ${audit.noindexInSitemap.length} noindex in sitemap`
      : 'seo-audit output ontbreekt',
  });
}

// ── 2. Structured data — weight 25 ──
{
  const errs = schema?.errorCount ?? null;
  const totalSchemas = schema?.totalSchemas || 1;
  // 1 error per 100 schemas ~= -8 pts
  const score = errs === null ? 0 : clamp(100 - (errs / totalSchemas) * 100 * 8);
  categories.push({
    key: 'Schema',
    weight: 25,
    score,
    detail:
      errs === null
        ? 'schema-validator output ontbreekt'
        : `${errs} schema-fouten op ${totalSchemas} JSON-LD blokken (${schema.pagesAudited} pagina's)`,
  });
}

// ── 3. Links (internal + external) — weight 25 ──
{
  const brokenInt = links?.brokenInternal?.length || 0;
  const brokenExt = links?.brokenExternal?.length || 0;
  const checkedExt = links?.externalUrlsChecked || 0;
  // internal breaks are severe (-12 each), external moderate (-3 each)
  const score = links ? clamp(100 - brokenInt * 12 - brokenExt * 3) : 0;
  categories.push({
    key: 'Links',
    weight: 25,
    score,
    detail: links
      ? `${brokenInt} kapotte interne links, ${brokenExt} kapotte externe links` +
        (checkedExt ? ` (${checkedExt} extern gecontroleerd)` : ' (extern niet live-gecheckt — gebruik --check-external)')
      : 'link-integrity output ontbreekt',
  });
}

// ── 4. Content / internal-link depth (orphans) — weight 15 ──
{
  const trueOrphans = orphan?.trueOrphans?.length || 0;
  const ctxOrphans = orphan?.contextualOrphans?.length || 0;
  // true orphans (zero inbound) are warnings; contextual orphans (few inbound) are notices
  const score = orphan ? clamp(100 - trueOrphans * 5 - ctxOrphans * 1) : 0;
  categories.push({
    key: 'Content/Orphans',
    weight: 15,
    score,
    detail: orphan
      ? `${trueOrphans} echte orphans, ${ctxOrphans} contextuele orphans van ${orphan.totalPages} pagina's`
      : 'orphan-audit output ontbreekt',
  });
}

// ── 5. Performance (PageSpeed) — weight 15 ──
{
  let score = null;
  let detail = 'PSI niet gedraaid — gebruik --psi';
  const r = psi?.results?.[0];
  if (r && (r.mobile || r.desktop)) {
    const m = r.mobile?.performance ?? r.mobile?.scores?.performance;
    const d = r.desktop?.performance ?? r.desktop?.scores?.performance;
    const vals = [m, d].filter((v) => typeof v === 'number');
    if (vals.length) {
      // PSI scores may be 0-1 or 0-100
      const norm = vals.map((v) => (v <= 1 ? v * 100 : v));
      score = clamp(norm.reduce((a, b) => a + b, 0) / norm.length);
      detail = `PSI performance gemiddeld ${score} (mobile/desktop)`;
    }
  }
  categories.push({ key: 'Performance', weight: 15, score, detail });
}

// ── Weighted total (reweight to skip categories with no data) ──
const scored = categories.filter((c) => c.score !== null);
const totalWeight = scored.reduce((s, c) => s + c.weight, 0) || 1;
const total = clamp(scored.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight);

function grade(n) {
  if (n >= 90) return 'A — uitstekend';
  if (n >= 80) return 'B — goed';
  if (n >= 70) return 'C — voldoende';
  if (n >= 55) return 'D — zwak';
  return 'F — kritiek';
}

function bar(n) {
  if (n === null) return '   n/a';
  const filled = Math.round(n / 5);
  return '[' + '#'.repeat(filled) + '-'.repeat(20 - filled) + ']';
}

console.log('──────────────────────────────────────────────────────────────');
console.log(' Categorie          Gewicht  Score');
console.log('──────────────────────────────────────────────────────────────');
for (const c of categories) {
  const s = c.score === null ? ' n/a' : String(c.score).padStart(4);
  console.log(` ${c.key.padEnd(18)} ${String(c.weight + '%').padStart(5)}  ${s}  ${bar(c.score)}`);
  console.log(`   ${c.detail}`);
}
console.log('──────────────────────────────────────────────────────────────');
console.log(` SEO HEALTH SCORE: ${total}/100   ${grade(total)}`);
console.log('──────────────────────────────────────────────────────────────');

const out = {
  generatedAt: new Date().toISOString(),
  total,
  grade: grade(total),
  categories: categories.map((c) => ({ key: c.key, weight: c.weight, score: c.score, detail: c.detail })),
};
fs.writeFileSync(path.join(SCRIPTS, 'seo-scorecard-output.json'), JSON.stringify(out, null, 2));
console.log('\nOutput: scripts/seo-scorecard-output.json');

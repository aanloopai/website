#!/usr/bin/env node
// SEO Autofix — applies the SAFE, deterministic SEO fixes and reports the rest.
// Pairs with seo-scorecard.cjs. Default is dry-run; pass --apply to write.
//
// Auto-fixable (applied with --apply):
//   · sitemap desync  -> regenerate public/sitemap.xml via build-sitemap.cjs
//
// Report-only (needs human judgement — never auto-edited):
//   · titles > 60 chars, descriptions > 160 / missing
//   · broken external links
//   · orphan pages
//   · structured-data errors that are not centralised in BaseLayout
//
// Usage:
//   node scripts/seo-autofix.cjs            dry-run, report only
//   node scripts/seo-autofix.cjs --apply    apply the safe fixes
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = __dirname;
const APPLY = process.argv.includes('--apply');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(SCRIPTS, file), 'utf8'));
  } catch {
    return null;
  }
}

const audit = readJson('seo-audit-output.json');
const schema = readJson('seo-schema-validator-output.json');
const links = readJson('seo-link-integrity-output.json');
const orphan = readJson('seo-orphan-output.json');

console.log('=== AANLOOPAI SEO AUTOFIX ===');
console.log(APPLY ? 'MODE: --apply (writing changes)\n' : 'MODE: dry-run (no changes — pass --apply to write)\n');

const applied = [];
const manual = [];

// ── AUTO-FIX 1: sitemap desync ────────────────────────────────────
{
  const desync =
    (audit?.indexableNotInSitemap?.length || 0) +
    (audit?.noindexInSitemap?.length || 0) +
    (audit?.sitemapOnlyUrls?.length || 0);
  if (APPLY) {
    try {
      execSync('node scripts/build-sitemap.cjs', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] });
      applied.push(`Sitemap geregenereerd (was ${desync} desync-issue${desync === 1 ? '' : 's'}).`);
    } catch (e) {
      manual.push(`Sitemap-regeneratie MISLUKT: ${e.message}`);
    }
  } else if (desync > 0) {
    console.log(`AUTO-FIXABLE  Sitemap desync: ${desync} pagina(s) — wordt opgelost door build-sitemap.cjs`);
  }
}

// ── REPORT: titles too long ───────────────────────────────────────
if (audit?.titleTooLong?.length) {
  manual.push(`${audit.titleTooLong.length} titel(s) > 60 tekens — handmatig inkorten:`);
  audit.titleTooLong.slice(0, 30).forEach((r) => manual.push(`    ${r.titleLen}t  ${r.url}`));
}

// ── REPORT: descriptions ──────────────────────────────────────────
if (audit?.descTooLong?.length) {
  manual.push(`${audit.descTooLong.length} meta-description(s) > 160 tekens — handmatig inkorten:`);
  audit.descTooLong.slice(0, 30).forEach((r) => manual.push(`    ${r.descLen}t  ${r.url}`));
}
if (audit?.descNone?.length) {
  manual.push(`${audit.descNone.length} pagina('s) ZONDER meta-description — toevoegen:`);
  audit.descNone.forEach((r) => manual.push(`    ${r.url}`));
}

// ── REPORT: schema errors ─────────────────────────────────────────
if (schema?.errorCount) {
  manual.push(`${schema.errorCount} structured-data fout(en) — controleer schema-objecten:`);
  Object.entries(schema.errorsByType || {}).forEach(([type, n]) => manual.push(`    ${n}x  ${type}`));
}

// ── REPORT: broken links ──────────────────────────────────────────
if (links?.brokenInternal?.length) {
  manual.push(`${links.brokenInternal.length} kapotte INTERNE link(s) — kritiek, direct fixen:`);
  links.brokenInternal.slice(0, 20).forEach((b) => manual.push(`    ${b.url}`));
}
if (links?.brokenExternal?.length) {
  manual.push(`${links.brokenExternal.length} kapotte EXTERNE link(s) — vervangen of verwijderen:`);
  links.brokenExternal.slice(0, 40).forEach((b) =>
    manual.push(`    [${b.status || b.error}]  ${b.url}  (${b.referencedFrom.length} pagina's)`)
  );
} else if (links && links.externalUrlsChecked === 0) {
  manual.push('Externe links niet live-gecheckt — draai: node scripts/seo-link-integrity.cjs --check-external');
}

// ── REPORT: orphans ───────────────────────────────────────────────
if (orphan?.trueOrphans?.length) {
  manual.push(`${orphan.trueOrphans.length} echte orphan-pagina('s) — interne link toevoegen.`);
}

// ── Output ────────────────────────────────────────────────────────
console.log('--- Toegepaste auto-fixes ---');
if (applied.length) applied.forEach((a) => console.log(`  ✓ ${a}`));
else console.log(APPLY ? '  (geen)' : '  (dry-run — nog niets toegepast)');

console.log('\n--- Handmatige actie vereist ---');
if (manual.length) manual.forEach((m) => console.log(`  ${m.startsWith('    ') ? m : '• ' + m}`));
else console.log('  (geen openstaande issues)');

console.log('');
if (!APPLY && manual.length === 0 && audit) {
  console.log('Geen openstaande issues gevonden.');
} else if (!APPLY) {
  console.log('Draai met --apply om de veilige fixes toe te passen.');
}

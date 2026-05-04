#!/usr/bin/env node
// One-shot codemod: shorten too-long titles and descriptions in
// src/pages/**/*.astro using safe pattern replacements + word-boundary
// truncation. Reads scripts/seo-audit-output.json for target list.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');
const AUDIT = path.join(ROOT, 'scripts', 'seo-audit-output.json');

const TITLE_SUFFIX = ' · Aanloop AI';
const TITLE_MAX = 60;
const TITLE_BARE_MAX = TITLE_MAX - TITLE_SUFFIX.length; // 47
const DESC_MAX = 158;

const TITLE_PATTERNS = [
  [/\s*—\s*Volledige Pillar-Gids/g, ''],
  [/\s*—\s*Volledige Gids voor MKB( Nederland)?( 2026)?/g, ''],
  [/\s*—\s*Volledige Gids/g, ''],
  [/\s*—\s*Complete Gids( voor MKB)?( Nederland)?( \d{4})?/g, ''],
  [/\s*—\s*De 7 Stappen voor Succesvolle Adoptie/g, ' — 7 stappen'],
  [/\s+voor Nederlandse MKB(-bedrijven)?/g, ' MKB'],
  [/\s+voor Nederlands MKB/g, ' MKB'],
  [/\s+voor MKB Nederland/g, ' MKB Nederland'],
  [/MKB Nederland 2026/g, 'MKB NL 2026'],
  [/\s+gids MKB Nederland 2026/g, ' MKB NL 2026'],
  [/\s+— gids/g, ' —'],
  [/Nederland 2026 — /g, 'NL 2026 — '],
  [/voor MKB( Nederland)?$/g, 'MKB$1'],
  [/Vergelijking Nederland 2026/g, 'NL 2026'],
  [/Wat Kost AI Echt voor Nederlands MKB\?/g, 'Wat kost AI? (NL)'],
  [/\s*—\s*\d+ Selectiecriteria voor MKB/g, ''],
  [/\s+gids 2026$/g, ' 2026'],
  [/\s+TCO\s+€[\d.]+ vs €[\d.]+\/mnd/g, ' — TCO-vergelijk'],
  [/\s+Realistische cijfers per investering/g, ''],
  [/\s+Tot \d+ procent minder gemiste afspraken/g, ''],
  [/\s+Verwerkersovereenkomst, datalokatie en risicos/g, ''],
];

function smartShorten(value, max, patterns) {
  let out = value;
  for (const [re, repl] of patterns) {
    if (out.length <= max) break;
    out = out.replace(re, repl).replace(/\s{2,}/g, ' ').trim();
  }
  return out;
}

function smartTruncateDesc(value, max) {
  if (value.length <= max) return value;
  let cut = value.slice(0, max + 1);
  const lastSentence = Math.max(
    cut.lastIndexOf('. '),
    cut.lastIndexOf('! '),
    cut.lastIndexOf('? ')
  );
  if (lastSentence >= 80) {
    return value.slice(0, lastSentence + 1).trim();
  }
  cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace >= 100) {
    return value.slice(0, lastSpace).replace(/[,;:—-]+$/, '').trim();
  }
  return value.slice(0, max - 1).trim() + '…';
}

function loadAudit() {
  if (!fs.existsSync(AUDIT)) {
    console.error(`Missing ${path.relative(ROOT, AUDIT)} — run scripts/seo-audit.cjs first.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(AUDIT, 'utf8'));
}

function fileForUrl(url, fallback) {
  const rel = url.replace('https://aanloopai.nl/', '').replace(/\/$/, '');
  if (!rel) return path.join(PAGES_DIR, 'index.astro');
  const direct = path.join(PAGES_DIR, rel + '.astro');
  if (fs.existsSync(direct)) return direct;
  const indexed = path.join(PAGES_DIR, rel, 'index.astro');
  if (fs.existsSync(indexed)) return indexed;
  if (fallback) {
    const f = path.join(ROOT, fallback);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceField(content, field, oldVal, newVal) {
  // 1) const form: `const title = '...';`
  const constRe = new RegExp(
    `(\\bconst\\s+${field}\\s*=\\s*)(['"\`])${escapeReg(oldVal)}\\2`
  );
  if (constRe.test(content)) {
    return content.replace(constRe, `$1$2${newVal}$2`);
  }
  // 2) jsx-line form: `  title="..."` on its own line
  const jsxLineRe = new RegExp(`(^\\s+${field}=)(['"])${escapeReg(oldVal)}\\2`, 'm');
  if (jsxLineRe.test(content)) {
    return content.replace(jsxLineRe, `$1$2${newVal}$2`);
  }
  // 3) jsx-inline form: `<BaseLayout title="..." description="..." ...>`
  const jsxInlineRe = new RegExp(
    `(<BaseLayout\\b[^>]*?\\b${field}=)(['"])${escapeReg(oldVal)}\\2`
  );
  if (jsxInlineRe.test(content)) {
    return content.replace(jsxInlineRe, `$1$2${newVal}$2`);
  }
  return null;
}

const audit = loadAudit();
let titleFixed = 0;
let titleSkipped = 0;
let descFixed = 0;
let descSkipped = 0;
const log = [];

for (const row of audit.titleTooLong) {
  const file = fileForUrl(row.url, row.file);
  if (!file) {
    log.push(`  [skip-title] ${row.file}: file not found`);
    titleSkipped++;
    continue;
  }
  const original = row.title;
  const limit = original.includes('Aanloop') ? TITLE_MAX : TITLE_BARE_MAX;
  const shortened = smartShorten(original, limit, TITLE_PATTERNS);
  if (shortened === original) {
    titleSkipped++;
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  const next = replaceField(content, 'title', original, shortened);
  if (!next) {
    log.push(`  [no-match] title ${row.file}: regex did not match`);
    titleSkipped++;
    continue;
  }
  fs.writeFileSync(file, next);
  const flag = shortened.length > limit ? '[partial]' : '[ok]';
  log.push(`  ${flag} title ${row.file}: [${original.length}→${shortened.length}] "${shortened}"`);
  titleFixed++;
}

for (const row of audit.descTooLong) {
  const file = fileForUrl(row.url, row.file);
  if (!file) {
    log.push(`  [skip-desc] ${row.file}: file not found`);
    descSkipped++;
    continue;
  }
  const original = row.desc;
  const truncated = smartTruncateDesc(original, DESC_MAX);
  if (truncated === original) {
    descSkipped++;
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  const next = replaceField(content, 'description', original, truncated);
  if (!next) {
    log.push(`  [no-match] desc ${row.file}: regex did not match`);
    descSkipped++;
    continue;
  }
  fs.writeFileSync(file, next);
  log.push(`  [ok] desc ${row.file}: [${original.length}→${truncated.length}]`);
  descFixed++;
}

console.log(`Titles: ${titleFixed} fixed, ${titleSkipped} skipped`);
console.log(`Descriptions: ${descFixed} fixed, ${descSkipped} skipped`);
console.log('');
log.forEach((l) => console.log(l));

#!/usr/bin/env node
// Measures visible-text / HTML ratio and visible word count per built page.
// Flags thin pages (Semrush "low text-HTML ratio"): low word count is the real
// signal — a heavily-styled page can have a low ratio yet plenty of content.
//
// Usage: node scripts/seo-text-ratio.cjs   (needs a prior "npm run build")
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const RATIO_MIN = 0.10;   // Semrush threshold
const WORD_MIN = 300;     // genuine-thin-content threshold

if (!fs.existsSync(DIST)) {
  console.error('No dist/ — run "npm run build" first.');
  process.exit(1);
}

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, files);
    else if (e.isFile() && e.name.endsWith('.html')) files.push(f);
  }
  return files;
}

function urlFor(file) {
  const rel = path.relative(DIST, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  return '/' + rel.replace(/\.html$/, '') + '/';
}

function visibleText(html) {
  let body = html.replace(/[\s\S]*?<body\b[^>]*>/i, '').replace(/<\/body>[\s\S]*/i, '');
  body = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  return body.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

const rows = [];
for (const file of walk(DIST)) {
  const html = fs.readFileSync(file, 'utf8');
  const noindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  const text = visibleText(html);
  const words = text ? text.split(/\s+/).length : 0;
  const ratio = html.length ? text.length / html.length : 0;
  rows.push({ url: urlFor(file), words, ratio: +(ratio * 100).toFixed(1), noindex });
}

const indexable = rows.filter((r) => !r.noindex);
const lowRatio = indexable.filter((r) => r.ratio < RATIO_MIN * 100).sort((a, b) => a.ratio - b.ratio);
const thin = indexable.filter((r) => r.words < WORD_MIN).sort((a, b) => a.words - b.words);

console.log('=== AANLOOPAI TEXT / HTML RATIO ===');
console.log(`Indexable pages: ${indexable.length}`);
console.log(`Low ratio (<${RATIO_MIN * 100}%): ${lowRatio.length}`);
console.log(`Genuinely thin (<${WORD_MIN} words): ${thin.length}`);
console.log('');
console.log('--- Thin pages (real action needed, fewest words first) ---');
thin.forEach((r) => console.log(`  ${String(r.words).padStart(4)}w  ${r.ratio}%  ${r.url}`));
console.log('');
console.log('--- Low ratio but enough words (HTML-heavy, no content action) ---');
lowRatio.filter((r) => r.words >= WORD_MIN).slice(0, 15).forEach((r) =>
  console.log(`  ${String(r.words).padStart(4)}w  ${r.ratio}%  ${r.url}`)
);

fs.writeFileSync(
  path.join(__dirname, 'seo-text-ratio-output.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), indexable: indexable.length, lowRatio, thin }, null, 2)
);
console.log('\nOutput: scripts/seo-text-ratio-output.json');

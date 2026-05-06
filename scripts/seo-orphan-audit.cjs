#!/usr/bin/env node
// Walk dist/ HTML output, count inbound internal links per page, and flag
// pages with 0 contextual inbound links (excluding header/footer/nav).
// Detects Q2.6 orphans.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://aanloopai.nl';

if (!fs.existsSync(DIST)) {
  console.error('No dist/ directory — run "npm run build" first.');
  process.exit(1);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function urlForHtmlFile(file) {
  const rel = path.relative(DIST, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  if (rel.endsWith('.html')) return '/' + rel.slice(0, -'.html'.length) + '/';
  return '/' + rel;
}

function normaliseInternalUrl(raw, baseUrl) {
  let url;
  try {
    url = new URL(raw, baseUrl);
  } catch {
    return null;
  }
  if (url.origin !== SITE) return null;
  url.hash = '';
  url.search = '';
  let n = url.pathname;
  if (!n.endsWith('/') && !n.match(/\.[a-z0-9]+$/i)) n += '/';
  return n;
}

const HREF_RE = /<a\b[^>]*?\bhref=(["'])([^"'#]*?)\1/gi;

function stripChrome(html) {
  return html
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '');
}

const htmlFiles = walk(DIST);
const allUrls = new Set();
for (const f of htmlFiles) allUrls.add(urlForHtmlFile(f));

const inboundAll = new Map();
const inboundContextual = new Map();
for (const u of allUrls) {
  inboundAll.set(u, new Set());
  inboundContextual.set(u, new Set());
}

for (const file of htmlFiles) {
  const sourceUrl = urlForHtmlFile(file);
  const fullHtml = fs.readFileSync(file, 'utf8');
  const bodyHtml = stripChrome(fullHtml);

  for (const [scope, html] of [['all', fullHtml], ['contextual', bodyHtml]]) {
    for (const m of html.matchAll(HREF_RE)) {
      const raw = m[2].trim();
      if (!raw) continue;
      if (raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) continue;
      const target = normaliseInternalUrl(raw, SITE + sourceUrl);
      if (!target || target === sourceUrl) continue;
      if (/\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|woff2?|ttf|eot|pdf|xml|json|webmanifest|txt)$/i.test(target)) continue;
      const map = scope === 'all' ? inboundAll : inboundContextual;
      if (!map.has(target)) continue;
      map.get(target).add(sourceUrl);
    }
  }
}

const rows = Array.from(allUrls).map((u) => ({
  url: u,
  inboundAll: inboundAll.get(u).size,
  inboundContextual: inboundContextual.get(u).size,
})).sort((a, b) => a.inboundContextual - b.inboundContextual || a.inboundAll - b.inboundAll);

const orphansContextual = rows.filter((r) => r.inboundContextual === 0);
const orphansTotal = rows.filter((r) => r.inboundAll === 0);

console.log('=== AANLOOPAI ORPHAN AUDIT ===');
console.log(`Total HTML pages: ${htmlFiles.length}`);
console.log('');
console.log(`--- Q2.6 True orphans (0 inbound including header/footer/nav): ${orphansTotal.length} ---`);
orphansTotal.forEach((r) => console.log(`  ${r.url}`));
console.log('');
console.log(`--- Q2.6 Contextual orphans (0 inbound from body content): ${orphansContextual.length} ---`);
orphansContextual.slice(0, 40).forEach((r) => console.log(`  [chrome=${r.inboundAll}] ${r.url}`));
if (orphansContextual.length > 40) console.log(`  ...+${orphansContextual.length - 40} more`);
console.log('');
console.log('--- Bottom 20 by contextual inbound (least-linked): ---');
rows.slice(0, 20).forEach((r) =>
  console.log(`  contextual=${r.inboundContextual.toString().padStart(2)} all=${r.inboundAll.toString().padStart(3)}  ${r.url}`)
);

const out = {
  totalPages: htmlFiles.length,
  trueOrphans: orphansTotal.map((r) => r.url),
  contextualOrphans: orphansContextual.map((r) => ({ url: r.url, inboundAll: r.inboundAll })),
  bottom20: rows.slice(0, 20),
};
fs.writeFileSync(path.join(ROOT, 'scripts', 'seo-orphan-output.json'), JSON.stringify(out, null, 2));
console.log('');
console.log('Output: scripts/seo-orphan-output.json');

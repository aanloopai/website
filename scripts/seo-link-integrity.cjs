#!/usr/bin/env node
// Walk dist/ HTML output, extract every internal href, resolve against disk
// pages + sitemap URLs, and report broken internal links + suspicious external
// links. Detects Q1.5 (404 candidates) + Q2.7 (broken outgoing) preconditions.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITEMAP = path.join(ROOT, 'public', 'sitemap.xml');
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

const sitemap = fs.readFileSync(SITEMAP, 'utf8');
const sitemapUrls = new Set(
  Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1].trim())
);

const htmlFiles = walk(DIST);
const knownUrls = new Set();
for (const f of htmlFiles) knownUrls.add(SITE + urlForHtmlFile(f));

const brokenLinks = new Map();
const externalLinks = new Map();

const HREF_RE = /<a\b[^>]*?\bhref=(["'])([^"'#]*?)\1/gi;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const m of html.matchAll(HREF_RE)) {
    const raw = m[2].trim();
    if (!raw) continue;
    if (raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) continue;
    let url;
    try {
      url = new URL(raw, SITE).toString();
    } catch {
      continue;
    }
    if (url.startsWith(SITE)) {
      const u = new URL(url);
      u.hash = '';
      let normalised = `${SITE}${u.pathname}`;
      if (!normalised.endsWith('/') && !normalised.match(/\.[a-z0-9]+$/i)) {
        normalised += '/';
      }
      if (/\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|woff2?|ttf|eot|pdf|xml|json|webmanifest|txt)$/i.test(normalised)) continue;
      if (!knownUrls.has(normalised)) {
        if (!brokenLinks.has(normalised)) brokenLinks.set(normalised, new Set());
        brokenLinks.get(normalised).add(path.relative(DIST, file).replace(/\\/g, '/'));
      }
    } else {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');
      externalLinks.set(host, (externalLinks.get(host) || 0) + 1);
    }
  }
}

console.log('=== AANLOOPAI INTERNAL-LINK INTEGRITY ===');
console.log(`HTML pages: ${htmlFiles.length}`);
console.log(`Sitemap URLs: ${sitemapUrls.size}`);
console.log(`Known disk URLs: ${knownUrls.size}`);
console.log('');

const broken = Array.from(brokenLinks.entries()).sort((a, b) => b[1].size - a[1].size);
console.log(`--- Q1.5 Broken internal links (target URLs not on disk): ${broken.length} ---`);
for (const [url, sources] of broken) {
  const arr = Array.from(sources);
  console.log(`  ${url}  (referenced from ${sources.size} page${sources.size > 1 ? 's' : ''}):`);
  arr.slice(0, 5).forEach((s) => console.log(`    - ${s}`));
  if (arr.length > 5) console.log(`    ...+${arr.length - 5} more`);
}
console.log('');

const ext = Array.from(externalLinks.entries()).sort((a, b) => b[1] - a[1]);
console.log('--- External link domains (top 20): ---');
ext.slice(0, 20).forEach(([host, n]) => console.log(`  ${n.toString().padStart(5)}  ${host}`));

const out = {
  brokenInternal: broken.map(([url, set]) => ({
    url,
    referencedFrom: Array.from(set),
  })),
  externalDomains: ext.map(([host, count]) => ({ host, count })),
};
fs.writeFileSync(path.join(ROOT, 'scripts', 'seo-link-integrity-output.json'), JSON.stringify(out, null, 2));
console.log('');
console.log('Output: scripts/seo-link-integrity-output.json');

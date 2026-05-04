#!/usr/bin/env node
// SEO audit: walk src/pages, extract title/description/noindex from BaseLayout
// usage, and cross-check against public/sitemap.xml.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');
const SITEMAP = path.join(ROOT, 'public', 'sitemap.xml');

const TITLE_SUFFIX = ' · Aanloop AI';
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.endsWith('.astro')) files.push(full);
  }
  return files;
}

function pageToUrl(file) {
  const rel = path.relative(PAGES_DIR, file).replace(/\\/g, '/');
  let url = '/' + rel.replace(/\.astro$/, '');
  if (url.endsWith('/index')) url = url.slice(0, -'index'.length);
  if (!url.endsWith('/')) url += '/';
  return 'https://aanloopai.nl' + url;
}

function extract(content) {
  const titleMatch = content.match(/(?:^|\n)\s*const\s+title\s*=\s*([`'"])(.*?)\1/s);
  const descMatch = content.match(/(?:^|\n)\s*const\s+description\s*=\s*([`'"])(.*?)\1/s);
  const layoutTitleAttr = content.match(/<BaseLayout\b[^>]*?\btitle=\{?([`'"])([^`'"]+)\1\}?/);
  const layoutDescAttr = content.match(/<BaseLayout\b[^>]*?\bdescription=\{?([`'"])([^`'"]+)\1\}?/);
  const noindex = /<BaseLayout\b[^>]*?\bnoindex(?:=\{?true\}?)?(?:\s|>)/.test(content);
  const title = titleMatch ? titleMatch[2] : (layoutTitleAttr ? layoutTitleAttr[2] : null);
  const desc = descMatch ? descMatch[2] : (layoutDescAttr ? layoutDescAttr[2] : null);
  return { title, desc, noindex };
}

// Mirrors BaseLayout.astro: append " · Aanloop AI" only if total <=60 chars
function fullTitle(t) {
  if (!t) return null;
  if (t.includes('Aanloop')) return t;
  return t.length + TITLE_SUFFIX.length <= TITLE_MAX ? t + TITLE_SUFFIX : t;
}

const files = walk(PAGES_DIR);
const sitemap = fs.readFileSync(SITEMAP, 'utf8');
const sitemapUrls = new Set(
  Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1].trim())
);

const rows = files.map((f) => {
  const c = fs.readFileSync(f, 'utf8');
  const { title, desc, noindex } = extract(c);
  const ft = fullTitle(title);
  const url = pageToUrl(f);
  return {
    file: path.relative(ROOT, f).replace(/\\/g, '/'),
    url,
    title: title || '',
    fullTitle: ft || '',
    titleLen: ft ? ft.length : 0,
    desc: desc || '',
    descLen: desc ? desc.length : 0,
    noindex,
    inSitemap: sitemapUrls.has(url),
  };
});

const titleTooLong = rows.filter((r) => !r.noindex && r.titleLen > TITLE_MAX);
const titleNone = rows.filter((r) => !r.noindex && r.titleLen === 0);
const descTooLong = rows.filter((r) => !r.noindex && r.descLen > DESC_MAX);
const descTooShort = rows.filter((r) => !r.noindex && r.descLen > 0 && r.descLen < DESC_MIN);
const descNone = rows.filter((r) => !r.noindex && r.descLen === 0);
const indexableNotInSitemap = rows.filter((r) => !r.noindex && !r.inSitemap);
const noindexInSitemap = rows.filter((r) => r.noindex && r.inSitemap);
const onDiskUrls = new Set(rows.map((r) => r.url));
const sitemapOnlyUrls = Array.from(sitemapUrls).filter((u) => !onDiskUrls.has(u));

console.log('=== AANLOOPAI SEO AUDIT ===');
console.log(`Total .astro pages: ${rows.length}`);
console.log(`Indexable pages: ${rows.filter((r) => !r.noindex).length}`);
console.log(`Noindex pages: ${rows.filter((r) => r.noindex).length}`);
console.log(`Sitemap URLs: ${sitemapUrls.size}`);
console.log('');

console.log(`--- Q1.1 Titles too long (>${TITLE_MAX}, indexable): ${titleTooLong.length} ---`);
titleTooLong.slice(0, 50).forEach((r) =>
  console.log(`  [${r.titleLen}] ${r.file}  →  "${r.fullTitle}"`)
);
if (titleTooLong.length > 50) console.log(`  ...+${titleTooLong.length - 50} more`);
console.log('');

console.log(`--- Q1.1b Titles missing (indexable): ${titleNone.length} ---`);
titleNone.forEach((r) => console.log(`  ${r.file}`));
console.log('');

console.log(`--- Q1.2 Descriptions too long (>${DESC_MAX}, indexable): ${descTooLong.length} ---`);
descTooLong.slice(0, 50).forEach((r) =>
  console.log(`  [${r.descLen}] ${r.file}  →  "${r.desc.slice(0, 100)}…"`)
);
if (descTooLong.length > 50) console.log(`  ...+${descTooLong.length - 50} more`);
console.log('');

console.log(`--- Q1.2b Descriptions too short (<${DESC_MIN}, indexable, non-empty): ${descTooShort.length} ---`);
descTooShort.forEach((r) => console.log(`  [${r.descLen}] ${r.file}  →  "${r.desc}"`));
console.log('');

console.log(`--- Q1.2c Descriptions missing (indexable): ${descNone.length} ---`);
descNone.forEach((r) => console.log(`  ${r.file}`));
console.log('');

console.log(`--- Q1.4a Indexable pages NOT in sitemap: ${indexableNotInSitemap.length} ---`);
indexableNotInSitemap.forEach((r) => console.log(`  ${r.url}`));
console.log('');

console.log(`--- Q1.4b Noindex pages IN sitemap: ${noindexInSitemap.length} ---`);
noindexInSitemap.forEach((r) => console.log(`  ${r.url}`));
console.log('');

console.log(`--- Q1.4c Sitemap URLs without disk-page: ${sitemapOnlyUrls.length} ---`);
sitemapOnlyUrls.forEach((u) => console.log(`  ${u}`));
console.log('');

const jsonOut = path.join(ROOT, 'scripts', 'seo-audit-output.json');
fs.writeFileSync(jsonOut, JSON.stringify({
  rows,
  titleTooLong: titleTooLong.map((r) => ({ file: r.file, url: r.url, title: r.title, fullTitle: r.fullTitle, titleLen: r.titleLen })),
  descTooLong: descTooLong.map((r) => ({ file: r.file, url: r.url, desc: r.desc, descLen: r.descLen })),
  descTooShort: descTooShort.map((r) => ({ file: r.file, url: r.url, desc: r.desc, descLen: r.descLen })),
  descNone: descNone.map((r) => ({ file: r.file, url: r.url })),
  indexableNotInSitemap: indexableNotInSitemap.map((r) => ({ url: r.url, file: r.file })),
  noindexInSitemap: noindexInSitemap.map((r) => ({ url: r.url, file: r.file })),
  sitemapOnlyUrls,
}, null, 2));
console.log(`Audit JSON: ${path.relative(ROOT, jsonOut)}`);

#!/usr/bin/env node
/**
 * crawl-links.mjs — interne linkgraaf + linkhygiëne over de gebouwde site.
 *
 * Bouwt uit dist/**\/*.html de volledige interne linkgraaf en rapporteert:
 *   1. interne links naar redirect-URL's (public/_redirects-bronnen en
 *      /whatsapp) — Ahrefs 2026-08-24: 207 pagina's linkten naar een 3xx;
 *   2. interne links met http:// of www. (moeten kaal https zijn);
 *   3. interne links naar paden die robots.txt disallowt (48 stuks bij Ahrefs)
 *      — alleen fout als de doelpagina indexeerbaar hoort te zijn;
 *   4. links naar niet-bestaande interne doelen (404 in de build);
 *   5. indexeerbare pagina's met ≤ 2 inkomende dofollow-links (wees-pagina's).
 *
 * Gebruik:  node scripts/crawl-links.mjs           → hard falen op 1/2/4
 *           node scripts/crawl-links.mjs --report  → alles alleen rapporteren
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const REPORT_ONLY = process.argv.includes('--report');

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

// _redirects-bronpaden (Pages-formaat: "<van> <naar> <status>")
const redirectSources = new Set(['/whatsapp', '/whatsapp/']);
const redirectsFile = path.join(ROOT, 'public', '_redirects');
if (fs.existsSync(redirectsFile)) {
  for (const line of fs.readFileSync(redirectsFile, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const from = t.split(/\s+/)[0];
    if (from && from.startsWith('/')) {
      redirectSources.add(from.replace(/\*$/, ''));
    }
  }
}

// robots.txt disallows (alleen de regels onder User-agent: *)
const disallows = [];
const robotsFile = path.join(ROOT, 'public', 'robots.txt');
if (fs.existsSync(robotsFile)) {
  let inStar = false;
  for (const line of fs.readFileSync(robotsFile, 'utf8').split('\n')) {
    const t = line.trim();
    if (/^user-agent:/i.test(t)) inStar = /user-agent:\s*\*/i.test(t);
    else if (inStar && /^disallow:/i.test(t)) {
      const p = t.replace(/^disallow:\s*/i, '').trim();
      if (p) disallows.push(p);
    }
  }
}

function urlOfFile(file) {
  let rel = path.relative(DIST, file).replace(/\\/g, '/');
  if (rel.endsWith('index.html')) rel = rel.slice(0, -'index.html'.length);
  else rel = rel.replace(/\.html$/, '');
  return '/' + rel;
}

function normalize(href) {
  // interne doel-URL normaliseren naar pad-met-slash zonder query/anker
  let u = href.replace(/^https:\/\/aanloopai\.nl/, '');
  u = u.split('#')[0].split('?')[0];
  if (u === '') u = '/';
  return u;
}

const pages = new Map(); // url → { file, noindex, outlinks: [{href, nofollow}] }
const anchorRe = /<a\s[^>]*href="([^"]+)"[^>]*>/g;

for (const file of walk(DIST)) {
  const url = urlOfFile(file);
  const html = fs.readFileSync(file, 'utf8');
  const noindex = /<meta name="robots" content="[^"]*noindex/i.test(html);
  const outlinks = [];
  let m;
  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[1];
    const tag = m[0];
    if (/^(mailto:|tel:|javascript:|#)/.test(href)) continue;
    const external = /^https?:\/\//.test(href) && !href.startsWith('https://aanloopai.nl') && !href.startsWith('http://aanloopai.nl');
    if (external) continue;
    outlinks.push({ href, nofollow: /rel="[^"]*nofollow/.test(tag) });
  }
  pages.set(url, { file, noindex, outlinks });
}

const inlinks = new Map(); // url → Set van bron-URL's (alleen dofollow)
const problems = { redirect: [], http: [], blocked: [], broken: [] };

const existing = new Set(pages.keys());
// bestaande varianten zonder slash meenemen
for (const u of [...existing]) {
  if (u.endsWith('/') && u !== '/') existing.add(u.slice(0, -1));
}

for (const [url, page] of pages) {
  for (const { href, nofollow } of page.outlinks) {
    if (/^http:\/\//.test(href) || href.startsWith('https://www.aanloopai.nl')) {
      problems.http.push(`${url} → ${href}`);
    }
    const target = normalize(href);
    const targetSlash = target.endsWith('/') || /\.[a-z0-9]+$/i.test(target) ? target : target + '/';
    if (redirectSources.has(target) || redirectSources.has(targetSlash)) {
      if (!nofollow) problems.redirect.push(`${url} → ${href}`);
      continue; // redirects tellen niet als inlink van de bestemming
    }
    if (disallows.some((d) => targetSlash.startsWith(d))) {
      problems.blocked.push(`${url} → ${href}`);
      continue;
    }
    if (!/\.[a-z0-9]+$/i.test(targetSlash) && !existing.has(targetSlash) && !existing.has(target)) {
      problems.broken.push(`${url} → ${href}`);
      continue;
    }
    if (!nofollow) {
      if (!inlinks.has(targetSlash)) inlinks.set(targetSlash, new Set());
      inlinks.get(targetSlash).add(url);
    }
  }
}

// Wees-rapport: indexeerbare pagina's met ≤ 2 inkomende dofollow-links.
const orphanish = [];
for (const [url, page] of pages) {
  if (page.noindex || url === '/404') continue;
  const n = inlinks.get(url)?.size ?? 0;
  if (n <= 2) orphanish.push({ url, n });
}
orphanish.sort((a, b) => a.n - b.n || a.url.localeCompare(b.url));

console.log(`crawl-links: ${pages.size} pagina's, ${[...pages.values()].reduce((s, p) => s + p.outlinks.length, 0)} interne links.`);
console.log(`\n— dofollow-links naar redirects (${problems.redirect.length}):`);
problems.redirect.slice(0, 30).forEach((x) => console.log('  ' + x));
console.log(`\n— http:// of www.-links (${problems.http.length}):`);
problems.http.slice(0, 30).forEach((x) => console.log('  ' + x));
console.log(`\n— links naar robots.txt-disallowed paden (${problems.blocked.length}):`);
problems.blocked.slice(0, 30).forEach((x) => console.log('  ' + x));
console.log(`\n— kapotte interne links (${problems.broken.length}):`);
problems.broken.slice(0, 30).forEach((x) => console.log('  ' + x));
console.log(`\n— indexeerbare pagina's met ≤ 2 inkomende dofollow-links (${orphanish.length}):`);
orphanish.forEach(({ url, n }) => console.log(`  ${n}× ${url}`));

const fatal = problems.redirect.length + problems.http.length + problems.broken.length;
if (fatal && !REPORT_ONLY) {
  console.error(`\n${fatal} harde linkfout(en) — zie hierboven.`);
  process.exit(1);
}

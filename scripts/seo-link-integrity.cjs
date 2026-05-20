#!/usr/bin/env node
// Walk dist/ HTML output, extract every href, resolve internal links against
// disk pages, and (with --check-external) run live HTTP checks on every unique
// external URL to find broken outgoing links (Semrush "broken external links").
//
// Usage:
//   node scripts/seo-link-integrity.cjs                  internal only (fast)
//   node scripts/seo-link-integrity.cjs --check-external live external checks
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITEMAP = path.join(ROOT, 'public', 'sitemap.xml');
const SITE = 'https://aanloopai.nl';
const CHECK_EXTERNAL = process.argv.includes('--check-external');
const TIMEOUT_MS = 9000;
const CONCURRENCY = 12;

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
const externalLinks = new Map();   // host -> count
const externalUrls = new Map();    // full URL -> Set(source pages)

const HREF_RE = /<a\b[^>]*?\bhref=(["'])([^"'#]*?)\1/gi;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const src = path.relative(DIST, file).replace(/\\/g, '/');
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
        brokenLinks.get(normalised).add(src);
      }
    } else {
      const u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      const host = u.hostname.replace(/^www\./, '');
      externalLinks.set(host, (externalLinks.get(host) || 0) + 1);
      // wa.me / WhatsApp deeplinks are not crawlable health signals — skip live check
      if (host === 'wa.me' || host === 'api.whatsapp.com') continue;
      const clean = `${u.protocol}//${u.host}${u.pathname}${u.search}`;
      if (!externalUrls.has(clean)) externalUrls.set(clean, new Set());
      externalUrls.get(clean).add(src);
    }
  }
}

console.log('=== AANLOOPAI LINK INTEGRITY ===');
console.log(`HTML pages: ${htmlFiles.length}`);
console.log(`Sitemap URLs: ${sitemapUrls.size}`);
console.log(`Known disk URLs: ${knownUrls.size}`);
console.log('');

const broken = Array.from(brokenLinks.entries()).sort((a, b) => b[1].size - a[1].size);
console.log(`--- Broken internal links (target not on disk): ${broken.length} ---`);
for (const [url, sources] of broken) {
  const arr = Array.from(sources);
  console.log(`  ${url}  (from ${sources.size} page${sources.size > 1 ? 's' : ''})`);
  arr.slice(0, 5).forEach((s) => console.log(`    - ${s}`));
  if (arr.length > 5) console.log(`    ...+${arr.length - 5} more`);
}
console.log('');

const ext = Array.from(externalLinks.entries()).sort((a, b) => b[1] - a[1]);
console.log(`--- External link domains (top 20 of ${ext.length}): ---`);
ext.slice(0, 20).forEach(([host, n]) => console.log(`  ${n.toString().padStart(5)}  ${host}`));
console.log(`Unique external URLs (excl. wa.me): ${externalUrls.size}`);

async function checkUrl(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  // Real browser UA — many sites (gov, branch-orgs) bot-block non-browser agents
  // with a 403/404, which would otherwise look like a dead link.
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal, headers });
    // Many servers reject or mis-handle HEAD (405/501/403/404) — retry with GET
    if (res.status === 405 || res.status === 501 || res.status === 403 || res.status === 404) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers });
    }
    clearTimeout(timer);
    // 401/403/999 = auth- or bot-gated (LinkedIn etc.); the URL exists and the
    // link is valid for real users — not broken.
    const ok = res.status < 400 || res.status === 401 || res.status === 403 || res.status === 999;
    return { url, status: res.status, ok, state: ok ? 'ok' : 'broken' };
  } catch (err) {
    clearTimeout(timer);
    // network-level failure (TLS/DNS/timeout) — cannot confirm a 4xx/5xx, so
    // report as "unverified" rather than counting it as a broken link.
    return { url, status: 0, ok: false, state: 'unverified', error: err.name === 'AbortError' ? 'timeout' : (err.code || err.message) };
  }
}

async function runExternalChecks() {
  const urls = Array.from(externalUrls.keys());
  const results = [];
  let i = 0;
  console.log(`\n--- Live-checking ${urls.length} external URLs (concurrency ${CONCURRENCY}) ---`);
  async function worker() {
    while (i < urls.length) {
      const idx = i++;
      const r = await checkUrl(urls[idx]);
      results.push(r);
      if (!r.ok) console.log(`  BROKEN  [${r.status || r.error}]  ${r.url}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

(async () => {
  let brokenExternal = [];
  let unverifiedExternal = [];
  if (CHECK_EXTERNAL) {
    const results = await runExternalChecks();
    const toEntry = (r) => ({
      url: r.url,
      status: r.status,
      error: r.error || null,
      referencedFrom: Array.from(externalUrls.get(r.url) || []),
    });
    brokenExternal = results
      .filter((r) => r.state === 'broken')
      .map(toEntry)
      .sort((a, b) => b.referencedFrom.length - a.referencedFrom.length);
    unverifiedExternal = results
      .filter((r) => r.state === 'unverified')
      .map(toEntry)
      .sort((a, b) => b.referencedFrom.length - a.referencedFrom.length);
    console.log(`\nBroken external URLs: ${brokenExternal.length} / ${results.length}`);
    if (unverifiedExternal.length) {
      console.log(`Unverified (network/TLS/timeout, not confirmed broken): ${unverifiedExternal.length}`);
    }
  } else {
    console.log('\n(external links not checked — pass --check-external for live HTTP checks)');
  }

  const out = {
    generatedAt: new Date().toISOString(),
    htmlPages: htmlFiles.length,
    brokenInternal: broken.map(([url, set]) => ({ url, referencedFrom: Array.from(set) })),
    externalDomains: ext.map(([host, count]) => ({ host, count })),
    externalUrlsChecked: CHECK_EXTERNAL ? externalUrls.size : 0,
    brokenExternal,
    unverifiedExternal,
  };
  fs.writeFileSync(
    path.join(ROOT, 'scripts', 'seo-link-integrity-output.json'),
    JSON.stringify(out, null, 2)
  );
  console.log('\nOutput: scripts/seo-link-integrity-output.json');
})();

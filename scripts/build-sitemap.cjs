#!/usr/bin/env node
// Auto-generate public/sitemap.xml from src/pages, excluding noindex pages,
// dynamic routes, and well-known non-canonical URLs (404, bedankt, demo-*).
const fs = require('fs');
const path = require('path');

const ROOT = process.env.SITEMAP_ROOT ? path.resolve(process.env.SITEMAP_ROOT) : path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');
const SITEMAP = path.join(ROOT, 'public', 'sitemap.xml');
const SITE = 'https://aanloopai.nl';

// On-disk pages that exist but should NOT be in sitemap (post-submit / 404)
const SITEMAP_EXCLUDE = new Set([
  '/404/',
  '/bedankt/',
  '/demo-bedankt/',
  '/demo-bevestigd/',
  '/demo-herplannen/',
  '/demo-inplannen/',
]);

// Whole sections that must never appear in the public sitemap (backoffice + logged-in app)
const SITEMAP_EXCLUDE_PREFIXES = ['/admin/', '/portal/'];

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
  return url;
}

function isDynamicRoute(file) {
  return /\[[^\]]+\]/.test(path.relative(PAGES_DIR, file));
}

function isNoindex(content) {
  return /<BaseLayout\b[^>]*?\bnoindex(?:=\{?true\}?)?(?:\s|>|\/)/.test(content);
}

function priorityFor(url) {
  if (url === '/') return '1.0';
  if (url === '/resultaten/' || url === '/werk/') return '0.9';
  if (url.startsWith('/werk/')) return '0.85';
  if (url === '/diensten/' || url === '/cases/' || url === '/sectoren/') return '0.9';
  if (url.startsWith('/diensten/') && (url.includes('bundel') || url.includes('website-laten-maken') || url.includes('webshop-laten-maken'))) return '0.95';
  if (url.startsWith('/diensten/')) return '0.9';
  if (url === '/gratis-ai-scan/' || url === '/no-show-calculator/') return '0.85';
  if (url === '/branche-statistieken-mkb-ai-nederland/') return '0.85';
  if (url.startsWith('/sectoren/')) return '0.85';
  if (url.startsWith('/cases/')) return '0.8';
  if (url.startsWith('/kennisbank/')) return '0.8';
  if (url.startsWith('/locaties/')) return '0.75';
  if (url.startsWith('/vergelijk/')) return '0.75';
  if (url === '/glossarium/') return '0.75';
  if (url === '/geo-bureau/') return '0.9';
  if (url.startsWith('/geo-bureau/')) return '0.85';
  if (url.startsWith('/ai-')) return '0.85';
  return '0.7';
}

function changefreqFor(url) {
  if (url.startsWith('/team/') || url === '/glossarium/' || url === '/pers/') return 'monthly';
  if (url.startsWith('/locaties/')) return 'monthly';
  return 'weekly';
}

const today = new Date().toISOString().slice(0, 10);

// ── lastmod uit git-historie ────────────────────────────────────────────────
// Eén git-aanroep levert per bronbestand de datum van de laatste commit —
// eerlijker dan "vandaag" (elke build stempelde nieuwe URL's op de builddatum,
// terwijl crawlers lastmod juist gebruiken om her-crawlen te prioriteren).
// Nieuwste commit eerst; de eerste keer dat een pad voorbijkomt wint.
const { execSync } = require('child_process');
const gitDateByFile = new Map();
// Shallow clone: git ziet alleen de gegraafde top-commit, dus elk bestand lijkt
// vandaag gewijzigd (de oorzaak van 253x 2026-11-11 in PR #281). Dan géén
// git-datums gebruiken; val terug op de bestaande sitemapwaarden.
let isShallow = false;
try {
  isShallow = execSync('git rev-parse --is-shallow-repository', { cwd: ROOT, encoding: 'utf8' }).trim() === 'true';
} catch (_) { /* geen git: gitDateByFile blijft leeg */ }
if (isShallow) console.warn('lastmod: shallow clone - git-historie genegeerd, bestaande sitemapwaarden blijven staan.');
try {
  if (isShallow) throw new Error('shallow clone');
  // --no-merges: een merge-commit toont zonder -m geen bestandslijst, maar
  // uitsluiten maakt dat expliciet. De datum wordt via Date() naar UTC
  // genormaliseerd: %cI staat in de tijdzone van de committer, waardoor een
  // commit van 00:30 +02:00 anders een dag te laat stempelt.
  const log = execSync(
    'git log --no-merges --format=COMMIT:%cI --name-only --no-renames -- src/pages src/content src/data',
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  let current = null;
  for (const line of log.split('\n')) {
    if (line.startsWith('COMMIT:')) {
      const iso = line.slice('COMMIT:'.length).trim();
      const d = new Date(iso);
      current = isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    } else if (line.trim() && current && !gitDateByFile.has(line.trim())) {
      gitDateByFile.set(line.trim(), current);
    }
  }
} catch (err) {
  // Geen git beschikbaar (bijv. kale tarball) — val terug op bestaand gedrag.
  console.warn(`lastmod: git-historie niet leesbaar (${err.message?.split('\n')[0]}) — fallback op bestaande sitemapwaarden.`);
}

function lastmodForSource(absFile) {
  const rel = path.relative(ROOT, absFile).replace(/\\/g, '/');
  return gitDateByFile.get(rel) || null;
}

// ── lastmod voor pagina's die uit een gedeeld data-bestand komen ────────────
// /sectoren/<x>/, /leads-kopen/<x>/, /werk/<x>/ enz. hebben één bronbestand
// voor alle slugs. De bestandsdatum zou élke wijziging aan één entry naar alle
// pagina's laten doorsijpelen (nepvers-signaal, PR #281). Daarom: datum van de
// laatste commit waarin het tekstblok van DIE entry (van zijn sleutelregel tot
// de volgende sleutelregel) veranderde. Geen git/shallow: null (fallback).
const entryVersionCache = new Map(); // relFile -> [{date, text}] nieuwste eerst
function fileVersions(rel) {
  if (entryVersionCache.has(rel)) return entryVersionCache.get(rel);
  const versions = [];
  if (!isShallow) {
    try {
      const out = execSync(`git log --no-merges --format=%H%x09%cI -- ${rel}`, { cwd: ROOT, encoding: 'utf8' });
      for (const l of out.split('\n').filter(Boolean)) {
        const [hash, iso] = l.split('\t');
        const d = new Date(iso);
        if (isNaN(d.getTime())) continue;
        let text = '';
        try { text = execSync(`git show ${hash}:${rel}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }); } catch (_) { /* bestand bestond niet */ }
        versions.push({ date: d.toISOString().slice(0, 10), text });
      }
    } catch (_) { versions.length = 0; }
  }
  entryVersionCache.set(rel, versions);
  return versions;
}
function entryBlock(text, keyRe, slug) {
  const starts = [...text.matchAll(keyRe)];
  const i = starts.findIndex((m) => m[1] === slug);
  if (i < 0) return '';
  const end = i + 1 < starts.length ? starts[i + 1].index : text.length;
  return text.slice(starts[i].index, end).replace(/\r\n/g, '\n');
}
function lastmodForEntry(absFile, keyRe, slug) {
  const rel = path.relative(ROOT, absFile).split(path.sep).join('/');
  const v = fileVersions(rel);
  if (!v.length) return null;
  const blocks = v.map((x) => entryBlock(x.text, keyRe, slug));
  for (let i = 0; i < v.length - 1; i++) {
    if (blocks[i] !== blocks[i + 1]) return blocks[i] ? v[i].date : null;
  }
  return blocks[v.length - 1] ? v[v.length - 1].date : null;
}
const entryKeyByUrl = new Map(); // URL -> { re, slug }
function lastmodForUrl(u) {
  const src = sourceByUrl.get(u);
  if (!src) return null;
  const e = entryKeyByUrl.get(u);
  return (e ? lastmodForEntry(src, e.re, e.slug) : lastmodForSource(src)) || null;
}
const KEY_SLUG = /^[ \t]*slug:\s*'([^']+)'/gm;
const KEY_KEY = /^[ \t]*key:\s*'([^']+)'/gm;
function setEntry(url, file, re, slug) {
  sourceByUrl.set(url, file);
  entryKeyByUrl.set(url, { re, slug });
}

const files = walk(PAGES_DIR);
const urls = [];
const sourceByUrl = new Map(); // URL → bronbestand, voor lastmod uit git
const skipped = { noindex: [], dynamic: [], excluded: [] };

for (const file of files) {
  if (isDynamicRoute(file)) {
    skipped.dynamic.push(path.relative(ROOT, file));
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  const url = pageToUrl(file);
  if (isNoindex(content)) {
    skipped.noindex.push(url);
    continue;
  }
  if (SITEMAP_EXCLUDE.has(url) || SITEMAP_EXCLUDE_PREFIXES.some((p) => url.startsWith(p))) {
    skipped.excluded.push(url);
    continue;
  }
  urls.push(url);
  sourceByUrl.set(url, file);
}

// Real, indexable pages generated by the voor-[sector].astro dynamic route
// (the source file is skipped by isDynamicRoute). Slugs are derived from the
// data module so new sectors are picked up automatically.
const geoSectorsSrc = fs.readFileSync(path.join(ROOT, 'src', 'data', 'geo-sectors.ts'), 'utf8');
const geoSlugs = Array.from(geoSectorsSrc.matchAll(/slug:\s*'([^']+)'/g)).map((m) => m[1]);
for (const s of geoSlugs) {
  urls.push(`/ai-vindbaarheid/voor-${s}/`);
  setEntry(`/ai-vindbaarheid/voor-${s}/`, path.join(ROOT, 'src', 'data', 'geo-sectors.ts'), KEY_SLUG, s);
}

// /geo-bureau/[regio] en /geo-bureau/sector/[sector] dynamic routes — slugs uit
// geo-regios.ts en geo-sbi-sectoren.ts (zelfde indeling als de GEO Agency Index).
for (const [file, prefix] of [['geo-regios.ts', '/geo-bureau/'], ['geo-sbi-sectoren.ts', '/geo-bureau/sector/']]) {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'data', file), 'utf8');
  for (const m of src.matchAll(/slug:\s*'([^']+)'/g)) {
    urls.push(`${prefix}${m[1]}/`);
    setEntry(`${prefix}${m[1]}/`, path.join(ROOT, 'src', 'data', file), KEY_SLUG, m[1]);
  }
}

// /werk/[site] dynamic route — keys uit resultaten.ts (nieuwe sites auto-included).
const resultatenSrc = fs.readFileSync(path.join(ROOT, 'src', 'data', 'resultaten.ts'), 'utf8');
for (const m of resultatenSrc.matchAll(/^\s+key:\s*'([^']+)'/gm)) {
  urls.push(`/werk/${m[1]}/`);
  setEntry(`/werk/${m[1]}/`, path.join(ROOT, 'src', 'data', 'resultaten.ts'), KEY_KEY, m[1]);
}

// /leads-kopen/[sector] dynamic route — slugs uit lead-sectors.ts (nieuwe branches auto-included).
const leadSectorsSrc = fs.readFileSync(path.join(ROOT, 'src', 'data', 'lead-sectors.ts'), 'utf8');
const leadSlugs = Array.from(leadSectorsSrc.matchAll(/^\s+slug:\s*'([^']+)'/gm)).map((m) => m[1]);
for (const s of leadSlugs) {
  urls.push(`/leads-kopen/${s}/`);
  setEntry(`/leads-kopen/${s}/`, path.join(ROOT, 'src', 'data', 'lead-sectors.ts'), KEY_SLUG, s);
}

// /sectoren/[sector] dynamic route — slugs uit sectors.ts (nieuwe sectoren auto-included).
const sectorsSrc = fs.readFileSync(path.join(ROOT, 'src', 'data', 'sectors.ts'), 'utf8');
const sectorSlugs = Array.from(sectorsSrc.matchAll(/slug:\s*'([^']+)'/g)).map((m) => m[1]);
for (const s of sectorSlugs) {
  urls.push(`/sectoren/${s}/`);
  setEntry(`/sectoren/${s}/`, path.join(ROOT, 'src', 'data', 'sectors.ts'), KEY_SLUG, s);
}

// /kennisbank/[slug] dynamic route — one markdown file per article in
// src/content/kennisbank/. The route file itself is skipped by
// isDynamicRoute(), so md articles are derived directly from the content
// files (draft: true articles are excluded). The 84 hand-written
// src/pages/kennisbank/*.astro articles are already picked up by the normal
// walk() above; this only adds the markdown-sourced ones.
const KENNISBANK_CONTENT_DIR = path.join(ROOT, 'src', 'content', 'kennisbank');
if (fs.existsSync(KENNISBANK_CONTENT_DIR)) {
  const kennisbankFiles = fs.readdirSync(KENNISBANK_CONTENT_DIR).filter((f) => f.endsWith('.md'));
  for (const file of kennisbankFiles) {
    const raw = fs.readFileSync(path.join(KENNISBANK_CONTENT_DIR, file), 'utf8');
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const frontmatter = fmMatch ? fmMatch[1] : '';
    const isDraft = /^draft:\s*true\s*$/m.test(frontmatter);
    if (isDraft) continue;
    const slug = file.replace(/\.md$/, '');
    urls.push(`/kennisbank/${slug}/`);
    sourceByUrl.set(`/kennisbank/${slug}/`, path.join(KENNISBANK_CONTENT_DIR, file));
  }
}

// Centrale noindex-lijst (src/data/noindex-paths.json) — zelfde bron als BaseLayout.
const NOINDEX_LISTED = new Set(
  JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'noindex-paths.json'), 'utf8')).groups.flatMap((g) => g.paths)
);

const uniqueSorted = Array.from(new Set(urls)).filter((u) => !NOINDEX_LISTED.has(u)).sort();

// Preserve existing lastmod values where the URL was already present
const existingXml = fs.existsSync(SITEMAP) ? fs.readFileSync(SITEMAP, 'utf8') : '';
const lastmodMap = new Map();
for (const m of existingXml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) {
  const u = m[1].replace(SITE, '');
  lastmodMap.set(u, m[2]);
}

const xmlLines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
];

for (const u of uniqueSorted) {
  const loc = SITE + u;
  // Voorkeursvolgorde: git-commitdatum van het bronbestand → eerder
  // gepubliceerde waarde → vandaag (alleen voor URL's zonder git-spoor).
  const lastmod = lastmodForUrl(u) || lastmodMap.get(u) || today;
  xmlLines.push(
    `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreqFor(u)}</changefreq><priority>${priorityFor(u)}</priority></url>`
  );
}

// Echte wijzigingsdatum per pad voor BaseLayout (dateModified in JSON-LD): exact
// dezelfde waarde als <lastmod> hierboven, dus de git-commitdatum van het
// bronbestand — nooit "nu" voor ongewijzigde pagina's. Gegenereerd, niet in git.
{
  const pageLastmod = {};
  for (const u of uniqueSorted) {
    const d = lastmodForUrl(u) || lastmodMap.get(u);
    if (d) pageLastmod[u] = String(d).slice(0, 10);
  }
  fs.writeFileSync(path.join(ROOT, 'src', 'data', 'page-lastmod.json'), JSON.stringify(pageLastmod));
}

xmlLines.push('</urlset>');
xmlLines.push('');

fs.writeFileSync(SITEMAP, xmlLines.join('\n'));

console.log(`Wrote ${uniqueSorted.length} URLs to public/sitemap.xml`);
// Histogram in de buildlog: één regel per lastmod-datum. Eén enkele datum
// over alle URL's is vrijwel altijd een symptoom (shallow checkout,
// tijdzone-drift, lege git-map) — zo is dat in CI direct zichtbaar.
{
  const hist = {};
  for (const u of uniqueSorted) {
    const d = lastmodForUrl(u) || lastmodMap.get(u) || today;
    hist[d] = (hist[d] || 0) + 1;
  }
  const dates = Object.keys(hist).sort();
  console.log(`lastmod-histogram (git-map: ${gitDateByFile.size} bestanden): ` + dates.map((d) => `${d}×${hist[d]}`).join(' '));
  if (dates.length === 1) {
    console.warn('lastmod: alle URL\'s hebben dezelfde datum — controleer fetch-depth/git-historie in deze omgeving.');
  }
}
console.log(`Skipped noindex (${skipped.noindex.length}): ${skipped.noindex.join(', ')}`);
console.log(`Skipped dynamic (${skipped.dynamic.length}): ${skipped.dynamic.join(', ')}`);
console.log(`Skipped excluded (${skipped.excluded.length}): ${skipped.excluded.join(', ')}`);

// ── image-sitemap.xml synchroon houden ──────────────────────────────────────
// Die file wordt met de hand bijgehouden en liep uit de pas: hij bevatte
// /prijzen/ (301 naar /tarieven/), /aanvragen/ (noindex) en vijf kennisbank-
// slugs die niet meer bestaan. Semrush meldde dat als "Non-canonical URL in
// sitemap". Een sitemap hoort alleen canonieke 200-URL's te bevatten, dus
// snoeit deze stap elk <url>-blok waarvan de loc niet in sitemap.xml staat.
const IMAGE_SITEMAP = path.join(ROOT, 'public', 'image-sitemap.xml');
if (fs.existsSync(IMAGE_SITEMAP)) {
  const canonical = new Set(uniqueSorted.map((u) => SITE + u));
  const xml = fs.readFileSync(IMAGE_SITEMAP, 'utf8');
  const removed = [];
  const pruned = xml.replace(/[ \t]*<url>[\s\S]*?<\/url>\n?/g, (block) => {
    const loc = block.match(/<loc>([^<]+)<\/loc>/);
    if (loc && !canonical.has(loc[1])) {
      removed.push(loc[1]);
      return '';
    }
    return block;
  });
  if (removed.length) {
    fs.writeFileSync(IMAGE_SITEMAP, pruned);
    console.log(`Pruned ${removed.length} niet-canonieke URL(s) uit image-sitemap.xml:`);
    removed.forEach((u) => console.log(`  - ${u}`));
  } else {
    console.log('image-sitemap.xml: alle URLs canoniek.');
  }
}

#!/usr/bin/env node
/**
 * Internal Link Audit — Q2.H (one-shot analyse, geen runtime caller)
 *
 * Walks all `dist/**\/index.html` (and dist/*.html), extracts every internal <a href>,
 * builds a directed graph, calculates incoming/outgoing counts per page, runs a BFS
 * from `/` to compute click-depth, identifies semi-orphans (incoming < 2 from
 * non-structural pages) and deepest pages (depth > 3).
 *
 * Reads:  dist/**\/*.html  (post-build static HTML, public routes only)
 * Writes: developing/INTERNAL-LINK-AUDIT-2026-05-07.md
 *
 * Run: node scratch/internal-link-audit.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\Users\\Hallo\\OneDrive\\Claude\\AGA\\aanloop';
const DIST = path.join(ROOT, 'dist');
const REPORT = path.join(ROOT, 'developing', 'INTERNAL-LINK-AUDIT-2026-05-07.md');

const SITE_HOSTS = new Set(['aanloopai.nl', 'www.aanloopai.nl']);
const STATIC_EXT = /\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|xml|txt|json|webmanifest|css|js|mjs)$/i;

// ---------- 1. Discover pages ------------------------------------------------
function walk(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['_astro', 'og', 'brand', '.well-known'].includes(e.name)) continue;
      walk(p, acc);
    } else if (e.isFile() && e.name.endsWith('.html')) {
      acc.push(p);
    }
  }
  return acc;
}

const htmlFiles = walk(DIST);

function fileToRoute(file) {
  const rel = path.relative(DIST, file).split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  if (rel.endsWith('.html')) return '/' + rel.slice(0, -'.html'.length);
  return '/' + rel;
}

const pages = new Set();
const fileMap = new Map();
for (const f of htmlFiles) {
  const r = fileToRoute(f);
  pages.add(r);
  fileMap.set(r, f);
}

// ---------- 2. Normalize a target href to a known route ----------------------
function normalizeHref(href, currentRoute) {
  if (!href) return null;
  href = href.trim();
  if (!href) return null;

  const hashIdx = href.indexOf('#');
  if (hashIdx === 0) return null;
  if (hashIdx > 0) href = href.slice(0, hashIdx);

  const qIdx = href.indexOf('?');
  if (qIdx >= 0) href = href.slice(0, qIdx);

  if (!href) return null;
  if (/^(mailto:|tel:|javascript:|sms:|whatsapp:|data:)/i.test(href)) return null;

  if (/^https?:\/\//i.test(href)) {
    try {
      const u = new URL(href);
      if (!SITE_HOSTS.has(u.hostname)) return null;
      href = u.pathname;
    } catch { return null; }
  }

  if (STATIC_EXT.test(href)) return null;

  if (!href.startsWith('/')) {
    const base = currentRoute.endsWith('/') ? currentRoute : currentRoute + '/';
    href = path.posix.normalize(base + href);
  }

  if (href !== '/' && !href.endsWith('/')) href = href + '/';

  if (pages.has(href)) return href;
  const noSlash = href.replace(/\/$/, '');
  if (pages.has(noSlash)) return noSlash;
  return href;
}

// ---------- 3. Extract <a> hrefs from HTML -----------------------------------
const anchorRe = /<a\b[^>]*\bhref\s*=\s*("([^"]*)"|'([^']*)')[^>]*>/gi;

function extractLinks(html) {
  const out = [];
  let m;
  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[2] !== undefined ? m[2] : m[3];
    out.push(href);
  }
  return out;
}

// ---------- 4. Identify structural blocks (Header/Footer) --------------------
const linkOccurrence = new Map();
const outgoing = new Map();

for (const file of htmlFiles) {
  const route = fileToRoute(file);
  const html = fs.readFileSync(file, 'utf8');
  const hrefs = extractLinks(html);

  const targetCounts = new Map();
  for (const raw of hrefs) {
    const t = normalizeHref(raw, route);
    if (!t) continue;
    if (t === route) continue;
    targetCounts.set(t, (targetCounts.get(t) || 0) + 1);
  }

  outgoing.set(route, targetCounts);
  for (const t of targetCounts.keys()) {
    if (!linkOccurrence.has(t)) linkOccurrence.set(t, new Set());
    linkOccurrence.get(t).add(route);
  }
}

const totalPages = pages.size;
const STRUCTURAL_THRESHOLD = 0.8 * totalPages;

const structuralTargets = new Set();
for (const [t, srcs] of linkOccurrence) {
  if (srcs.size >= STRUCTURAL_THRESHOLD) structuralTargets.add(t);
}

// ---------- 5. Build incoming counts (structural counted as 1 bucket) --------
const incomingTotal = new Map();
const incomingSourcesNonStructural = new Map();

for (const [src, targets] of outgoing) {
  for (const t of targets.keys()) {
    incomingTotal.set(t, (incomingTotal.get(t) || 0) + 1);
  }
}

for (const [src, targets] of outgoing) {
  for (const t of targets.keys()) {
    if (structuralTargets.has(t)) continue;
    if (!incomingSourcesNonStructural.has(t)) incomingSourcesNonStructural.set(t, new Set());
    incomingSourcesNonStructural.get(t).add(src);
  }
}

function incomingNonStructCount(t) {
  if (structuralTargets.has(t)) return Infinity;
  return incomingSourcesNonStructural.get(t)?.size || 0;
}

// ---------- 6. BFS click-depth from / ----------------------------------------
const depth = new Map();
depth.set('/', 0);
const queue = ['/'];
while (queue.length) {
  const u = queue.shift();
  const d = depth.get(u);
  const out = outgoing.get(u);
  if (!out) continue;
  for (const v of out.keys()) {
    if (!pages.has(v)) continue;
    if (!depth.has(v)) {
      depth.set(v, d + 1);
      queue.push(v);
    }
  }
}

const unreachable = [];
for (const p of pages) {
  if (!depth.has(p)) unreachable.push(p);
}

// ---------- 7. Aggregates & rankings -----------------------------------------
const pageStats = [];
for (const p of pages) {
  const d = depth.has(p) ? depth.get(p) : Infinity;
  const inNS = incomingNonStructCount(p);
  const inTotal = incomingTotal.get(p) || 0;
  const out = outgoing.get(p);
  const outCount = out ? out.size : 0;
  pageStats.push({
    route: p,
    depth: d,
    incomingNonStructural: inNS === Infinity ? 'structural' : inNS,
    incomingTotal: inTotal,
    outgoing: outCount,
    isStructural: structuralTargets.has(p),
  });
}

// Expected-orphan routes (form-confirmation, error pages, ephemeral flow steps).
// These are intentionally not linked from regular content.
const EXPECTED_ORPHAN_RE = /^\/(404|bedankt|demo-bedankt|demo-bevestigd|demo-herplannen|brand|og|google[a-z0-9]+|e[a-f0-9]{30,})(\/|$)/i;
function isExpectedOrphan(route) {
  return EXPECTED_ORPHAN_RE.test(route);
}

const semiOrphansAll = pageStats
  .filter(s => !s.isStructural && s.route !== '/' && typeof s.incomingNonStructural === 'number' && s.incomingNonStructural < 2)
  .sort((a, b) => a.incomingNonStructural - b.incomingNonStructural || a.route.localeCompare(b.route));

const semiOrphans = semiOrphansAll.filter(s => !isExpectedOrphan(s.route));
const expectedOrphans = semiOrphansAll.filter(s => isExpectedOrphan(s.route));

const deepPages = pageStats
  .filter(s => typeof s.depth === 'number' && Number.isFinite(s.depth) && s.depth > 3)
  .sort((a, b) => b.depth - a.depth || a.route.localeCompare(b.route));

const nonStructStats = pageStats.filter(s => typeof s.incomingNonStructural === 'number');
const avgIncomingNS = nonStructStats.reduce((a, s) => a + s.incomingNonStructural, 0) / Math.max(1, nonStructStats.length);
const maxDepth = pageStats.filter(s => Number.isFinite(s.depth)).reduce((m, s) => Math.max(m, s.depth), 0);

// ---------- 8. Remediation suggestions ---------------------------------------
function pickAnchorText(route) {
  const slug = route.replace(/^\/|\/$/g, '').split('/').pop() || route;
  // Try to read <title> or first <h1> from the file
  const f = fileMap.get(route);
  if (f) {
    try {
      const html = fs.readFileSync(f, 'utf8');
      const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
      if (h1) {
        const text = h1[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (text && text.length < 80) return text;
      }
      const tt = html.match(/<title>([\s\S]*?)<\/title>/i);
      if (tt) {
        let text = tt[1].replace(/\s+/g, ' ').trim();
        text = text.replace(/\s*[\|\-–—]\s*Aanloop AI.*$/, '').trim();
        if (text && text.length < 80) return text;
      }
    } catch { /* ignore */ }
  }
  return slug.replace(/-/g, ' ');
}

function pickSection(route) {
  if (route.startsWith('/sectoren/')) return 'related-sectors block aan einde van de page';
  if (route.startsWith('/diensten/')) return 'related-services / "Andere AI-oplossingen" sectie';
  if (route.startsWith('/locaties/')) return 'regio-cluster sectie of nearby-locaties block';
  if (route.startsWith('/kennisbank/')) return 'related-articles block onder de hoofd-content';
  if (route.startsWith('/onderzoek/')) return 'CTA-block "Lees ook ons onderzoek"';
  if (route.startsWith('/cases/')) return 'related-cases block';
  return 'in-content body waar het topic ter sprake komt';
}

// Map slug-keywords to candidate source-pages (semantic-match).
// Order: more specific -> generic. Returns the first source that exists & differs.
function relatedSource(target) {
  const segs = target.replace(/^\/|\/$/g, '').split('/');
  const slug = segs[segs.length - 1] || '';
  const tokens = slug.split('-');

  // Slug-token to source-page heuristic
  const tokenMap = [
    [['pensioen', 'pensioenadviseur'], '/kennisbank/ai-pensioenadviseur-nederland/'],
    [['hypotheek', 'hypotheekadviseur'], '/kennisbank/ai-hypotheekadviseur-nederland/'],
    [['financieel', 'planner'], '/kennisbank/ai-financieel-planner-nederland/'],
    [['accountant', 'accountancy', 'boekhouding'], '/sectoren/accountancy/'],
    [['advocaat', 'advocaten', 'jurist'], '/sectoren/ai-voor-advocaten/'],
    [['webshop', 'ecommerce', 'shopify', 'woocommerce'], '/sectoren/ai-voor-webshops/'],
    [['zzp', 'eenmanszaak'], '/sectoren/ai-voor-zzp/'],
    [['bouw', 'aannemer'], '/sectoren/bouw/'],
    [['horeca', 'restaurant'], '/sectoren/horeca/'],
    [['detailhandel', 'retail'], '/sectoren/detailhandel/'],
    [['logistiek', 'transport'], '/sectoren/logistiek/'],
    [['vastgoed', 'makelaar'], '/sectoren/vastgoed/'],
    [['zakelijk', 'b2b'], '/sectoren/zakelijk/'],
    [['zorg', 'huisarts', 'fysio', 'tandarts'], '/sectoren/zorg/'],
    [['receptionist', 'telefoon', 'telefonie'], '/diensten/telefoon-assistent/'],
    [['chatbot'], '/diensten/ai-chatbot-website/'],
    [['email', 'mail'], '/diensten/ai-email-assistent/'],
    [['lead', 'leadgen'], '/diensten/ai-lead-qualification/'],
    [['klantenservice', 'omnichannel'], '/diensten/ai-klantenservice-omnichannel/'],
    [['recruitment', 'hr'], '/diensten/ai-hr-recruitment/'],
    [['social', 'media'], '/diensten/ai-social-media-agent/'],
    [['document'], '/diensten/ai-document-processing/'],
    [['outbound', 'verkoop'], '/diensten/ai-verkoopagent-outbound/'],
    [['seo', 'content'], '/diensten/ai-seo-content-generator/'],
    [['afspraken', 'planning'], '/diensten/ai-afspraken-inplannen/'],
  ];

  for (const [keywords, src] of tokenMap) {
    if (tokens.some(t => keywords.includes(t)) && pages.has(src) && src !== target) return src;
  }

  // Parent fallback
  if (segs.length >= 2) {
    const parent = '/' + segs.slice(0, -1).join('/') + '/';
    if (pages.has(parent) && parent !== target) return parent;
  }

  // Cluster index fallback
  if (target.startsWith('/sectoren/')) return '/sectoren/';
  if (target.startsWith('/diensten/')) return '/diensten/';
  if (target.startsWith('/kennisbank/')) return '/kennisbank/';
  if (target.startsWith('/locaties/')) return '/locaties/';
  if (target.startsWith('/onderzoek/')) return '/onderzoek/';
  if (target.startsWith('/cases/')) return '/cases/';

  return '/';
}

const remediations = semiOrphans.slice(0, 10).map(s => {
  const source = relatedSource(s.route);
  return {
    source,
    target: s.route,
    anchorText: pickAnchorText(s.route),
    section: pickSection(s.route),
    reason: `${s.route} heeft slechts ${s.incomingNonStructural} non-structural incoming link(s); depth ${s.depth}.`,
  };
});

// ---------- 9. Build report markdown -----------------------------------------
function fmtRow(cells) { return '| ' + cells.join(' | ') + ' |'; }

const lines = [];
lines.push('# Internal Link Audit — 2026-05-07');
lines.push('');
lines.push('> Q2.H click-depth + semi-orphan analyse op de gebouwde site (`dist/`). Alleen analyse, geen page-edits.');
lines.push('');
lines.push('## 1. Overall stats');
lines.push('');
lines.push(`- **Totaal pages (HTML in dist):** ${totalPages}`);
lines.push(`- **Gemiddeld incoming links per page (non-structural):** ${avgIncomingNS.toFixed(2)}`);
lines.push(`- **Max click-depth vanaf homepage:** ${maxDepth}`);
lines.push(`- **Aantal structural targets (header/footer/layout, gepresent op >=80% van pages):** ${structuralTargets.size}`);
lines.push(`- **Aantal semi-orphans (non-structural incoming < 2, na expected-filter):** ${semiOrphans.length}`);
lines.push(`- **Aantal expected-orphans (404/bedankt/demo-confirm/og — bewust niet gelinkt):** ${expectedOrphans.length}`);
lines.push(`- **Aantal diepe pages (depth > 3):** ${deepPages.length}`);
lines.push(`- **Aantal unreachable pages (geen pad vanaf /):** ${unreachable.length}`);
lines.push('');
if (unreachable.length) {
  lines.push('### Unreachable pages (geen pad vanaf homepage)');
  lines.push('');
  for (const u of unreachable.slice(0, 30)) {
    const tag = isExpectedOrphan(u) ? ' _(expected — flow/error page)_' : ' _(NEEDS REVIEW)_';
    lines.push('- `' + u + '`' + tag);
  }
  lines.push('');
}

if (expectedOrphans.length) {
  lines.push('### Expected-orphans (whitelist — bewust niet gelinkt vanuit content)');
  lines.push('');
  for (const s of expectedOrphans) lines.push('- `' + s.route + '` (incoming non-struct: ' + s.incomingNonStructural + ')');
  lines.push('');
}

lines.push('## 2. Top 20 semi-orphans (lowest non-structural incoming)');
lines.push('');
lines.push(fmtRow(['#', 'Route', 'Non-struct in', 'Total in', 'Out', 'Depth']));
lines.push(fmtRow(['---', '---', '---', '---', '---', '---']));
const top20 = semiOrphans.slice(0, 20);
top20.forEach((s, i) => {
  lines.push(fmtRow([
    String(i + 1),
    '`' + s.route + '`',
    String(s.incomingNonStructural),
    String(s.incomingTotal),
    String(s.outgoing),
    Number.isFinite(s.depth) ? String(s.depth) : 'unreachable',
  ]));
});
lines.push('');

lines.push('## 3. Top 10 deepest pages (depth > 3)');
lines.push('');
if (deepPages.length === 0) {
  lines.push('_Geen pages met depth > 3 — site is plat._');
} else {
  lines.push(fmtRow(['#', 'Route', 'Depth', 'Non-struct in', 'Out']));
  lines.push(fmtRow(['---', '---', '---', '---', '---']));
  deepPages.slice(0, 10).forEach((s, i) => {
    lines.push(fmtRow([
      String(i + 1),
      '`' + s.route + '`',
      String(s.depth),
      String(s.incomingNonStructural),
      String(s.outgoing),
    ]));
  });
}
lines.push('');

lines.push('## 4. Concrete remediatie-suggesties (top 10)');
lines.push('');
lines.push('Voeg per remediatie een in-content link toe in de aangegeven sectie van de source-page.');
lines.push('');
lines.push(fmtRow(['#', 'Source-page', 'Target (orphan)', 'Anchor-text suggestie', 'Sectie', 'Reden']));
lines.push(fmtRow(['---', '---', '---', '---', '---', '---']));
remediations.forEach((r, i) => {
  lines.push(fmtRow([
    String(i + 1),
    '`' + r.source + '`',
    '`' + r.target + '`',
    `"${r.anchorText}"`,
    r.section,
    r.reason,
  ]));
});
lines.push('');

lines.push('## 5. Methodiek');
lines.push('');
lines.push('- **Source:** alle `dist/**/*.html` (post-build, render uitgepakt incl. layout/header/footer).');
lines.push('- **Anchor-extract:** regex `<a ... href=...>`, intern = relative of `aanloopai.nl|www.aanloopai.nl`.');
lines.push('- **Filter:** `mailto:`, `tel:`, fragment-only, statische assets (png/svg/pdf/xml/...) genegeerd.');
lines.push('- **Structural detection:** target gepresent op >= 80% van pages -> structureel (header/footer/layout).');
lines.push('- **Semi-orphan:** non-structural target met < 2 unieke non-structural incoming sources.');
lines.push('- **Click-depth:** BFS vanaf `/`, alleen via outgoing links die naar bekende routes verwijzen.');
lines.push('- **Self-links uitgesloten** uit incoming-count.');
lines.push('');
lines.push('## 6. Caveats');
lines.push('');
lines.push('- Structural targets krijgen geen orphan-flag (al bereikbaar via footer). Hun in-content depth kan alsnog > 3 zijn als de footer-link niet als kortste pad telt — maar BFS pakt sowieso de kortste, dus footer-bereikbare pages zitten op depth 1 of 2.');
lines.push('- "Incoming non-structural" telt slechts unieke source-pages, niet aantal occurrences per page.');
lines.push('- Remediatie-suggesties zijn heuristisch (parent-pad als source). Voor elke voorgestelde edit: lees de source-page en controleer contextuele plaatsing.');
lines.push('');

fs.writeFileSync(REPORT, lines.join('\n'), 'utf8');

console.log(JSON.stringify({
  totalPages,
  semiOrphansCount: semiOrphans.length,
  deepPagesCount: deepPages.length,
  unreachable: unreachable.length,
  structuralTargets: structuralTargets.size,
  avgIncomingNS: Number(avgIncomingNS.toFixed(2)),
  maxDepth,
  reportPath: REPORT,
  top3Remediations: remediations.slice(0, 3),
}, null, 2));

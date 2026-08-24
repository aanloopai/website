#!/usr/bin/env node
/**
 * check-meta.mjs — on-page metadata-bewaking over de gebouwde site.
 *
 * Controleert per dist/**\/*.html (na astro build):
 *   - precies één <title>, lengte ≤ 60 tekens;
 *   - precies één meta description, lengte 110–155 tekens;
 *   - geen twee pagina's met dezelfde title of description;
 *   - precies één <h1> in de gerenderde HTML (Ahrefs 2026-08-24: dubbele H1
 *     op /kennisbank/ai-automatisering-voor-mkb/ door een #-kop in de
 *     markdown bovenop de hero-H1).
 *
 * Noindex-pagina's (meta robots noindex) slaan we over voor de
 * lengte-eisen — die concurreren niet in de zoekresultaten — maar de
 * H1-regel geldt overal.
 *
 * Gebruik:  node scripts/check-meta.mjs          → fouten = exit 1 (CI-stap)
 *           node scripts/check-meta.mjs --warn   → alleen rapporteren
 */

import fs from 'node:fs';
import path from 'node:path';

const DIST = path.join(process.cwd(), 'dist');
const WARN_ONLY = process.argv.includes('--warn');

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

const errors = [];
const titles = new Map();
const descriptions = new Map();
let pages = 0;

for (const file of walk(DIST)) {
  const rel = path.relative(DIST, file).replace(/\\/g, '/');
  // 404-pagina en search-console-verificatiebestanden dingen niet mee.
  if (rel === '404.html' || /^google[0-9a-f]+\.html$/.test(rel)) continue;
  const html = fs.readFileSync(file, 'utf8');
  pages++;

  const noindex = /<meta name="robots" content="[^"]*noindex/i.test(html);

  const titleMatches = [...html.matchAll(/<title>([\s\S]*?)<\/title>/g)];
  const descMatches = [...html.matchAll(/<meta name="description" content="([^"]*)"/g)];
  const h1Count = (html.match(/<h1[\s>]/g) || []).length;

  if (titleMatches.length !== 1) errors.push(`${rel}: ${titleMatches.length} <title>-tags (verwacht 1)`);
  // Noindex-pagina's (admin, portal, bedanktpagina's) hoeven geen description.
  if (!noindex && descMatches.length !== 1) errors.push(`${rel}: ${descMatches.length} meta descriptions (verwacht 1)`);
  if (h1Count !== 1 && !noindex) errors.push(`${rel}: ${h1Count} <h1>-elementen (verwacht 1)`);

  const title = titleMatches[0]?.[1]?.trim() ?? '';
  const desc = descMatches[0]?.[1]?.trim() ?? '';

  if (!noindex) {
    if (title && title.length > 60) errors.push(`${rel}: title ${title.length} tekens (> 60): "${title}"`);
    if (desc && (desc.length < 110 || desc.length > 155)) {
      errors.push(`${rel}: description ${desc.length} tekens (buiten 110–155): "${desc.slice(0, 80)}…"`);
    }
    if (title) {
      if (titles.has(title)) errors.push(`${rel}: title dupliceert ${titles.get(title)}: "${title}"`);
      else titles.set(title, rel);
    }
    if (desc) {
      if (descriptions.has(desc)) errors.push(`${rel}: description dupliceert ${descriptions.get(desc)}`);
      else descriptions.set(desc, rel);
    }
  }
}

console.log(`check-meta: ${pages} pagina's gecontroleerd, ${errors.length} bevinding(en).`);
for (const e of errors) console.log('  - ' + e);
if (errors.length && !WARN_ONLY) process.exit(1);

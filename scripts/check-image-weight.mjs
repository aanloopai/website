#!/usr/bin/env node
/**
 * check-image-weight.mjs — faalt wanneer een pagina in dist/ een raster
 * groter dan 300 KB insluit (img src, srcset, poster, og:image, CSS url()).
 *
 * Bewust géén kale "geen bestand > 300 KB in public/"-check: de PNG's onder
 * public/social-feed/ zijn brondmateriaal voor de Instagram-pipeline
 * (raw.githubusercontent-URL's in marketing/instagram/*-schedule.json) en
 * moeten in vol formaat blijven bestaan. Wat telt is wat een bezoeker
 * daadwerkelijk gedownload krijgt — dus wat HTML refereert.
 *
 * Gebruik:  node scripts/check-image-weight.mjs   (na astro build; CI-stap)
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const LIMIT = 300 * 1024;

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

const refRe = /(?:src|href|poster|content)="(\/[^"]+\.(?:png|jpe?g|webp|avif|gif))"|url\((\/[^)]+\.(?:png|jpe?g|webp|avif|gif))\)|(?:src|poster)=\{?"?(\/[^"'\s}]+\.(?:png|jpe?g|webp|avif|gif))/gi;

const errors = [];
const seen = new Map(); // imgpad → eerste pagina die hem refereert

for (const file of walk(DIST)) {
  const rel = path.relative(DIST, file).replace(/\\/g, '/');
  const html = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = refRe.exec(html)) !== null) {
    const imgUrl = (m[1] || m[2] || m[3] || '').split('?')[0];
    if (!imgUrl || seen.has(imgUrl)) continue;
    seen.set(imgUrl, rel);
    const imgFile = path.join(DIST, imgUrl.replace(/^\//, ''));
    if (!fs.existsSync(imgFile)) continue;
    const size = fs.statSync(imgFile).size;
    if (size > LIMIT) {
      errors.push(`${rel} refereert ${imgUrl} (${(size / 1024).toFixed(0)} KB > 300 KB) — draai scripts/optimize-images.mjs en verwijs naar de .webp`);
    }
  }
}

console.log(`check-image-weight: ${seen.size} unieke afbeeldingsreferenties gecontroleerd.`);
if (errors.length) {
  console.error(`${errors.length} te zware referentie(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('Geen pagina verwijst naar een raster > 300 KB.');

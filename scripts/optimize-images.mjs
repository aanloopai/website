#!/usr/bin/env node
/**
 * optimize-images.mjs — WebP-varianten voor zware rasters in public/.
 *
 * Voor elke .png/.jpg/.jpeg in public/ groter dan 300 KB wordt een .webp
 * naast het origineel gezet (max 1600 px breed, kwaliteit 80). Het origineel
 * blijft ONAANGEROERD: de PNG's onder public/social-feed/ worden door de
 * Instagram-publishpipeline geconsumeerd via
 * raw.githubusercontent.com/.../public/social-feed (zie
 * marketing/instagram/*-schedule.json → image_base_url) — hernoemen of
 * vervangen breekt geplande IG-posts. Sitepagina's horen naar de
 * .webp-variant te verwijzen; scripts/check-meta.mjs' zusje
 * check-image-weight.mjs bewaakt dat.
 *
 * Gebruik:  node scripts/optimize-images.mjs           → schrijft varianten
 *           node scripts/optimize-images.mjs --dry-run → alleen rapporteren
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const PUBLIC = path.join(process.cwd(), 'public');
const LIMIT = 300 * 1024;
const MAX_WIDTH = 1600;
const QUALITY = 80;
const DRY = process.argv.includes('--dry-run');

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(png|jpe?g)$/i.test(e.name)) yield p;
  }
}

let made = 0, skipped = 0, total = 0;
for (const file of walk(PUBLIC)) {
  const size = fs.statSync(file).size;
  if (size <= LIMIT) continue;
  total++;
  const webp = file.replace(/\.(png|jpe?g)$/i, '.webp');
  if (fs.existsSync(webp) && fs.statSync(webp).mtimeMs >= fs.statSync(file).mtimeMs) {
    skipped++;
    continue;
  }
  const rel = path.relative(PUBLIC, file).replace(/\\/g, '/');
  if (DRY) {
    console.log(`zou maken: ${rel} (${(size / 1024).toFixed(0)} KB) → .webp`);
    continue;
  }
  const img = sharp(file);
  const meta = await img.metadata();
  await img
    .resize({ width: Math.min(meta.width ?? MAX_WIDTH, MAX_WIDTH), withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(webp);
  const newSize = fs.statSync(webp).size;
  console.log(`${rel}: ${(size / 1024).toFixed(0)} KB → ${(newSize / 1024).toFixed(0)} KB (webp)`);
  made++;
}
console.log(`optimize-images: ${total} zware rasters, ${made} webp gemaakt, ${skipped} al actueel.`);

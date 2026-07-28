#!/usr/bin/env node
/**
 * Verwijdert HTML-commentaar uit de gebouwde pagina's.
 *
 * De bron staat vol met uitleg-commentaar — nuttig in de repo, maar het reisde
 * op elke pagina mee: ~4,5 KB ruw en ~2 KB gzip per pagina, op 253 pagina's.
 * Astro's compressHTML haalt witruimte weg, geen commentaar.
 *
 * Wat NIET aangeraakt wordt: de inhoud van <script>, <style>, <pre>, <code> en
 * <textarea>. Daar kan "<!--" als tekst of als code-voorbeeld staan; die blokken
 * worden eerst gemaskeerd en daarna teruggezet. Conditional comments
 * (<!--[if IE]>) worden bewust overgeslagen.
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const PROTECT = /<(script|style|pre|code|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi;
const COMMENT = /<!--(?!\[if)[\s\S]*?-->/g;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

if (!fs.existsSync(DIST)) {
  console.error('[strip-html-comments] dist/ bestaat niet — draai eerst de build.');
  process.exit(1);
}

const files = walk(DIST);
let before = 0;
let after = 0;
let stripped = 0;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  const guarded = [];
  const masked = original.replace(PROTECT, (m) => {
    guarded.push(m);
    return `\u0000GUARD${guarded.length - 1}\u0000`;
  });

  let count = 0;
  const cleaned = masked.replace(COMMENT, () => {
    count++;
    return '';
  });

  const restored = cleaned.replace(/\u0000GUARD(\d+)\u0000/g, (_, i) => guarded[Number(i)]);

  before += Buffer.byteLength(original);
  after += Buffer.byteLength(restored);
  stripped += count;

  if (restored !== original) fs.writeFileSync(file, restored);
}

const saved = (before - after) / 1024;
console.log(
  `[strip-html-comments] ${files.length} pagina's, ${stripped} commentaarblokken weg, ` +
    `${saved.toFixed(1)} KB ruw bespaard (${(saved / files.length).toFixed(1)} KB per pagina)`
);

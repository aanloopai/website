#!/usr/bin/env node
// Meet per gebouwde pagina de verhouding zichtbare tekst / totale HTML, plus
// waar de bytes zitten (inline <style>, inline <script>, JSON-LD, inline SVG).
// Semrush noemt een pagina "low text-HTML ratio" onder ongeveer 10%.
//
//   node scripts/text-html-ratio.cjs           # 15 zwaarste pagina's
//   node scripts/text-html-ratio.cjs --all     # alles, csv-achtig
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const showAll = process.argv.includes('--all');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

const sizeOf = (html, re) => [...html.matchAll(re)].reduce((n, m) => n + m[0].length, 0);
const kb = (n) => (n / 1024).toFixed(1);

const rows = walk(DIST)
  .filter((f) => !f.includes(`${path.sep}admin${path.sep}`) && !f.includes(`${path.sep}portal${path.sep}`))
  .map((file) => {
    const html = fs.readFileSync(file, 'utf8');
    const total = Buffer.byteLength(html);
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      rel: path.relative(DIST, file).replace(/\\/g, '/'),
      total,
      text: Buffer.byteLength(text),
      ratio: (Buffer.byteLength(text) / total) * 100,
      style: sizeOf(html, /<style[\s\S]*?<\/style>/gi),
      script: sizeOf(html, /<script(?![^>]*ld\+json)[\s\S]*?<\/script>/gi),
      jsonld: sizeOf(html, /<script[^>]*ld\+json[\s\S]*?<\/script>/gi),
      svg: sizeOf(html, /<svg[\s\S]*?<\/svg>/gi),
    };
  })
  .sort((a, b) => b.total - a.total);

const shown = showAll ? rows : rows.slice(0, 15);
console.log('pagina'.padEnd(58), 'totaal'.padStart(8), 'tekst'.padStart(8), 'ratio'.padStart(7), 'style'.padStart(7), 'script'.padStart(7), 'jsonld'.padStart(7), 'svg'.padStart(7));
for (const r of shown) {
  console.log(
    r.rel.slice(0, 57).padEnd(58),
    (kb(r.total) + 'K').padStart(8),
    (kb(r.text) + 'K').padStart(8),
    (r.ratio.toFixed(1) + '%').padStart(7),
    (kb(r.style) + 'K').padStart(7),
    (kb(r.script) + 'K').padStart(7),
    (kb(r.jsonld) + 'K').padStart(7),
    (kb(r.svg) + 'K').padStart(7)
  );
}

const low = rows.filter((r) => r.ratio < 10).length;
const totalBytes = rows.reduce((n, r) => n + r.total, 0);
console.log(`\n${rows.length} pagina's · ${kb(totalBytes)} KB totaal · gemiddelde ratio ${(rows.reduce((n, r) => n + r.ratio, 0) / rows.length).toFixed(1)}% · ${low} pagina's onder 10%`);

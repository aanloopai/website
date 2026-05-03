#!/usr/bin/env node
// One-shot helper:
//  1) Remove broken `linkedin.com/company/aanloop-ai` from every kennisbank article's sameAs array
//  2) Diversify datePublished (spread 6 months back) + dateModified (recent 30 days)
//     — deterministic hash by filename so the spread is stable across runs.
//
// Idempotent for (1). For (2): only touches uniform dates 2026-05-01 / 02 / 03 / 04 / 07.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const KENNISBANK = path.join(ROOT, 'src/pages/kennisbank');

const PUBLISH_RANGE_START = new Date('2025-11-01').getTime();
const PUBLISH_RANGE_END   = new Date('2026-04-30').getTime();
const MODIFIED_RANGE_START = new Date('2026-04-04').getTime();
const MODIFIED_RANGE_END   = new Date('2026-05-03').getTime();

const UNIFORM_DATES = ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-07'];

function fractionToISO(start, end, frac) {
  const ms = start + (end - start) * frac;
  return new Date(ms).toISOString().slice(0, 10);
}

function dateForFile(filename, isModified) {
  const h = crypto.createHash('sha256').update(filename + (isModified ? '|mod' : '|pub')).digest();
  const n = h.readUInt32BE(0);
  const frac = n / 0xffffffff;
  return fractionToISO(
    isModified ? MODIFIED_RANGE_START : PUBLISH_RANGE_START,
    isModified ? MODIFIED_RANGE_END   : PUBLISH_RANGE_END,
    frac,
  );
}

let linkedinFixed = 0;
let datesFixed = 0;

const files = fs.readdirSync(KENNISBANK).filter((f) => f.endsWith('.astro'));

for (const file of files) {
  const p = path.join(KENNISBANK, file);
  let src = fs.readFileSync(p, 'utf8');
  const before = src;

  // 1) Strip broken LinkedIn company URL from sameAs arrays.
  // Patterns: 'https://www.linkedin.com/company/aanloop-ai', / "https://www.linkedin.com/company/aanloop-ai",
  // Optional trailing comma+space. Followed by potential cleanup of stray commas.
  const linkedinPatterns = [
    /'https:\/\/www\.linkedin\.com\/company\/aanloop-ai',?\s*/g,
    /"https:\/\/www\.linkedin\.com\/company\/aanloop-ai",?\s*/g,
  ];
  for (const pat of linkedinPatterns) {
    src = src.replace(pat, '');
  }
  // Tidy doubled commas / leading-comma-before-bracket from removal
  src = src.replace(/,\s*,/g, ',');
  src = src.replace(/\[\s*,\s*/g, '[');
  src = src.replace(/,\s*\]/g, ']');
  if (src !== before) linkedinFixed++;

  // 2) Diversify dates ONLY when matching one of UNIFORM_DATES
  const fileBase = file.replace(/\.astro$/, '');
  const newPub = dateForFile(fileBase, false);
  const newModRaw = dateForFile(fileBase, true);
  const newMod = newModRaw < newPub ? '2026-04-30' : newModRaw;

  let dateChanged = false;
  for (const uniform of UNIFORM_DATES) {
    const pubSingleRe = new RegExp("datePublished:\\s*'" + uniform + "'", 'g');
    const modSingleRe = new RegExp("dateModified:\\s*'" + uniform + "'", 'g');
    const pubDoubleRe = new RegExp('"datePublished":\\s*"' + uniform + '"', 'g');
    const modDoubleRe = new RegExp('"dateModified":\\s*"' + uniform + '"', 'g');

    if (pubSingleRe.test(src) || pubDoubleRe.test(src) || modSingleRe.test(src) || modDoubleRe.test(src)) {
      dateChanged = true;
    }

    // Reset lastIndex of the regexes after .test() for the .replace()
    src = src.replace(new RegExp("datePublished:\\s*'" + uniform + "'", 'g'), "datePublished: '" + newPub + "'");
    src = src.replace(new RegExp("dateModified:\\s*'" + uniform + "'", 'g'), "dateModified: '" + newMod + "'");
    src = src.replace(new RegExp('"datePublished":\\s*"' + uniform + '"', 'g'), '"datePublished": "' + newPub + '"');
    src = src.replace(new RegExp('"dateModified":\\s*"' + uniform + '"', 'g'), '"dateModified": "' + newMod + '"');
  }
  if (dateChanged) datesFixed++;

  if (src !== before) {
    fs.writeFileSync(p, src, 'utf8');
  }
}

console.log('Cleanup result:');
console.log('  Files scanned:     ' + files.length);
console.log('  LinkedIn cleaned:  ' + linkedinFixed);
console.log('  Dates diversified: ' + datesFixed);

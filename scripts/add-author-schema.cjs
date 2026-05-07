/**
 * add-author-schema.cjs
 * Codemod: normalise author Person schema across all kennisbank/*.astro files.
 *
 * Canonical target author (inline JS object):
 *   { '@type': 'Person', '@id': 'https://aanloopai.nl/over-ons/#mustafa-agah-dogan',
 *     name: 'Mustafa Agah Dogan', jobTitle: 'Oprichter & AI-strateeg',
 *     url: 'https://aanloopai.nl/over-ons/',
 *     worksFor: { '@id': 'https://aanloopai.nl/#organization' } }
 *
 * Strategy: raw-string regex on each file.
 * - Files without Article/ScholarlyArticle schema → skipped (no injection).
 * - Files already using canonical @id → reported but not double-written.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const KENNISBANK_DIR = path.join(__dirname, '../src/pages/kennisbank');

const CANONICAL_ID  = 'https://aanloopai.nl/over-ons/#mustafa-agah-dogan';
const CANONICAL_URL = 'https://aanloopai.nl/over-ons/';

// Inline single-quote replacement (for files using JS object literals)
const CANONICAL_INLINE =
  `{ '@type': 'Person', '@id': '${CANONICAL_ID}', name: 'Mustafa Agah Dogan', jobTitle: 'Oprichter & AI-strateeg', url: '${CANONICAL_URL}', worksFor: { '@id': 'https://aanloopai.nl/#organization' } }`;

// Multi-line double-quote replacement (for files using JSON-style objects)
const CANONICAL_MULTILINE_DQ =
`{
      "@type": "Person",
      "@id": "${CANONICAL_ID}",
      "name": "Mustafa Agah Dogan",
      "jobTitle": "Oprichter & AI-strateeg",
      "url": "${CANONICAL_URL}",
      "worksFor": { "@id": "https://aanloopai.nl/#organization" }
    }`;

function hasArticleSchema(src) {
  return /'@type':\s*'(?:Article|ScholarlyArticle)'/.test(src) ||
         /"@type":\s*"(?:Article|ScholarlyArticle)"/.test(src);
}

function alreadyCanonical(src) {
  return src.includes(CANONICAL_ID);
}

/**
 * Replace inline single-quote author blocks.
 * Handles nested { } one level deep (for worksFor).
 */
function replaceInlineAuthor(src) {
  // Match: author: { ... } where inner may contain one nested {}
  const re = /author:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g;
  if (!re.test(src)) return null;
  return src.replace(/author:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g,
    `author: ${CANONICAL_INLINE}`);
}

/**
 * Replace multi-line double-quote "author": { ... } block.
 * Uses brace-depth counting to find exact closing brace.
 */
function replaceMultilineAuthor(src) {
  const token = '"author":';
  const idx = src.indexOf(token);
  if (idx === -1) return null;

  const braceStart = src.indexOf('{', idx + token.length);
  if (braceStart === -1) return null;

  let depth = 0;
  let i = braceStart;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }

  const before = src.slice(0, idx);
  const after  = src.slice(i + 1);
  return before + `"author": ${CANONICAL_MULTILINE_DQ}` + after;
}

function processFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');

  if (!hasArticleSchema(src)) {
    return { changed: false, reason: 'no Article/ScholarlyArticle schema' };
  }
  if (alreadyCanonical(src)) {
    return { changed: false, reason: 'already canonical' };
  }

  // Detect style: single-quote JS literal vs double-quote JSON style
  const hasSingleQuoteAuthor = /author:\s*\{/.test(src);
  const hasDoubleQuoteAuthor = /"author"\s*:\s*\{/.test(src);

  let newSrc = null;

  if (hasSingleQuoteAuthor) {
    newSrc = replaceInlineAuthor(src);
  }
  if (!newSrc && hasDoubleQuoteAuthor) {
    newSrc = replaceMultilineAuthor(src);
  }

  if (!newSrc) {
    return { changed: false, reason: 'author field not matched by any pattern' };
  }

  if (!newSrc.includes(CANONICAL_ID)) {
    return { changed: false, reason: 'replacement sanity check failed' };
  }

  fs.writeFileSync(filePath, newSrc, 'utf8');
  return { changed: true };
}

// ── Main ─────────────────────────────────────────────────────────────────────
const files = fs.readdirSync(KENNISBANK_DIR)
  .filter(f => f.endsWith('.astro'))
  .sort()
  .map(f => path.join(KENNISBANK_DIR, f));

let modified  = 0;
let skipped   = 0;
let alreadyOk = 0;
const issues  = [];

for (const f of files) {
  const result = processFile(f);
  if (result.changed) {
    modified++;
    console.log(`  MODIFIED : ${path.basename(f)}`);
  } else if (result.reason === 'already canonical') {
    alreadyOk++;
    console.log(`  OK (skip): ${path.basename(f)}`);
  } else if (result.reason === 'no Article/ScholarlyArticle schema') {
    skipped++;
    console.log(`  SKIP     : ${path.basename(f)} — ${result.reason}`);
  } else {
    issues.push(`${path.basename(f)}: ${result.reason}`);
    console.log(`  WARN     : ${path.basename(f)} — ${result.reason}`);
  }
}

console.log(`\n=== Summary ===`);
console.log(`  Modified  : ${modified}`);
console.log(`  Already OK: ${alreadyOk}`);
console.log(`  Skipped   : ${skipped}`);
console.log(`  Issues    : ${issues.length}`);
if (issues.length) {
  console.log('  Issue details:');
  issues.forEach(i => console.log('    -', i));
}

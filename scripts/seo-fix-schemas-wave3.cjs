#!/usr/bin/env node
// Wave-3 schema codemod: fixes errors that wave-1/2 (seo-fix-schemas.cjs) missed.
//   - Article.publisher inline Organization missing `url`
//   - WebPage (speakableSchema-style) missing `name` — derive from
//     articleSchema.headline OR BaseLayout title prop in same file.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.endsWith('.astro')) files.push(full);
  }
  return files;
}

function extractHeadlineOrTitle(content) {
  const headline = content.match(/headline:\s*(['"`])((?:(?!\1).)*?)\1/);
  if (headline) return headline[2];
  const title = content.match(/<BaseLayout\b[\s\S]*?\btitle=\{?(["'`])((?:(?!\1).)*?)\1\}?/);
  if (title) return title[2];
  const constTitle = content.match(/(?:^|\n)\s*const\s+title\s*=\s*(['"`])((?:(?!\1).)*?)\1/);
  if (constTitle) return constTitle[2];
  return null;
}

function addUrlToPublisher(content) {
  // Match Article.publisher inline form (single-quoted JS keys):
  //   publisher: { '@type': 'Organization', name: 'Aanloop AI', logo: {...} }
  // Idempotent: skip if `url:` already inside that object literal.
  let result = content.replace(
    /publisher:\s*\{\s*'@type':\s*'Organization',\s*name:\s*'Aanloop AI'(\s*,\s*)logo:/g,
    (match) => match.includes("url:")
      ? match
      : match.replace(
          /name:\s*'Aanloop AI'(\s*,\s*)logo:/,
          "name: 'Aanloop AI', url: 'https://aanloopai.nl', logo:"
        )
  );
  // Double-quoted JSON-style keys variant (multi-line):
  //   "publisher": {
  //     "@type": "Organization",
  //     "name": "Aanloop AI",
  //     "logo": { ... }
  //   }
  result = result.replace(
    /("publisher":\s*\{\s*"@type":\s*"Organization",\s*"name":\s*"Aanloop AI",\s*)("logo":)/g,
    (match, p1, p2) => match.includes('"url":')
      ? match
      : `${p1}"url": "https://aanloopai.nl",\n      ${p2}`
  );
  return result;
}

// String/template-aware forward brace-walker. Returns index of matching `}`
// for the open brace at `openIdx` (which must be a `{`).
function findMatchingClose(s, openIdx) {
  let depth = 0;
  let i = openIdx;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '{') { depth++; i++; }
    else if (ch === '}') { depth--; if (depth === 0) return i; i++; }
    else if (ch === "'" || ch === '"') {
      const q = ch; i++;
      while (i < s.length && s[i] !== q) {
        if (s[i] === '\\') i += 2; else i++;
      }
      i++;
    } else if (ch === '`') {
      i++;
      while (i < s.length && s[i] !== '`') {
        if (s[i] === '\\') { i += 2; continue; }
        if (s[i] === '$' && s[i + 1] === '{') {
          i += 2;
          let d = 1;
          while (i < s.length && d > 0) {
            if (s[i] === '{') d++;
            else if (s[i] === '}') d--;
            i++;
          }
        } else {
          i++;
        }
      }
      i++;
    } else if (ch === '/' && s[i + 1] === '/') {
      while (i < s.length && s[i] !== '\n') i++;
    } else if (ch === '/' && s[i + 1] === '*') {
      i += 2;
      while (i < s.length - 1 && !(s[i] === '*' && s[i + 1] === '/')) i++;
      i += 2;
    } else {
      i++;
    }
  }
  return -1;
}

// Backward brace-walker (simple — assumes no `}` inside template-literal
// expressions before our position — works for our schema constants).
function findEnclosingOpen(s, fromIdx) {
  let i = fromIdx;
  let depth = 0;
  while (i > 0) {
    const ch = s[i];
    if (ch === '}') depth++;
    else if (ch === '{') {
      if (depth === 0) return i;
      depth--;
    }
    i--;
  }
  return -1;
}

function addNameToWebPage(content, fallbackName) {
  const re = /'@type':\s*'WebPage'/g;
  let result = content;
  let offset = 0;

  while (true) {
    re.lastIndex = offset;
    const m = re.exec(result);
    if (!m) break;

    const braceOpen = findEnclosingOpen(result, m.index);
    if (braceOpen < 0) { offset = m.index + m[0].length; continue; }
    const braceClose = findMatchingClose(result, braceOpen);
    if (braceClose < 0) { offset = m.index + m[0].length; continue; }

    const block = result.slice(braceOpen, braceClose + 1);
    const hasName = /(?:[\{,]\s*)name\s*:/.test(block);
    if (hasName) {
      offset = braceClose;
      continue;
    }

    const afterType = m.index + m[0].length;
    let injectAt = afterType;
    while (injectAt < result.length && /\s/.test(result[injectAt])) injectAt++;
    if (result[injectAt] === ',') injectAt++;
    const escaped = fallbackName.replace(/'/g, "\\'");
    const injection = ` name: '${escaped}',`;
    result = result.slice(0, injectAt) + injection + result.slice(injectAt);
    offset = injectAt + injection.length;
  }
  return result;
}

const files = walk(PAGES_DIR);
let modified = 0;
let publisherFixed = 0;
let webpageNameFixed = 0;
const log = [];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');

  const beforePub = content;
  content = addUrlToPublisher(content);
  if (content !== beforePub) publisherFixed++;

  const headline = extractHeadlineOrTitle(content);
  if (headline) {
    const beforeWp = content;
    content = addNameToWebPage(content, headline);
    if (content !== beforeWp) webpageNameFixed++;
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    modified++;
    log.push(`  ${rel}`);
  }
}

console.log(`Wave-3 schema fix: ${modified} files modified`);
console.log(`  Publisher.url added: ${publisherFixed}`);
console.log(`  WebPage.name added: ${webpageNameFixed}`);
console.log('');
log.slice(0, 50).forEach((l) => console.log(l));
if (log.length > 50) console.log(`  ...+${log.length - 50} more`);

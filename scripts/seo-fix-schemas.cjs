#!/usr/bin/env node
// One-shot codemod: fix common schema.org JSON-LD missing-field errors in
// src/pages/**/*.astro identified by seo-schema-validator.cjs.
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

const files = walk(PAGES_DIR);
let modified = 0;
const log = [];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');

  // Fix 1: Service schemas missing `name` — derive from serviceType.
  content = content.replace(
    /('@type':\s*'Service',\s*)(serviceType:\s*'([^']+)')(?!\s*,\s*name)/g,
    (match, p1, p2, type) => {
      if (match.includes("name:")) return match;
      return `${p1}name: '${type}', ${p2}`;
    }
  );

  // Fix 2: provider Organization in Service missing `url`.
  content = content.replace(
    /(provider:\s*\{\s*'@type':\s*'Organization',\s*name:\s*'Aanloop AI'\s*)(\})/g,
    "$1, url: 'https://aanloopai.nl'$2"
  );

  // Fix 3: standalone Organization missing url (sitewide pattern when only name set).
  content = content.replace(
    /(\{\s*'@type':\s*'Organization',\s*name:\s*'Aanloop AI'\s*)(\})/g,
    "$1, url: 'https://aanloopai.nl'$2"
  );

  // Fix 4: itemOffered Service missing provider — add @id reference.
  content = content.replace(
    /(itemOffered:\s*\{\s*'@type':\s*'Service',[^}]*?)(\}(?!\s*,\s*provider))/g,
    (match, p1, p2) => {
      if (match.includes('provider')) return match;
      return `${p1}, provider: { '@id': 'https://aanloopai.nl/#organization' }${p2}`;
    }
  );

  if (content !== original) {
    fs.writeFileSync(file, content);
    modified++;
    log.push(`  ${rel}`);
  }
}

console.log(`Schema-fix codemod: ${modified} files modified`);
log.slice(0, 30).forEach((l) => console.log(l));
if (log.length > 30) console.log(`  ...+${log.length - 30} more`);

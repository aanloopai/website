#!/usr/bin/env node
// One-shot codemod: strip hardcoded brand-suffix variants from
// `const title = '...';` declarations in src/pages/**/*.astro.
// BaseLayout.astro now appends " · Aanloop AI" only when total <=60 chars.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');

const SUFFIX_PATTERNS = [
  / \| Aanloop AI$/,
  / · Aanloop AI$/,
  / — Aanloop AI$/,
  / - Aanloop AI$/,
  / \| Aanloopai$/i,
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.endsWith('.astro')) files.push(full);
  }
  return files;
}

function stripSuffix(value) {
  let stripped = value;
  let didStrip = false;
  for (const re of SUFFIX_PATTERNS) {
    if (re.test(stripped)) {
      stripped = stripped.replace(re, '');
      didStrip = true;
    }
  }
  return { stripped, didStrip };
}

const files = walk(PAGES_DIR);
let modified = 0;
const log = [];

// Three title-declaration shapes in this codebase:
//   1) const title = '...'; (frontmatter)
//   2)   title="..." (JSX attribute on its own line — multi-line BaseLayout)
//   3) <BaseLayout title="..." ...> (JSX attribute inline on opening tag)
const PATTERNS = [
  { re: /(\bconst\s+title\s*=\s*)(['"])([^\n]*?)\2(\s*;?)/, label: 'const' },
  { re: /(^\s+title=)(['"])([^\n"']*?)\2/m, label: 'jsx-line' },
  { re: /(<BaseLayout\b[^>]*?\btitle=)(['"])([^"'\n]*?)\2/, label: 'jsx-inline' },
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let fileModified = false;
  let lastValue = '';
  let lastStripped = '';
  for (const { re } of PATTERNS) {
    const m = content.match(re);
    if (!m) continue;
    const value = m[3];
    const { stripped, didStrip } = stripSuffix(value);
    if (!didStrip) continue;
    content = content.replace(re, `${m[1]}${m[2]}${stripped}${m[2]}${m[4] ?? ''}`);
    fileModified = true;
    lastValue = value;
    lastStripped = stripped;
  }
  if (!fileModified) continue;
  fs.writeFileSync(file, content);
  modified++;
  log.push(`  ${path.relative(ROOT, file)}: [${lastValue.length}→${lastStripped.length}] "${lastStripped}"`);
}

console.log(`Stripped suffix from ${modified} files:`);
log.forEach((l) => console.log(l));

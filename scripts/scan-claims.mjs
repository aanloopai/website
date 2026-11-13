// Toont ongebronde effectcijfers in BRONBESTANDEN (src/) met dezelfde patronen als de CI-guard.
// Gebruik: node scripts/scan-claims.mjs src/pages/kennisbank/x.astro ...   (zonder args: alle src + public/data)
import fs from 'node:fs';
import path from 'node:path';
import { PATTERNS, walk, root } from '../test/_claims-scan.js';
let files = process.argv.slice(2);
if (!files.length) files = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'public', 'data'))].filter((f) => /\.(astro|ts|md|json|js)$/.test(f) && !/bronnen\.json$/.test(f));
let n = 0;
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  raw.split('\n').forEach((line, i) => {
    for (const [name, re] of PATTERNS) {
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) { n++; console.log(`${path.relative(root, f).split(path.sep).join('/')}:${i + 1} [${name}] ${m[0]}`); }
    }
  });
}
console.log(`-- ${n} treffers`);
process.exit(n ? 1 : 0);

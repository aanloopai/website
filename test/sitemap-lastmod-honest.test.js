// Guard: <lastmod> is een eerlijk signaal. PR #281 zette 253 URL's op dezelfde dag, ook pagina's die
// niet zijn aangeraakt. Twee regels, gesynthetiseerd in een wegwerp-git-repo zodat het niet van
// de echte historie afhangt:
//  1. een commit die in een gedeeld data-bestand (sectors.ts) ALLEEN entry "b" wijzigt, bumpt alleen /sectoren/b/
//  2. een .astro/.md-pagina krijgt de datum van haar eigen laatste commit, niet van een commit aan iets anders
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const real = fileURLToPath(new URL('../', import.meta.url));
const git = (cwd, cmd, date) =>
  execSync(`git ${cmd}`, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date, GIT_CONFIG_GLOBAL: '', GIT_CONFIG_SYSTEM: '' },
  });
const sectors = (bText) =>
  `export const sectors = [\n  {\n    slug: 'a',\n    t: 'alpha',\n  },\n  {\n    slug: 'b',\n    t: '${bText}',\n  },\n  {\n    slug: 'c',\n    t: 'gamma',\n  },\n];\n`;
const empty = `export const x = [\n  {\n    slug: 'z',\n  },\n];\n`;

function build(root) {
  execSync(`node ${JSON.stringify(join(real, 'scripts/build-sitemap.cjs'))}`, {
    cwd: root,
    env: { ...process.env, SITEMAP_ROOT: root },
    stdio: 'pipe',
  });
  const xml = readFileSync(join(root, 'public/sitemap.xml'), 'utf8');
  const m = {};
  for (const x of xml.matchAll(/<loc>https:\/\/aanloopai\.nl([^<]*)<\/loc><lastmod>([^<]*)</g)) m[x[1]] = x[2];
  return m;
}

describe('sitemap lastmod is eerlijk', () => {
  let root;
  let map;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'sm-'));
    for (const d of ['src/pages', 'src/data', 'src/content/kennisbank', 'public']) mkdirSync(join(root, d), { recursive: true });
    writeFileSync(join(root, 'src/pages/p1.astro'), '<BaseLayout>1</BaseLayout>\n');
    writeFileSync(join(root, 'src/pages/p2.astro'), '<BaseLayout>2</BaseLayout>\n');
    writeFileSync(join(root, 'src/data/sectors.ts'), sectors('beta'));
    for (const f of ['geo-sectors', 'geo-regios', 'geo-sbi-sectoren', 'lead-sectors']) writeFileSync(join(root, `src/data/${f}.ts`), empty);
    writeFileSync(join(root, 'src/data/resultaten.ts'), `export const r = {\n  q: {\n    key: 'k1',\n  },\n};\n`);
    writeFileSync(join(root, 'src/data/noindex-paths.json'), '{"groups":[]}');
    git(root, 'init -q -b main', '2026-01-01T12:00:00Z');
    git(root, 'add -A', '2026-01-01T12:00:00Z');
    git(root, '-c user.name=t -c user.email=t@t commit -q -m c1', '2026-01-01T12:00:00Z');
    writeFileSync(join(root, 'src/pages/p2.astro'), '<BaseLayout>2 edit</BaseLayout>\n');
    git(root, 'add -A', '2026-02-02T12:00:00Z');
    git(root, '-c user.name=t -c user.email=t@t commit -q -m c2', '2026-02-02T12:00:00Z');
    writeFileSync(join(root, 'src/data/sectors.ts'), sectors('beta EDIT')); // raakt ALLEEN entry b
    git(root, 'add -A', '2026-03-03T12:00:00Z');
    git(root, '-c user.name=t -c user.email=t@t commit -q -m c3', '2026-03-03T12:00:00Z');
    map = build(root);
  });

  it('data-bestand-commit bumpt alleen de pagina van de gewijzigde entry', () => {
    expect(map['/sectoren/b/']).toBe('2026-03-03');
    expect(map['/sectoren/a/']).toBe('2026-01-01');
    expect(map['/sectoren/c/']).toBe('2026-01-01');
    expect(map['/werk/k1/']).toBe('2026-01-01');
  });

  it('pagina-datum = eigen laatste commit, niet die van een andere pagina of data-bestand', () => {
    expect(map['/p1/']).toBe('2026-01-01');
    expect(map['/p2/']).toBe('2026-02-02');
  });
});

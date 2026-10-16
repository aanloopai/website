// Guard: elke pad in src/data/noindex-paths.json (a) staat NIET in public/sitemap.xml
// en (b) levert in de build (dist/) een <meta name="robots" content="noindex, follow">.
// (b) draait alleen als dist/ bestaat (na `npm run build`); (a) en de bron-wiring altijd.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const list = JSON.parse(fs.readFileSync(path.join(root, 'src/data/noindex-paths.json'), 'utf8'));
const paths = list.groups.flatMap((g) => g.paths);
const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');
const distDir = path.join(root, 'dist');

describe('noindex-paths', () => {
  it('lijst is niet leeg, uniek en elk pad heeft slashes en een reden', () => {
    expect(paths.length).toBeGreaterThan(0);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) expect(p).toMatch(/^\/.+\/$/);
    for (const g of list.groups) expect(g.reason.length).toBeGreaterThan(20);
  });

  it('geen enkel noindex-pad staat in de sitemap', () => {
    for (const p of paths) expect(sitemap).not.toContain(`<loc>https://aanloopai.nl${p}</loc>`);
  });

  it('BaseLayout en build-sitemap gebruiken dezelfde lijst', () => {
    const layout = fs.readFileSync(path.join(root, 'src/layouts/BaseLayout.astro'), 'utf8');
    const script = fs.readFileSync(path.join(root, 'scripts/build-sitemap.cjs'), 'utf8');
    expect(layout).toContain('noindex-paths.json');
    expect(layout).toContain('noindex, follow');
    expect(script).toContain('noindex-paths.json');
  });

  it.skipIf(!fs.existsSync(distDir))('elk noindex-pad heeft noindex,follow in dist/', () => {
    for (const p of paths) {
      const html = fs.readFileSync(path.join(distDir, p, 'index.html'), 'utf8');
      expect(html, p).toMatch(/<meta name="robots" content="noindex, follow"/);
    }
  });
});

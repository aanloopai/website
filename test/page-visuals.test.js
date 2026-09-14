// Guard voor src/data/page-visuals.ts: elke pagina krijgt precies één hero-beeld.
// - Pagina's met een eigen <Image> in de hero-sectie mogen GEEN CSS-achtergrond krijgen
//   (anders staan er twee foto's achter elkaar).
// - Elk bestand uit de map moet in public/visuals/ bestaan (anders een lege hero).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PAGE_VISUALS, visualFor } from '../src/data/page-visuals.ts';

const ROOT = path.resolve(__dirname, '..');
const PAGES = path.join(ROOT, 'src/pages');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)],
  );
}

function routeOf(file) {
  const rel = path.relative(PAGES, file).replace(/\\/g, '/').replace(/\.astro$/, '');
  return '/' + (rel.endsWith('/index') ? rel.slice(0, -'index'.length) : rel + '/');
}

/** Pagina's waarvan de eerste sectie (de hero) al een <Image> bevat. */
function pagesWithHeroImage() {
  return walk(PAGES)
    .filter((f) => f.endsWith('.astro') && !path.basename(f).startsWith('['))
    .filter((f) => {
      const src = fs.readFileSync(f, 'utf8');
      const img = src.indexOf('<Image');
      if (img < 0) return false;
      const first = src.indexOf('<section');
      const second = src.indexOf('<section', first + 1);
      return first >= 0 && (second < 0 || img < second);
    })
    .map(routeOf);
}

describe('page-visuals', () => {
  it('geeft geen CSS-achtergrond aan pagina\'s met een eigen hero-<Image>', () => {
    const routes = pagesWithHeroImage();
    expect(routes.length).toBeGreaterThan(20); // sanity: de scanner vindt de diensten/sectoren
    const doubles = routes.filter((r) => visualFor(r) !== undefined);
    expect(doubles).toEqual([]);
  });

  it('verwijst alleen naar bestaande bestanden in public/visuals/', () => {
    const missing = [...new Set(Object.values(PAGE_VISUALS).map((v) => v.file).filter(Boolean))]
      .filter((f) => !fs.existsSync(path.join(ROOT, 'public/visuals', `${f}.jpg`)));
    expect(missing).toEqual([]);
  });

  it('matcht routes zoals bedoeld (langste match wint)', () => {
    expect(visualFor('/diensten/emma/')).toBeUndefined();
    expect(visualFor('/diensten/telefoon-assistent/')?.file).toBe('telefoon');
    expect(visualFor('/sectoren/')?.file).toBe('sectoren');
    expect(visualFor('/sectoren/horeca/')).toBeUndefined();
    expect(visualFor('/locaties/rotterdam/')?.file).toBe('rotterdam');
    expect(visualFor('/locaties/breda/')?.file).toBe('nederland');
    expect(visualFor('/kennisbank/whatsapp-business-api-mkb/')?.file).toBe('whatsapp');
    expect(visualFor('/kennisbank/iets-anders/')?.file).toBe('kennis');
    expect(visualFor('/tarieven/')?.file).toBe('tarieven');
    expect(visualFor('/cases/')).toBeUndefined();
    expect(visualFor('/privacy/')?.file).toBe('nederland'); // vangnet
    expect(visualFor('/tarieven')?.file).toBe('tarieven'); // zonder slash
  });
});

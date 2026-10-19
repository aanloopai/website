// Guard GEO-golf 2026-10-19: doelpagina's dragen verifieerbare CBS/Eurostat-cijfers met bronlinks
// + dateModified. Terugdraaien = bewust de component of dit bestand aanpassen.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const PAGES = [
  'src/pages/index.astro',
  'src/pages/locaties/amsterdam.astro',
  'src/pages/locaties/eindhoven.astro',
  'src/pages/diensten/audit.astro',
  'src/pages/kennisbank/ai-voor-hypotheekadviseur-nederland-2026.astro',
];

describe('GEO-golf 2026-10-19', () => {
  it.each(PAGES)('%s gebruikt AiAdoptieCbs en heeft dateModified 2026-10-19', (p) => {
    const s = read(p);
    expect(s).toContain('<AiAdoptieCbs');
    expect(s).toContain("dateModified: '2026-10-19'");
  });

  it('component heeft >=2 externe bronlinks (CBS + Eurostat) en zichtbare datum', () => {
    const s = read('src/components/AiAdoptieCbs.astro');
    expect(s).toContain('https://www.cbs.nl/');
    expect(s).toContain('https://ec.europa.eu/eurostat/');
    expect(s).toContain('Bijgewerkt op');
    expect(s).toContain('<blockquote');
  });

  it('component claimt geen eigen certificering of klantresultaten', () => {
    const s = read('src/components/AiAdoptieCbs.astro');
    expect(s).not.toMatch(/SOC ?2|ISO ?27001|NEN ?7510|HIPAA/i);
  });
});

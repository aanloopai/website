// Guard: GSC toonde zoekopdracht "aanloopai.nl" op positie 43 - de homepage rankte niet op de eigen merknaam.
// Merknaam staat vooraan in de homepage-<title>, en Organization + WebSite dragen 'aanloopai.nl' als alternateName.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), 'utf8');

describe('merkvindbaarheid homepage', () => {
  it('homepage-title begint met de merknaam', () => {
    const m = read('src/pages/index.astro').match(/<BaseLayout\s+title="([^"]+)"/);
    expect(m).not.toBeNull();
    expect(m[1].startsWith('Aanloop AI')).toBe(true);
  });
  it('Organization en WebSite hebben alternateName met aanloopai.nl en AanloopAI', () => {
    const src = read('src/layouts/BaseLayout.astro');
    const hits = src.match(/alternateName: \['AanloopAI', 'aanloopai\.nl'\]/g) || [];
    expect(hits.length).toBe(2);
  });
});

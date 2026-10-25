// Master plan Faz 3: "Vier diensten. Geen ruis." geldt ook voor het menu.
// Guard: de hoofdnavigatie toont de vier hoofdproducten, geen tweede
// prijsverhaal ("maandtarief op aanvraag") en een enkele primaire CTA.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const header = readFileSync('src/components/Header.astro', 'utf8');
const dienstenBlock = header.slice(header.indexOf('const dienstenGroups'), header.indexOf('const overItems'));

describe('header: vier diensten, één prijs, één primaire CTA', () => {
  it('dienstenGroups bevat precies de vier hoofdproducten', () => {
    const hrefs = [...dienstenBlock.matchAll(/href: '([^']+)'/g)].map((m) => m[1]);
    const items = hrefs.filter((h) => !['/geo-bureau/', '/resultaten/'].includes(h));
    expect(items).toEqual([
      '/diensten/ai-website-bundel-mkb-nederland/',
      '/diensten/emma/',
      '/ai-vindbaarheid/',
      '/leads-kopen/',
    ]);
  });
  it('geen "maandtarief op aanvraag" in de navigatie; bundelprijs komt uit pricing.ts', () => {
    expect(header).not.toMatch(/maandtarief op aanvraag/i);
    expect(header).toContain("from '../data/pricing'");
  });
  it('primaire header-CTA is de gratis AI-scan; "Start direct" staat niet in de header', () => {
    expect(header).toMatch(/href="\/gratis-ai-scan\/" class="btn-primary[^"]*"[^>]*id="header-demo-cta"/);
    expect(header).not.toContain('Start direct');
  });
});

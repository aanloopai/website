// Wave 4 (2026-10-20): site-brede GEO-basis. Legt vast dat robots.txt de
// citatie-bots expliciet noemt (met de private paden opnieuw gedisallowd, want
// een eigen groep vervangt de * groep), dat de WebPage-node in BaseLayout een
// description (= meta description), echte datum en Organization-auteur draagt,
// en dat de hero geen verborgen roterende woorden in de server-HTML zet.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

describe('robots.txt citatie-bots', () => {
  const robots = read('public/robots.txt');
  for (const bot of ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot', 'Googlebot', 'Applebot', 'GPTBot', 'ClaudeBot']) {
    it(`${bot} heeft een eigen groep met Allow: /`, () => {
      expect(robots).toMatch(new RegExp(`User-agent: ${bot}\r?\nAllow: /`));
    });
  }
  it('Googlebot en Applebot houden de private paden dicht', () => {
    for (const bot of ['Googlebot', 'Applebot']) {
      const block = robots.split(`User-agent: ${bot}`)[1].split('User-agent:')[0];
      for (const p of ['/admin/', '/api/', '/demo/']) expect(block).toContain(`Disallow: ${p}`);
    }
  });
});

describe('BaseLayout WebPage-node', () => {
  const layout = read('src/layouts/BaseLayout.astro');
  it('draagt description, auteur-Organization en datum uit git (geen now())', () => {
    const i = layout.indexOf('const speakableSchema');
    const node = layout.slice(i, i + 900);
    expect(node).toMatch(/\bdescription,/);
    expect(node).toMatch(/author: \{ '@type': 'Organization'/);
    expect(node).toMatch(/dateModified: pageDateModified/);
    expect(layout).not.toMatch(/dateModified:\s*new Date/);
  });
});

describe('hero', () => {
  it('rendert server-side alleen het actieve roterende woord', () => {
    expect(read('src/components/ui/animated-hero.tsx')).toMatch(/mounted \|\| index === titleNumber/);
  });
});

describe('homepage FAQ', () => {
  it('geeft faqSchema door en toont dezelfde array zichtbaar', () => {
    const idx = read('src/pages/index.astro');
    expect(idx).toMatch(/faqSchema=\{faqItems\}/);
    expect(idx).toMatch(/<FaqSection items=\{faqItems\}/);
  });
});

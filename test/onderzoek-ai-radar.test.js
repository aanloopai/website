// Guard: de cijfers op /onderzoek/ai-radar-mkb-nederland-2026/ komen uit de
// gecommitte dataset, niet uit hardcoded tekst, en de dataset is intern consistent.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const near = (a, b) => expect(Math.abs(a - b)).toBeLessThanOrEqual(0.05 + 1e-9);
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const data = JSON.parse(read('../src/data/ai-radar-2026-10.json'));
const page = read('../src/pages/onderzoek/ai-radar-mkb-nederland-2026.astro');
const endpoint = read('../src/pages/onderzoek/ai-radar-mkb-nederland-2026.json.ts');
const frontmatter = page.split('---')[1];
const template = page.split('---').slice(2).join('---');

describe('ai-radar dataset', () => {
  it('parst en heeft sectoren en meta', () => {
    expect(data.sectors.length).toBe(data.meta.sector_count);
    expect(data.meta.engine).toBe('gemini-grounded');
    expect(data.meta.license).toBe('CC BY 4.0');
  });

  it('totalen kloppen: som per sector == overall', () => {
    const sum = (k) => data.sectors.reduce((a, s) => a + s[k], 0);
    expect(sum('runs')).toBe(data.meta.runs);
    for (const k of ['answers', 'answered', 'mentioned', 'cited', 'answers_with_sources', 'domain_citations', 'zero_nl_answers']) {
      expect(sum(k), k).toBe(data.overall[k]);
    }
    expect(sum('english_prompt_answers')).toBe(data.dutch_prompts.excluded_english_answers);
    expect(data.dutch_prompts.answers + data.dutch_prompts.excluded_english_answers).toBe(data.overall.answers);
  });

  it('percentages volgen uit de aantallen en TLD-verdeling sluit', () => {
    const blocks = [data.overall, data.dutch_prompts, ...data.sectors];
    for (const b of blocks) {
      expect(b.tld.nl + b.tld.com + b.tld.other).toBe(b.domain_citations);
      near(b.mentioned_pct, (b.mentioned / b.answered) * 100);
      near(b.cited_pct, (b.cited / b.answered) * 100);
      near(b.zero_nl_pct, (b.zero_nl_answers / b.answers_with_sources) * 100);
      near(b.avg_cited_domains, b.domain_citations / b.answered);
      near(b.stability.retained_domain_pct, (b.stability.retained_domains / b.stability.base_domains) * 100);
      expect(b.top_domains.length).toBeLessThanOrEqual(10);
      for (const t of b.top_domains) near(t.share_pct, (t.count / b.answered) * 100);
    }
  });

  it('bevat geen sitenamen of ruwe prompts buiten 2 voorbeelden per sector', () => {
    const json = JSON.stringify({ overall: data.overall, dutch: data.dutch_prompts, sectors: data.sectors });
    for (const name of ['aanloopai.nl', 'alfareclame', 'fleettrackholland', 'tripandtick', 'keukeninbeeld', 'zoekeen', 'allesinrenovatie']) {
      expect(json.toLowerCase(), name).not.toContain(name);
    }
    for (const s of data.sectors) expect(s.example_prompts.length).toBeLessThanOrEqual(2);
  });
});

describe('ai-radar pagina', () => {
  it('importeert de dataset en bevat geen hardcoded percentages', () => {
    expect(frontmatter).toContain("from '../../data/ai-radar-2026-10.json'");
    expect(page.match(/\d+(?:[.,]\d+)?\s*%/g) || [], 'hardcoded N%').toEqual([]);
    // Geen losse 2-of-meer-cijferige getallen in de template-tekst buiten attributen/jsx-expressies.
    const prose = template
      .replace(/\{[^{}]*\}/g, '')
      .replace(/<[^>]+>/g, ' ');
    expect((prose.match(/\b\d{2,}\b/g) || []).filter((n) => n !== '2026'), 'hardcoded getallen in tekst').toEqual([]);
  });

  it('titel en description voldoen aan de meta-eisen', () => {
    const title = page.match(/title="([^"]+)"/)[1];
    const desc = page.match(/description="([^"]+)"/)[1];
    expect(title.length + ' · Aanloop AI'.length).toBeLessThanOrEqual(60);
    expect(desc.length).toBeGreaterThanOrEqual(110);
    expect(desc.length).toBeLessThanOrEqual(155);
  });

  it('heeft FAQ (4), speakable, licentie en citeerregel; geen em-dashes', () => {
    expect((frontmatter.match(/question:/g) || []).length).toBe(4);
    expect(page).toContain('faqSchema={faqItems}');
    expect(page).toContain('data-speakable');
    expect(page).toContain('SpeakableSpecification');
    expect(data.meta.citation).toBe(
      'AI-radar MKB Nederland van Aanloop AI, editie oktober 2026, https://aanloopai.nl/onderzoek/ai-radar-mkb-nederland-2026/',
    );
    expect(page).not.toMatch(/[—–]/);
  });

  it('endpoint serveert dezelfde dataset', () => {
    expect(endpoint).toContain("from '../../data/ai-radar-2026-10.json'");
    expect(page).toContain('/onderzoek/ai-radar-mkb-nederland-2026.json');
  });
});

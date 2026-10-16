import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseBlocks, renderHtml, wordCount } from '../src/lib/markdown-lite.js';

describe('parseBlocks', () => {
  it('parses headings, paragraphs, lists, hr, quote and tables', () => {
    const md = [
      '# Titel', '', '## Sub', '', 'Eerste **vette** regel', 'tweede regel', '',
      '- een', '- twee', '', '1. a', '2. b', '', '---', '', '> citaat', '',
      '| A | B |', '|---|---|', '| 1 | 2 |',
    ].join('\n');
    expect(parseBlocks(md)).toEqual([
      { type: 'h', level: 1, text: 'Titel' },
      { type: 'h', level: 2, text: 'Sub' },
      { type: 'p', text: 'Eerste **vette** regel tweede regel' },
      { type: 'ul', items: ['een', 'twee'] },
      { type: 'ol', items: ['a', 'b'] },
      { type: 'hr' },
      { type: 'quote', text: 'citaat' },
      { type: 'table', rows: [['A', 'B'], ['1', '2']] },
    ]);
  });

  it('handles CRLF and empty input', () => {
    expect(parseBlocks('')).toEqual([]);
    expect(parseBlocks('a\r\n\r\nb')).toEqual([{ type: 'p', text: 'a' }, { type: 'p', text: 'b' }]);
  });

  it('parses every real legal document without leaving raw markers', () => {
    for (const f of ['overeenkomst', 'algemene-voorwaarden', 'privacy-verwerker']) {
      const blocks = parseBlocks(readFileSync(`content/legal/${f}.md`, 'utf8'));
      expect(blocks.length).toBeGreaterThan(10);
      expect(blocks.some((b) => b.type === 'h')).toBe(true);
      for (const b of blocks.filter((x) => x.type === 'h')) expect(b.text).not.toMatch(/^#/);
    }
  });
});

describe('renderHtml', () => {
  it('escapes HTML and renders bold', () => {
    const html = renderHtml('Hallo <script>x</script> **vet**');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('<strong>vet</strong>');
  });

  it('renders tables with md-table class', () => {
    const html = renderHtml('| A | B |\n|---|---|\n| 1 | <b> |');
    expect(html).toContain('<table class="md-table">');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>&lt;b&gt;</td>');
  });

  it('renders headings, lists, hr, quote', () => {
    const html = renderHtml('### H3\n\n- x\n\n1. y\n\n---\n\n> q');
    expect(html).toContain('<h3>H3</h3>');
    expect(html).toContain('<ul><li>x</li></ul>');
    expect(html).toContain('<ol><li>y</li></ol>');
    expect(html).toContain('<hr>');
    expect(html).toContain('<blockquote>q</blockquote>');
  });
});

describe('wordCount', () => {
  it('counts whitespace-separated words', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('  een twee\ndrie  ')).toBe(3);
  });
});

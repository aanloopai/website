// Guard: elke FAQPage-JSON-LD in dist/ moet zijn vragen ook als zichtbare tekst tonen
// (schema != inhoud = risico bij Google en AI-engines). Gebruik <FaqSection items={...} />
// met dezelfde array als faqSchema. Draait alleen als dist/ bestaat (na `npm run build`).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

const norm = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&#x27;|&apos;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/\s+/g, ' ').trim().toLowerCase();

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name === 'index.html') yield p;
  }
}

function faqQuestions(html) {
  const qs = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    let j;
    try { j = JSON.parse(m[1]); } catch { continue; }
    const nodes = Array.isArray(j) ? j : (j['@graph'] || [j]);
    for (const o of nodes) {
      if (o && o['@type'] === 'FAQPage') for (const q of o.mainEntity || []) qs.push(q.name);
    }
  }
  return qs;
}

describe('faq-schema-visible', () => {
  it.skipIf(!fs.existsSync(distDir))('elke FAQPage-vraag staat als zichtbare tekst op de pagina', () => {
    const missing = [];
    let pages = 0;
    for (const file of walk(distDir)) {
      const html = fs.readFileSync(file, 'utf8');
      const qs = faqQuestions(html);
      if (!qs.length) continue;
      pages++;
      const visible = norm(html
        .replace(/<script[\s\S]*?<\/script>/g, ' ')
        .replace(/<style[\s\S]*?<\/style>/g, ' ')
        .replace(/<[^>]+>/g, ' '));
      for (const q of qs) {
        if (!visible.includes(norm(q).slice(0, 40))) {
          missing.push(`${path.relative(distDir, path.dirname(file)).split(path.sep).join('/') || '/'}: ${q.slice(0, 60)}`);
        }
      }
    }
    expect(pages).toBeGreaterThan(50);
    expect(missing, `FAQPage-schema zonder zichtbare vraag:\n${missing.join('\n')}`).toEqual([]);
  });
});

// Owner-eis 2026-10-28: nergens op aanloopai.nl een telefoonnummer. Wie een vraag
// heeft, vult het formulier in (/contact/) of mailt naar hello@aanloopai.nl.
// Deze guard faalt zodra het nummer (in welk formaat ook), een tel:-link, een
// WhatsApp-link of een schema-telephone terugkomt in src/ of public/.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..');
const EXT = /\.(astro|js|ts|mjs|cjs|md|mdx|json|txt|html|xml)$/;
// public/demo/* zijn klant-demo's met het nummer van die klant, niet van AanloopAI.
const SKIP = [/^public[\\/]demo[\\/]/];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.test(name)) out.push(p);
  }
  return out;
}

const files = ['src', 'public']
  .flatMap((d) => walk(join(ROOT, d)))
  .map((p) => ({ rel: relative(ROOT, p), text: readFileSync(p, 'utf8') }))
  .filter((f) => !SKIP.some((re) => re.test(f.rel)));

// 06 24741597 / +31 6 2474 1597 / 0624741597 / 31624741597 … ongeacht scheidingstekens.
const OWNER_NUMBER = /6[\s.\-()]{0,3}2[\s.\-()]{0,3}4[\s.\-()]{0,3}7[\s.\-()]{0,3}4[\s.\-()]{0,3}1[\s.\-()]{0,3}5[\s.\-()]{0,3}9[\s.\-()]{0,3}7/;

const RULES = [
  ['owner-telefoonnummer', OWNER_NUMBER],
  ['tel:-link', /href=["'{`]?tel:/i],
  ['wa.me-link', /wa\.me\//i],
  ['api.whatsapp-link', /api\.whatsapp\.com/i],
  ['/whatsapp-CTA', /href=["']\/whatsapp/i],
  ['schema telephone', /\btelephone\s*:/],
];

describe('geen telefoonnummer op de site (owner-eis 2026-10-28)', () => {
  it('scant een realistische set bestanden', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  for (const [label, re] of RULES) {
    it(`geen ${label} in src/ of public/`, () => {
      const hits = files.filter((f) => re.test(f.text)).map((f) => f.rel);
      expect(hits).toEqual([]);
    });
  }
});

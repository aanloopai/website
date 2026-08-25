// Guard voor de prijs- en claim-consistentie-audit van 2026-08-25.
// Kanon (src/data/pricing.ts + /tarieven): Emma €497 (tot 150 gesprekken,
// tot 3 callscripts) · Groei €997 (onbeperkt) · derde tier heet "Enterprise"
// (niet "Partner" of "Growth") · setup publiek "op aanvraag" · go-live-claim
// "7 werkdagen". Faalt deze test, dan is een oude/verzonnen claim teruggekeerd.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

function collect(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) collect(p, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

const pageFiles = [
  ...collect(join(ROOT, 'src', 'pages'), ['.astro', '.ts', '.js']),
  ...collect(join(ROOT, 'src', 'data'), ['.ts']),
  join(ROOT, 'public', 'llms.txt'),
  join(ROOT, 'public', 'llms-full.txt'),
];

// [regex, uitleg]. Codecommentaar dat de geschrapte tier documenteert is
// toegestaan — daarom checken we alleen regels die niet met // beginnen.
const BANNED = [
  [/€\s?49(?![0-9.,])/u, 'geschrapte WhatsApp-Lite prijs €49 (owner-besluit 2026-08-11)'],
  [/(vanaf|v\.a\.)\s+(€|EUR)\s?49(?![0-9.,])/iu, '"vanaf €49" — bestaat niet meer'],
  [/1 callscript/u, 'Emma heeft tot 3 callscripts (kanon /tarieven), niet 1'],
  [/[Tt]ot 5 callscripts/u, 'Groei heeft onbeperkte callscripts, niet 5'],
  [/Growth-?\s?pakket/u, 'Emma-ladder tier heet "Groei", niet "Growth"'],
  [/Partner-pakket|Partner op maat|Partner is op maat/u, 'derde tier heet "Enterprise", niet "Partner"'],
  [/Live binnen 10 werkdagen/u, 'go-live-claim is 7 werkdagen (kanon /tarieven)'],
  [/Live binnen 14 werkdagen/u, 'go-live-claim is 7 werkdagen; Enterprise = scope-afhankelijk'],
  [/Setup 495 of 795 euro/u, 'setup-bedragen zijn publiek verborgen — "op aanvraag"'],
  [/\b(495|795) euro (eenmalige )?setup/u, 'setup-bedragen zijn publiek verborgen — "op aanvraag"'],
  [/setup van? €?(495|795)\b/iu, 'setup-bedragen zijn publiek verborgen — "op aanvraag"'],
  [/€1\.997\/maand/u, 'verzonnen beheerd-automatisering-tarief — custom is op maat'],
];

describe('prijs- en claim-consistentie', () => {
  it('bevat geen geschrapte of tegenstrijdige prijs-claims', () => {
    const hits = [];
    for (const file of pageFiles) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        const code = line.trimStart();
        if (code.startsWith('//') || code.startsWith('*')) return;
        for (const [re, why] of BANNED) {
          if (re.test(line)) hits.push(`${file.slice(ROOT.length + 1)}:${i + 1} — ${why}`);
        }
      });
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it('homepage-bundelclaim klopt met pricing.ts (€45/mnd voordeel)', async () => {
    const { EMMA, WEBSITE_BUNDEL } = await import('../src/data/pricing.ts');
    const websiteGroeiMaand = 197;
    expect(websiteGroeiMaand + EMMA.monthly - WEBSITE_BUNDEL.maand).toBe(45);
  });
});

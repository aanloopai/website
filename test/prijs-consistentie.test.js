// Guard voor de prijs- en claim-consistentie.
// Kanon per 2026-09-15 (owner, src/data/pricing.ts + /tarieven):
//   Emma Start €149 (300 belminuten, telefoon, self-serve, geen setup)
//   Emma Groei €299 (1.000 belminuten, telefoon + WhatsApp, CRM, tot 3 callscripts, setup op aanvraag)
//   Emma Compleet €497 (onbeperkt, multi-number, workflows op maat, priority, setup op aanvraag)
//   Enterprise op aanvraag · extra minuten €0,25 · 14 dagen niet goed, geld terug.
// Dit vervangt de ladder Emma €497 / Groei €997 (aug-sep 2026). "€997", "vanaf
// €497", "150 gesprekken" en "Emma €497" zonder tier-naam zijn dus oude claims.
//
// Ouder, blijft gelden: €49 / €197 / €129 / €249 / €397 (WhatsApp-Lite, website-
// maandtarieven, founding) mogen NERGENS meer staan; website-maandtarieven zijn
// "op aanvraag"; setup-bedragen zijn publiek "op aanvraag"; go-live-claim is
// 7 werkdagen. De rectificatie-pagina (vs Schedulio) corrigeert zonder het oude
// WhatsApp-bedrag te herhalen.
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
  ...collect(join(ROOT, 'src', 'components'), ['.astro']),
  ...collect(join(ROOT, 'src', 'content'), ['.md']),
  join(ROOT, 'public', 'llms.txt'),
  join(ROOT, 'public', 'llms-full.txt'),
];

const RECTIFICATIE_PAGINA = join(ROOT, 'src', 'pages', 'vergelijk', 'aanloop-vs-schedulio.astro');

// [regex, uitleg]. Codecommentaar dat de geschrapte tier documenteert is
// toegestaan — daarom checken we alleen regels die niet met // beginnen.
const BANNED = [
  [/€\s?49(?![0-9.,])/u, 'geschrapte WhatsApp-Lite prijs €49 (owner-besluit 2026-08-11 + 2026-09-10: nergens meer)'],
  [/(vanaf|v\.a\.)\s+(€|EUR)\s?49(?![0-9.,])/iu, '"vanaf €49" — bestaat niet meer'],
  [/\b49\s?(euro|EUR)\b/iu, '"49 euro" — geschrapte WhatsApp-Lite prijs'],
  [/&euro;\s?49(?![0-9.,])/u, '&euro;49 — geschrapte WhatsApp-Lite prijs'],
  [/€\s?197(?![0-9.,])/u, 'geschrapte €197-prijs (WhatsApp Standard / website Groei) — geen prijs onder €497 op de site'],
  [/\b197\s?(euro|EUR)\b/iu, '"197 euro" — geschrapt'],
  [/&euro;\s?197(?![0-9.,])/u, '&euro;197 — geschrapt'],
  [/€\s?129(?![0-9.,])/u, 'website Starter €129/mnd — maandtarief is "op aanvraag"'],
  [/(vanaf|v\.a\.)\s+(€|EUR)\s?(129|197)(?![0-9.,])/iu, '"vanaf €129/€197" — maandtarief is op aanvraag'],
  // Owner 2026-09-10 (2): géén eigen bedrag onder €497 zichtbaar — ook geen
  // website-Pro/webshop-tier, founding-korting, setup-bedrag of maandbesparing.
  [/€\s?397(?![0-9.,])/u, 'website Pro / webshop Groei Shop €397/mnd — maandtarief is op aanvraag'],
  [/€\s?249(?![0-9.,])/u, 'founding/CORE €249 — geen eigen prijs onder €497'],
  [/\b(495|795)\s?euro\b/iu, 'setup-bedrag (495/795) — publiek "op aanvraag"'],
  [/setup\s+(495|795)\b/iu, 'setup-bedrag (495/795) — publiek "op aanvraag"'],
  [/€\s?45 per maand/u, 'bundelvoordeel per maand (€45) — toon per jaar (€540)'],
  [/€\s?195\/maand/u, 'SEO+GEO-besparing per maand (€195) — toon per jaar (€2.340)'],
  [/€\s?397–€997/u, 'oude custom-range €397–€997 — ondergrens is €497'],
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
  // Ladder 2026-09-15: Start €149 · Groei €299 · Compleet €497. Oude ladder-claims:
  [/(€|&euro;)\s?997(?![0-9.,])/u, 'Groei €997 bestaat niet meer — onbeperkt volume is Emma Compleet €497'],
  // Voluit geschreven bedragen: alleen in Emma/Groei-context (andere diensten hebben eigen prijzen).
  [/(Emma|Groei(?!-))[^.\n]{0,80}\b997\s?(euro|EUR)\b|\b997\s?(euro|EUR)\b[^.\n]{0,80}(Emma|Groei(?!-))/iu, '"Groei 997 euro" — bestaat niet meer; onbeperkt volume is Emma Compleet 497 euro'],
  [/(vanaf|v\.a\.)\s+(€|EUR)\s?497(?![0-9.,])/iu, '"vanaf €497" — instap is Emma Start €149'],
  [/\b150 gesprekken/u, '"150 gesprekken" was de oude Emma-bundel — nu 300/1.000 belminuten of onbeperkt'],
  [/Emma \(?€\s?497/u, '"Emma €497" zonder tier-naam — dat is Emma Compleet; Start €149 / Groei €299 bestaan ook'],
  [/(€|&euro;)\s?497[–-]€?\s?997/u, 'oude range €497–€997 — nu €149–€497'],
];

const isComment = (line) => {
  const code = line.trimStart();
  return code.startsWith('//') || code.startsWith('*') || code.startsWith('<!--');
};

describe('prijs- en claim-consistentie', () => {
  it('bevat geen geschrapte of tegenstrijdige prijs-claims', () => {
    const hits = [];
    for (const file of pageFiles) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (isComment(line)) return;
        for (const [re, why] of BANNED) {
          if (re.test(line)) hits.push(`${file.slice(ROOT.length + 1)}:${i + 1} — ${why}`);
        }
      });
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it('rectificatie-pagina (vs Schedulio) corrigeert zonder het oude bedrag te noemen', () => {
    const body = readFileSync(RECTIFICATIE_PAGINA, 'utf8');
    expect(body).toMatch(/bestaat niet meer/);
    expect(body).toMatch(/11 augustus 2026/);
    expect(body).toMatch(/€149/);
    expect(body).toMatch(/Heeft Aanloop AI een goedkoop WhatsApp-only instaptarief\?/);
    const code = body.split('\n').filter((l) => !isComment(l)).join('\n');
    expect(code).not.toMatch(/(€|&euro;)\s?49(?![0-9.,])/);
  });

  it('homepage-bundelclaim klopt met pricing.ts (€45/mnd voordeel)', async () => {
    const { EMMA, WEBSITE_BUNDEL } = await import('../src/data/pricing.ts');
    // Interne rekengrondslag van de bundel (website Groei-maandtarief). Niet
    // publiek getoond — de site zegt "maandtarief op aanvraag".
    const websiteGroeiMaand = 197;
    expect(websiteGroeiMaand + EMMA.monthly - WEBSITE_BUNDEL.maand).toBe(45);
  });
});

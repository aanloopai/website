// Guard GEO-golf 3 (aanloopai.nl): vijf klassen verwijderde/herkaderde claims mogen niet terugkomen.
//  a) verzonnen lokale voorbeeldbedrijven staan altijd zichtbaar als "Fictief voorbeeld"
//  b) ISO 27001 hoort bij de hostingleverancier (Hetzner, bron in bronnen.json), nooit bij Aanloop AI zelf
//  c) geen 99,5/99,9% SLA/uptime-claim in het glossarium (geen contractbron)
//  d) geen pakketprijzen buiten de kanon van src/data/pricing.ts (€149/€299/€497) op webshop-/garage-/zorgpagina's
//  e) TCO-calculator op /tarieven/: salaris is zichtbaar een "aanname", uitkomst is een rekenvoorbeeld, geen CBS-/CAO-claim
// Leest bronbestanden (geen dist/), dus draait ook zonder build.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(astro|md|ts)$/.test(f)) out.push(p);
  }
  return out;
}
const srcFiles = [...walk(join(root, 'src/pages')), ...walk(join(root, 'src/content')), join(root, 'src/data/sectors.ts')]
  .map((p) => ({ p: relative(root, p).split(String.fromCharCode(92)).join('/'), s: readFileSync(p, 'utf8') }));
const publicTxt = ['public/llms.txt', 'public/llms-full.txt'].filter((p) => existsSync(join(root, p))).map((p) => ({ p, s: read(p) }));
const all = [...srcFiles, ...publicTxt];

export const scanFor = (files, re) => files.flatMap(({ p, s }) => (s.match(re) || []).map((m) => `${p}: ${m}`));

describe('GEO golf 3 - aanloop', () => {
  it('a) locatiepagina met voorbeeldbedrijven + sectors.ts labelen "Fictief voorbeeld"', () => {
    const loc = srcFiles.filter((f) => /^src\/pages\/locaties\/[^/]+\.astro$/.test(f.p) && /lokale AI use cases/i.test(f.s));
    expect(loc.length).toBeGreaterThanOrEqual(12);
    for (const f of loc) expect(f.s, f.p).toMatch(/Fictief voorbeeld/);
    // gemeten-klinkende uren-claims in die blokken zijn weg
    expect(scanFor(loc, /(scheelt|bespaart)[^<.]{0,30}\d+ uur[^<.]{0,30}per week/gi)).toEqual([]);
    const sectors = read('src/data/sectors.ts');
    expect(sectors).not.toMatch(/company:\s*'Voorbeeldscenario'/);
    expect(sectors).toMatch(/company:\s*'Fictief voorbeeld'/);
  });

  it('b) ISO 27001 nooit als eigen certificering of als anonieme "ISO-cloud"', () => {
    const VERBODEN = /ISO ?27001[- ]?(gecertificeerde? (infrastructuur|cloud|hosting|datacent|Europese)|cloud\b)|op ISO 27001-cloud|(draait|staat) op ISO 27001/gi;
    expect(scanFor(all, VERBODEN)).toEqual([]);
  });

  it('b) Hetzner-ISO-bron staat in bronnen.json met letterlijk citaat (>= 20 tekens)', () => {
    const reg = JSON.parse(read('src/data/bronnen.json')).bronnen;
    const h = reg.filter((b) => /hetzner\.com/.test(b.url));
    expect(h.length).toBeGreaterThanOrEqual(1);
    for (const b of h) { expect(b.status).toBe(200); expect(b.citaat.length).toBeGreaterThanOrEqual(20); expect(b.citaat).toMatch(/27001/); }
  });

  it('c) glossarium noemt geen 99,5/99,9 procent SLA of uptime', () => {
    const g = read('src/pages/glossarium.astro');
    expect(g).not.toMatch(/99[,.][59]/);
    expect(g).not.toMatch(/financi[eë]le credits/i);
  });

  it('d) geen off-kanon pakketprijzen (297-497, 697-997, 1297-1997, 2497, 1497-2997, 3995-7995)', () => {
    const OFF = /\b(297[- ]497|697[- ]997|1297[- ]1997|1497[- ]?(tot|-)[ ]?2997|3995[- ]7995|vanaf 2497|2497 euro)\b/gi;
    expect(scanFor(srcFiles.filter((f) => f.p.startsWith('src/pages/')), OFF)).toEqual([]);
  });

  it('d) webshop-pagina noemt geen eigen setupbedragen en verwijst naar /tarieven/', () => {
    const w = read('src/pages/ai-voor-ecommerce-webshops-nederland.astro');
    expect(w).not.toMatch(/setup \d{3,}/i);
    expect(w).toMatch(/\/tarieven\//);
    expect(w).toMatch(/€149/); expect(w).toMatch(/€299/); expect(w).toMatch(/€497/);
  });

  it('e) TCO-calculator: salaris is "aanname", uitkomst is rekenvoorbeeld, geen CBS-/CAO-claim', () => {
    const t = read('src/pages/tarieven.astro');
    expect(t).toMatch(/aanname, pas aan/i);
    expect(t).toMatch(/geen belofte/i);
    expect(t).not.toMatch(/CBS gem/);
    expect(t).not.toMatch(/CAO ProTie/);
    expect(t).not.toMatch(/'ROI: '|>ROI: \{/); // oude kale ROI-uitkomst (server + client)
  });
});

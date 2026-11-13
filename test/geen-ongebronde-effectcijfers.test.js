// Guard: geen ongebronde effect-/ROI-/besparingscijfers op de gebouwde site (dist/) of in public/data/*.json.
// Aanleiding: PR #277 haalde verzonnen ROI-cijfers weg uit ~25 pagina's; de rest van de legacy-pagina's volgde
// in een tweede ronde. Dit is de regressie-vergrendeling: een nieuw "40% meer leads" zonder bron laat CI falen.
//
// Regel: een cijfer over effect / ROI / percentage / tijdwinst / bedrag-besparing staat er alleen als het
// (a) letterlijk voorkomt in een citaat van de Bronnen-sectie van dezelfde pagina (data-bronnen, bronnen.json), of
// (b) in ALLOW staat met een reden. Anders: herschrijf zonder getal.
// Lokaal: draait alleen met dist/ (npm run build). In CI (process.env.CI) NOOIT skippen.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { PATTERNS, scan, walk, dist, root } from './_claims-scan.js';

// pad (t.o.v. dist/ of public/data, forward slashes) -> [{ re, reden }]. ALLEEN met reden. Leeg = ideaal.
const ALLOW = {
};

const hasDist = fs.existsSync(path.join(dist, 'index.html'));
const maybe = hasDist || process.env.CI ? describe : describe.skip;

maybe('geen ongebronde effectcijfers', () => {
  it('dist/ bestaat (CI bouwt vóór de tests)', () => {
    expect(hasDist, 'dist/ ontbreekt: draai npm run build').toBe(true);
  });
  it('geen effect/ROI/besparing-cijfers zonder bron in dist/**/*.html', () => {
    const hits = walk(dist).filter((f) => f.endsWith('.html')).flatMap((f) => scan(f, fs.readFileSync(f, 'utf8'), true, ALLOW));
    expect(hits, hits.slice(0, 40).join('\n')).toEqual([]);
  });
  it('geen ongebronde effectcijfers in public/data/*.json', () => {
    const dir = path.join(root, 'public', 'data');
    const hits = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).flatMap((f) => scan(path.join(dir, f), fs.readFileSync(path.join(dir, f), 'utf8'), false, ALLOW));
    expect(hits, hits.slice(0, 40).join('\n')).toEqual([]);
  });
  it('patronen vangen de bekende gevallen (guard werkt)', () => {
    const t = '40% meer leads, 15-25 procent extra omzet, 21x meer kans, ROI van 300%, terugverdientijd 3 maanden, bespaart u €500';
    const names = new Set(PATTERNS.filter(([, re]) => { re.lastIndex = 0; return re.test(t); }).map(([n]) => n));
    for (const n of ['pct-effect', 'x-meer', 'roi-van', 'terugverdientijd', 'besparing-euro']) expect(names.has(n), n).toBe(true);
  });
  it('allowlist: elke entry heeft een reden', () => {
    for (const [p, arr] of Object.entries(ALLOW)) for (const a of arr) expect(a.reden?.length, p).toBeGreaterThan(10);
  });
});

// Aanloop AI heeft geen eigen SOC 2-rapport, geen ISO 27001- of NEN 7510-certificaat,
// en HIPAA is in Nederland niet van toepassing. Op 2026-09-25 bleek de site toch
// "data uitsluitend binnen de EU (Frankfurt of Amsterdam)", "geen Amerikaanse clouds"
// en een "SOC 2 Type II roadmap (2026)" te claimen, terwijl Cloudflare, ElevenLabs,
// OpenAI/Anthropic en Google Amerikaanse sub-verwerkers zijn en de eigen server bij
// Hetzner in Neurenberg staat. Deze test vergrendelt de eerlijke versie: wie een
// valse claim terugzet, moet deze test bewust aanpassen.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../src/', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith('.astro')) out.push(p);
  }
  return out;
}
const pages = walk(fileURLToPath(new URL('pages/', root)))
  .map((p) => ({ p, src: readFileSync(p, 'utf8') }));

const VERBODEN = [
  'data uitsluitend binnen de EU verwerkt (Frankfurt of Amsterdam',
  'uitsluitend op EU-servers (Frankfurt of Amsterdam',
  'geen persoonsgegevens naar Amerikaanse clouds',
  'geen data naar Amerikaanse clouddiensten',
  'SOC 2 Type II roadmap',
  'OVHcloud HDS-certificering',
  'Microsoft Azure EU-West met BAA-equivalent',
];

describe('Geen valse certificerings- of datalocatieclaims', () => {
  it.each(VERBODEN)('geen pagina bevat "%s"', (zin) => {
    const hits = pages.filter(({ src }) => src.includes(zin)).map(({ p }) => p);
    expect(hits).toEqual([]);
  });

  it('geen pagina claimt dat Aanloop AI zelf SOC 2/ISO 27001/HIPAA-gecertificeerd is', () => {
    const claim = /Aanloop AI (is|zijn) (SOC ?2|ISO ?27001|HIPAA)[- ](gecertificeerd|compliant)/i;
    const hits = pages.filter(({ src }) => claim.test(src)).map(({ p }) => p);
    expect(hits).toEqual([]);
  });
});

describe('/beveiliging/ vertelt per norm de waarheid', () => {
  const page = read('pages/beveiliging.astro');

  it('SOC 2, ISO 27001 en NEN 7510: "Nee" voor Aanloop AI zelf', () => {
    for (const norm of ['SOC 2 (Type I / Type II)', 'ISO/IEC 27001', 'NEN 7510 (zorg)']) {
      expect(page).toMatch(new RegExp(`norm: '${norm.replace(/[()/]/g, '\\$&')}',\\s*wij: 'Nee'`));
    }
  });

  it('HIPAA staat als niet van toepassing, niet als "ja"', () => {
    expect(page).toMatch(/norm: 'HIPAA',\s*wij: 'Niet van toepassing'/);
  });

  it('sub-verwerkersregister noemt de Amerikaanse leveranciers', () => {
    for (const naam of ['Cloudflare', 'ElevenLabs', 'OpenAI / Anthropic', 'Google', 'Hetzner', 'Mollie', 'Brevo']) {
      expect(page).toContain(`naam: '${naam}`);
    }
  });
});

describe('Homepage en footer linken naar /beveiliging/', () => {
  it('homepage heeft een beveiligingsblok met link', () => {
    const home = read('pages/index.astro');
    expect(home).toContain('aria-labelledby="beveiliging-heading"');
    expect(home).toContain('href="/beveiliging/"');
    expect(home).toContain('geen SOC 2- of ISO 27001-certificaat');
  });

  it('footer linkt naar /beveiliging/', () => {
    expect(read('components/Footer.astro')).toContain('href="/beveiliging/"');
  });
});

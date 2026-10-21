// PHP-lekken CVE-2026-109618/-109619 (21 oktober 2026). Drie pagina's: nieuws,
// checklist en de dienst website-beveiliging-onderhoud. Deze test vergrendelt
// wat eerlijk en feitelijk juist is:
// - de gepatchte versies zoals Sansec/PHP ze publiceerden (een typfout hier
//   stuurt een ondernemer naar een kwetsbare versie);
// - de waarschuwing dat een onderhoudsmodus NIET beschermt (Sansec);
// - geen "100% veilig"-belofte en geen eigen certificering (zie
//   beveiliging-geen-valse-certificering.test.js; die walkt alleen .astro,
//   de .md-artikelen worden hier gedekt).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

const nieuws = src('content/kennisbank/php-lek-oktober-2026-websites-offline.md');
const checklist = src('content/kennisbank/is-mijn-website-kwetsbaar-php-lek-checklist.md');
const dienst = src('pages/diensten/website-beveiliging-onderhoud.astro');
const beveiliging = src('pages/beveiliging.astro');
const all = [nieuws, checklist, dienst];

describe('PHP-lek pagina\'s', () => {
  it('noemen de juiste gepatchte PHP-versies', () => {
    for (const s of all) {
      for (const v of ['8.5.12', '8.4.27', '8.3.36', '8.2.35']) expect(s).toContain(v);
    }
  });

  it('waarschuwen dat onderhoudsmodus niet beschermt', () => {
    for (const s of all) expect(s).toMatch(/onderhouds(modus|pagina)[^.]*(helpt niet|beschermt[^.]*niet)/i);
  });

  it('noemen beide CVE-nummers in nieuws en checklist', () => {
    for (const s of [nieuws, checklist]) {
      expect(s).toContain('CVE-2026-109618');
      expect(s).toContain('CVE-2026-109619');
    }
  });

  it('beloven geen 100% veiligheid en claimen geen eigen certificaat', () => {
    for (const s of all) {
      expect(s).not.toMatch(/(garanderen|garantie)[^.]*(veilig|onhackbaar)/i);
      expect(s).not.toMatch(/Aanloop AI (is|zijn) (SOC ?2|ISO ?27001|NEN ?7510)[- ](gecertificeerd|compliant)/i);
    }
    expect(dienst).toMatch(/geen eigen SOC 2-, ISO 27001- of NEN 7510-cert/i);
  });

  it('dienst heeft geen verzonnen prijs', () => {
    expect(dienst).not.toMatch(/€\s?\d/);
    expect(dienst).toContain('Op aanvraag');
  });

  it('/beveiliging/ linkt naar alle drie de pagina\'s', () => {
    for (const href of [
      '/kennisbank/php-lek-oktober-2026-websites-offline/',
      '/kennisbank/is-mijn-website-kwetsbaar-php-lek-checklist/',
      '/diensten/website-beveiliging-onderhoud/',
    ]) expect(beveiliging).toContain(href);
  });
});

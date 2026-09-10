// Guards voor /leads-kopen/* (2026-09-10). Owner-besluiten die hier vastliggen:
// - Geen prijzen op de leadpagina's: prijs per lead is "op aanvraag".
// - Alleen branches met een aantoonbaar lopende leadstroom zijn 'actief'
//   (keukens via keukeninbeeld.nl). Een nieuwe 'actief' vereist deze test
//   aanpassen — dat is de bedoeling: het is een claim naar buiten.
// - 'in-opbouw' mag nergens "beschikbaar" / "direct leverbaar" beloven.
// - Sitemap, nav en worker kennen de nieuwe route (drift-guard).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { LEAD_SECTORS, LEAD_GROEPEN } from '../src/data/lead-sectors.ts';

const ROOT = join(import.meta.dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const LEAD_FILES = [
  'src/data/lead-sectors.ts',
  'src/data/lead-content.ts',
  ...readdirSync(join(ROOT, 'src', 'pages', 'leads-kopen')).map((f) => `src/pages/leads-kopen/${f}`),
  ...readdirSync(join(ROOT, 'src', 'content', 'kennisbank'))
    .filter((f) => /leads-kopen|gedeelde-leads|avg-bij-leads/.test(f))
    .map((f) => `src/content/kennisbank/${f}`),
];

const nonCommentLines = (src) => src.split('\n').filter((l) => !/^\s*(\/\/|\*|<!--)/.test(l));

describe('leads-kopen — data', () => {
  it('heeft unieke slugs, geldige groepen en minimaal 20 branches', () => {
    const slugs = LEAD_SECTORS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.length).toBeGreaterThanOrEqual(20);
    for (const s of LEAD_SECTORS) {
      expect(LEAD_GROEPEN, `${s.slug}: onbekende groep "${s.groep}"`).toContain(s.groep);
      expect(/^[a-z0-9-]+$/.test(s.slug), `${s.slug}: slug niet url-veilig`).toBe(true);
      expect(s.velden.length, `${s.slug}: velden`).toBe(5);
      expect(s.voorbeelden.length, `${s.slug}: voorbeelden`).toBe(3);
      expect(s.faq.length, `${s.slug}: faq`).toBe(2);
    }
  });

  it("markeert alleen keukens als 'actief' (aantoonbare leadstroom: keukeninbeeld.nl)", () => {
    const actief = LEAD_SECTORS.filter((s) => s.status === 'actief').map((s) => s.slug);
    expect(actief).toEqual(['keukens']);
  });

  it('bevat geen bijzondere persoonsgegevens in de leadvelden (AVG art. 9)', () => {
    const verboden = /medisch|gezondheid|diagnose|ziekte|religie|geloof|strafblad|etnisch|seksuel/i;
    for (const s of LEAD_SECTORS) {
      for (const v of s.velden) expect(verboden.test(v), `${s.slug}: "${v}"`).toBe(false);
    }
  });
});

describe('leads-kopen — geen prijzen, geen valse beschikbaarheid', () => {
  it('noemt nergens een bedrag, percentage of "vanaf"-prijs', () => {
    const banned = [
      [/€/u, 'euroteken'],
      [/\b\d+([.,]\d+)?\s?(euro|EUR)\b/iu, 'bedrag in euro'],
      [/\d\s?%/u, 'percentage'],
      [/\bvanaf\s+(€|\d)/iu, '"vanaf"-prijs'],
    ];
    const hits = [];
    for (const f of LEAD_FILES) {
      nonCommentLines(read(f)).forEach((line, i) => {
        for (const [re, why] of banned) if (re.test(line)) hits.push(`${f}:${i + 1} — ${why}`);
      });
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it("belooft geen voorraad: 'beschikbaar', 'direct leverbaar', 'op voorraad' komen niet voor", () => {
    const re = /\bbeschikbaar\b|direct leverbaar|op voorraad|wij hebben leads/iu;
    const hits = [];
    for (const f of LEAD_FILES) {
      nonCommentLines(read(f)).forEach((line, i) => { if (re.test(line)) hits.push(`${f}:${i + 1}`); });
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });
});

describe('leads-kopen — bedrading', () => {
  it('sitemap bevat hub, subpagina\'s en elke branche', () => {
    const xml = read('public/sitemap.xml');
    for (const u of ['/leads-kopen/', '/leads-kopen/aanmelden/', '/leads-kopen/hoe-het-werkt/', '/leads-kopen/prijzen/', '/leads-kopen/voorwaarden/']) {
      expect(xml, u).toContain(`<loc>https://aanloopai.nl${u}</loc>`);
    }
    for (const s of LEAD_SECTORS) {
      expect(xml, s.slug).toContain(`<loc>https://aanloopai.nl/leads-kopen/${s.slug}/</loc>`);
    }
  });

  it('build-sitemap leest lead-sectors.ts (nieuwe branche = automatisch in sitemap)', () => {
    expect(read('scripts/build-sitemap.cjs')).toContain("'lead-sectors.ts'");
  });

  it('header, footer, diensten-overzicht en tarieven linken naar /leads-kopen/', () => {
    for (const f of ['src/components/Header.astro', 'src/components/Footer.astro', 'src/pages/diensten/index.astro', 'src/pages/tarieven.astro', 'src/pages/index.astro']) {
      expect(read(f), f).toMatch(/href[:=]\s?["']\/leads-kopen\//);
    }
  });

  it('worker kent form_type=leads (autoresponse + verplichte velden) en bedankt kent ?type=leads', () => {
    const worker = read('src/worker.js');
    expect(worker).toMatch(/^\s+leads: \{/m);
    expect(worker).toContain("formType === 'leads'");
    expect(read('src/pages/bedankt.astro')).toMatch(/^\s+leads: \{/m);
  });

  it('aanmeldformulier post naar /api/submit met form_type=leads en privacy-akkoord', () => {
    const form = read('src/pages/leads-kopen/aanmelden.astro');
    expect(form).toContain('name="form_type" value="leads"');
    expect(form).toContain("fetch('/api/submit'");
    expect(form).toContain('name="akkoord"');
    expect(form).toContain('name="botcheck"');
    expect(existsSync(join(ROOT, 'src/pages/leads-kopen/[sector].astro'))).toBe(true);
  });
});

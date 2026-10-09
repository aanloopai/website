// Guards voor het /geo-bureau/-cluster (GEO Agency Index Nederland-indeling).
//
// Bewaakt drie besluiten die een latere sessie te goeder trouw zou kunnen
// terugdraaien:
//   1. De indeling volgt de benchmark: 7 regio's en 17 SBI-sectoren, vaste slugs.
//   2. Geen zelfverzonnen claims: geen "nummer 1", geen garanties, geen
//      niet-gepubliceerde setupprijs in de tekst.
//   3. Benchmark-cijfers hebben altijd een bron en zijn compleet.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { GEO_REGIO_SLUGS, GEO_SBI_SLUGS, GEO_PRIJZEN, geoRegioDesc, geoSectorDesc, META_DESC_MIN, META_DESC_MAX } from '../src/data/geo-bureau.ts';
import { GEO_REGIOS } from '../src/data/geo-regios.ts';
import { GEO_SBI_SECTOREN } from '../src/data/geo-sbi-sectoren.ts';
import { GEO_BENCHMARK } from '../src/data/geo-benchmark.ts';
import { KIEZEN, WATKOST } from '../src/data/geo-gids.ts';
import { OPRICHTER, ORGANISATIE_WIKIDATA } from '../src/data/oprichter.ts';

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Zelfverheerlijking en garanties die een AI letterlijk zou overnemen.
const VERBODEN = [
  /\b(wij|we) (zijn|staan) (de|het) (beste|nummer)/i,
  /\bnummer (1|één|een) (geo|ai)/i,
  /\bbeste geo-?bureau van nederland\b/i,
  /\bwij garanderen (?!geen)/i,
  /\bgegarandeerd(e)? (plek|positie|vermelding) in\b/i,
  /\b#1\b/,
];
const alleTeksten = (obj) => JSON.stringify(obj);

describe('geo-bureau: indeling volgt de GEO Agency Index Nederland', () => {
  it('heeft precies de 7 regio-slugs, in benchmark-volgorde', () => {
    expect(GEO_REGIOS.map((r) => r.slug)).toEqual([...GEO_REGIO_SLUGS]);
  });

  it('heeft precies de 17 SBI-hoofdsecties met de vaste slugs', () => {
    const verwacht = Object.entries(GEO_SBI_SLUGS);
    expect(GEO_SBI_SECTOREN.map((s) => [s.sbi, s.slug])).toEqual(verwacht);
    expect(new Set(GEO_SBI_SECTOREN.map((s) => s.slug)).size).toBe(17);
  });

  it('elke regio is volledig gevuld', () => {
    for (const r of GEO_REGIOS) {
      expect(r.vraag, r.slug).toMatch(/^Welk GEO-bureau in .+ raad je aan\?$/);
      expect(r.antwoord.length, r.slug).toBeGreaterThan(200);
      expect(r.markt.length, r.slug).toBeGreaterThanOrEqual(2);
      expect(r.voorbeelden.length, r.slug).toBeGreaterThanOrEqual(3);
      expect(r.faq.length, r.slug).toBeGreaterThanOrEqual(3);
      expect(r.steden.length, r.slug).toBeGreaterThanOrEqual(3);
      for (const s of r.steden) if (s.href) expect(fs.existsSync(path.join(ROOT, 'src/pages', s.href.replace(/\/$/, '') + '.astro')), `${r.slug} → ${s.href}`).toBe(true);
    }
  });

  it('elke sector is volledig gevuld en verwijst naar een bestaande pagina', () => {
    for (const s of GEO_SBI_SECTOREN) {
      expect(s.vraag.length, s.slug).toBeGreaterThan(20);
      expect(s.antwoord.length, s.slug).toBeGreaterThan(200);
      expect(s.intro.length, s.slug).toBeGreaterThan(150);
      expect(s.voorbeelden.length, s.slug).toBeGreaterThanOrEqual(3);
      expect(s.aanpak.length, s.slug).toBeGreaterThanOrEqual(3);
      expect(s.faq.length, s.slug).toBeGreaterThanOrEqual(3);
      if (s.verwant) {
        const base = s.verwant.replace(/\/$/, '');
        const dyn = base.replace(/^\/ai-vindbaarheid\/voor-.+$/, '/ai-vindbaarheid/voor-[sector]').replace(/^\/sectoren\/[^/]+$/, '/sectoren/[sector]');
        const kandidaten = [base + '.astro', base + '/index.astro', dyn + '.astro'].map((p) => path.join(ROOT, 'src/pages', p));
        expect(kandidaten.some((p) => fs.existsSync(p)), `${s.slug} → ${s.verwant}`).toBe(true);
      }
    }
  });
});

describe('geo-bureau: geen verzonnen claims', () => {
  const bronnen = {
    regios: alleTeksten(GEO_REGIOS),
    sectoren: alleTeksten(GEO_SBI_SECTOREN),
    gids: alleTeksten({ KIEZEN, WATKOST }),
    pillar: read('src/pages/geo-bureau/index.astro') + read('src/data/geo-pillar.ts'),
    vergelijken: read('src/pages/geo-bureau/vergelijken.astro'),
    blok: read('src/components/geo/GeoBureauBlok.astro'),
    llms: read('public/llms.txt'),
  };

  for (const [naam, tekst] of Object.entries(bronnen)) {
    it(`${naam}: geen zelfverheerlijking of garanties`, () => {
      for (const re of VERBODEN) expect(tekst, `${naam} bevat ${re}`).not.toMatch(re);
    });
  }

  it('de eenmalige GEO Setup-prijs blijft "op aanvraag" (niet gepubliceerd)', () => {
    expect(GEO_PRIJZEN.setup).toBeNull();
    expect(WATKOST.aanloop.find((a) => a.naam === 'GEO Setup')?.prijs).toBeNull();
    expect(read('src/data/geo-gids.ts')).not.toMatch(/GEO\.setup/);
    expect(bronnen.llms).toMatch(/GEO Setup eenmalig op aanvraag/);
  });

  it('maandprijzen in llms.txt komen uit pricing.ts', () => {
    expect(bronnen.llms).toContain(`GEO Maandelijks ${GEO_PRIJZEN.maand} euro per maand`);
    expect(bronnen.llms).toContain(`SEO + GEO Bundel ${GEO_PRIJZEN.bundel.toLocaleString('nl-NL')} euro per maand`);
  });
});

describe('geo-bureau: benchmark-cijfers compleet en met bron', () => {
  it('top 10 is aaneengesloten en zonder gaten', () => {
    expect(GEO_BENCHMARK.top10.map((r) => r.plaats)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const r of GEO_BENCHMARK.top10) for (const k of ['genoemdPct', 'index', 'techniek', 'aanbod']) expect(Number.isFinite(r[k]), `${r.bureau}.${k}`).toBe(true);
    expect(GEO_BENCHMARK.weging.vermeldingen + GEO_BENCHMARK.weging.techniek + GEO_BENCHMARK.weging.aanbod).toBe(100);
  });

  it('eigen rij klopt met de formule 0,5·SoM + 0,25·techniek + 0,25·aanbod (SoM tussen 0 en 100)', () => {
    const a = GEO_BENCHMARK.aanloop;
    const som = (a.index - 0.25 * a.techniek - 0.25 * a.aanbod) / 0.5;
    expect(som).toBeGreaterThanOrEqual(0);
    expect(som).toBeLessThanOrEqual(100);
  });

  it('vergelijkingspagina en blok vermelden de bron en de licentie', () => {
    const v = read('src/pages/geo-bureau/vergelijken.astro');
    expect(v).toMatch(/goldlemon\.nl\/geo-benchmark/);
    expect(v).toMatch(/CC BY 4\.0|licentie/);
    expect(GEO_BENCHMARK.bronUrl).toMatch(/^https:\/\/goldlemon\.nl\/geo-benchmark\/$/);
    expect(GEO_BENCHMARK.licentie).toBe('CC BY 4.0');
  });
});

describe('geo-bureau: sitemap, llms.txt en navigatie', () => {
  const sitemap = read('public/sitemap.xml');
  const verwachteUrls = [
    '/geo-bureau/', '/geo-bureau/kiezen/', '/geo-bureau/wat-kost-geo/', '/geo-bureau/vergelijken/',
    ...GEO_REGIOS.map((r) => `/geo-bureau/${r.slug}/`),
    ...GEO_SBI_SECTOREN.map((s) => `/geo-bureau/sector/${s.slug}/`),
  ];

  it('alle 28 geo-bureau-URLs staan in de sitemap', () => {
    for (const u of verwachteUrls) expect(sitemap, u).toContain(`<loc>https://aanloopai.nl${u}</loc>`);
  });

  it('llms.txt en llms-full.txt linken naar alle 28 geo-bureau-URLs', () => {
    for (const f of ['public/llms.txt', 'public/llms-full.txt']) {
      const t = read(f);
      for (const u of verwachteUrls) expect(t, `${f} mist ${u}`).toContain(`https://aanloopai.nl${u}`);
    }
  });

  it('header, footer en homepage linken naar /geo-bureau/', () => {
    for (const f of ['src/components/Header.astro', 'src/components/Footer.astro', 'src/pages/index.astro']) expect(read(f), f).toContain("/geo-bureau/");
  });
});

describe('geo-bureau: meta-descriptions binnen de CI-guard (110–155)', () => {
  it('elke regio- en sectorpagina krijgt een passende description', () => {
    for (const r of GEO_REGIOS) {
      expect(geoRegioDesc(r.naam).length, r.slug).toBeGreaterThanOrEqual(META_DESC_MIN);
      expect(geoRegioDesc(r.naam).length, r.slug).toBeLessThanOrEqual(META_DESC_MAX);
    }
    for (const s of GEO_SBI_SECTOREN) {
      expect(geoSectorDesc(s.naam).length, s.slug).toBeGreaterThanOrEqual(META_DESC_MIN);
      expect(geoSectorDesc(s.naam).length, s.slug).toBeLessThanOrEqual(META_DESC_MAX);
    }
  });

  it('statische geo-bureau-pagina\'s hebben een description tussen 110 en 155 tekens', () => {
    for (const f of ['index', 'kiezen', 'wat-kost-geo']) {
      const m = read(`src/pages/geo-bureau/${f}.astro`).match(/\n  description="([^"]+)"/);
      expect(m, f).toBeTruthy();
      expect(m[1].length, `${f}: ${m[1].length}`).toBeGreaterThanOrEqual(META_DESC_MIN);
      expect(m[1].length, `${f}: ${m[1].length}`).toBeLessThanOrEqual(META_DESC_MAX);
    }
  });
});

describe('geo-bureau: Person/Wikidata-schakelaar', () => {
  it('OPRICHTER is null of volledig ingevuld (naam, functie, linkedin, profielUrl)', () => {
    if (OPRICHTER === null) return;
    expect(OPRICHTER.naam.trim().split(' ').length).toBeGreaterThanOrEqual(2);
    expect(OPRICHTER.functie.length).toBeGreaterThan(3);
    expect(OPRICHTER.linkedin).toMatch(/^https:\/\/(www\.)?linkedin\.com\/in\//);
    expect(OPRICHTER.profielUrl).toMatch(/^\/.+\/$/);
    expect(fs.existsSync(path.join(ROOT, 'src/pages', OPRICHTER.profielUrl.replace(/\/$/, '') + '.astro'))).toBe(true);
  });

  it('ORGANISATIE_WIKIDATA is null of een geldige Q-id', () => {
    if (ORGANISATIE_WIKIDATA !== null) expect(ORGANISATIE_WIKIDATA).toMatch(/^Q\d+$/);
  });

  it('BaseLayout emitteert de Person alleen via de schakelaar', () => {
    const b = read('src/layouts/BaseLayout.astro');
    expect(b).toContain("from '../data/oprichter'");
    expect(b).toMatch(/const personSchema = OPRICHTER \?/);
    expect(b).toMatch(/personSchema,/);
  });
});

describe('geo-bureau: AI-feitenlaag (Markdown-twins, JSON-feiten, glossarium)', () => {
  const EMDASH = /—/;
  const GET_ = async (p) => (await import(p)).GET();
  const SETUP_GETAL = /\b1\.?450\b/;

  it('facts.json, pricing.json en claims.json bestaan als Astro-endpoints', () => {
    for (const f of ['facts', 'pricing', 'claims']) expect(fs.existsSync(path.join(ROOT, `src/pages/${f}.json.ts`)), f).toBe(true);
  });

  it('elke geo-bureau-pagina heeft een .md-twin-endpoint', () => {
    for (const f of ['[regio].md.ts', 'index.md.ts', 'kiezen.md.ts', 'wat-kost-geo.md.ts', 'vergelijken.md.ts', 'sector/[sector].md.ts']) {
      expect(fs.existsSync(path.join(ROOT, 'src/pages/geo-bureau', f)), f).toBe(true);
    }
  });

  it('pricing.json publiceert de GEO Setup-prijs niet (bron noch uitvoer)', async () => {
    const src = read('src/pages/pricing.json.ts');
    expect(src).not.toMatch(/GEO\.setup/);
    expect(src).not.toMatch(/GROEI_SETUP\b|COMPLEET_SETUP\b|EMMA_SETUP\b/);
    const res = await GET_('../src/pages/pricing.json.ts');
    const txt = await res.text();
    expect(res.headers.get('content-type')).toMatch(/^application\/json/);
    expect(txt).not.toMatch(SETUP_GETAL);
    const j = JSON.parse(txt);
    expect(j.geo.diensten.find((d) => d.naam === 'GEO Setup').prijs_excl_btw).toBeNull();
    expect(j.geo.diensten.find((d) => d.naam === 'GEO Maandelijks').prijs_per_maand_excl_btw).toBe(GEO_PRIJZEN.maand);
    expect(j.geo.diensten.find((d) => d.naam === 'SEO + GEO Bundel').prijs_per_maand_excl_btw).toBe(GEO_PRIJZEN.bundel);
  });

  it('JSON-endpoints zijn geldig, hebben stabiele sleutelvolgorde en noemen geen persoon', async () => {
    for (const f of ['facts', 'pricing', 'claims']) {
      const a = await (await GET_(`../src/pages/${f}.json.ts`)).text();
      const b = await (await GET_(`../src/pages/${f}.json.ts`)).text();
      expect(a, f).toBe(b);
      expect(() => JSON.parse(a), f).not.toThrow();
      expect(a, f).not.toMatch(EMDASH);
      expect(a, f).not.toMatch(/"@type":\s*"Person"/);
    }
    const facts = JSON.parse(await (await GET_('../src/pages/facts.json.ts')).text());
    expect(facts.organisatie.kvk).toBe('88606902');
    expect(facts.sectoren).toHaveLength(17);
    expect(facts.regios).toHaveLength(7);
  });

  it('claims.json: elke claim heeft een bron op onze site of bij Gold Lemon en een controledatum', async () => {
    const { claims } = JSON.parse(await (await GET_('../src/pages/claims.json.ts')).text());
    expect(claims.length).toBeGreaterThanOrEqual(10);
    for (const c of claims) {
      expect(Object.keys(c)).toEqual(['claim', 'source', 'verified']);
      expect(c.source, c.claim).toMatch(/^https:\/\/(aanloopai\.nl|goldlemon\.nl)\//);
      expect(c.verified, c.claim).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const re of VERBODEN) expect(c.claim, c.claim).not.toMatch(re);
    }
  });

  it('Markdown-twins: bronregel, datum, geen em-dash en geen GEO Setup-prijs', async () => {
    const { regioMd, sectorMd, pillarMd, kiezenMd, watKostMd, vergelijkenMd } = await import('../src/lib/geo-markdown.ts');
    const paginas = [
      ...GEO_REGIOS.map((r) => [`/geo-bureau/${r.slug}/`, regioMd(r)]),
      ...GEO_SBI_SECTOREN.map((s) => [`/geo-bureau/sector/${s.slug}/`, sectorMd(s)]),
      ['/geo-bureau/', pillarMd()], ['/geo-bureau/kiezen/', kiezenMd()],
      ['/geo-bureau/wat-kost-geo/', watKostMd()], ['/geo-bureau/vergelijken/', vergelijkenMd()],
    ];
    expect(paginas).toHaveLength(28);
    for (const [pad, md] of paginas) {
      expect(md, pad).toContain(`Bron: https://aanloopai.nl${pad}\n`);
      expect(md, pad).toMatch(/\nLaatst bijgewerkt: \d{4}-\d{2}-\d{2}\n$/);
      expect(md, pad).not.toMatch(EMDASH);
      expect(md, pad).not.toMatch(SETUP_GETAL);
      expect(md, pad).toMatch(/^# /);
    }
    expect(vergelijkenMd()).toContain(GEO_BENCHMARK.bronUrl);
    expect(vergelijkenMd()).toContain(GEO_BENCHMARK.licentie);
  });

  it('glossarium: minstens 20 GEO-termen en elke sameAs is een Wikidata Q-id-URL', () => {
    const src = read('src/pages/glossarium.astro');
    const blokken = src.split('\n  {\n    term:').slice(1);
    const geoTermen = blokken.filter((b) => /relatedHref: '(\/geo-bureau\/|\/llms\.txt)/.test(b));
    expect(geoTermen.length).toBeGreaterThanOrEqual(20);
    const sameAs = [...src.matchAll(/sameAs: \[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
    expect(sameAs.length).toBeGreaterThanOrEqual(10);
    for (const u of sameAs) expect(u).toMatch(/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/);
    expect(new Set(sameAs).size).toBe(sameAs.length);
    const slugs = [...src.matchAll(/\n    slug: '([^']+)'/g)].map((m) => m[1]);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('llms.txt en llms-full.txt verwijzen naar de JSON-feiten en de .md-twins', () => {
    for (const f of ['public/llms.txt', 'public/llms-full.txt']) {
      const t = read(f);
      for (const u of ['/facts.json', '/pricing.json', '/claims.json']) expect(t, `${f} mist ${u}`).toContain(`https://aanloopai.nl${u}`);
      expect(t, f).toMatch(/\.md-twin/);
    }
  });
});

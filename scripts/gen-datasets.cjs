#!/usr/bin/env node
// Prebuild: src/data/datasets/*.json -> public/data/<slug>.json (machine-leesbare uitgave).
// Een datapunt zonder volledige bron (https-url, citaat, gelezen-datum) komt de dataset niet
// in: validate() gooit en het script stopt met exit 1, dus de build faalt luid.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src', 'data', 'datasets');
const OUT_DIR = path.join(ROOT, 'public', 'data');
const SITE = 'https://aanloopai.nl';
const GELEZEN = /^\d{4}-\d{2}-\d{2}$/;

// slug -> pagina waar de cijfers staan (voor bronUrl en citatie)
const PAGES = {
  'branche-statistieken-mkb-ai': '/branche-statistieken-mkb-ai-nederland/',
  'ai-adoptie-marktcontext-2026': '/onderzoek/ai-adoption-mkb-nederland-2026/',
};

function validate(bron) {
  if (!bron || !PAGES[bron.slug]) throw new Error(`gen-datasets: onbekende slug "${bron && bron.slug}"`);
  if (!GELEZEN.test(bron.gecontroleerd || '')) throw new Error(`gen-datasets: ${bron.slug} mist geldige "gecontroleerd" datum`);
  if (!Array.isArray(bron.datapunten) || bron.datapunten.length === 0) throw new Error(`gen-datasets: ${bron.slug} heeft geen datapunten`);
  const ids = new Set();
  for (const dp of bron.datapunten) {
    if (!dp.id || ids.has(dp.id)) throw new Error(`gen-datasets: ontbrekend of dubbel id (${dp.id})`);
    ids.add(dp.id);
    if (!(dp.tekst || '').trim()) throw new Error(`gen-datasets: ${dp.id} mist tekst`);
    const b = dp.bron;
    if (!b || !/^https:\/\//.test(b.url || '') || !(b.citaat || '').trim() || !GELEZEN.test(b.gelezen || '')) {
      throw new Error(`gen-datasets: ${dp.id} mist een volledige bron (https-url, citaat, gelezen)`);
    }
  }
}

function build(bron) {
  validate(bron);
  const pagina = PAGES[bron.slug];
  return {
    naam: bron.naam,
    editie: bron.editie,
    beschrijving: bron.beschrijving,
    bronUrl: `${SITE}${pagina}`,
    uitgever: { naam: 'Aanloop AI', kvk: '88606902', url: `${SITE}/` },
    licentie: 'https://creativecommons.org/licenses/by/4.0/',
    citatie: `Bron: Aanloop AI – ${bron.naam}, aanloopai.nl${pagina}`,
    bijgewerkt: bron.gecontroleerd,
    taal: 'nl-NL',
    land: 'NL',
    aantalDatapunten: bron.datapunten.length,
    datapunten: bron.datapunten,
  };
}

function loadSources(dir = SRC_DIR) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const bron of loadSources()) {
    const out = build(bron);
    fs.writeFileSync(path.join(OUT_DIR, `${bron.slug}.json`), `${JSON.stringify(out, null, 2)}\n`, 'utf8');
    console.log(`gen-datasets: ${bron.slug}.json — ${out.aantalDatapunten} datapunt(en)`);
  }
}

module.exports = { validate, build, loadSources, PAGES };

if (require.main === module) {
  try { main(); } catch (e) { console.error(e.message); process.exit(1); }
}

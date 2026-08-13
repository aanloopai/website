#!/usr/bin/env node
// Valideert de JSON-LD in dist/ tegen de verplichte velden van Google Rich Results.
// Semrush rapporteert dezelfde tekorten als "invalid structured data item"; deze
// check draait lokaal zodat een fix meteen te verifieren is.
//
//   node scripts/validate-jsonld.cjs                 # hele dist/
//   node scripts/validate-jsonld.cjs tarieven        # alleen paden die matchen
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const filter = process.argv[2] || '';

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function extractBlocks(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch (err) {
      blocks.push({ __parseError: err.message });
    }
  }
  return blocks;
}

// Platgeslagen lijst van alle node-objecten: @graph-leden, maar ook entiteiten
// die verstopt zitten in ItemList.itemListElement of mainEntity. De velden die
// zelf onderdeel van een node zijn (offers, provider, brand, ...) worden door
// hun eigen node gecontroleerd en hier overgeslagen.
const NESTED_SKIP = new Set([
  'offers', 'provider', 'brand', 'seller', 'creator', 'publisher', 'author',
  'audience', 'areaServed', 'eligibleRegion', 'priceSpecification', 'aggregateRating',
  'review', 'speakable', 'logo', 'image', 'address', 'potentialAction', 'about',
  'serviceOutput', 'instructor', 'worksFor', 'teaches', 'step',
]);

function flatten(node, out = [], seen = new Set()) {
  if (Array.isArray(node)) {
    node.forEach((n) => flatten(n, out, seen));
    return out;
  }
  if (!node || typeof node !== 'object' || seen.has(node)) return out;
  seen.add(node);
  if (node['@type']) out.push(node);
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('@') && key !== '@graph') continue;
    if (NESTED_SKIP.has(key)) continue;
    if (value && typeof value === 'object') flatten(value, out, seen);
  }
  return out;
}

const typesOf = (node) => (Array.isArray(node['@type']) ? node['@type'] : [node['@type']]);
const has = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);

const SOFTWARE_TYPES = ['SoftwareApplication', 'WebApplication', 'MobileApplication', 'VideoGame'];

function checkOffer(offer, prefix, issues) {
  if (!has(offer)) return;
  const offers = Array.isArray(offer) ? offer : [offer];
  for (const o of offers) {
    const t = typesOf(o)[0];
    if (t === 'AggregateOffer') {
      if (!has(o.lowPrice)) issues.push(`${prefix}.offers(AggregateOffer): lowPrice ontbreekt`);
      if (!has(o.priceCurrency)) issues.push(`${prefix}.offers(AggregateOffer): priceCurrency ontbreekt`);
      continue;
    }
    if (!has(o.price) && !has(o.priceSpecification)) {
      issues.push(`${prefix}.offers: price ontbreekt`);
    }
    if (has(o.price) && !/^\d+(\.\d+)?$/.test(String(o.price))) {
      issues.push(`${prefix}.offers.price is geen getal ("${o.price}")`);
    }
    if (!has(o.priceCurrency)) issues.push(`${prefix}.offers: priceCurrency ontbreekt`);
    if (!has(o.availability)) issues.push(`${prefix}.offers: availability ontbreekt`);
  }
}

function validateNode(node, issues) {
  const types = typesOf(node);
  const id = node['@id'] || node.name || '(naamloos)';

  if (types.some((t) => SOFTWARE_TYPES.includes(t))) {
    const p = `SoftwareApplication[${id}]`;
    if (!has(node.name)) issues.push(`${p}: name ontbreekt`);
    if (!has(node.applicationCategory)) issues.push(`${p}: applicationCategory ontbreekt`);
    if (!has(node.operatingSystem)) issues.push(`${p}: operatingSystem ontbreekt`);
    if (!has(node.offers)) issues.push(`${p}: offers ontbreekt`);
    else checkOffer(node.offers, p, issues);
    // Google eist voor de Software App rich result een rating; zonder echte
    // reviews is dat niet in te vullen en hoort het type hier niet.
    if (!has(node.aggregateRating) && !has(node.review)) {
      issues.push(`${p}: aggregateRating of review ontbreekt (verplicht voor Software App)`);
    }
  }

  if (types.includes('Product')) {
    const p = `Product[${id}]`;
    if (!has(node.name)) issues.push(`${p}: name ontbreekt`);
    if (!has(node.image)) issues.push(`${p}: image ontbreekt`);
    if (!has(node.offers) && !has(node.review) && !has(node.aggregateRating)) {
      issues.push(`${p}: offers/review/aggregateRating ontbreken alle drie`);
    }
    checkOffer(node.offers, p, issues);
    // Merchant listing-validatie schopt aan zodra er een Offer met prijs hangt.
    const offers = Array.isArray(node.offers) ? node.offers : node.offers ? [node.offers] : [];
    for (const o of offers) {
      if (typesOf(o)[0] === 'Offer' && has(o.price)) {
        if (!has(o.shippingDetails)) issues.push(`${p}: offers.shippingDetails ontbreekt (merchant listing)`);
        if (!has(o.hasMerchantReturnPolicy)) issues.push(`${p}: offers.hasMerchantReturnPolicy ontbreekt (merchant listing)`);
      }
    }
  }

  if (types.includes('Course')) {
    const p = `Course[${id}]`;
    if (!has(node.name)) issues.push(`${p}: name ontbreekt`);
    if (!has(node.description)) issues.push(`${p}: description ontbreekt`);
    const prov = node.provider;
    if (!has(prov) || !has(prov && prov.name)) issues.push(`${p}: provider.name ontbreekt`);
    if (!has(node.hasCourseInstance)) issues.push(`${p}: hasCourseInstance ontbreekt`);
    if (!has(node.offers)) issues.push(`${p}: offers ontbreekt (Course info)`);
    const instances = Array.isArray(node.hasCourseInstance)
      ? node.hasCourseInstance
      : node.hasCourseInstance
        ? [node.hasCourseInstance]
        : [];
    for (const ci of instances) {
      if (!has(ci.courseMode)) issues.push(`${p}: hasCourseInstance.courseMode ontbreekt`);
      if (!has(ci.courseWorkload) && !has(ci.courseSchedule)) {
        issues.push(`${p}: hasCourseInstance.courseWorkload of courseSchedule ontbreekt`);
      }
    }
  }
}

const files = walk(DIST).filter((f) => !filter || f.includes(filter));
let totalIssues = 0;
const perFile = [];

for (const file of files) {
  const rel = path.relative(DIST, file).replace(/\\/g, '/');
  const html = fs.readFileSync(file, 'utf-8');
  const issues = [];
  for (const block of extractBlocks(html)) {
    if (block.__parseError) {
      issues.push(`JSON parse-fout: ${block.__parseError}`);
      continue;
    }
    flatten(block).forEach((node) => validateNode(node, issues));
  }
  if (issues.length) {
    perFile.push({ rel, issues });
    totalIssues += issues.length;
  }
}

perFile.sort((a, b) => b.issues.length - a.issues.length);
for (const { rel, issues } of perFile) {
  console.log(`\n${rel}  (${issues.length})`);
  issues.forEach((i) => console.log(`   - ${i}`));
}
console.log(`\n${totalIssues} bevinding(en) in ${perFile.length} van ${files.length} pagina's.`);
process.exit(totalIssues ? 1 : 0);

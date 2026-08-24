#!/usr/bin/env node
/**
 * validate-schema.mjs — JSON-LD structuurvalidatie over de gebouwde site.
 *
 * Loopt elke dist/**\/*.html af, haalt alle <script type="application/ld+json">
 * blokken eruit en controleert:
 *   1. geldige JSON;
 *   2. @context aanwezig en schema.org;
 *   3. elk @type staat in de allowlist hieronder (nieuw type bewust toevoegen —
 *      dit ving RequestQuoteAction, dat niet in het schema.org-vocabulaire
 *      bestaat, Ahrefs-audit 2026-08-24);
 *   4. potentialAction heeft een @type dat een geldige Action-subklasse is;
 *   5. LocalBusiness heeft geen author (unexpected property, Ahrefs) en geen
 *      postalCode met een bereik (postalCode is één code, geen '8200-8244');
 *   6. url/@id/target/sameAs zijn absoluut en beginnen met https:// (interne
 *      links: https://aanloopai.nl, nooit http://).
 *
 * Gebruik:  node scripts/validate-schema.mjs   (na astro build)
 * Exit 1 bij fouten — geschikt als CI-stap.
 */

import fs from 'node:fs';
import path from 'node:path';

const DIST = path.join(process.cwd(), 'dist');

// Types die deze site bewust gebruikt. Onbekend type = fout: liever een
// bewuste toevoeging hier dan stilzwijgend ongeldig structured data uitsturen.
const KNOWN_TYPES = new Set([
  'Organization', 'LocalBusiness', 'WebSite', 'WebPage', 'WebApplication',
  'Service', 'Offer', 'AggregateOffer', 'PriceSpecification', 'UnitPriceSpecification',
  'PostalAddress', 'GeoCoordinates', 'GeoShape', 'Place', 'City', 'Country',
  'OpeningHoursSpecification', 'ContactPoint', 'Brand', 'ImageObject',
  'FAQPage', 'Question', 'Answer', 'BreadcrumbList', 'ListItem', 'ItemList',
  'Article', 'BlogPosting', 'NewsArticle', 'ScholarlyArticle', 'TechArticle',
  'HowTo', 'HowToStep', 'HowToSection', 'VideoObject', 'AudioObject',
  'Person', 'Thing', 'CreativeWork', 'CreativeWorkSeries', 'Dataset', 'DataCatalog', 'DataDownload',
  'Review', 'AggregateRating', 'Rating', 'BusinessAudience', 'Audience',
  'EntryPoint', 'PropertyValue', 'DefinedTerm', 'DefinedTermSet', 'SpeakableSpecification',
  'Event', 'JobPosting', 'MonetaryAmount', 'QuantitativeValue', 'EducationalOccupationalCredential',
  'ProfessionalService', 'SiteNavigationElement', 'WebPageElement', 'CollectionPage', 'AboutPage', 'ContactPage',
  'OfferCatalog', 'DigitalDocument',
  // Action-subklassen (ook geldig als potentialAction):
  'SearchAction', 'QuoteAction', 'CommunicateAction', 'InformAction',
  'RegisterAction', 'SubscribeAction', 'ViewAction', 'ReadAction', 'DownloadAction',
]);

// Geldige Action-types voor potentialAction (subset van KNOWN_TYPES).
const ACTION_TYPES = new Set([
  'Action', 'SearchAction', 'QuoteAction', 'CommunicateAction', 'InformAction',
  'RegisterAction', 'SubscribeAction', 'ViewAction', 'ReadAction', 'DownloadAction',
  'TradeAction', 'BuyAction', 'OrderAction', 'InteractAction', 'ConsumeAction',
]);

const URL_KEYS = new Set(['url', '@id', 'sameAs', 'target', 'contentUrl', 'thumbnailUrl', 'logo', 'image', 'mainEntityOfPage']);

const errors = [];
const stats = { files: 0, blocks: 0, nodes: 0 };

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

function err(file, msg) {
  errors.push(`${path.relative(DIST, file).replace(/\\/g, '/')}: ${msg}`);
}

function checkUrlValue(file, key, value, ctx) {
  if (typeof value !== 'string') return;
  if (!/^https?:\/\//.test(value)) {
    // relatief of anker — alleen fout als het op een pagina-URL lijkt
    if (value.startsWith('/') || value.startsWith('http')) {
      err(file, `${ctx}: ${key} niet absoluut https: "${value}"`);
    }
    return;
  }
  if (value.startsWith('http://')) {
    err(file, `${ctx}: ${key} gebruikt http:// i.p.v. https://: "${value}"`);
  }
}

function checkNode(file, node, ctx) {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((n, i) => checkNode(file, n, `${ctx}[${i}]`));
    return;
  }
  const types = [].concat(node['@type'] || []);
  if (types.length) stats.nodes++;
  for (const t of types) {
    if (typeof t === 'string' && !KNOWN_TYPES.has(t) && !ACTION_TYPES.has(t)) {
      err(file, `${ctx}: onbekend @type "${t}" — bestaat dit in schema.org? Zo ja: toevoegen aan KNOWN_TYPES in scripts/validate-schema.mjs`);
    }
  }
  if (types.includes('LocalBusiness')) {
    if ('author' in node) err(file, `${ctx}: LocalBusiness heeft "author" (unexpected property)`);
  }
  if (types.includes('PostalAddress') && typeof node.postalCode === 'string' && /\d\s*[-–]\s*\d/.test(node.postalCode)) {
    err(file, `${ctx}: postalCode is een bereik ("${node.postalCode}") — moet één code zijn`);
  }
  if ('potentialAction' in node) {
    for (const pa of [].concat(node.potentialAction)) {
      const paTypes = [].concat((pa && pa['@type']) || []);
      if (!paTypes.length || !paTypes.some((t) => ACTION_TYPES.has(t))) {
        err(file, `${ctx}: potentialAction @type "${paTypes.join(',') || '(geen)'}" is geen geldige Action`);
      }
    }
  }
  for (const [k, v] of Object.entries(node)) {
    if (URL_KEYS.has(k)) {
      for (const vv of [].concat(v)) checkUrlValue(file, k, vv, ctx);
    }
    if (v && typeof v === 'object' && k !== '@context') checkNode(file, v, `${ctx}.${k}`);
  }
}

const blockRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

for (const file of walk(DIST)) {
  const html = fs.readFileSync(file, 'utf8');
  let m;
  let sawBlock = false;
  while ((m = blockRe.exec(html)) !== null) {
    sawBlock = true;
    stats.blocks++;
    let data;
    try {
      data = JSON.parse(m[1]);
    } catch (e) {
      err(file, `ongeldige JSON in ld+json blok: ${e.message}`);
      continue;
    }
    for (const root of [].concat(data)) {
      const ctxVal = root['@context'];
      const ctxStr = typeof ctxVal === 'string' ? ctxVal : '';
      if (!ctxStr.includes('schema.org')) {
        err(file, `@context ontbreekt of is geen schema.org: ${JSON.stringify(ctxVal)}`);
      }
      checkNode(file, root, [].concat(root['@type'] || ['?']).join('+'));
    }
  }
  if (sawBlock) stats.files++;
}

console.log(`validate-schema: ${stats.files} pagina's met JSON-LD, ${stats.blocks} blokken, ${stats.nodes} nodes gecontroleerd.`);
if (errors.length) {
  console.error(`\n${errors.length} fout(en):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('Geen structured-data-fouten gevonden.');

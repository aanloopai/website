#!/usr/bin/env node
// Schema.org JSON-LD validator. Walks dist/, extracts every
// <script type="application/ld+json"> block, parses it, and checks
// required-field rules per @type.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'scripts', 'seo-schema-validator-output.json');

if (!fs.existsSync(DIST)) {
  console.error('No dist/ — run "npm run build" first.');
  process.exit(1);
}

const REQUIRED = {
  Organization: ['name', 'url'],
  LocalBusiness: ['name', 'address', 'telephone'],
  ProfessionalService: ['name', 'url'],
  Person: ['name'],
  WebSite: ['name', 'url'],
  WebPage: ['name', 'url'],
  Article: ['headline', 'datePublished', 'author'],
  BlogPosting: ['headline', 'datePublished', 'author'],
  NewsArticle: ['headline', 'datePublished', 'author'],
  TechArticle: ['headline', 'datePublished', 'author'],
  FAQPage: ['mainEntity'],
  Question: ['name', 'acceptedAnswer'],
  Answer: ['text'],
  BreadcrumbList: ['itemListElement'],
  ListItem: ['position', 'name', 'item'],
  Service: ['name', 'provider'],
  Offer: ['price', 'priceCurrency'],
  AggregateOffer: ['lowPrice', 'priceCurrency', 'offerCount'],
  Product: ['name'],
  Review: ['author', 'reviewRating'],
  Rating: ['ratingValue'],
  AggregateRating: ['ratingValue', 'reviewCount'],
  CollectionPage: ['name', 'url'],
  ItemList: ['itemListElement'],
  HowTo: ['name', 'step'],
  HowToStep: ['name', 'text'],
  Event: ['name', 'startDate', 'location'],
  ImageObject: ['url'],
  PostalAddress: ['addressCountry'],
  ContactPoint: ['contactType'],
  GeoCoordinates: ['latitude', 'longitude'],
  OpeningHoursSpecification: ['opens', 'closes'],
};

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function checkSchema(schema, sourceFile, idx, errors, isTopLevel = true) {
  if (!schema || typeof schema !== 'object') {
    errors.push({ file: sourceFile, schemaIndex: idx, type: 'invalid', message: 'schema is not an object' });
    return;
  }
  // @context only required at top-level — nested objects inherit from parent.
  if (isTopLevel && !schema['@context']) {
    errors.push({ file: sourceFile, schemaIndex: idx, type: 'missing-context', message: 'missing @context (top-level)' });
  }
  // Nested objects with @id are graph-references — Google merges them with
  // the canonical entity by @id. Skip required-field checks regardless of
  // other fields (name etc. are display hints, not required for reference).
  if (!isTopLevel && schema['@id']) {
    return;
  }
  const types = Array.isArray(schema['@type']) ? schema['@type'] : [schema['@type']];
  if (!types[0]) {
    errors.push({ file: sourceFile, schemaIndex: idx, type: 'missing-type', message: 'missing @type' });
    return;
  }
  for (const t of types) {
    const required = REQUIRED[t];
    if (!required) continue;
    for (const field of required) {
      if (schema[field] === undefined || schema[field] === null || schema[field] === '') {
        errors.push({
          file: sourceFile,
          schemaIndex: idx,
          type: `missing-field-${t}.${field}`,
          message: `${t} missing required field "${field}"`,
        });
      } else if (Array.isArray(schema[field]) && schema[field].length === 0) {
        errors.push({
          file: sourceFile,
          schemaIndex: idx,
          type: `empty-array-${t}.${field}`,
          message: `${t} required field "${field}" is empty array`,
        });
      }
    }
  }
  for (const key of Object.keys(schema)) {
    const v = schema[key];
    if (v && typeof v === 'object') {
      if (Array.isArray(v)) {
        v.forEach((item, i) => {
          if (item && typeof item === 'object' && item['@type']) {
            checkSchema(item, sourceFile, `${idx}.${key}[${i}]`, errors, false);
          }
        });
      } else if (v['@type']) {
        checkSchema(v, sourceFile, `${idx}.${key}`, errors, false);
      }
    }
  }
}

const htmlFiles = walk(DIST);
const errors = [];
let totalSchemas = 0;
const SCRIPT_RE = /<script\b[^>]*?type=["']application\/ld\+json["'][^>]*?>([\s\S]*?)<\/script>/gi;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(DIST, file).replace(/\\/g, '/');
  let idx = 0;
  for (const m of html.matchAll(SCRIPT_RE)) {
    totalSchemas++;
    let schema;
    try {
      schema = JSON.parse(m[1].trim());
    } catch (e) {
      errors.push({
        file: rel,
        schemaIndex: idx,
        type: 'parse-error',
        message: `JSON parse failed: ${e.message}`,
      });
      idx++;
      continue;
    }
    checkSchema(schema, rel, idx, errors);
    idx++;
  }
}

const errorsByType = {};
for (const e of errors) {
  errorsByType[e.type] = (errorsByType[e.type] || 0) + 1;
}

console.log('=== AANLOOPAI SCHEMA.ORG VALIDATOR ===');
console.log(`Pages audited: ${htmlFiles.length}`);
console.log(`JSON-LD schemas total: ${totalSchemas}`);
console.log(`Errors found: ${errors.length}`);
console.log('');
console.log('Errors by type:');
Object.entries(errorsByType).sort((a, b) => b[1] - a[1]).forEach(([t, c]) =>
  console.log(`  ${c.toString().padStart(4)}x  ${t}`)
);
console.log('');
if (errors.length > 0) {
  console.log('First 30 error samples:');
  errors.slice(0, 30).forEach((e) => console.log(`  ${e.file}#${e.schemaIndex}  ${e.type}  ${e.message}`));
}

fs.writeFileSync(OUT, JSON.stringify({
  pagesAudited: htmlFiles.length,
  totalSchemas,
  errorCount: errors.length,
  errorsByType,
  errors,
}, null, 2));
console.log('');
console.log(`Output: ${path.relative(ROOT, OUT)}`);

#!/usr/bin/env node
// One-shot Lighthouse a11y detail extractor. Pulls element-level details
// (color-contrast, aria, button-name, heading-order, label) for a single URL
// from PSI to surface exact selectors needing fixes.
//
// Usage:
//   node scripts/seo-psi-a11y-detail.cjs / desktop
//   node scripts/seo-psi-a11y-detail.cjs /aanvragen/ mobile
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env.local');
const SITE = 'https://aanloopai.nl';
const PSI_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

const TARGET_AUDITS = [
  'color-contrast',
  'aria-required-children',
  'aria-required-parent',
  'button-name',
  'label-content-name-mismatch',
  'heading-order',
  'list',
  'link-in-text-block',
  'is-crawlable',
  'unsized-images',
];

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const url = process.argv[2] || '/';
  const strategy = process.argv[3] || 'desktop';
  const KEY = loadEnv().GOOGLE_PSI_KEY;
  const target = SITE + url;
  const psiUrl = `${PSI_BASE}?url=${encodeURIComponent(target)}&key=${KEY}&strategy=${strategy}&category=accessibility&category=seo`;
  console.log(`Fetching: ${url} (${strategy})`);
  const data = await fetchJson(psiUrl);
  if (data.error) { console.error(data.error); process.exit(1); }
  const audits = data.lighthouseResult.audits;
  for (const id of TARGET_AUDITS) {
    const a = audits[id];
    if (!a || a.score === 1 || a.score === null) continue;
    console.log(`\n=== ${id} (score=${a.score}) — ${a.title}`);
    const items = a.details?.items || [];
    for (const item of items.slice(0, 8)) {
      const node = item.node || {};
      console.log(`  - selector: ${node.selector || 'n/a'}`);
      if (node.snippet) console.log(`    snippet: ${node.snippet.slice(0, 200)}`);
      if (node.explanation) console.log(`    why: ${node.explanation.slice(0, 200)}`);
      if (node.nodeLabel) console.log(`    label: ${node.nodeLabel.slice(0, 100)}`);
    }
    if (items.length > 8) console.log(`  ... (${items.length - 8} more)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

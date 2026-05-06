#!/usr/bin/env node
// PageSpeed Insights audit for aanloopai.nl. Reads GOOGLE_PSI_KEY from
// .env.local, queries PSI API for top URLs (mobile + desktop), and writes
// a per-URL summary with Lighthouse scores + top opportunities.
//
// Usage:
//   node scripts/seo-pagespeed-audit.cjs           # default top URLs
//   node scripts/seo-pagespeed-audit.cjs --all     # every URL in sitemap
//   node scripts/seo-pagespeed-audit.cjs --url /x/ # single URL
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env.local');
const SITEMAP = path.join(ROOT, 'public', 'sitemap.xml');
const OUT = path.join(ROOT, 'scripts', 'seo-pagespeed-output.json');
const SITE = 'https://aanloopai.nl';

function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) {
    console.error(`Missing ${path.relative(ROOT, ENV_FILE)}`);
    process.exit(1);
  }
  const env = {};
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const KEY = loadEnv().GOOGLE_PSI_KEY;
if (!KEY) {
  console.error('GOOGLE_PSI_KEY missing in .env.local');
  process.exit(1);
}

const PSI_BASE = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

const TOP_URLS = [
  '/',
  '/diensten/',
  '/diensten/marco/',
  '/diensten/emma/',
  '/diensten/ai-website-bundel-mkb-nederland/',
  '/diensten/website-laten-maken-mkb-nederland-2026/',
  '/ai-receptionist-nederland/',
  '/ai-roi-calculator/',
  '/kennisbank/',
  '/cases/',
  '/contact/',
  '/aanvragen/',
  '/gratis-ai-scan/',
  '/locaties/',
  '/sectoren/',
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (e) {
          reject(new Error(`Parse error for ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function audit(url, strategy) {
  const target = SITE + url;
  const psiUrl = `${PSI_BASE}?url=${encodeURIComponent(target)}&key=${KEY}&strategy=${strategy}&category=performance&category=accessibility&category=seo&category=best-practices`;
  const data = await fetchJson(psiUrl);
  if (data.error) return { url, strategy, error: data.error.message };
  const lh = data.lighthouseResult;
  const cats = lh.categories;
  const audits = lh.audits;
  const opps = Object.values(audits)
    .filter((a) => a.details && a.details.type === 'opportunity' && a.details.overallSavingsMs > 100)
    .map((a) => ({ id: a.id, title: a.title, savingsMs: Math.round(a.details.overallSavingsMs), savingsBytes: a.details.overallSavingsBytes || 0 }))
    .sort((a, b) => b.savingsMs - a.savingsMs);
  const failed = Object.values(audits)
    .filter((a) => a.score !== null && a.score < 1 && !['manual', 'notApplicable', 'informative'].includes(a.scoreDisplayMode))
    .map((a) => ({ id: a.id, title: a.title, score: a.score }))
    .sort((a, b) => a.score - b.score);
  return {
    url, strategy,
    scores: {
      performance: Math.round((cats.performance?.score || 0) * 100),
      accessibility: Math.round((cats.accessibility?.score || 0) * 100),
      seo: Math.round((cats.seo?.score || 0) * 100),
      bestPractices: Math.round((cats['best-practices']?.score || 0) * 100),
    },
    metrics: {
      lcp: audits['largest-contentful-paint']?.numericValue,
      cls: audits['cumulative-layout-shift']?.numericValue,
      tbt: audits['total-blocking-time']?.numericValue,
      fcp: audits['first-contentful-paint']?.numericValue,
      si: audits['speed-index']?.numericValue,
      inp: audits['interaction-to-next-paint']?.numericValue,
    },
    topOpportunities: opps.slice(0, 5),
    failedAudits: failed.slice(0, 10),
  };
}

async function main() {
  const args = process.argv.slice(2);
  let urls = TOP_URLS;
  if (args.includes('--all')) {
    const sitemap = fs.readFileSync(SITEMAP, 'utf8');
    urls = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1].replace(SITE, ''));
  }
  const urlIdx = args.indexOf('--url');
  if (urlIdx >= 0 && args[urlIdx + 1]) urls = [args[urlIdx + 1]];

  console.log(`Auditing ${urls.length} URLs (mobile + desktop) — ${urls.length * 2} PSI queries`);
  const results = [];
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    process.stdout.write(`[${i + 1}/${urls.length}] ${u} ... `);
    try {
      const mob = await audit(u, 'mobile');
      const desk = await audit(u, 'desktop');
      results.push({ url: u, mobile: mob, desktop: desk });
      const m = mob.scores || {};
      const d = desk.scores || {};
      console.log(`mobile P=${m.performance} A=${m.accessibility} SEO=${m.seo} BP=${m.bestPractices} | desktop P=${d.performance} A=${d.accessibility} SEO=${d.seo} BP=${d.bestPractices}`);
    } catch (e) {
      console.log(`ERROR ${e.message}`);
      results.push({ url: u, error: e.message });
    }
  }

  const oppCounts = new Map();
  for (const r of results) {
    if (!r.mobile?.topOpportunities) continue;
    for (const o of r.mobile.topOpportunities) {
      if (!oppCounts.has(o.id)) oppCounts.set(o.id, { id: o.id, title: o.title, count: 0, totalSavingsMs: 0 });
      const e = oppCounts.get(o.id);
      e.count += 1;
      e.totalSavingsMs += o.savingsMs;
    }
  }
  const topOpps = Array.from(oppCounts.values()).sort((a, b) => b.totalSavingsMs - a.totalSavingsMs);

  console.log('');
  console.log('=== AGGREGATE TOP MOBILE OPPORTUNITIES ===');
  topOpps.slice(0, 15).forEach((o) =>
    console.log(`  ${o.totalSavingsMs.toString().padStart(7)}ms total | ${o.count.toString().padStart(2)}x  ${o.title}  (${o.id})`)
  );

  fs.writeFileSync(OUT, JSON.stringify({ results, topOpps }, null, 2));
  console.log('');
  console.log(`Output: ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});

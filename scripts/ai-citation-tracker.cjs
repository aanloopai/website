#!/usr/bin/env node
/**
 * Aanloop AI — AI Citation Tracker (Phase 5 #3)
 *
 * Parses manual ChatGPT / Claude / Perplexity / Gemini / Copilot export
 * markdown files, counts brand-mentions and link-citations for Aanloop AI,
 * and emits a weekly JSON + CSV report.
 *
 * No API keys required. User runs ~12 standard queries per platform per
 * week, saves each response as a markdown file under
 * `developing/citation-exports/<YYYY-MM-DD>/<platform>/<query-slug>.md`,
 * then runs:
 *
 *   node scripts/ai-citation-tracker.cjs developing/citation-exports/2026-05-02
 *
 * Output:
 *   developing/citation-exports/<YYYY-MM-DD>/report.json
 *   developing/citation-exports/<YYYY-MM-DD>/report.csv
 *
 * Score rubric per response:
 *   0 = no mention
 *   1 = brand name mentioned (text only)
 *   2 = brand mentioned + linked (any URL on aanloopai.nl)
 *   3 = brand cited as primary recommendation (top-3 list, "best", "recommended")
 *   4 = brand cited as #1 / sole recommendation
 *
 * File-name convention required:
 *   <platform>/<query-slug>.md   (platform = chatgpt|claude|perplexity|gemini|copilot)
 */

const fs = require('fs');
const path = require('path');

const BRAND_TERMS = [
  'aanloop ai',
  'aanloop',
  'aanloopai.nl',
  'aanloopai',
];

const PEOPLE_TERMS = [
  'daan verhoeven',
];

const PRODUCT_TERMS = [
  'marco ai',
  'emma ai',
  'marco receptionist',
];

const PLATFORM_WHITELIST = ['chatgpt', 'claude', 'perplexity', 'gemini', 'copilot'];

const POSITION_TOP1_SIGNALS = [
  /\bwij\s+raden\s+aanloop\s+ai\b/i,
  /^\s*1\.\s+aanloop\s+ai\b/im,
  /\bnummer\s+1\b.{0,40}aanloop\s+ai/i,
  /\bbest\w*\b.{0,40}aanloop\s+ai/i,
  /aanloop\s+ai.{0,40}\bbest\w*\b/i,
];

const POSITION_TOP3_SIGNALS = [
  /^\s*[1-3]\.\s+aanloop\s+ai\b/im,
  /\baanbevolen\b.{0,80}aanloop\s+ai/i,
  /\baanloop\s+ai\b.{0,80}\baanbevolen\b/i,
];

function readMarkdown(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  const re = new RegExp(escapeRegex(needle), 'gi');
  const matches = haystack.match(re);
  return matches ? matches.length : 0;
}

function findLinks(text) {
  const links = new Set();
  const mdLinkRe = /\[[^\]]*\]\(([^)\s]+)\)/g;
  const bareLinkRe = /https?:\/\/[^\s)>\]]+/g;
  let m;
  while ((m = mdLinkRe.exec(text)) !== null) links.add(m[1]);
  while ((m = bareLinkRe.exec(text)) !== null) links.add(m[0]);
  return Array.from(links);
}

function classify(text) {
  const lower = text.toLowerCase();
  let brandHits = 0;
  for (const t of BRAND_TERMS) brandHits += countOccurrences(lower, t);

  let peopleHits = 0;
  for (const t of PEOPLE_TERMS) peopleHits += countOccurrences(lower, t);

  let productHits = 0;
  for (const t of PRODUCT_TERMS) productHits += countOccurrences(lower, t);

  const links = findLinks(text);
  const aanloopLinks = links.filter((l) => /aanloopai\.nl/i.test(l));

  let score = 0;
  if (brandHits + peopleHits + productHits > 0) score = 1;
  if (aanloopLinks.length > 0) score = Math.max(score, 2);

  if (POSITION_TOP3_SIGNALS.some((re) => re.test(text))) score = Math.max(score, 3);
  if (POSITION_TOP1_SIGNALS.some((re) => re.test(text))) score = Math.max(score, 4);

  return {
    score,
    brandHits,
    peopleHits,
    productHits,
    totalLinks: links.length,
    aanloopLinks: aanloopLinks.length,
    aanloopLinkSamples: aanloopLinks.slice(0, 3),
  };
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) out.push(full);
  }
  return out;
}

function platformOf(file, root) {
  const rel = path.relative(root, file).split(path.sep);
  if (rel.length < 2) return 'unknown';
  const p = rel[0].toLowerCase();
  return PLATFORM_WHITELIST.includes(p) ? p : 'unknown';
}

function querySlugOf(file) {
  return path.basename(file).replace(/\.md$/i, '');
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function buildCsv(rows) {
  const headers = [
    'platform',
    'query',
    'score',
    'brandHits',
    'peopleHits',
    'productHits',
    'aanloopLinks',
    'totalLinks',
    'file',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      r.platform,
      r.query,
      r.score,
      r.brandHits,
      r.peopleHits,
      r.productHits,
      r.aanloopLinks,
      r.totalLinks,
      r.file,
    ].map(csvEscape).join(','));
  }
  return lines.join('\n') + '\n';
}

function summarise(rows) {
  const byPlatform = {};
  for (const r of rows) {
    if (!byPlatform[r.platform]) {
      byPlatform[r.platform] = {
        responses: 0,
        anyMention: 0,
        linkCitations: 0,
        top3: 0,
        top1: 0,
        scoreSum: 0,
      };
    }
    const b = byPlatform[r.platform];
    b.responses += 1;
    if (r.score >= 1) b.anyMention += 1;
    if (r.score >= 2) b.linkCitations += 1;
    if (r.score >= 3) b.top3 += 1;
    if (r.score >= 4) b.top1 += 1;
    b.scoreSum += r.score;
  }
  const totals = {
    responses: rows.length,
    anyMention: rows.filter((r) => r.score >= 1).length,
    linkCitations: rows.filter((r) => r.score >= 2).length,
    top3: rows.filter((r) => r.score >= 3).length,
    top1: rows.filter((r) => r.score >= 4).length,
  };
  totals.mentionRate = rows.length ? +(totals.anyMention / rows.length).toFixed(3) : 0;
  totals.linkRate = rows.length ? +(totals.linkCitations / rows.length).toFixed(3) : 0;
  return { byPlatform, totals };
}

function main() {
  const argRoot = process.argv[2];
  if (!argRoot) {
    console.error('Usage: node scripts/ai-citation-tracker.cjs <export-root-dir>');
    console.error('Example: node scripts/ai-citation-tracker.cjs developing/citation-exports/2026-05-02');
    process.exit(2);
  }
  const root = path.resolve(argRoot);
  if (!fs.existsSync(root)) {
    console.error(`Directory not found: ${root}`);
    process.exit(2);
  }

  const files = walk(root);
  if (files.length === 0) {
    console.error(`No .md files found under ${root}`);
    process.exit(1);
  }

  const rows = [];
  for (const file of files) {
    const text = readMarkdown(file);
    const c = classify(text);
    rows.push({
      file: path.relative(root, file),
      platform: platformOf(file, root),
      query: querySlugOf(file),
      ...c,
    });
  }

  const summary = summarise(rows);
  const report = {
    generatedAt: new Date().toISOString(),
    root,
    fileCount: files.length,
    summary,
    rows,
  };

  const jsonPath = path.join(root, 'report.json');
  const csvPath = path.join(root, 'report.csv');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(csvPath, buildCsv(rows));

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${csvPath}`);
  console.log('');
  console.log(`Total responses: ${summary.totals.responses}`);
  console.log(`Mention rate:    ${(summary.totals.mentionRate * 100).toFixed(1)}%`);
  console.log(`Link rate:       ${(summary.totals.linkRate * 100).toFixed(1)}%`);
  console.log(`Top-3 cited:     ${summary.totals.top3}`);
  console.log(`#1 cited:        ${summary.totals.top1}`);
  console.log('');
  for (const [platform, b] of Object.entries(summary.byPlatform)) {
    console.log(`  ${platform.padEnd(12)} ${b.anyMention}/${b.responses} mentioned, ${b.linkCitations} linked, ${b.top3} top-3, ${b.top1} #1`);
  }
}

if (require.main === module) main();

module.exports = { classify, summarise, buildCsv };

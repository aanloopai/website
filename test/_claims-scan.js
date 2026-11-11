// Gedeelde scanner voor de effectcijfer-guard (test/geen-ongebronde-effectcijfers.test.js) en scripts/scan-claims.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const dist = path.join(root, 'dist');
const NUM = String.raw`\d+(?:[.,]\d+)?`;
const RANGE = String.raw`${NUM}(?:\s?[-–]\s?${NUM})?`;
const PCT = String.raw`${RANGE}\s?(?:%|procent)`;
const EFFECT = String.raw`(?:minder|meer|reductie|extra|hogere?|lagere?|sneller|snellere|goedkoper|besparing|stijging|daling|toename|afname|verbetering|verlaging|verhoging|conversie|groei|betere?|kortere?|langere?|korter|langer|beter|lager|hoger)`;
export const PATTERNS = [
  ['pct-effect', new RegExp(String.raw`(?<![\d.,])${PCT}\s+${EFFECT}\b`, 'gi')],
  ['pct-van-volume', new RegExp(String.raw`(?<![\d.,])${PCT}\s+van\s+de\s+(?:oproepen|telefoontjes|vragen|gesprekken|calls|aanvragen|tickets|leads|bellers|berichten|e-?mails|afspraken|klantvragen|routinevragen|no-shows|bezoekers)\b`, 'gi')],
  ['x-meer', new RegExp(String.raw`(?<![\d.,])${NUM}(?:\s?[-–]\s?${NUM})?\s?x\s+(?:meer|beter|sneller|vaker|zo)\b`, 'gi')],
  ['roi-van', /\bROI\s+(?:van|of)\s+(?:ca\.?\s*)?[\d€]/gi],
  ['roi-multiple', /\bROI\b[^.<>\n]{0,40}?:\s*\d+(?:[.,]\d+)?\s?x\b/gi],
  ['roi-pct', new RegExp(String.raw`${PCT}\s+ROI\b`, 'gi')],
  ['terugverdientijd', /\bterugverdientijd\s+(?:van\s+)?(?:ca\.?\s*|circa\s+)?\d/gi],
  ['besparing-euro', /\bbespaar\w*\s+(?:u\s+)?(?:ca\.?\s*|circa\s+)?€\s?\d/gi],
];


const norm = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&#x27;|&apos;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/\s+/g, ' ').trim();
const visible = (h) => norm(h
  .replace(/<script(?![^>]*application\/ld\+json)[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' '));

export function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

export function scan(file, raw, isHtml, ALLOW = {}) {
  const rel = path.relative(file.startsWith(dist) ? dist : path.join(root, 'public', 'data'), file).split(path.sep).join('/');
  const text = isHtml ? visible(raw) : norm(raw);
  const quotes = isHtml ? [...raw.matchAll(/<q[^>]*>([\s\S]*?)<\/q>/g)].map((m) => norm(m[1]).toLowerCase()) : [];
  const hasBronnen = isHtml && /data-bronnen/.test(raw);
  const hits = [];
  for (const [name, re] of PATTERNS) {
    for (const m of text.matchAll(re)) {
      const num = (m[0].match(/\d+(?:[.,]\d+)?/) || [''])[0];
      const ctx = text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 30);
      if (hasBronnen && num && quotes.some((q) => q.includes(m[0].toLowerCase()) || q.includes(num))) continue; // (a)
      if ((ALLOW[rel] || []).some((a) => a.re.test(ctx))) continue; // (b)
      hits.push(`${rel}: [${name}] …${ctx}…`);
    }
  }
  return hits;
}


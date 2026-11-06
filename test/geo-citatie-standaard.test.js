// Guard: GEO-citatiestandaard v1 (S1, S2, S5, S6, S7, S8, S10) op gebouwde kennisbank-pagina's (dist/).
// MUST_PASS = elk markdown-artikel met `bronnen:` in de frontmatter. Ratchet: MIN_PAGES alleen verhogen.
// Draait alleen als dist/ bestaat (na `npm run build`). S3/S4/S9/S11/S12 niet machine-gecontroleerd (zie PR).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIN_PAGES = 57;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const kbDir = path.join(root, 'src', 'content', 'kennisbank');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'src/data/bronnen.json'), 'utf8')).bronnen;
const registryUrls = new Set(registry.map((b) => b.url));
const OWN = /(^|\.)(aanloopai|keukeninbeeld|zoekeen|alfareclame|fleettrackholland|grynnstudio|tripandtick|4menterprise)\.nl$/;
const SOCIAL = /^(www\.)?(facebook|instagram|linkedin|twitter|x|youtube|tiktok)\.(com|nl)$|^schema\.org$|^maps\./;
const INTERROG = /^(wat|hoe|hoeveel|waarom|wanneer|welke|kan|is|moet|wie|waar)\b/i;

const norm = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&#x27;|&apos;/g, "'")
  .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/\s+/g, ' ').trim().toLowerCase();
const text = (h) => norm(h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' '));
const words = (s) => s.split(/\s+/).filter(Boolean).length;

const slugs = fs.readdirSync(kbDir).filter((f) => f.endsWith('.md'))
  .filter((f) => /^bronnen:/m.test(fs.readFileSync(path.join(kbDir, f), 'utf8').split(/\n---/)[0]))
  .map((f) => f.replace(/\.md$/, ''));

const MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const sitemap = fs.existsSync(path.join(dist, 'sitemap.xml')) ? fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8') : '';

function check(slug) {
  const v = [];
  const file = path.join(dist, 'kennisbank', slug, 'index.html');
  if (!fs.existsSync(file)) return [`${slug}: dist-pagina ontbreekt`];
  const html = fs.readFileSync(file, 'utf8');
  const main = (html.match(/<main[\s\S]*?<\/main>/) || [html])[0];
  // S2 + S1 + S10
  const bron = main.match(/<h2[^>]*>\s*Bronnen\s*<\/h2>([\s\S]*?)<\/section>/);
  if (!bron) v.push('S2: geen zichtbare <h2>Bronnen</h2>-sectie');
  else {
    const links = [...bron[1].matchAll(/<a [^>]*href="(https:\/\/[^"]+)"[^>]*>/g)].map((m) => m[1]);
    const domains = new Set(links.map((u) => new URL(u).hostname.replace(/^www\./, '')).filter((d) => !OWN.test(d) && !SOCIAL.test(d)));
    if (domains.size < 2) v.push(`S1: ${domains.size} externe domeinen in Bronnen (min 2)`);
    if (!/<ol[\s>]/.test(bron[1]) || !/geraadpleegd \d{2}-\d{2}-\d{4}/.test(bron[1])) v.push('S2: <ol> met "geraadpleegd DD-MM-YYYY" ontbreekt');
    for (const u of links) if (!registryUrls.has(u)) v.push(`S10: ${u} niet in src/data/bronnen.json`);
  }
  // S5/S6/S7 FAQ
  let schemaQs = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    let j; try { j = JSON.parse(m[1]); } catch { continue; }
    for (const o of Array.isArray(j) ? j : (j['@graph'] || [j])) if (o?.['@type'] === 'FAQPage') schemaQs = o.mainEntity;
  }
  if (schemaQs.length < 4 || schemaQs.length > 8) v.push(`S5: ${schemaQs.length} FAQ-items (4-8)`);
  const seen = new Set();
  const vis = text(main);
  if (!/<h2[^>]*>\s*Veelgestelde vragen\s*<\/h2>/.test(main)) v.push('S7: <h2>Veelgestelde vragen</h2> ontbreekt');
  for (const q of schemaQs) {
    const name = q.name.trim(); const a = q.acceptedAnswer.text.trim();
    if (!name.endsWith('?') || words(name) < 5 || !INTERROG.test(name)) v.push(`S5: vraag niet natuurlijk/volledig: "${name}"`);
    if (seen.has(norm(name))) v.push(`S5: dubbele vraag "${name}"`); seen.add(norm(name));
    if (words(a) > 200) v.push(`S6: antwoord >200 woorden bij "${name}"`);
    const first = a.split(/(?<=[.!?])\s+/)[0];
    if (words(first) > 35) v.push(`S6: eerste zin >35 woorden bij "${name}"`);
    if (!vis.includes(norm(name)) || !vis.includes(norm(a))) v.push(`S7: schema != zichtbaar bij "${name}"`);
  }
  // S8 datums
  const vd = main.match(/Bijgewerkt (\d{1,2}) (\w+) (\d{4})/);
  const ld = [...html.matchAll(/"dateModified":"(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
  if (!vd) v.push('S8: geen zichtbare "Bijgewerkt"-datum');
  else {
    const iso = `${vd[3]}-${String(MONTHS.indexOf(vd[2]) + 1).padStart(2, '0')}-${vd[1].padStart(2, '0')}`;
    if (!ld.length || ld.some((d) => d !== iso)) v.push(`S8: zichtbaar ${iso} != JSON-LD dateModified ${ld.join(',')}`);
    const sm = sitemap.match(new RegExp(`<loc>[^<]*/kennisbank/${slug}/</loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})`));
    if (sm && sm[1] !== iso) v.push(`S8: sitemap lastmod ${sm[1]} != ${iso}`);
  }
  return v.map((x) => `${slug}: ${x}`);
}

describe('geo-citatie-standaard (kennisbank)', () => {
  it('ratchet: minstens MIN_PAGES artikelen dragen bronnen', () => {
    expect(slugs.length).toBeGreaterThanOrEqual(MIN_PAGES);
  });
  it('registry: elke bron heeft status 200, citaat >= 20 tekens en accessed-datum', () => {
    for (const b of registry) {
      expect(b.status).toBe(200);
      expect(b.citaat.length).toBeGreaterThanOrEqual(20);
      expect(b.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(b.url).toMatch(/^https:\/\//);
    }
  });
  it.skipIf(!fs.existsSync(dist))('S1/S2/S5-S8/S10 op alle MUST_PASS-pagina\'s', () => {
    const violations = slugs.flatMap(check);
    expect(violations).toEqual([]);
  });
});

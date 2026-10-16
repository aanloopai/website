#!/usr/bin/env node
/**
 * build-ai-radar-dataset.cjs
 * Bouwt src/data/ai-radar-2026-10.json uit de wekelijkse GEO-radar-runs (geo-*.json).
 * De ruwe bestanden worden NIET gecommit; alleen dit geaggregeerde resultaat.
 *
 * Gebruik: node scripts/build-ai-radar-dataset.cjs <map-met-geo-*.json>
 *
 * Definities (ook gepubliceerd op de pagina):
 *  - Alleen runs met engine "gemini-grounded" tellen mee (andere engines: uitgesloten, geteld).
 *  - Een antwoord = een prompt in een run. "Beantwoord" = answered:true.
 *  - Het eigen domein van de gemeten site wordt uit de bronlijsten gehaald voor alle
 *    domeinstatistieken (geen zelfciteer-vertekening).
 *  - Domeinaantal = aantal antwoorden waarin het domein minstens eenmaal voorkomt.
 *  - Stabiliteit: per site en prompt de laatste run per ISO-week; voor elk paar
 *    opeenvolgende weken (met bronnen in beide weken): aandeel domeinen uit week t dat
 *    ook in week t+1 staat. Gewogen over alle paren (som doorsnede / som week t).
 */
const fs = require('node:fs');
const path = require('node:path');

const SECTORS = {
  aanloop: { id: 'ai-bureau', label: 'AI-bureau (B2B)' },
  alfa: { id: 'reclamebureau', label: 'reclamebureau' },
  fth: { id: 'voertuigtracking', label: 'voertuigtracking' },
  tripandtick: { id: 'reisorganisatie', label: 'reisorganisatie' },
  keukeninbeeld: { id: 'keukens', label: 'keukens (lead-platform)' },
  zoekeen: { id: 'lokale-diensten', label: 'lokale diensten (lead-platform)' },
  allesinrenovatie: { id: 'renovatie', label: 'renovatie (lead-platform)' },
};
const ENGINE = 'gemini-grounded';
const TOP_N = 10;

const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);
const norm = (d) =>
  String(d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();
const isEnglish = (p) => /^(what|which|who|how|where)\b/i.test(String(p).trim());
const tldOf = (d) => (d.endsWith('.nl') ? 'nl' : d.endsWith('.com') ? 'com' : 'other');

function isoWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7; // ma = 0
  d.setUTCDate(d.getUTCDate() - day + 3); // donderdag van die week
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const wk = 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(wk).padStart(2, '0')}`;
}

function topN(counter, denom, n) {
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([domain, count]) => ({ domain, count, share_pct: pct(count, denom) }));
}

function aggregate(items, counter) {
  const answered = items.filter((i) => i.answered);
  const withSources = answered.filter((i) => i.domains.size > 0);
  const tld = { nl: 0, com: 0, other: 0 };
  let domCitations = 0;
  for (const i of answered) {
    for (const d of i.domains) {
      counter.set(d, (counter.get(d) || 0) + 1);
      domCitations++;
      tld[tldOf(d)]++;
    }
  }
  const zeroNl = withSources.filter((i) => ![...i.domains].some((d) => d.endsWith('.nl'))).length;
  const mentioned = answered.filter((i) => i.mentioned).length;
  const cited = answered.filter((i) => i.cited).length;
  return {
    answers: items.length,
    answered: answered.length,
    answered_pct: pct(answered.length, items.length),
    mentioned,
    mentioned_pct: pct(mentioned, answered.length),
    cited,
    cited_pct: pct(cited, answered.length),
    answers_with_sources: withSources.length,
    domain_citations: domCitations,
    avg_cited_domains: answered.length ? Math.round((domCitations / answered.length) * 10) / 10 : 0,
    zero_nl_answers: zeroNl,
    zero_nl_pct: pct(zeroNl, withSources.length),
    tld: {
      nl: tld.nl,
      com: tld.com,
      other: tld.other,
      nl_pct: pct(tld.nl, domCitations),
      com_pct: pct(tld.com, domCitations),
      other_pct: pct(tld.other, domCitations),
    },
    unique_domains: counter.size,
    top_domains: topN(counter, answered.length, TOP_N),
  };
}

/** Telt weekparen voor een lijst runs van een site. */
function weekPairs(runs, keep = () => true) {
  const byPrompt = new Map();
  for (const run of runs) {
    const wk = isoWeek(run.date);
    const own = norm(run.results[0] && run.results[0].own_domain);
    for (const r of run.results) {
      if (!r.answered || !keep(r.prompt)) continue;
      if (!byPrompt.has(r.prompt)) byPrompt.set(r.prompt, new Map());
      byPrompt.get(r.prompt).set(wk, new Set((r.cited_domains || []).map(norm).filter((d) => d && d !== own)));
    }
  }
  let inter = 0, base = 0, pairs = 0;
  for (const weeks of byPrompt.values()) {
    const ks = [...weeks.keys()].sort();
    for (let i = 0; i + 1 < ks.length; i++) {
      const [y1, w1] = ks[i].split('-W').map(Number);
      const [y2, w2] = ks[i + 1].split('-W').map(Number);
      const consecutive = (y1 === y2 && w2 === w1 + 1) || (y2 === y1 + 1 && w1 >= 52 && w2 === 1);
      if (!consecutive) continue;
      const a = weeks.get(ks[i]);
      const b = weeks.get(ks[i + 1]);
      if (!a.size || !b.size) continue;
      pairs++;
      base += a.size;
      for (const d of a) if (b.has(d)) inter++;
    }
  }
  return { inter, base, pairs, prompts: byPrompt.size };
}

const stabilityOut = (s) => ({
  week_pairs: s.pairs,
  prompts_tracked: s.prompts,
  retained_domains: s.inter,
  base_domains: s.base,
  retained_domain_pct: pct(s.inter, s.base),
});

function main() {
  const dir = process.argv[2];
  if (!dir || !fs.existsSync(dir)) {
    console.error('Gebruik: node scripts/build-ai-radar-dataset.cjs <map-met-geo-*.json>');
    process.exit(1);
  }
  const sectors = [];
  const allItems = [];
  const allRuns = [];
  const tot = { inter: 0, base: 0, pairs: 0, prompts: 0 };
  const totNl = { inter: 0, base: 0, pairs: 0, prompts: 0 };
  let excludedRuns = 0;

  for (const [site, { id, label }] of Object.entries(SECTORS)) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, `geo-${site}.json`), 'utf8'));
    const runs = data.runs.filter((r) => r.engine === ENGINE);
    excludedRuns += data.runs.length - runs.length;
    const items = [];
    for (const run of runs) {
      for (const r of run.results) {
        const own = norm(r.own_domain);
        items.push({
          prompt: r.prompt,
          prompt: r.prompt,
          answered: !!r.answered,
          mentioned: !!r.mentioned,
          cited: !!r.cited,
          domains: new Set((r.cited_domains || []).map(norm).filter((d) => d && d !== own)),
        });
      }
    }
    const agg = aggregate(items, new Map());
    const sp = weekPairs(runs);
    const spNl = weekPairs(runs, (p) => !isEnglish(p));
    for (const k of Object.keys(tot)) tot[k] += sp[k];
    for (const k of Object.keys(totNl)) totNl[k] += spNl[k];
    allItems.push(...items);
    allRuns.push(...runs);
    const dates = runs.map((r) => r.date).sort();
    sectors.push({
      id,
      label,
      runs: runs.length,
      weeks: new Set(runs.map((r) => isoWeek(r.date))).size,
      date_from: dates[0],
      date_to: dates[dates.length - 1],
      ...agg,
      english_prompt_answers: items.filter((i) => isEnglish(i.prompt)).length,
      stability: stabilityOut(sp),
      example_prompts: [...new Set(runs[0].results.map((r) => r.prompt))].slice(0, 2),
    });
  }

  const overall = aggregate(allItems, new Map());
  overall.stability = stabilityOut(tot);
  // Hoofdcijfers: alleen Nederlandstalige prompts (een sector had Engelstalige prompts; die vertekenen .nl-cijfers)
  const dutch = aggregate(allItems.filter((i) => !isEnglish(i.prompt)), new Map());
  dutch.stability = stabilityOut(totNl);
  dutch.excluded_english_answers = allItems.length - dutch.answers;

  const dates = allRuns.map((r) => r.date).sort();
  const out = {
    meta: {
      title: 'AI-radar MKB Nederland, editie oktober 2026',
      edition: '2026-10',
      publisher: 'Aanloop AI',
      license: 'CC BY 4.0',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      citation:
        'AI-radar MKB Nederland van Aanloop AI, editie oktober 2026, https://aanloopai.nl/onderzoek/ai-radar-mkb-nederland-2026/',
      engine: ENGINE,
      engine_description: 'Gemini met Google Search grounding',
      date_from: dates[0],
      date_to: dates[dates.length - 1],
      sector_count: sectors.length,
      runs: allRuns.length,
      excluded_runs_other_engines: excludedRuns,
      own_domain_excluded_from_domain_stats: true,
      denominators: {
        dutch_prompts: 'hoofdcijfers op de pagina: alleen Nederlandstalige prompts; Engelstalige prompts staan wel in overall en in de sectortabel',
        answered_pct: 'antwoorden / gestelde prompts',
        mentioned_pct: 'antwoorden waarin het eigen domein wordt genoemd / beantwoorde prompts',
        cited_pct: 'antwoorden met het eigen domein als bron / beantwoorde prompts',
        top_domains_share_pct: 'antwoorden waarin het domein voorkomt / beantwoorde prompts',
        tld_pct: 'domeinvermeldingen per TLD / alle domeinvermeldingen',
        zero_nl_pct: 'antwoorden met bronnen maar zonder .nl-domein / antwoorden met minstens een bron',
        retained_domain_pct: 'domeinen uit week t die ook in week t+1 staan, zelfde prompt, gewogen over alle weekparen',
      },
    },
    overall,
    dutch_prompts: dutch,
    sectors,
  };
  const dest = path.join(__dirname, '..', 'src', 'data', 'ai-radar-2026-10.json');
  fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
  console.log('geschreven:', dest, `(${allRuns.length} runs, ${overall.answers} antwoorden)`);
}

main();

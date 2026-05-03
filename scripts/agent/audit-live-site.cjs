#!/usr/bin/env node
/**
 * Autonomous-agent V1 — live-site audit (zero deps, Node 20+ fetch).
 *
 * Runs against production aanloopai.nl. Detects regressies in 4 categorieën:
 *   - schema    : JSON-LD aanwezig en geldig op key-URLs
 *   - robots    : 13 AI-bot Allow:/ in robots.txt, geen global Disallow
 *   - pricing   : geen stale prijzen (€297/€397/€497/€697/€797/€897 zijn forbidden)
 *   - critical  : kritieke strings (telefoon, email, brand-name) aanwezig op key-URLs
 *
 * Exit 0 = alle checks pass; exit 1 = minimaal één regressie; exit 2 = fatal.
 * Output: regelsgewijs PASS/FAIL log + JSON summary op laatste regel.
 *
 * CLI:
 *   node scripts/agent/audit-live-site.cjs              # all checks
 *   node scripts/agent/audit-live-site.cjs --schema     # only schema
 *   node scripts/agent/audit-live-site.cjs --json       # JSON-only output
 *   BASE_URL=https://staging.aanloopai.nl node scripts/agent/audit-live-site.cjs
 */

const BASE_URL = process.env.BASE_URL || 'https://aanloopai.nl';
const args = new Set(process.argv.slice(2));
const JSON_ONLY = args.has('--json');
const RUN_ALL = !args.has('--schema') && !args.has('--robots') && !args.has('--pricing') && !args.has('--critical');

const KEY_URLS = [
  { path: '/', schemas: ['Organization', 'WebSite'] },
  { path: '/diensten/marco/', schemas: ['Product', 'SoftwareApplication'], anyOf: true },
  { path: '/diensten/emma/', schemas: ['Product', 'SoftwareApplication'], anyOf: true },
  { path: '/tarieven/', schemas: ['Product', 'FAQPage'], requireFaqPopulated: true },
  { path: '/ai-roi-calculator/', schemas: ['SoftwareApplication', 'HowTo'] },
  { path: '/gratis-ai-scan/', schemas: ['SoftwareApplication', 'HowTo'] },
  { path: '/contact/', schemas: [] },
];

const AI_BOTS = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
  'ClaudeBot', 'anthropic-ai', 'Claude-User',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended',
  'CCBot', 'Bytespider', 'meta-externalagent',
];

const FORBIDDEN_PRICES = [
  '€297', '€397', '€497', '€697', '€797', '€897',
  'EUR 297', 'EUR 397', 'EUR 497', 'EUR 697', 'EUR 797', 'EUR 897',
];

const REQUIRED_PRICES_TARIEVEN = ['€597', '€1.197'];

const CRITICAL_STRINGS = [
  { path: '/', must: ['Aanloop AI'] },
  { path: '/tarieven/', must: REQUIRED_PRICES_TARIEVEN },
  { path: '/contact/', must: ['hello@aanloopai.nl'] },
  { path: '/contact/', must: ['+31 6 24 74 15 97', '+31624741597', '+31 6 24741597'], anyOf: true },
];

const failures = [];
const passes = [];

function log(line) {
  if (!JSON_ONLY) console.log(line);
}

function recordPass(category, msg) {
  passes.push({ category, msg });
  log(`  ✓ ${msg}`);
}

function recordFail(category, msg) {
  failures.push({ category, msg });
  log(`  ✗ ${msg}`);
}

async function fetchText(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'AanloopAI-AutonomousAgent-V1 (+https://aanloopai.nl)',
      'Accept': 'text/html,*/*',
    },
    redirect: 'follow',
  });
  return { ok: res.ok, status: res.status, text: await res.text(), url };
}

function extractJsonLd(html) {
  const blocks = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else blocks.push(parsed);
    } catch {
      // Ongeldig JSON-LD telt niet als 'gevonden'; schema-check failt hieronder
    }
  }
  return blocks;
}

function getTypes(jsonld) {
  const t = jsonld['@type'];
  if (!t) return [];
  if (Array.isArray(t)) return t;
  return [t];
}

async function checkSchema() {
  log('\n[SCHEMA] Schema check op 7 key-URLs');
  for (const { path, schemas, anyOf, requireFaqPopulated } of KEY_URLS) {
    const r = await fetchText(path);
    if (!r.ok) {
      recordFail('schema', `${path} → HTTP ${r.status}`);
      continue;
    }
    const blocks = extractJsonLd(r.text);
    if (blocks.length === 0 && schemas.length > 0) {
      recordFail('schema', `${path} → geen JSON-LD blokken gevonden`);
      continue;
    }

    const foundTypes = new Set();
    blocks.forEach(b => getTypes(b).forEach(t => foundTypes.add(t)));

    if (schemas.length > 0) {
      if (anyOf) {
        const hasAny = schemas.some(s => foundTypes.has(s));
        if (hasAny) recordPass('schema', `${path} → minstens één van [${schemas.join(', ')}] aanwezig`);
        else recordFail('schema', `${path} → geen van [${schemas.join(', ')}] gevonden, only [${[...foundTypes].join(', ')}]`);
      } else {
        const missing = schemas.filter(s => !foundTypes.has(s));
        if (missing.length === 0) recordPass('schema', `${path} → alle vereiste schemas [${schemas.join(', ')}]`);
        else recordFail('schema', `${path} → ontbrekend: [${missing.join(', ')}]; gevonden: [${[...foundTypes].join(', ')}]`);
      }
    }

    if (requireFaqPopulated) {
      const faq = blocks.find(b => getTypes(b).includes('FAQPage'));
      const mainEntity = faq?.mainEntity;
      const questions = Array.isArray(mainEntity) ? mainEntity : (mainEntity ? [mainEntity] : []);
      const populated = questions.filter(q => q?.acceptedAnswer?.text && q.acceptedAnswer.text.trim().length > 0);
      if (populated.length >= 3) recordPass('schema', `${path} → FAQPage met ${populated.length} populated Q&A`);
      else recordFail('schema', `${path} → FAQPage heeft ${populated.length} populated Q&A (minimaal 3 vereist)`);
    }
  }
}

async function checkRobots() {
  log('\n[ROBOTS] AI-bot Allow:/ check op /robots.txt');
  const r = await fetchText('/robots.txt');
  if (!r.ok) {
    recordFail('robots', `/robots.txt → HTTP ${r.status}`);
    return;
  }
  const txt = r.text;

  // Geen global Disallow:/ onder generieke User-agent: *
  const starBlock = txt.match(/User-agent:\s*\*\s*[\r\n]+([\s\S]*?)(?=User-agent:|$)/i);
  if (starBlock && /Disallow:\s*\/\s*$/m.test(starBlock[1])) {
    recordFail('robots', 'User-agent: * heeft Disallow: / (volledige site geblokkeerd)');
  } else {
    recordPass('robots', 'Geen Disallow: / onder User-agent: *');
  }

  // Elke AI-bot heeft een Allow: / direct eronder
  for (const bot of AI_BOTS) {
    const re = new RegExp(`User-agent:\\s*${bot}\\s*[\\r\\n]+Allow:\\s*\\/`, 'i');
    if (re.test(txt)) recordPass('robots', `${bot} → Allow: / aanwezig`);
    else recordFail('robots', `${bot} → Allow: / ontbreekt of staat niet direct onder User-agent`);
  }
}

async function checkPricing() {
  log('\n[PRICING] Stale-pricing check op 5 commerciële pages');
  const targets = ['/', '/tarieven/', '/diensten/marco/', '/diensten/emma/', '/ai-roi-calculator/'];
  for (const path of targets) {
    const r = await fetchText(path);
    if (!r.ok) {
      recordFail('pricing', `${path} → HTTP ${r.status}`);
      continue;
    }
    const found = FORBIDDEN_PRICES.filter(p => r.text.includes(p));
    if (found.length === 0) recordPass('pricing', `${path} → geen stale prijzen`);
    else recordFail('pricing', `${path} → STALE pricing gevonden: [${found.join(', ')}]`);
  }
}

async function checkCritical() {
  log('\n[CRITICAL] Kritieke-strings check');
  // Group by path zodat anyOf groepen samen geëvalueerd worden
  const grouped = [];
  CRITICAL_STRINGS.forEach(c => grouped.push(c));
  const seenPaths = new Set();
  for (const c of grouped) {
    const cacheKey = `${c.path}:${c.must.join('|')}`;
    if (seenPaths.has(cacheKey)) continue;
    seenPaths.add(cacheKey);

    const r = await fetchText(c.path);
    if (!r.ok) {
      recordFail('critical', `${c.path} → HTTP ${r.status}`);
      continue;
    }
    if (c.anyOf) {
      const present = c.must.some(s => r.text.includes(s));
      if (present) recordPass('critical', `${c.path} → minstens één van [${c.must.join(', ')}] aanwezig`);
      else recordFail('critical', `${c.path} → geen van [${c.must.join(', ')}] gevonden`);
    } else {
      const missing = c.must.filter(s => !r.text.includes(s));
      if (missing.length === 0) recordPass('critical', `${c.path} → alle vereiste strings aanwezig`);
      else recordFail('critical', `${c.path} → ontbrekend: [${missing.join(', ')}]`);
    }
  }
}

async function main() {
  const t0 = Date.now();
  log(`# Autonomous-agent live-site audit`);
  log(`# Target: ${BASE_URL}`);
  log(`# Timestamp: ${new Date().toISOString()}`);

  if (RUN_ALL || args.has('--schema')) await checkSchema();
  if (RUN_ALL || args.has('--robots')) await checkRobots();
  if (RUN_ALL || args.has('--pricing')) await checkPricing();
  if (RUN_ALL || args.has('--critical')) await checkCritical();

  const duration = ((Date.now() - t0) / 1000).toFixed(1);
  const summary = {
    base_url: BASE_URL,
    timestamp: new Date().toISOString(),
    duration_seconds: parseFloat(duration),
    pass_count: passes.length,
    fail_count: failures.length,
    failures,
  };

  log('\n# Summary');
  log(`# Passes: ${passes.length}, Failures: ${failures.length}, Duration: ${duration}s`);
  if (JSON_ONLY) console.log(JSON.stringify(summary, null, 2));
  else console.log('\n' + JSON.stringify(summary, null, 2));

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('FATAL', err);
  process.exit(2);
});

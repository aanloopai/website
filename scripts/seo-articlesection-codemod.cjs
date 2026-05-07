#!/usr/bin/env node
/**
 * seo-articlesection-codemod.cjs
 *
 * Adds the `articleSection` field to the Article schema of every kennisbank
 * page that does not already have it. Idempotent: pages that already contain
 * `articleSection` are skipped.
 *
 * Run from project root:
 *   node scripts/seo-articlesection-codemod.cjs
 *
 * Pure-Node, zero-dependency.
 */

const fs = require('fs');
const path = require('path');

const KENNISBANK_DIR = path.resolve(__dirname, '..', 'src', 'pages', 'kennisbank');

// Topic mapping: filename-regex -> articleSection (first match wins).
// Order is significant — more specific matches must come first.
const TOPIC_RULES = [
  { re: /pensioen/i, section: 'Pensioenadvies & AI' },
  { re: /hypotheek/i, section: 'Hypotheek & AI' },
  { re: /financieel-planner|verzekeringsmakelaar/i, section: 'Financiele planning & AI' },
  { re: /accountantskantoor|cashflow|finance|facturering/i, section: 'Finance & AI' },
  { re: /advocaat|notaris/i, section: 'Juridisch & AI' },
  { re: /zorginstelling|thuiszorg|huisarts|tandarts|fysio|dierenarts/i, section: 'Zorg & AI' },
  { re: /bouw|installatiebedrijf|garagebedrijf/i, section: 'Bouw & AI' },
  { re: /horeca|cateraar|evenementenbureau/i, section: 'Horeca & AI' },
  { re: /detailhandel|webshop|shopify/i, section: 'Retail & AI' },
  { re: /logistiek|reisbureau/i, section: 'Logistiek & AI' },
  { re: /woningcorporatie|vastgoed|makelaar/i, section: 'Vastgoed & AI' },
  { re: /eu-ai-act|avg|gdpr|compliance/i, section: 'AI Compliance & AVG' },
  { re: /agent-kosten/i, section: 'AI Prijzen & ROI' },
  { re: /prijs|prijzen|kosten|roi/i, section: 'AI Prijzen & ROI' },
  { re: /klantenservice|servicedesk|helpdesk|no-show/i, section: 'Klantenservice & AI' },
  { re: /meertalig/i, section: 'Meertalige AI' },
  { re: /microsoft-365|google-workspace|gmail|outlook/i, section: 'AI in Productiviteit' },
  { re: /whatsapp/i, section: 'AI Messaging' },
  { re: /voice|voicebot|elevenlabs/i, section: 'AI Voice' },
  { re: /chatgpt|claude|gemini/i, section: 'AI Modellen' },
  { re: /n8n|make-com|zapier|power-automate/i, section: 'AI Workflows' },
  { re: /agency-kiezen|implementatie-stappen/i, section: 'AI Strategie' },
  { re: /tools-zzp/i, section: 'AI voor ZZP' },
  { re: /lead-scoring|b2b-sales/i, section: 'Sales & AI' },
  { re: /hr-sollicitatie|sollicitatie-screening|uitzendbureau|recruitment/i, section: 'HR & AI' },
  { re: /marketingbureau/i, section: 'Marketing & AI' },
  { re: /coach-trainer/i, section: 'Coaching & AI' },
  { re: /tuinbouw/i, section: 'Agri & AI' },
  { re: /schoonheidssalon|kapsalon|fitnessclub|zwemschool|sportclub|vereniging/i, section: 'Lifestyle & AI' },
  { re: /telefoniste|receptionist/i, section: 'AI Telefonie' },
  { re: /agent-voorbeelden|agent-vs-chatbot/i, section: 'AI Agents' },
  { re: /vergelijking|-vs-/i, section: 'AI Vergelijkingen' },
];

const FALLBACK_SECTION = 'AI per Sector';

function pickSection(filename) {
  for (const rule of TOPIC_RULES) {
    if (rule.re.test(filename)) return rule.section;
  }
  return FALLBACK_SECTION;
}

/**
 * Locate the Article-typed schema object in the source. Returns
 *   { openIdx, closeIdx, isJsonStyle }
 * or null if no Article schema can be located.
 */
function locateArticleSchema(source) {
  const typeRe = /(['"])@type\1\s*:\s*(['"])Article\2/;
  const typeMatch = source.match(typeRe);
  if (!typeMatch) return null;
  const typeIdx = typeMatch.index;
  const isJsonStyle = typeMatch[1] === '"' && typeMatch[2] === '"';

  // Walk backward to find the enclosing `{` (depth-tracking).
  let depth = 0;
  let openIdx = -1;
  for (let i = typeIdx; i >= 0; i--) {
    const ch = source[i];
    if (ch === '}') depth++;
    else if (ch === '{') {
      if (depth === 0) {
        openIdx = i;
        break;
      }
      depth--;
    }
  }
  if (openIdx === -1) return null;

  // Walk forward from openIdx to find the matching `}`.
  let fwdDepth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') fwdDepth++;
    else if (ch === '}') {
      fwdDepth--;
      if (fwdDepth === 0) return { openIdx, closeIdx: i, isJsonStyle };
    }
  }
  return null;
}

/**
 * Inject `articleSection` into the Article schema. Returns the new source,
 * or null if injection failed.
 *
 * Rules:
 *   - Insert right before the schema's matching closing `}`.
 *   - JSON-style (double-quoted keys): `"articleSection": "<section>"` and
 *     ensure the previous field has a trailing comma.
 *   - JS-style (single-quoted keys / shorthand keys):
 *       `articleSection: '<section>',`
 *     Always emit a trailing comma — safe in JS object literals.
 *   - Multi-line schemas use the indent of the line preceding the close.
 *   - Single-line schemas use a single-space separator.
 */
function injectArticleSection(source, section) {
  const loc = locateArticleSchema(source);
  if (!loc) return null;
  const { openIdx, closeIdx, isJsonStyle } = loc;

  const before = source.slice(0, closeIdx);
  const after = source.slice(closeIdx); // begins with `}`

  // Strip trailing whitespace before `}` so we can append cleanly, then
  // restore the same trailing whitespace afterwards.
  const trailingWsMatch = before.match(/\s*$/);
  const trailingWs = trailingWsMatch ? trailingWsMatch[0] : '';
  const beforeNoWs = before.slice(0, before.length - trailingWs.length);
  const lastChar = beforeNoWs[beforeNoWs.length - 1];

  const schemaSlice = source.slice(openIdx, closeIdx);
  const isSingleLine = !schemaSlice.includes('\n');

  // Decide how to format the new line.
  const valueJson = JSON.stringify(section); // always wrapped in double quotes
  const valueJs = "'" + section.replace(/'/g, "\\'") + "'";

  if (isSingleLine) {
    // Pattern: `const x = { ..., inLanguage: 'nl-NL' };`
    // Insert before closing `}` with appropriate separator.
    const sep = lastChar === ',' || lastChar === '{' ? ' ' : ', ';
    const fieldText = isJsonStyle
      ? `"articleSection": ${valueJson}`
      : `articleSection: ${valueJs}`;
    return beforeNoWs + sep + fieldText + ' ' + after;
  }

  // Multi-line. Detect indent of the last property line.
  // Look for the last `\n<indent><non-ws>` sequence inside the schema slice.
  const lines = beforeNoWs.split('\n');
  // The last line is empty or whitespace-only (since we stripped trailingWs
  // it actually contains content from the last property, not the closing
  // brace's own line). Find the last non-empty line.
  let indent = '  ';
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/^([ \t]+)\S/);
    if (m) {
      indent = m[1];
      break;
    }
  }

  // Ensure the previous field has a trailing comma. In JS this is always
  // safe; in JSON-style it's required because the next field follows.
  const needsComma = lastChar !== ',' && lastChar !== '{';
  const fieldText = isJsonStyle
    ? `"articleSection": ${valueJson},`
    : `articleSection: ${valueJs},`;

  const newSource =
    beforeNoWs +
    (needsComma ? ',' : '') +
    '\n' +
    indent +
    fieldText +
    trailingWs +
    after;

  return newSource;
}

function main() {
  if (!fs.existsSync(KENNISBANK_DIR)) {
    console.error(`[ERROR] Directory not found: ${KENNISBANK_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(KENNISBANK_DIR)
    .filter((f) => f.endsWith('.astro'))
    .sort();

  const changed = [];
  const skipped = [];
  const unmatched = [];

  for (const file of files) {
    const fullPath = path.join(KENNISBANK_DIR, file);
    const source = fs.readFileSync(fullPath, 'utf8');

    if (/\barticleSection\s*[:=]/.test(source)) {
      skipped.push(file);
      continue;
    }

    const section = pickSection(file);
    const updated = injectArticleSection(source, section);

    if (updated == null || updated === source) {
      unmatched.push(file);
      continue;
    }

    fs.writeFileSync(fullPath, updated, 'utf8');
    changed.push({ file, section });
  }

  console.log('---');
  console.log(`Changed: ${changed.length}`);
  for (const { file, section } of changed) {
    console.log(`  + ${file} -> "${section}"`);
  }
  console.log(`Skipped (already had articleSection): ${skipped.length}`);
  for (const file of skipped) {
    console.log(`  = ${file}`);
  }
  console.log(`Unmatched (could not locate Article schema): ${unmatched.length}`);
  for (const file of unmatched) {
    console.log(`  ! ${file}`);
  }
  console.log('---');
  console.log(
    `TOTAL: ${files.length} files | changed=${changed.length} skipped=${skipped.length} unmatched=${unmatched.length}`
  );
}

main();

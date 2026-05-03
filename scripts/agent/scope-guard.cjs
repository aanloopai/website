#!/usr/bin/env node
/**
 * V2 Autonomous-agent — scope-guard (safety checks).
 *
 * Valideert een unified-diff TEGEN de scope-contract in
 * .claude/AUTOPILOT-ALLOWED-SCOPES.md. Bedoeld als pre-apply gate:
 * agent mag een Claude-voorstel pas toepassen als scope-guard exit 0
 * geeft.
 *
 * Checks:
 *   1. Geen wijziging in FORBIDDEN paden (Header, Footer, wrangler,
 *      worker.js zelf, .env, .github/workflows, etc.)
 *   2. Diff bevat GEEN forbidden token-strings (KvK, telefoon, email,
 *      brand-color tokens, oude prijzen)
 *   3. Max 50 regels wijziging per file
 *   4. Max 5 files per diff totaal
 *   5. Geen wijziging aan AUTOPILOT-ALLOWED-SCOPES.md zelf (anti-self-mod)
 *
 * CLI:
 *   node scripts/agent/scope-guard.cjs <diff-file>
 *   git diff HEAD | node scripts/agent/scope-guard.cjs --stdin
 *
 * Exit:
 *   0 = clean, agent mag commit doen
 *   1 = violations gevonden — block + log + open issue
 *   2 = configuratie/parsing error
 *
 * Output:
 *   JSON { ok: bool, violations: [{rule, detail}], stats }
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCOPE_FILE = path.join(REPO_ROOT, '.claude', 'AUTOPILOT-ALLOWED-SCOPES.md');

const MAX_LINES_PER_FILE = 50;
const MAX_FILES_PER_DIFF = 5;

// FORBIDDEN paths — hardcoded sentinels (aanvullend op AUTOPILOT-ALLOWED-SCOPES.md
// die hier ook worden ingelezen). Hardcoded ervoor zodat een corrupt scope-file
// niet alle guards uitschakelt.
const HARDCODED_FORBIDDEN_PATHS = [
  /^src\/components\//, // Alle components forbidden voor agent
  /^src\/styles\//,
  /^src\/worker\.js$/,
  /^functions\/api\//,
  /^src\/lib\/growthbook\.ts$/,
  /^wrangler\.toml$/,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^\.github\/workflows\//,
  /^\.claude\/AUTOPILOT-ALLOWED-SCOPES\.md$/, // anti-self-mod
  /^scripts\/agent\//, // agent mag z'n eigen code niet wijzigen
  /^\.env/,
  /\.env$/,
  /^developing\//, // user-strategie docs
];

// FORBIDDEN token-strings — als de NIEUWE inhoud (na de change) deze bevat
// of als ze WORDEN VERWIJDERD uit bestaande inhoud → block.
const FORBIDDEN_INTRODUCE = [
  // Stale prijzen (mogen nooit terug)
  '€297', '€397', '€497', '€697', '€797', '€897',
  'EUR 297', 'EUR 397', 'EUR 497', 'EUR 697', 'EUR 797', 'EUR 897',
  // Mock-content (per master plan beslissing 2)
  'AggregateRating',
  '"@type": "AggregateRating"',
  '"@type":"AggregateRating"',
];

// Brand-strings die NOOIT verwijderd of gewijzigd mogen worden
const PRESERVE_STRINGS = [
  'KvK 88606902',
  '88606902',
  'hello@aanloopai.nl',
  '+31624741597',
  '+31 6 24 74 15 97',
  'Aanloop AI',
  'Daan Verhoeven',
];

function parseUnifiedDiff(diffText) {
  // Parse standaard `git diff` unified output naar lijst van { file, added, removed, addedLines, removedLines }
  const files = [];
  const fileHeaderRe = /^diff --git a\/(.+?) b\/(.+?)$/gm;
  const matches = [];
  let m;
  while ((m = fileHeaderRe.exec(diffText)) !== null) {
    matches.push({ start: m.index, file: m[2] });
  }

  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].start;
    const end = i + 1 < matches.length ? matches[i + 1].start : diffText.length;
    const block = diffText.slice(start, end);
    const file = matches[i].file;
    const lines = block.split('\n');
    const addedLines = [];
    const removedLines = [];
    for (const line of lines) {
      // Skip diff metadata
      if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@') || line.startsWith('diff') || line.startsWith('index ') || line.startsWith('new file') || line.startsWith('deleted file')) continue;
      if (line.startsWith('+')) addedLines.push(line.slice(1));
      else if (line.startsWith('-')) removedLines.push(line.slice(1));
    }
    files.push({ file, addedLines, removedLines, added: addedLines.length, removed: removedLines.length });
  }
  return files;
}

function loadAllowedScopes() {
  // Parse .claude/AUTOPILOT-ALLOWED-SCOPES.md — extract ALLOWED en FORBIDDEN paden
  // uit de markdown backtick-tokens. Tolerant — als file ontbreekt of corrupt is,
  // gebruiken we alleen HARDCODED_FORBIDDEN_PATHS (fail closed).
  const result = { allowed: [], forbidden: [], available: false };
  if (!fs.existsSync(SCOPE_FILE)) return result;

  const content = fs.readFileSync(SCOPE_FILE, 'utf8');
  result.available = true;

  const sections = content.split(/^## /m);
  for (const section of sections) {
    const isAllowed = /^ALLOWED/i.test(section);
    const isForbidden = /^FORBIDDEN/i.test(section);
    if (!isAllowed && !isForbidden) continue;
    const tokens = [...section.matchAll(/`([^`]+)`/g)].map(x => x[1]);
    for (const tok of tokens) {
      if (tok.includes('/') || tok.includes('.')) {
        if (isAllowed) result.allowed.push(tok);
        else result.forbidden.push(tok);
      }
    }
  }
  return result;
}

function pathMatches(filepath, pattern) {
  if (pattern instanceof RegExp) return pattern.test(filepath);
  // Glob-achtig: ** matches anything, * matches segment
  const re = new RegExp('^' + pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    + '$');
  return re.test(filepath);
}

function checkPath(file, scopeContract) {
  // 1. Hardcoded forbidden patterns first (fail closed)
  for (const pat of HARDCODED_FORBIDDEN_PATHS) {
    if (pathMatches(file, pat)) {
      return { ok: false, rule: 'forbidden_path_hardcoded', detail: `${file} → matched ${pat}` };
    }
  }
  // 2. Forbidden lijst uit scope-file
  for (const pat of scopeContract.forbidden) {
    if (pathMatches(file, pat)) {
      return { ok: false, rule: 'forbidden_path_scope', detail: `${file} → matched ${pat}` };
    }
  }
  // 3. Als ALLOWED-lijst aanwezig: file MOET matchen
  if (scopeContract.allowed.length > 0) {
    const allowed = scopeContract.allowed.some(pat => pathMatches(file, pat));
    if (!allowed) {
      return { ok: false, rule: 'not_in_allowed_list', detail: `${file} → niet in ALLOWED lijst` };
    }
  }
  return { ok: true };
}

function checkContent(filesData) {
  const violations = [];

  for (const { file, addedLines, removedLines } of filesData) {
    // 1. Geen forbidden tokens introduceren
    for (const line of addedLines) {
      for (const forbidden of FORBIDDEN_INTRODUCE) {
        if (line.includes(forbidden)) {
          violations.push({
            rule: 'forbidden_token_introduced',
            detail: `${file}: '${forbidden}' toegevoegd in regel: ${line.slice(0, 100)}`,
          });
        }
      }
    }
    // 2. Brand-strings die niet verwijderd mogen — als removed-line ze bevat EN
    //    geen identieke replacement in added-lines → block
    for (const removed of removedLines) {
      for (const preserve of PRESERVE_STRINGS) {
        if (removed.includes(preserve)) {
          const stillPresent = addedLines.some(a => a.includes(preserve));
          if (!stillPresent) {
            violations.push({
              rule: 'protected_string_removed',
              detail: `${file}: '${preserve}' verwijderd zonder vervanging`,
            });
          }
        }
      }
    }
  }

  return violations;
}

function checkSize(filesData) {
  const violations = [];
  if (filesData.length > MAX_FILES_PER_DIFF) {
    violations.push({
      rule: 'too_many_files',
      detail: `${filesData.length} files in diff, max=${MAX_FILES_PER_DIFF}`,
    });
  }
  for (const { file, added, removed } of filesData) {
    const total = added + removed;
    if (total > MAX_LINES_PER_FILE) {
      violations.push({
        rule: 'too_many_lines',
        detail: `${file}: ${total} regels (added=${added}, removed=${removed}), max=${MAX_LINES_PER_FILE}`,
      });
    }
  }
  return violations;
}

function readDiffInput() {
  const args = process.argv.slice(2);
  if (args.includes('--stdin') || args.length === 0) {
    return fs.readFileSync(0, 'utf8');
  }
  return fs.readFileSync(args[0], 'utf8');
}

function main() {
  let diffText;
  try {
    diffText = readDiffInput();
  } catch (e) {
    console.error(JSON.stringify({ ok: false, violations: [{ rule: 'no_input', detail: e.message }] }));
    process.exit(2);
  }

  if (!diffText || diffText.trim() === '') {
    console.log(JSON.stringify({ ok: true, violations: [], stats: { files: 0 } }));
    process.exit(0);
  }

  const scopeContract = loadAllowedScopes();
  const filesData = parseUnifiedDiff(diffText);
  const violations = [];

  for (const { file } of filesData) {
    const r = checkPath(file, scopeContract);
    if (!r.ok) violations.push({ rule: r.rule, detail: r.detail });
  }

  violations.push(...checkContent(filesData));
  violations.push(...checkSize(filesData));

  const result = {
    ok: violations.length === 0,
    violations,
    stats: {
      files: filesData.length,
      total_added: filesData.reduce((s, f) => s + f.added, 0),
      total_removed: filesData.reduce((s, f) => s + f.removed, 0),
      scope_contract_loaded: scopeContract.available,
      allowed_patterns: scopeContract.allowed.length,
      forbidden_patterns: scopeContract.forbidden.length,
    },
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main();

#!/usr/bin/env node
/**
 * V2 Autonomous-agent — orchestrator (LLM-triage + auto-apply + auto-push).
 *
 * Workflow per run:
 *   1. git pull origin master
 *   2. Run V1 audit (scripts/agent/audit-live-site.cjs)
 *   3. Geen failures → log + exit 0
 *   4. Failures → daily-commit-cap check → build context → Claude API →
 *      parse → scope-guard → git apply → npm run build → commit + push
 *
 * Cron op VPS (na deploy-key + .env setup):
 *   0 7 * * * cd /opt/aanloop-agent/website && \
 *     ANTHROPIC_API_KEY=$(cat /opt/aanloop-agent/.env | grep -oE 'sk-ant-[^"]+') \
 *     node scripts/agent/run-autonomous.cjs >> /var/log/aanloop-agent.log 2>&1
 *
 * CLI:
 *   --dry-run       : geen apply/push, alleen Claude-call + parse
 *   --no-push       : apply + commit lokaal, geen push
 *   --skip-audit    : gebruik bestaand audit-summary.json
 *
 * Env:
 *   ANTHROPIC_API_KEY     : verplicht
 *   AGENT_AUTHOR_NAME     : default 'aanloop-agent'
 *   AGENT_AUTHOR_EMAIL    : default 'agent@aanloopai.nl'
 *   AGENT_DAILY_LIMIT     : default 3
 *   AGENT_MODEL           : default 'claude-sonnet-4-6'
 *   AGENT_LOG_FILE        : default ./agent.log
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCOPE_FILE = path.join(REPO_ROOT, '.claude', 'AUTOPILOT-ALLOWED-SCOPES.md');
const AUDIT_SCRIPT = path.join(__dirname, 'audit-live-site.cjs');
const SCOPE_GUARD = path.join(__dirname, 'scope-guard.cjs');
const LOG_FILE = process.env.AGENT_LOG_FILE || path.join(REPO_ROOT, 'agent.log');

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const NO_PUSH = args.has('--no-push') || DRY_RUN;
const SKIP_AUDIT = args.has('--skip-audit');

const AUTHOR_NAME = process.env.AGENT_AUTHOR_NAME || 'aanloop-agent';
const AUTHOR_EMAIL = process.env.AGENT_AUTHOR_EMAIL || 'agent@aanloopai.nl';
const DAILY_LIMIT = parseInt(process.env.AGENT_DAILY_LIMIT || '3', 10);
const MODEL = process.env.AGENT_MODEL || 'claude-sonnet-4-6';

function log(msg, level = 'INFO') {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch { /* readonly fs */ }
}

function sh(cmd, opts = {}) {
  return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

function shResult(cmd, opts = {}) {
  try {
    const stdout = sh(cmd, opts);
    return { ok: true, stdout, stderr: '', code: 0 };
  } catch (e) {
    return { ok: false, stdout: e.stdout?.toString() || '', stderr: e.stderr?.toString() || e.message, code: e.status || 1 };
  }
}

function runDailyCommitCount() {
  const r = shResult(`git log --author="${AUTHOR_NAME}" --since="24 hours ago" --pretty=format:"%H" 2>/dev/null`);
  if (!r.ok) return 0;
  return r.stdout.split('\n').filter(Boolean).length;
}

function gitPull() {
  log('git pull origin master');
  const r = shResult('git pull origin master --rebase=false');
  if (!r.ok) {
    log(`git pull failed: ${r.stderr.slice(0, 300)}`, 'ERROR');
    return false;
  }
  return true;
}

function runAudit() {
  if (SKIP_AUDIT) {
    log('--skip-audit: looking for cached audit-summary.json');
    const cached = path.join(REPO_ROOT, 'audit-summary.json');
    if (!fs.existsSync(cached)) {
      log('no cached audit found — bailing', 'ERROR');
      return null;
    }
    return JSON.parse(fs.readFileSync(cached, 'utf8'));
  }
  log('running V1 audit (audit-live-site.cjs --json)');
  const r = shResult(`node "${AUDIT_SCRIPT}" --json`);
  try {
    return JSON.parse(r.stdout);
  } catch (e) {
    log(`failed to parse audit output: ${e.message}`, 'ERROR');
    log(`stdout head: ${r.stdout.slice(0, 500)}`);
    return null;
  }
}

function loadScopeContract() {
  if (!fs.existsSync(SCOPE_FILE)) {
    log('AUTOPILOT-ALLOWED-SCOPES.md missing — abort', 'ERROR');
    return null;
  }
  return fs.readFileSync(SCOPE_FILE, 'utf8');
}

function inferTargetFile(failure) {
  if (failure.category === 'robots') return 'public/robots.txt';

  const m = failure.msg.match(/^(\/[^\s]+)/);
  if (!m) return null;
  let urlPath = m[1].replace(/\/$/, '');
  if (urlPath === '') return 'src/pages/index.astro';
  if (urlPath === '/robots.txt') return 'public/robots.txt';
  return `src/pages${urlPath}.astro`;
}

function buildClaudePrompt(audit, scopeContract) {
  const failure = audit.failures[0];
  const targetFile = inferTargetFile(failure);
  let fileContent = '';
  if (targetFile && fs.existsSync(path.join(REPO_ROOT, targetFile))) {
    const raw = fs.readFileSync(path.join(REPO_ROOT, targetFile), 'utf8');
    fileContent = raw.length > 8000 ? raw.slice(0, 8000) + '\n...(truncated)' : raw;
  }

  const userPrompt = `# Audit failure to triage and fix

## Failure
**Category:** ${failure.category}
**Detail:** ${failure.msg}

## Inferred target file
${targetFile || '(unable to infer)'}

${fileContent ? `## Current file content\n\n\`\`\`\n${fileContent}\n\`\`\`` : ''}

## Your task

1. Determine if a code fix can resolve this within the ALLOWED scope.
2. If YES: produce a unified git-diff that:
   - Touches ONLY files in the ALLOWED scope
   - Does NOT remove preserved strings (KvK 88606902, hello@aanloopai.nl, +31624741597, brand names)
   - Does NOT introduce stale prices (€297/€397/€497/€697/€797/€897)
   - Is minimal (≤50 lines per file, ≤5 files total)
3. If NO: set requires_user=true with explanation.

## Output format (strict JSON only, no markdown wrapper)

{
  "action": "fix" | "user-decision",
  "rationale": "1-3 sentences",
  "diff": "<unified git diff OR empty>",
  "commit_message": "<conventional commit line OR empty>",
  "requires_user": false
}`;

  const systemPrompt = `You are an autonomous Astro/TypeScript site-fix agent for aanloopai.nl. Apply minimal, scope-respecting fixes for SEO/audit regressies.

## Scope contract (binding)

${scopeContract.slice(0, 4000)}

## Strict rules

- Output ONLY valid JSON matching the requested schema. No prose, no markdown fences.
- Diffs must be standard unified format starting with "diff --git a/<path> b/<path>".
- Never propose changes outside ALLOWED paths.
- When in doubt, set requires_user=true.`;

  return { systemPrompt, userPrompt };
}

async function callClaude({ systemPrompt, userPrompt }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log('ANTHROPIC_API_KEY not set', 'ERROR');
    return null;
  }
  log(`calling Claude API (model=${MODEL})`);
  const body = JSON.stringify({
    model: MODEL,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body,
  });
  if (!res.ok) {
    const errText = await res.text();
    log(`Claude API error ${res.status}: ${errText.slice(0, 300)}`, 'ERROR');
    return null;
  }
  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  log(`Claude returned ${text.length} chars (input=${data.usage?.input_tokens}, output=${data.usage?.output_tokens})`);
  return text;
}

function parseClaudeResponse(text) {
  let jsonStr = text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) jsonStr = fenceMatch[1];
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    log(`failed to parse Claude JSON: ${e.message}`, 'ERROR');
    log(`response head: ${text.slice(0, 200)}`);
    return null;
  }
}

function runScopeGuard(diff) {
  const r = spawnSync('node', [SCOPE_GUARD, '--stdin'], {
    input: diff,
    encoding: 'utf8',
    cwd: REPO_ROOT,
  });
  let parsed;
  try { parsed = JSON.parse(r.stdout); } catch { parsed = { ok: false, violations: [{ rule: 'scope_guard_parse_fail', detail: r.stdout.slice(0, 200) }] }; }
  return { ok: r.status === 0, exit: r.status, parsed };
}

function applyDiff(diff) {
  const tmpFile = path.join(REPO_ROOT, '.agent-tmp.diff');
  fs.writeFileSync(tmpFile, diff);
  const r = shResult(`git apply --check "${tmpFile}"`);
  if (!r.ok) {
    log(`git apply --check failed: ${r.stderr.slice(0, 300)}`, 'ERROR');
    fs.unlinkSync(tmpFile);
    return false;
  }
  const r2 = shResult(`git apply "${tmpFile}"`);
  fs.unlinkSync(tmpFile);
  if (!r2.ok) {
    log(`git apply failed: ${r2.stderr.slice(0, 300)}`, 'ERROR');
    return false;
  }
  return true;
}

function runBuild() {
  log('running npm run build (build-gate)');
  const r = shResult('npm run build');
  if (!r.ok) {
    log(`build failed: ${r.stderr.slice(0, 500) || r.stdout.slice(-500)}`, 'ERROR');
    return false;
  }
  return true;
}

function gitRevert() {
  log('reverting changes via git checkout .', 'WARN');
  shResult('git checkout -- .');
  shResult('git clean -fd src public 2>/dev/null');
}

function commitAndPush(commitMsg) {
  const fullMsg = `${commitMsg}\n\n[autonomous-agent] Auto-fix triggered by audit regression. Review weekly.`;
  shResult(`git config user.name "${AUTHOR_NAME}"`);
  shResult(`git config user.email "${AUTHOR_EMAIL}"`);
  shResult('git add -A');
  const r = shResult(`git commit -m ${JSON.stringify(fullMsg)}`);
  if (!r.ok) {
    log(`git commit failed: ${r.stderr.slice(0, 300)}`, 'ERROR');
    return null;
  }
  const sha = sh('git rev-parse HEAD').trim().slice(0, 7);
  if (NO_PUSH) {
    log(`commit ${sha} (--no-push, skipping push)`);
    return sha;
  }
  const pushR = shResult('git push origin master');
  if (!pushR.ok) {
    log(`git push failed: ${pushR.stderr.slice(0, 300)}`, 'ERROR');
    return null;
  }
  log(`pushed commit ${sha} to origin/master`);
  return sha;
}

function openIssue(title, body) {
  const r = shResult(`gh issue create --title ${JSON.stringify(title)} --body ${JSON.stringify(body)} --label autonomous-audit,agent-blocked`);
  if (r.ok) log(`opened issue: ${r.stdout.trim()}`);
  else log(`gh issue create failed: ${r.stderr.slice(0, 200)}`, 'WARN');
}

async function main() {
  log('=== V2 autonomous-agent run start ===');
  log(`config: model=${MODEL}, daily_limit=${DAILY_LIMIT}, dry_run=${DRY_RUN}, no_push=${NO_PUSH}`);

  if (!gitPull()) process.exit(1);

  const todayCount = runDailyCommitCount();
  log(`commits today by ${AUTHOR_NAME}: ${todayCount}/${DAILY_LIMIT}`);
  if (todayCount >= DAILY_LIMIT) {
    log('daily commit cap reached — abort', 'WARN');
    process.exit(0);
  }

  const audit = runAudit();
  if (!audit) process.exit(2);
  log(`audit: ${audit.pass_count} pass / ${audit.fail_count} fail`);
  if (audit.fail_count === 0) {
    log('all checks pass — nothing to do');
    process.exit(0);
  }

  const scopeContract = loadScopeContract();
  if (!scopeContract) process.exit(2);

  const { systemPrompt, userPrompt } = buildClaudePrompt(audit, scopeContract);
  const claudeText = await callClaude({ systemPrompt, userPrompt });
  if (!claudeText) process.exit(2);
  const parsed = parseClaudeResponse(claudeText);
  if (!parsed) process.exit(2);

  log(`Claude proposal: action=${parsed.action}, requires_user=${parsed.requires_user}`);

  if (parsed.action === 'user-decision' || parsed.requires_user) {
    log(`requires_user=true: ${parsed.rationale}`);
    openIssue(
      `[auto] Audit fix needs user decision — ${audit.failures[0].category}`,
      `## Audit failure\n\n**${audit.failures[0].category}**: ${audit.failures[0].msg}\n\n## Agent rationale\n\n${parsed.rationale}\n\n_Auto-opened by V2 agent._`
    );
    process.exit(0);
  }

  if (!parsed.diff) {
    log('action=fix but no diff — abort');
    process.exit(2);
  }

  const sg = runScopeGuard(parsed.diff);
  log(`scope-guard: ok=${sg.ok}, violations=${sg.parsed.violations?.length || 0}`);
  if (!sg.ok) {
    for (const v of sg.parsed.violations || []) log(`  - [${v.rule}] ${v.detail}`, 'WARN');
    openIssue(
      '[auto] Agent proposal blocked by scope-guard',
      `## Audit failure\n\n${audit.failures[0].msg}\n\n## Scope violations\n\n${(sg.parsed.violations || []).map(v => `- **${v.rule}**: ${v.detail}`).join('\n')}\n\n## Proposed diff\n\n\`\`\`diff\n${parsed.diff.slice(0, 2000)}\n\`\`\``
    );
    process.exit(0);
  }

  if (DRY_RUN) {
    log('--dry-run: showing diff but not applying');
    console.log('\n=== PROPOSED DIFF ===\n' + parsed.diff);
    process.exit(0);
  }

  if (!applyDiff(parsed.diff)) {
    openIssue(
      '[auto] Agent diff failed to apply',
      `## Audit failure\n\n${audit.failures[0].msg}\n\n## Diff (rejected by git apply)\n\n\`\`\`diff\n${parsed.diff.slice(0, 2000)}\n\`\`\``
    );
    process.exit(2);
  }

  if (!runBuild()) {
    log('build failed — reverting', 'ERROR');
    gitRevert();
    openIssue(
      '[auto] Agent fix broke build',
      `## Audit failure\n\n${audit.failures[0].msg}\n\n## Diff applied but build failed (reverted)\n\n\`\`\`diff\n${parsed.diff.slice(0, 2000)}\n\`\`\``
    );
    process.exit(2);
  }
  log('build passed');

  const commitMsg = parsed.commit_message || `fix(agent): auto-fix ${audit.failures[0].category} regression`;
  const sha = commitAndPush(commitMsg);
  if (!sha) {
    log('commit/push failed — reverting', 'ERROR');
    gitRevert();
    process.exit(2);
  }

  log(`=== success: commit ${sha} pushed ===`);
  process.exit(0);
}

main().catch(err => {
  log(`FATAL: ${err.stack || err.message}`, 'ERROR');
  process.exit(2);
});

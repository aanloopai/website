#!/usr/bin/env node
// Eenmalige migratie: zet de AI-vermelding (EU AI Act art. 50) op alle bestaande
// ElevenLabs ConvAI-agents die vóór deze regel zijn aangemaakt.
//
//   ELEVENLABS_API_KEY=... node scripts/elevenlabs-agents-disclosure.mjs          # dry-run: toont wat er zou wijzigen
//   ELEVENLABS_API_KEY=... node scripts/elevenlabs-agents-disclosure.mjs --apply  # voert de PATCH uit
//
// Per agent: als first_message het woord "AI" niet bevat → "…, de AI-assistent van …"
// (of een generieke AI-zin als de naam niet te herleiden is); als de prompt de
// AI_DISCLOSURE_RULE niet bevat → wordt die vooraan toegevoegd. Niets anders wordt aangeraakt.
import { AI_DISCLOSURE_RULE } from '../src/lib/elevenlabs.js';

const API = 'https://api.elevenlabs.io/v1';
const apiKey = process.env.ELEVENLABS_API_KEY;
const apply = process.argv.includes('--apply');
if (!apiKey) {
  console.error('ELEVENLABS_API_KEY ontbreekt');
  process.exit(1);
}

async function req(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'xi-api-key': apiKey, 'content-type': 'application/json', ...(init.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : {};
}

function fixFirstMessage(msg) {
  if (/\bAI\b/i.test(msg || '')) return null;
  // "…u spreekt met Emma van X…" / "…Ik ben Emma van X…" → voeg ", de AI-assistent" in
  const m = (msg || '').match(/^(.*?\bEmma)( van .*)$/i);
  if (m) return `${m[1]}, de AI-assistent${m[2]}`;
  return `Goedendag, u spreekt met Emma, de AI-assistent. ${msg || 'Waarmee kan ik u helpen?'}`.trim();
}

const list = await req('/convai/agents?page_size=100');
const agents = list.agents || [];
console.log(`${agents.length} agent(s) gevonden — ${apply ? 'APPLY' : 'dry-run'}`);
let changed = 0;
for (const a of agents) {
  const full = await req(`/convai/agents/${a.agent_id}`);
  const conv = full.conversation_config?.agent || {};
  const firstMessage = conv.first_message || '';
  const prompt = conv.prompt?.prompt || '';
  const newFirst = fixFirstMessage(firstMessage);
  const needsRule = !prompt.includes('AI Act art. 50');
  if (!newFirst && !needsRule) {
    console.log(`  ok      ${a.agent_id} ${a.name}`);
    continue;
  }
  changed++;
  console.log(`  WIJZIG  ${a.agent_id} ${a.name}`);
  if (newFirst) console.log(`          first_message: "${firstMessage}" → "${newFirst}"`);
  if (needsRule) console.log('          prompt: AI_DISCLOSURE_RULE vooraan toegevoegd');
  if (!apply) continue;
  const patch = { conversation_config: { agent: {} } };
  if (newFirst) patch.conversation_config.agent.first_message = newFirst;
  if (needsRule) patch.conversation_config.agent.prompt = { ...(conv.prompt || {}), prompt: AI_DISCLOSURE_RULE + prompt };
  await req(`/convai/agents/${a.agent_id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  console.log('          → gepatcht');
}
console.log(`${changed} agent(s) ${apply ? 'gepatcht' : 'zouden wijzigen'}`);

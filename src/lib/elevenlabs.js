// ElevenLabs Conversational AI provisioning (V4 Sprint C1).
// From a customer's intake answers, automatically creates a knowledge-base
// document + a ConvAI agent. Used by admin-routes.js when an order goes active.

const API = 'https://api.elevenlabs.io/v1';

async function elFetch(apiKey, path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`ElevenLabs ${path} HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  try { return JSON.parse(text); } catch { return {}; }
}

// POST /v1/convai/knowledge-base/text → { id, name }
async function createKbDoc(apiKey, name, text) {
  return elFetch(apiKey, '/convai/knowledge-base/text', { name: name.slice(0, 100), text: text.slice(0, 50000) });
}

// DELETE /v1/convai/knowledge-base/{documentation_id} — cleanup helper for
// when a later provisioning step fails after the KB doc was already created.
// Endpoint verified against ElevenLabs ConvAI API docs (knowledge base
// delete-document); same base URL / auth header as createKbDoc, but DELETE
// has no body and no JSON response to parse.
async function deleteKbDoc(apiKey, kbDocId) {
  const res = await fetch(`${API}/convai/knowledge-base/${kbDocId}`, {
    method: 'DELETE',
    headers: { 'xi-api-key': apiKey },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs KB delete HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
}

// POST /v1/convai/agents/create → { agent_id }
async function createAgent(apiKey, { name, systemPrompt, firstMessage, kbDoc }) {
  const agent = { prompt: { prompt: systemPrompt }, first_message: firstMessage, language: 'nl' };
  if (kbDoc) {
    agent.prompt.knowledge_base = [{ type: 'text', name: kbDoc.name, id: kbDoc.id }];
  }
  return elFetch(apiKey, '/convai/agents/create', {
    name: name.slice(0, 100),
    // Non-English agents require a turbo/flash v2.5 TTS model.
    conversation_config: { agent, tts: { model_id: 'eleven_flash_v2_5' } },
  });
}

// Build a knowledge-base text blob from FAQ pairs + free text.
function buildKbText(faq, extra) {
  let out = '';
  (Array.isArray(faq) ? faq : []).forEach((p) => {
    if (p && (p.vraag || p.antwoord)) out += `Vraag: ${p.vraag || ''}\nAntwoord: ${p.antwoord || ''}\n\n`;
  });
  if (extra) out += `\n${extra}\n`;
  return out.trim() || 'Geen aanvullende kennis opgegeven.';
}

// Sanitise customer-supplied intake text before it is interpolated into the
// agent system prompt. Strips control chars / linebreaks (would let a user
// inject extra "Instructions:" lines) and caps the length. Returns '' for
// non-string input.
function s(v, max = 200) {
  if (v == null) return '';
  return String(v).replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function sArr(v, max = 8, itemMax = 80) {
  return (Array.isArray(v) ? v : []).slice(0, max).map((x) => s(x, itemMax)).filter(Boolean);
}

// Build the agent prompt + first message from intake answers, per product.
function buildConfig(productKey, intake) {
  const i = intake || {};
  if (productKey === 'emma') {
    const b = i.bedrijf || {}, k = i.kennis || {}, af = i.afhandeling || {};
    const naam = s(b.bedrijfsnaam, 100) || 'het bedrijf';
    const branche = s(b.branche, 80);
    const talen = sArr(k.talen, 6, 30);
    return {
      systemPrompt:
        `Je bent Emma, de AI-chatassistent van ${naam}${branche ? ` (${branche})` : ''}. ` +
        `Je beantwoordt vragen van klanten via chat en WhatsApp. ` +
        `Talen: ${(talen.length ? talen : ['Nederlands']).join(', ')}. ` +
        `Overdracht naar mens: ${s(af.handover, 120) || 'handel zelf af'}.` +
        (af.handover_contact ? ` Doorschakelen naar: ${s(af.handover_contact, 80)}.` : '') +
        ` Wees vriendelijk en beknopt. Gebruik de kennisbank voor antwoorden.`,
      firstMessage: `Hallo! Ik ben Emma van ${naam}. Hoe kan ik u helpen?`,
      kbText: buildKbText(k.faq, k.productcatalogus),
    };
  }
  // default: emma-telefoon (voice receptionist)
  const b = i.bedrijf || {}, br = i.bereikbaarheid || {}, af = i.afhandeling || {}, k = i.kennis || {};
  const naam = s(b.bedrijfsnaam, 100) || 'het bedrijf';
  const branche = s(b.branche, 80);
  const taken = sArr(af.taken, 8, 60);
  return {
    systemPrompt:
      `Je bent Emma, de AI-telefoonreceptionist van ${naam}${branche ? ` (${branche})` : ''}. ` +
      `Openingstijden: ${s(br.openingstijden, 100) || 'onbekend'}. Buiten openingstijden: ${s(br.buiten_tijden, 120) || '-'}. ` +
      `Je taken: ${taken.join(', ') || 'vragen beantwoorden'}. ` +
      (af.doorverbind_nummers ? `Doorverbindnummers: ${s(af.doorverbind_nummers, 200)}. ` : '') +
      (af.escalatie ? `Bij urgente situaties: ${s(af.escalatie, 200)}. ` : '') +
      `Toon: ${s(k.toon, 60) || 'zakelijk en warm'}. Spreek altijd Nederlands, wees beknopt en behulpzaam. ` +
      `Gebruik de kennisbank voor antwoorden.`,
    firstMessage: `Goedendag, u spreekt met Emma van ${naam}. Waarmee kan ik u helpen?`,
    kbText: buildKbText(k.faq, k.diensten),
  };
}

// Provision a ConvAI agent for a service. Returns provisioning metadata.
// Throws on failure — the caller stores the error and does not block activation.
export async function provisionAgent(apiKey, productKey, serviceNaam, intake) {
  const cfg = buildConfig(productKey, intake);
  const kbDoc = await createKbDoc(apiKey, `${serviceNaam} — kennisbank`, cfg.kbText);
  let agent;
  try {
    agent = await createAgent(apiKey, {
      name: serviceNaam,
      systemPrompt: cfg.systemPrompt,
      firstMessage: cfg.firstMessage,
      kbDoc: { id: kbDoc.id, name: kbDoc.name },
    });
  } catch (err) {
    // Agent creation failed after the KB doc was already created — clean up
    // the orphaned doc so it doesn't accumulate in the ElevenLabs account.
    // Best-effort: a cleanup failure must not mask the original error.
    try {
      await deleteKbDoc(apiKey, kbDoc.id);
    } catch (cleanupErr) {
      console.error(`ElevenLabs KB doc cleanup failed for ${kbDoc.id}:`, cleanupErr);
    }
    throw err;
  }
  return {
    status: 'agent_aangemaakt',
    agent_id: agent.agent_id || null,
    kb_id: kbDoc.id || null,
    provisioned_at: new Date().toISOString(),
  };
}

// Products this module can auto-provision.
export function canProvision(productKey) {
  return productKey === 'emma-telefoon' || productKey === 'emma';
}

// DELETE /v1/convai/agents/{agent_id} — cleanup helper mirroring deleteKbDoc.
// 404 means the agent is already gone; treat that as success.
export async function deleteAgent(apiKey, agentId) {
  const res = await fetch(`${API}/convai/agents/${agentId}`, {
    method: 'DELETE',
    headers: { 'xi-api-key': apiKey },
  });
  if (res.status === 404) return;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs agent delete HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
}

// Best-effort teardown of a previously provisioned agent + KB doc. Used when
// a service is cancelled/deactivated. Never throws — each deletion is
// independent so a failure on one does not block the other, and a failure
// here must never block the caller's own flow (e.g. deactivation).
export async function teardownProvisioning(env, provisioning) {
  if (!env.ELEVENLABS_API_KEY || !provisioning) return;
  const apiKey = env.ELEVENLABS_API_KEY;
  if (provisioning.agent_id) {
    try {
      await deleteAgent(apiKey, provisioning.agent_id);
    } catch (err) {
      console.error(`ElevenLabs agent teardown failed for ${provisioning.agent_id}:`, err);
    }
  }
  if (provisioning.kb_id) {
    try {
      await deleteKbDoc(apiKey, provisioning.kb_id);
    } catch (err) {
      console.error(`ElevenLabs KB teardown failed for ${provisioning.kb_id}:`, err);
    }
  }
}

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

// Build the agent prompt + first message from intake answers, per product.
function buildConfig(productKey, intake) {
  const i = intake || {};
  if (productKey === 'emma') {
    const b = i.bedrijf || {}, k = i.kennis || {}, af = i.afhandeling || {};
    const naam = b.bedrijfsnaam || 'het bedrijf';
    return {
      systemPrompt:
        `Je bent Emma, de AI-chatassistent van ${naam}${b.branche ? ` (${b.branche})` : ''}. ` +
        `Je beantwoordt vragen van klanten via chat en WhatsApp. ` +
        `Talen: ${(Array.isArray(k.talen) ? k.talen : ['Nederlands']).join(', ')}. ` +
        `Overdracht naar mens: ${af.handover || 'handel zelf af'}.` +
        (af.handover_contact ? ` Doorschakelen naar: ${af.handover_contact}.` : '') +
        ` Wees vriendelijk en beknopt. Gebruik de kennisbank voor antwoorden.`,
      firstMessage: `Hallo! Ik ben Emma van ${naam}. Hoe kan ik u helpen?`,
      kbText: buildKbText(k.faq, k.productcatalogus),
    };
  }
  // default: marco (voice receptionist)
  const b = i.bedrijf || {}, br = i.bereikbaarheid || {}, af = i.afhandeling || {}, k = i.kennis || {};
  const naam = b.bedrijfsnaam || 'het bedrijf';
  return {
    systemPrompt:
      `Je bent Marco, de AI-telefoonreceptionist van ${naam}${b.branche ? ` (${b.branche})` : ''}. ` +
      `Openingstijden: ${br.openingstijden || 'onbekend'}. Buiten openingstijden: ${br.buiten_tijden || '-'}. ` +
      `Je taken: ${(Array.isArray(af.taken) ? af.taken : []).join(', ') || 'vragen beantwoorden'}. ` +
      (af.doorverbind_nummers ? `Doorverbindnummers: ${af.doorverbind_nummers}. ` : '') +
      (af.escalatie ? `Bij urgente situaties: ${af.escalatie}. ` : '') +
      `Toon: ${k.toon || 'zakelijk en warm'}. Spreek altijd Nederlands, wees beknopt en behulpzaam. ` +
      `Gebruik de kennisbank voor antwoorden.`,
    firstMessage: `Goedendag, u spreekt met Marco van ${naam}. Waarmee kan ik u helpen?`,
    kbText: buildKbText(k.faq, k.diensten),
  };
}

// Provision a ConvAI agent for a service. Returns provisioning metadata.
// Throws on failure — the caller stores the error and does not block activation.
export async function provisionAgent(apiKey, productKey, serviceNaam, intake) {
  const cfg = buildConfig(productKey, intake);
  const kbDoc = await createKbDoc(apiKey, `${serviceNaam} — kennisbank`, cfg.kbText);
  const agent = await createAgent(apiKey, {
    name: serviceNaam,
    systemPrompt: cfg.systemPrompt,
    firstMessage: cfg.firstMessage,
    kbDoc: { id: kbDoc.id, name: kbDoc.name },
  });
  return {
    status: 'agent_aangemaakt',
    agent_id: agent.agent_id || null,
    kb_id: kbDoc.id || null,
    provisioned_at: new Date().toISOString(),
  };
}

// Products this module can auto-provision.
export function canProvision(productKey) {
  return productKey === 'marco' || productKey === 'emma';
}

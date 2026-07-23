// Voice-provisioner (Emma-telefoon / Emma-chat) achter de provisioner-interface
// (spec Plak B, docs/superpowers/specs/2026-07-22-selfserve-funnel-design.md).
// Hergebruikt de bestaande ElevenLabs-provisioning uit elevenlabs.js — géén
// duplicatie van buildConfig/createAgent, alleen het "is de intake compleet
// genoeg om live te gaan?"-oordeel zit hier.
import { provisionAgent } from '../elevenlabs.js';
import { getIntakeSchema } from '../../data/intake-schemas.ts';

export const productKeys = ['emma-telefoon', 'emma'];

export function canProvision(productKey) {
  return productKeys.includes(productKey);
}

function isEmpty(value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

// De intake_json is GENEST als `intake[step.key][field.name]` — exact zoals
// de intake-wizard opslaat (`answers[step.key] = vals`,
// src/pages/portal/intake.astro) en buildConfig() leest (elevenlabs.js, bv.
// `i.bedrijf.bedrijfsnaam`, `i.bereikbaarheid.openingstijden`).
//
// `intake` mag een `_productKey` meegeven (provision() zet 'm vanuit
// order.product_key); zonder dat valt terug op 'emma-telefoon'.
export function missingForLive(intake) {
  const i = intake || {};
  const productKey = i._productKey || 'emma-telefoon';
  const schema = getIntakeSchema(productKey);
  const missing = [];
  for (const step of schema.steps) {
    for (const field of step.fields) {
      if (!field.required) continue;
      if (isEmpty(i?.[step.key]?.[field.name])) missing.push(field.name);
    }
  }
  if (i?.integraties?.agenda === 'Google Agenda' && !i?.agendaGekoppeld) missing.push('agenda_koppeling');
  return missing;
}

/**
 * Provision (of: constateer dat de klant eerst nog gegevens moet aanleveren).
 *
 * @param {object} env    Worker env (ELEVENLABS_API_KEY).
 * @param {{service?: object, order: object, intake: object, customerId?: string}} ctx
 * @returns {Promise<{status: 'klaar'|'wacht_op_klant'|'fout', wachtOp?: string[], error?: string, provisioning?: object}>}
 */
export async function provision(env, { service, order, intake } = {}) {
  const missing = missingForLive({ ...intake, _productKey: order?.product_key });
  if (missing.length) {
    return { status: 'wacht_op_klant', wachtOp: missing };
  }
  try {
    const serviceNaam = service?.naam || order?.product_key;
    const provisioning = await provisionAgent(env.ELEVENLABS_API_KEY, order?.product_key, serviceNaam, intake);
    return { status: 'klaar', provisioning };
  } catch (err) {
    return { status: 'fout', error: String(err?.message || err).slice(0, 400) };
  }
}

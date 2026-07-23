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

// De 'bedrijf'-stap (bedrijfsnaam, branche, ...) is bedrijfsidentiteit die al
// vóór de diepe intake bekend is (checkout/order/klantprofiel) — geen
// live-blokkerend veld. 'huidig_nummer' is puur input voor het (nog
// handmatige) nummerbehoud-proces en wordt door buildConfig() niet gebruikt
// om de agent-prompt te bouwen, dus ontbreken ervan hoeft provisioning niet
// tegen te houden.
const IDENTITY_STEP_KEY = 'bedrijf';
const LIVE_EXEMPT_FIELDS = new Set(['huidig_nummer']);

// Verplichte velden om een service "live" te mogen zetten: alle `required:true`
// velden uit het intake-schema, min de bedrijfsidentiteit-stap en de
// hierboven genoemde uitzondering.
function requiredFieldNames(productKey) {
  const schema = getIntakeSchema(productKey);
  return schema.steps
    .filter((step) => step.key !== IDENTITY_STEP_KEY)
    .flatMap((step) => step.fields
      .filter((field) => field.required && !LIVE_EXEMPT_FIELDS.has(field.name))
      .map((field) => field.name));
}

function isEmpty(value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

// `intake` mag een `_productKey` meegeven (provision() zet 'm vanuit
// order.product_key); zonder dat valt terug op 'emma-telefoon'.
export function missingForLive(intake) {
  const i = intake || {};
  const productKey = i._productKey || 'emma-telefoon';
  const required = requiredFieldNames(productKey);
  const missing = required.filter((name) => isEmpty(i[name]));
  if (i.agenda === 'Google Agenda' && !i.agendaGekoppeld) missing.push('agenda_koppeling');
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

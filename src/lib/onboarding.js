// Afgeleide onboarding-state (spec Plak B+C, docs/superpowers/specs/2026-07-22-selfserve-funnel-design.md).
// Pure functie — geen env/DB-calls. Combineert de order (met zijn opgeslagen
// intake_json) met een reeds-opgehaalde agenda-koppelstatus tot een klein
// weergave-object voor het klantportaal: welke verplichte velden ontbreken
// er nog, en hoe ver is de intake procentueel afgerond.
import { resolve } from './provisioners/index.js';
import { getIntakeSchema } from '../data/intake-schemas.ts';

function parseIntake(intakeJson) {
  try {
    return JSON.parse(intakeJson || '{}') || {};
  } catch {
    return {};
  }
}

function countRequiredFields(schema) {
  let count = 0;
  for (const step of schema.steps) {
    for (const field of step.fields) {
      if (field.required) count += 1;
    }
  }
  return count;
}

/**
 * @param {{product_key: string, intake_json?: string}} order
 * @param {boolean} agendaGekoppeld Of de klant al een Google Agenda-token heeft gekoppeld.
 * @returns {{productKey: string, missing: string[], progressPct: number, klaar: boolean}}
 */
export function onboardingState(order, agendaGekoppeld) {
  const productKey = order?.product_key;
  const provisioner = resolve(productKey);

  // Niet-provisionable product (bv. maatwerk/SEO): geen intake-gate van
  // toepassing — behandel als "klaar", zodat de UI geen eeuwige
  // voortgangsbalk toont voor iets wat hier niet automatisch geprovisioned wordt.
  if (!provisioner) {
    return { productKey, missing: [], progressPct: 100, klaar: true };
  }

  const intake = parseIntake(order?.intake_json);
  const intakeMetAgendaStatus = { ...intake, agendaGekoppeld };
  const missing = provisioner.missingForLive(intakeMetAgendaStatus, productKey);

  const schema = getIntakeSchema(productKey);
  const agendaVerplichtStelt = intake?.integraties?.agenda === 'Google Agenda';
  const totaalVerplicht = countRequiredFields(schema) + (agendaVerplichtStelt ? 1 : 0);

  const progressPct = totaalVerplicht > 0
    ? Math.round((100 * (totaalVerplicht - missing.length)) / totaalVerplicht)
    : 100;

  return { productKey, missing, progressPct, klaar: missing.length === 0 };
}

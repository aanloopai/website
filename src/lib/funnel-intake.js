// Vertaalt de platte self-serve wizard-antwoorden (SERVICE_QUESTIONS in
// start.astro) naar de geneste vorm die buildConfig() in elevenlabs.js
// verwacht (i.bedrijf, i.kennis, ...).
//
// Zonder deze vertaling schreef mintKlantEnOrder (voorstel-verify.js) de
// platte wizard-antwoorden ongewijzigd weg als service_orders.intake_json.
// buildConfig las daar overal lege objecten uit — de agent zei letterlijk
// "u spreekt met Emma van het bedrijf, openingstijden onbekend" — terwijl de
// ElevenLabs-call gewoon slaagde, dus activateOrder zette de order stil op
// 'actief'. Zie docs/superpowers/specs/2026-07-22-selfserve-funnel-design.md §5.
//
// Verzint nooit inhoud: een veld dat de wizard niet heeft gevraagd (of dat de
// klant leeg liet) ontbreekt gewoon in de output. buildConfig valt dan terug
// op zijn eigen "onbekend"/"vragen beantwoorden"-defaults — nooit een
// verzonnen waarde.

function trimmed(v) {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || null;
}

// productKey 'emma-telefoon' ← wizard-dienst 'voice-agent' (funnel-map.ts).
// SERVICE_QUESTIONS['voice-agent'] (start.astro) vraagt: huidige_lijn,
// call_volume, openingstoon, gemiste_gesprekken_week, gemiddelde_klantwaarde.
// Alleen 'openingstoon' heeft een natuurlijke plek in buildConfig (kennis.toon)
// — de rest is ROI-input voor het voorstel, geen agent-configuratie. De
// bedrijfsnaam komt niet uit de dienst-specifieke vragen maar uit de
// contactgegevens-stap (customer.company in worker.js/handleIntake).
function mapVoiceAgent(company, answers) {
  const bedrijfsnaam = trimmed(company);
  const toon = trimmed(answers?.openingstoon);
  const out = {};
  if (bedrijfsnaam) out.bedrijf = { bedrijfsnaam };
  if (toon) out.kennis = { toon };
  return out;
}

const MAPPERS = {
  'emma-telefoon': mapVoiceAgent,
};

/**
 * @param {string} productKey  Catalogus product_key (bv. 'emma-telefoon').
 * @param {{ company?: string, answers?: Record<string, unknown> }} [klant]
 * @returns {object} Geneste structuur voor buildConfig(), of `{}` wanneer er
 *   voor deze product_key nog geen mapping bestaat — provisionAgent gebruikt
 *   dan gewoon zijn eigen defaults, nooit een crash.
 */
export function buildProvisioningIntake(productKey, klant) {
  const mapper = MAPPERS[productKey];
  if (!mapper) return {};
  return mapper(klant?.company, klant?.answers || {});
}

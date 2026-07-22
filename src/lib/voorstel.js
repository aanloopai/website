// Bouwt de inhoud van een gepersonaliseerd voorstel.
//
// Harde scheiding: alle getallen (prijs, setup, ROI) komen uit de catalogus en
// uit roi.js. Het taalmodel krijgt die getallen als input en levert uitsluitend
// een kop en een lopende tekst. Faalt of ontbreekt het model, dan gebruiken we
// de statische copy uit funnel-map.ts — de funnel mag nooit omvallen omdat een
// externe API traag is.
import { berekenRoi } from './roi.js';
import { getFunnelEntry } from '../data/funnel-map.ts';
import { getCatalogTier } from '../data/portal-catalog.ts';
import { EMMA, GROEI } from '../data/pricing.ts';

const LLM_TIMEOUT_MS = 8000;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/** Setup-fee per tiernaam. Losstaand van portal-catalogus.setupCent — deze bron blijft hier apart. */
const SETUP_CENT_PER_TIER = {
  Starter: EMMA.setup * 100,
  Groei: GROEI.setup * 100,
};

export function prijsVoorEntry(entry) {
  const tier = getCatalogTier(entry.productKey, entry.tierNaam);
  if (!tier || !tier.prijsCent) throw new Error(`Geen betaalbare tier voor ${entry.productKey}/${entry.tierNaam}`);
  return { prijsCent: tier.prijsCent, setupCent: SETUP_CENT_PER_TIER[entry.tierNaam] || 0 };
}

function euro(cent) {
  return `€${(cent / 100).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function bouwPrompt({ entry, customer, roi, prijsCent, setupCent }) {
  const verlies = roi.modus === 'punt'
    ? `ongeveer ${euro(roi.verliesPerMaandCent)} per maand`
    : roi.modus === 'bereik'
      ? `tussen ${euro(roi.verliesLaagCent)} en ${euro(roi.verliesHoogCent)} per maand`
      : 'onbekend';
  return [
    'Je schrijft Nederlandse verkoopcopy voor Aanloop AI (AI-receptioniste Emma) voor het MKB.',
    'Regels: geen aantallen klanten claimen, geen garanties verzinnen, geen prijzen noemen die hier niet staan,',
    'geen uitroeptekens, zakelijk en concreet, maximaal 90 woorden in "tekst".',
    `Bedrijf: ${customer.company || 'onbekend'}. Contactpersoon: ${customer.name || 'onbekend'}.`,
    `Gemiste gesprekken per maand: ${roi.gemistPerMaand ?? 'onbekend'}. Geschat gemist omzetpotentieel: ${verlies}.`,
    `Aanbod: ${entry.productKey} (${entry.tierNaam}), ${euro(prijsCent)} per maand excl. btw, eenmalige inrichting ${euro(setupCent)} excl. btw.`,
    'Antwoord uitsluitend met JSON: {"kop": "...", "tekst": "..."}',
  ].join('\n');
}

/**
 * Roept het taalmodel aan. Gebruikt `llm` als die is meegegeven (test-injectie);
 * anders gaat de call naar Gemini met de sleutel uit env.
 * @param {{ GEMINI_API_KEY?: string }} env
 * @param {string} prompt
 * @param {(prompt: string) => Promise<string>} [llm]
 * @returns {Promise<string>}
 */
async function roepLlmAan(env, prompt, llm) {
  if (typeof llm === 'function') return llm(prompt);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const json = await res.json();
    return json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } finally {
    clearTimeout(timer);
  }
}

// Grens tussen "aantal" en "bedrag": een getal telt alleen als geldbedrag/percentage
// wanneer het direct (met alleen witruimte ertussen) een valuta- of percentage-marker
// draagt: een €-teken, het woord "euro"/"eur", een frequentie-suffix als
// "per maand"/"p/m"/"pm" (of het voorzetsel "voor maar" ervoor), de Nederlandse
// ",-"-notatie (bv. "497,-"), of "%"/"procent". Een getal zonder zo'n marker, of met
// andere woorden ertussen — bv. "22 gemiste gesprekken per maand", waar "per maand"
// niet direct op het getal volgt — is een gewoon aantal en blijft toegestaan. Dit
// voorkomt dat het model zelf een prijs of korting kan verzinnen die nergens tegen de
// catalogus/roi.js gecontroleerd is.
const BEDRAG_PATRONEN = [
  { label: 'euroteken', re: /€\s*\d[\d.,]*|\d[\d.,]*\s*€/i },
  { label: 'euro-woord', re: /\d[\d.,]*\s*(euro|eur)\b|\b(euro|eur)\s*\d[\d.,]*/i },
  { label: 'per-maand-bedrag', re: /\d[\d.,]*\s*(per\s*maand|p\/m|pm)\b|voor\s+maar\s+\d[\d.,]*/i },
  { label: 'nl-prijsnotatie', re: /\d[\d.,]*,-/ },
  { label: 'percentage', re: /\d[\d.,]*\s*%|\d[\d.,]*\s*procent\b/i },
];

/** @param {string} text @returns {string|null} label van het eerst gevonden patroon, of null. */
function vindBedrag(text) {
  for (const { label, re } of BEDRAG_PATRONEN) {
    if (re.test(text)) return label;
  }
  return null;
}

function parseCopy(raw) {
  if (!raw) return null;
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed;
  try { parsed = JSON.parse(match[0]); } catch { return null; }
  const kop = String(parsed?.kop || '').trim().slice(0, 120);
  const tekst = String(parsed?.tekst || '').trim().slice(0, 900);
  if (kop.length < 8 || tekst.length < 30) return null;
  const bedragInKop = vindBedrag(kop);
  const bedragInTekst = vindBedrag(tekst);
  if (bedragInKop || bedragInTekst) {
    const waar = bedragInKop ? `kop:${bedragInKop}` : `tekst:${bedragInTekst}`;
    console.error(`[voorstel] LLM-copy geweigerd: zelfverzonnen bedrag/percentage gedetecteerd (${waar}), statische copy gebruikt.`);
    return null;
  }
  return { kop, tekst };
}

/**
 * @param {{ GEMINI_API_KEY?: string }} env
 * @param {{ serviceId: string, customer: object, answers: object }} request
 * @param {{ llm?: (prompt: string) => Promise<string> }} [opts] Optionele injecteerbare LLM-call (tests).
 */
export async function buildVoorstelData(env, { serviceId, customer, answers }, { llm } = {}) {
  const entry = getFunnelEntry(serviceId);
  if (!entry) throw new Error(`Onbekende dienst: ${serviceId}`);
  if (!entry.sellable) throw new Error(`Dienst ${serviceId} is niet verkoopbaar`);

  const { prijsCent, setupCent } = prijsVoorEntry(entry);
  const roi = berekenRoi(answers || {});

  let copy = { kop: entry.fallbackKop, tekst: entry.fallbackTekst, bronnen: 'fallback' };
  if (typeof llm === 'function' || env?.GEMINI_API_KEY) {
    try {
      const raw = await roepLlmAan(env || {}, bouwPrompt({ entry, customer: customer || {}, roi, prijsCent, setupCent }), llm);
      const parsed = parseCopy(raw);
      if (parsed) copy = { ...parsed, bronnen: 'llm' };
    } catch (err) {
      console.error('[voorstel] LLM-framing mislukt, statische copy gebruikt:', err?.message || err);
    }
  }

  return { productKey: entry.productKey, tierNaam: entry.tierNaam, prijsCent, setupCent, roi, copy };
}

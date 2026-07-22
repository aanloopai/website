// Opslag en publieke uitlezing van voorstellen.
//
// Het token staat in een publieke URL en is dus een capability: 256 bit
// (randomToken), server-side vervaldatum, en de publieke leesfunctie geeft
// nooit PII terug. Een onbekend en een verlopen token leveren hetzelfde
// resultaat — de pagina mag niet verklappen of een token ooit bestond.
import { randomToken, randomId } from './auth.js';
import { buildVoorstelData } from './voorstel.js';
import { isSellable } from '../data/funnel-map.ts';

export const VOORSTEL_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * @param {{ PORTAL_DB: object }} env
 * @param {{ intakeId: string, serviceId: string, customer: object, answers: object }} request
 * @returns {Promise<{ id: string, token: string } | null>} null wanneer de dienst niet verkoopbaar is.
 */
export async function maakVoorstel(env, { intakeId, serviceId, customer, answers }) {
  if (!isSellable(serviceId)) return null;

  const data = await buildVoorstelData(env, { serviceId, customer, answers });
  const id = randomId('vst');
  const token = randomToken();
  const now = Date.now();

  await env.PORTAL_DB.prepare(
    'INSERT INTO voorstellen (id, token, intake_id, service_id, product_key, tier_naam, prijs_cent, setup_cent, roi_json, copy_json, status, expires_at, created_at) '
    + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)",
  ).bind(id, token, intakeId, serviceId, data.productKey, data.tierNaam,
    data.prijsCent, data.setupCent, JSON.stringify(data.roi), JSON.stringify(data.copy),
    now + VOORSTEL_TTL_MS, now).run();

  return { id, token };
}

function parse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

/**
 * Publieke projectie — bevat bewust geen e-mail, telefoon, naam of intake_id.
 * @param {{ PORTAL_DB: object }} env
 * @param {string} token
 * @returns {Promise<object | null>}
 */
export async function leesVoorstelViaToken(env, token) {
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await env.PORTAL_DB
    .prepare('SELECT service_id, product_key, tier_naam, prijs_cent, setup_cent, roi_json, copy_json, status, expires_at FROM voorstellen WHERE token = ?')
    .bind(token).first();
  if (!row) return null;
  if (Date.now() > row.expires_at) return null;
  return {
    serviceId: row.service_id,
    productKey: row.product_key,
    tierNaam: row.tier_naam,
    prijsCent: row.prijs_cent,
    setupCent: row.setup_cent,
    roi: parse(row.roi_json, {}),
    copy: parse(row.copy_json, {}),
    status: row.status,
  };
}

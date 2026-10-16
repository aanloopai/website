// Zoekeen-beheer vanuit het aanloopai-adminpaneel (/admin/zoekeen).
//
// Server-side proxy: /api/admin/zoekeen/<pad> → https://zoekeen.nl/api/ext/v1/<pad>.
// Contract: zoekeen docs/ext-admin-api.md. Het token (env.ZOEKEEN_ADMIN_TOKEN) gaat
// alleen van deze Worker naar zoekeen en komt nooit in de browser.
//
// Alleen aanroepen vanuit handleAdminApi() (admin-routes.js): die dwingt de
// staff-sessie en de origin-check voor mutaties af. Dit is GEEN open proxy —
// alleen de paden, methodes en query-parameters hieronder gaan door.
import { jsonResponse } from './google-auth.js';

export const ZOEKEEN_API = 'https://zoekeen.nl/api/ext/v1';
const PREFIX = '/api/admin/zoekeen/';
const UPSTREAM_TIMEOUT_MS = 15000;

// Zoekeen-ids zijn ULIDs (26 tekens Crockford base32).
const ID = '[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}';
const LEAD_ACTIONS = 'route|reject|spam|delete|resend';

// [methode, padpatroon, toegestane query-parameters]
const ROUTES = [
  ['GET', new RegExp('^leads$'), ['status', 'sector', 'q', 'offset']],
  ['GET', new RegExp(`^leads/${ID}$`), []],
  ['POST', new RegExp(`^leads/${ID}/(${LEAD_ACTIONS})$`), []],
  ['GET', new RegExp('^partners$'), []],
  ['GET', new RegExp('^settings$'), []],
  ['PUT', new RegExp('^settings/recipients$'), []],
  ['PUT', new RegExp('^settings/flags$'), []],
  ['GET', new RegExp('^stats$'), []],
];

function fout(message, status, code) {
  return jsonResponse({ ok: false, error: message, code }, status);
}

export async function zoekeenProxy(request, env) {
  const url = new URL(request.url);
  const sub = url.pathname.slice(PREFIX.length);
  const method = request.method;

  const pathMatches = ROUTES.filter(([, re]) => re.test(sub));
  if (!pathMatches.length) return fout('Niet gevonden', 404, 'not_found');
  const route = pathMatches.find(([m]) => m === method);
  if (!route) return fout('Methode niet toegestaan', 405, 'method_not_allowed');

  if (!env.ZOEKEEN_ADMIN_TOKEN) return fout('Zoekeen-koppeling niet geconfigureerd', 503, 'not_configured');

  const target = new URL(`${ZOEKEEN_API}/${sub}`);
  for (const key of route[2]) {
    const v = url.searchParams.get(key);
    if (v !== null && v !== '') target.searchParams.set(key, v.slice(0, 200));
  }

  const headers = { authorization: `Bearer ${env.ZOEKEEN_ADMIN_TOKEN}`, accept: 'application/json' };
  let body;
  if (method !== 'GET') {
    const raw = await request.text();
    if (raw) {
      let parsed;
      try { parsed = JSON.parse(raw); } catch { return fout('Ongeldige JSON', 400, 'invalid'); }
      body = JSON.stringify(parsed);
      headers['content-type'] = 'application/json';
    }
  }

  let upstream;
  try {
    upstream = await fetch(target.toString(), {
      method, headers, body, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    console.error('[admin] zoekeen fetch failed:', err?.message || err);
    return fout('Zoekeen onbereikbaar', 502, 'upstream_unreachable');
  }

  const j = await upstream.json().catch(() => null);
  if (!j || typeof j.ok !== 'boolean') {
    return fout(`Zoekeen gaf een ongeldig antwoord (${upstream.status})`, 502, 'upstream_invalid');
  }
  if (upstream.ok && j.ok) return jsonResponse({ ok: true, data: j.data });

  const code = j.error?.code || 'upstream_error';
  const message = j.error?.message || `Zoekeen-fout (${upstream.status})`;
  // 401/403 van zoekeen = token klopt niet. Nooit als 401/403 doorgeven: de
  // admin-UI stuurt die naar het inlogscherm, terwijl de sessie prima is.
  if (upstream.status === 401 || upstream.status === 403) {
    return fout('Zoekeen weigert het token — controleer ZOEKEEN_ADMIN_TOKEN (moet gelijk zijn aan ZOEKEEN_ADMIN_API_TOKEN op zoekeen)', 502, code);
  }
  if (code === 'ext_disabled') {
    return fout('Zoekeen-koppeling staat uit aan de zoekeen-kant (ZOEKEEN_ADMIN_API_TOKEN ontbreekt daar)', 503, code);
  }
  const status = upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502;
  return fout(message, status, code);
}

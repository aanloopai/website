// Per-tenant Google-agenda OAuth (Task 11) — initiate + callback.
// Wired into src/lib/portal-routes.js's handlePortalApi dispatcher, so both
// routes already run behind the existing session gate (no session → 401,
// same jsonResponse/errorResponse shape as the rest of that dispatcher).
//
// Tokens are stored via the KV shape getAccessToken() (google-auth.js)
// expects — {access_token, refresh_token, expires_at} — under the per-klant
// key `oauth:google:cust:<customerId>`, so getAccessToken(env,
// `oauth:google:cust:<id>`) can refresh/read them unchanged.
import { errorResponse } from './google-auth.js';

const SITE = 'https://aanloopai.nl';
const CALLBACK_PATH = '/api/portal/onboarding/agenda/callback';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AGENDA_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

const encoder = new TextEncoder();

function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
  if (typeof hex !== 'string' || !/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function b64urlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}
async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  );
}

// Signed state token: base64url(`${customerId}.${orderId}`) + '.' + hex(HMAC).
// Same construction as createSession/verifySession (src/lib/auth.js) and
// signConsentToken/verifyConsentToken (src/worker.js) — a WebCrypto HMAC
// sign/verify pair, which is constant-time by construction (no manual
// timing-safe compare needed). customerId/orderId are randomId()-shaped
// (`<prefix>_<hex>`, see auth.js) and never contain a literal '.', so the
// payload.split('.') below is unambiguous.
export async function buildAgendaState(secret, customerId, orderId) {
  const payload = `${customerId}.${orderId}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return `${b64urlEncode(payload)}.${bytesToHex(sig)}`;
}

// Verify + decode a state token. Returns { customerId, orderId } or null on
// ANY mismatch/malformed input (bad signature, tampered payload, wrong shape).
export async function verifyAgendaState(secret, state) {
  if (!state || typeof state !== 'string' || !state.includes('.')) return null;
  const dot = state.indexOf('.');
  const body = state.slice(0, dot);
  const sigHex = state.slice(dot + 1);
  if (!body || !sigHex || !/^[0-9a-f]+$/.test(sigHex) || sigHex.length % 2 !== 0) return null;
  const sigBytes = hexToBytes(sigHex);
  if (!sigBytes) return null;

  let payload;
  try { payload = b64urlDecode(body); } catch { return null; }

  const key = await hmacKey(secret);
  // crypto.subtle.verify is constant-time — no manual timing-safe compare needed.
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload));
  if (!valid) return null;

  const parts = payload.split('.');
  if (parts.length !== 2) return null;
  const [customerId, orderId] = parts;
  if (!customerId || !orderId) return null;
  return { customerId, orderId };
}

// GET /api/portal/onboarding/agenda/initiate?order=<id>
// Called from handlePortalApi, which has already resolved+required a session
// user (401 if missing) before dispatching here — see portal-routes.js.
export async function handleAgendaInitiate(env, user, url) {
  const orderId = (url.searchParams.get('order') || '').toString();
  if (!orderId) return errorResponse('Aanvraag-id ontbreekt', 400);

  // Ownership check — identical id=? AND customer_id=? pattern as getOrder/
  // getOnboarding in portal-routes.js: an unknown or another customer's order
  // gives the exact same 404, no enumeration.
  const order = await env.PORTAL_DB
    .prepare('SELECT id FROM service_orders WHERE id = ? AND customer_id = ?')
    .bind(orderId, user.customer_id).first();
  if (!order) return errorResponse('Aanvraag niet gevonden', 404);

  if (!env.GOOGLE_CLIENT_ID || !env.PORTAL_SESSION_SECRET) {
    return errorResponse('Agenda-koppeling is nog niet geconfigureerd', 503);
  }

  const state = await buildAgendaState(env.PORTAL_SESSION_SECRET, user.customer_id, order.id);
  const redirect = new URL(GOOGLE_AUTH_URL);
  redirect.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  redirect.searchParams.set('redirect_uri', `${SITE}${CALLBACK_PATH}`);
  redirect.searchParams.set('response_type', 'code');
  redirect.searchParams.set('scope', AGENDA_SCOPE);
  redirect.searchParams.set('access_type', 'offline');
  redirect.searchParams.set('prompt', 'consent');
  redirect.searchParams.set('state', state);
  return Response.redirect(redirect.toString(), 302);
}

// GET /api/portal/onboarding/agenda/callback?code=&state=
// Also reached only with a resolved session user (handlePortalApi's gate).
// IDOR/CSRF-critical: the state HMAC alone proves the (customerId, orderId)
// pair was issued by us, but NOT that the browser completing the callback is
// the same one that started it — an attacker could still trick a victim into
// visiting a callback URL carrying the ATTACKER's state. The session-match
// check below is what actually stops that: only the customer the state was
// issued for may complete it.
export async function handleAgendaCallback(env, user, url) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  if (oauthError) return errorResponse(`Google-koppeling geweigerd: ${oauthError}`, 400);
  if (!code || !state) return errorResponse('Ongeldige callback', 400);
  if (!env.PORTAL_SESSION_SECRET) return errorResponse('Agenda-koppeling is nog niet geconfigureerd', 503);

  const verified = await verifyAgendaState(env.PORTAL_SESSION_SECRET, state);
  if (!verified) return errorResponse('Ongeldige of verlopen state', 400);

  // Voorkomt dat iemand andermans callback voltooit: de ingelogde klant moet
  // exact de klant zijn voor wie deze state is uitgegeven.
  if (verified.customerId !== user.customer_id) return errorResponse('Niet toegestaan', 403);

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return errorResponse('Agenda-koppeling is nog niet geconfigureerd', 503);
  }
  if (!env.GOOGLE_TOKENS) return errorResponse('KV namespace GOOGLE_TOKENS niet gekoppeld', 500);

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${SITE}${CALLBACK_PATH}`,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    // Never forward Google's raw error body to the client or logs — log only
    // the HTTP status. Tokens/secrets must never be logged (task constraint).
    console.error(`[agenda-oauth] token exchange failed: HTTP ${tokenRes.status}`);
    return errorResponse('Kon Google-agenda niet koppelen', 502);
  }
  const tokens = await tokenRes.json();
  if (!tokens.refresh_token) {
    console.error('[agenda-oauth] geen refresh_token ontvangen — mogelijk al eerder gekoppeld');
    return errorResponse(
      'Kon Google-agenda niet koppelen. Herroep eerdere toegang bij myaccount.google.com/permissions en probeer opnieuw.',
      502,
    );
  }

  await env.GOOGLE_TOKENS.put(
    `oauth:google:cust:${verified.customerId}`,
    JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
    }),
  );

  // Tokens never go to the client — the only response is a redirect back into
  // the onboarding wizard.
  return Response.redirect(`${SITE}/portal/onboarding?order=${encodeURIComponent(verified.orderId)}`, 302);
}

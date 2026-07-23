// Per-tenant Google-agenda OAuth (Task 11) — initiate + callback.
// Wired into src/lib/portal-routes.js's handlePortalApi dispatcher.
// `initiate` runs behind the existing session gate (no session → 401) plus an
// order-ownership check. `callback` is dispatched BEFORE that gate — see the
// comment on handleAgendaCallback below for why (SameSite=Strict cookie is
// never sent on the cross-site redirect Google issues back to us).
//
// Tokens are stored via the KV shape getAccessToken() (google-auth.js)
// expects — {access_token, refresh_token, expires_at} — under the per-klant
// key `oauth:google:cust:<customerId>`, so getAccessToken(env,
// `oauth:google:cust:<id>`) can refresh/read them unchanged.
//
// Security hardening (HIGH finding, opus security-review): a state-HMAC
// alone is valid forever and isn't bound to the browser that requested it —
// a leaked state (browser history / shared device / logs) could otherwise be
// replayed by an attacker to bind their OWN Google-consent to the victim's
// customer_id. Fixed with two independent layers:
//   1. State TTL (15 min) + a domain-separation prefix, so a state token can
//      never be confused with another HMAC-signed token type in this codebase
//      (session tokens, consent tokens, ...) even if secrets were ever shared.
//   2. Browser-binding: initiate mints a random nonce, sets it as a separate
//      SameSite=Lax cookie scoped to the callback path, and embeds a HASH of
//      it in the state (see MEDIUM follow-up below for why the raw nonce
//      never goes in the state). SameSite=Lax (unlike Strict) IS sent on
//      Google's top-level cross-site redirect back to us, so the callback
//      can require sha256(cookie's raw nonce) to match the state's
//      nonceHash — proving this request came from the same browser that
//      started the flow. A leaked/replayed state without the matching
//      cookie is now rejected.
//
// MEDIUM follow-up (opus security-re-review): the raw nonce must never
// appear in the state payload. base64url is an ENCODING, not encryption —
// anyone who observes a leaked state (the same threat model as above) can
// decode the payload and read the nonce in plaintext, then simply set
// `agenda_oauth_bind=<nonce>` on their OWN request (HttpOnly only stops
// script access on the victim's browser, it does nothing to stop an
// attacker from setting that same cookie name/value themselves). That would
// make the "browser-binding" check above pass trivially, defeating layer 2
// entirely. Fixed by storing only sha256(nonce) in the state — the raw
// nonce lives EXCLUSIVELY in the Set-Cookie response, which a state-leak
// alone never exposes. The callback then re-hashes the cookie's raw nonce
// and compares against the state's hash.
import { errorResponse } from './google-auth.js';
import { randomId, readCookie, sha256Hex } from './auth.js';

const SITE = 'https://aanloopai.nl';
const CALLBACK_PATH = '/api/portal/onboarding/agenda/callback';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AGENDA_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const BIND_COOKIE = 'agenda_oauth_bind';

// Domain-separation prefix for the state payload — see header comment.
const STATE_PREFIX = 'agenda-state:v1|';
const STATE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const STATE_CLOCK_SKEW_MS = 60 * 1000; // tolerate up to 60s of clock skew

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

// Constant-time compare — same approach as mollie.js's / mcp.js's local
// constantTimeEqual (no WebCrypto timingSafeEqual in Workers); kept local so
// agenda-oauth.js stays self-contained rather than importing the
// non-exported helper from another module.
function constantTimeEqual(a, b) {
  const aBytes = encoder.encode(a || '');
  const bBytes = encoder.encode(b || '');
  const len = Math.max(aBytes.length, bBytes.length, 1);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] || 0) ^ (bBytes[i] || 0);
  }
  return diff === 0;
}

// Signed state token: base64url(`agenda-state:v1|${customerId}.${orderId}.${nonceHash}.${ts}`)
// + '.' + hex(HMAC). Same outer construction as createSession/verifySession
// (src/lib/auth.js) and signConsentToken/verifyConsentToken (src/worker.js) —
// a WebCrypto HMAC sign/verify pair, which is constant-time by construction
// (no manual timing-safe compare needed for the signature itself).
// customerId/orderId are randomId()-shaped (`<prefix>_<hex>`, see auth.js)
// and nonceHash is sha256Hex() output (`[0-9a-f]{64}`) — none ever contain a
// literal '.', so payload.split('.') is unambiguous given the fixed 4-field
// guard in verifyAgendaState below. The caller passes sha256(nonce), never
// the raw nonce — see the MEDIUM-fix header comment above.
export async function buildAgendaState(secret, customerId, orderId, nonceHash) {
  const payload = `${STATE_PREFIX}${customerId}.${orderId}.${nonceHash}.${Date.now()}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return `${b64urlEncode(payload)}.${bytesToHex(sig)}`;
}

// Verify + decode a state token. Returns { customerId, orderId, nonceHash }
// or null on ANY mismatch/malformed input (bad signature, tampered payload,
// wrong shape, wrong/missing domain prefix, expired, or timestamp in the
// future beyond tolerated clock skew).
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

  if (!payload.startsWith(STATE_PREFIX)) return null;
  const rest = payload.slice(STATE_PREFIX.length);
  const parts = rest.split('.');
  if (parts.length !== 4) return null;
  const [customerId, orderId, nonceHash, tsRaw] = parts;
  if (!customerId || !orderId || !nonceHash || !tsRaw) return null;

  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) return null;
  const now = Date.now();
  if (now - ts > STATE_TTL_MS) return null; // expired
  if (ts > now + STATE_CLOCK_SKEW_MS) return null; // implausibly-future timestamp

  return { customerId, orderId, nonceHash };
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

  // Browser-binding nonce — the RAW nonce goes ONLY into the Set-Cookie
  // below (never into the state); the state carries sha256(nonce) instead.
  // See header comment for why this defeats leaked-state replay.
  const nonce = randomId('agn');
  const nonceHash = await sha256Hex(nonce);
  const state = await buildAgendaState(env.PORTAL_SESSION_SECRET, user.customer_id, order.id, nonceHash);
  const redirect = new URL(GOOGLE_AUTH_URL);
  redirect.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  redirect.searchParams.set('redirect_uri', `${SITE}${CALLBACK_PATH}`);
  redirect.searchParams.set('response_type', 'code');
  redirect.searchParams.set('scope', AGENDA_SCOPE);
  redirect.searchParams.set('access_type', 'offline');
  redirect.searchParams.set('prompt', 'consent');
  redirect.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirect.toString(),
      // SameSite=Lax (not Strict): DOES get sent on Google's top-level
      // cross-site GET redirect back to CALLBACK_PATH, unlike Strict.
      'Set-Cookie': `${BIND_COOKIE}=${nonce}; Path=${CALLBACK_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=900`,
    },
  });
}

// GET /api/portal/onboarding/agenda/callback?code=&state=
// UNAUTHENTICATED by design — reached via a cross-site 302 redirect FROM
// accounts.google.com, so the portal session cookie (SameSite=Strict, see
// auth.js's sessionCookie) is never attached by the browser on this request:
// SameSite=Strict cookies are withheld on cross-site top-level navigations,
// which is exactly what this redirect is. There is no session to check here,
// by construction — not a bug to route around. Authorization instead rests
// on TWO checks that must both pass: (1) the state HMAC verifies AND hasn't
// expired (proves the (customerId, orderId) pair was minted by a session-
// gated, order-ownership-checked initiate call within the last 15 minutes),
// and (2) the agenda_oauth_bind cookie (SameSite=Lax, so it DOES survive this
// cross-site redirect), once hashed, matches the nonceHash embedded in that
// state (proves this request comes from the same browser that started the
// flow, defeating replay of a leaked state by a different browser/attacker —
// the state alone only reveals the hash, never the raw cookie value).
// customerId/orderId used below come exclusively from the verified state,
// never from a session.
export async function handleAgendaCallback(env, url, request) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  if (oauthError) {
    // LOW fix: never reflect the error param back into the response — log
    // server-side only, return a fixed message.
    console.error('[agenda-oauth] Google-consent geweigerd of mislukt');
    return errorResponse('Google-agenda koppelen is niet gelukt', 400);
  }
  if (!code || !state) return errorResponse('Ongeldige callback', 400);
  if (!env.PORTAL_SESSION_SECRET) return errorResponse('Agenda-koppeling is nog niet geconfigureerd', 503);

  const verified = await verifyAgendaState(env.PORTAL_SESSION_SECRET, state);
  if (!verified) return errorResponse('Ongeldige of verlopen state', 400);

  // Browser-binding check — must happen before any token-exchange. See
  // header + handler comment. The cookie carries the RAW nonce; the state
  // carries only its hash, so we re-hash the cookie value before comparing —
  // a leaked state alone (which only reveals the hash) is not enough to
  // forge a matching cookie.
  const boundNonce = readCookie(request, BIND_COOKIE);
  if (!boundNonce) return errorResponse('Ongeldige of verlopen state', 400);
  const boundHash = await sha256Hex(boundNonce);
  if (!constantTimeEqual(boundHash, verified.nonceHash)) {
    return errorResponse('Ongeldige of verlopen state', 400);
  }

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
  if (!Number.isFinite(tokens.expires_in)) {
    console.error('[agenda-oauth] token-response mist geldige expires_in');
    return errorResponse('Kon Google-agenda niet koppelen', 502);
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

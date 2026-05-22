// Passwordless magic-link auth helpers for the customer portal (schema v2).
// Sessions are stateless: an HMAC-SHA256-signed token in an HttpOnly cookie,
// keyed to a user id. No password is ever stored. Magic-link / invite tokens
// are stored hashed in D1.

const encoder = new TextEncoder();

export const SESSION_COOKIE = 'aanloop_portal_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;     // 7 days
export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;    // 15 minutes
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// SHA-256 hex — magic-link / invite tokens are stored hashed, never raw.
export async function sha256Hex(input) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return bytesToHex(digest);
}

// Cryptographically-random URL-safe token (32 bytes → 64 hex chars).
export function randomToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

// Short random id with a typed prefix, e.g. randomId('usr') → 'usr_a1b2c3d4e5f6'.
export function randomId(prefix) {
  return `${prefix}_${bytesToHex(crypto.getRandomValues(new Uint8Array(6)))}`;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  );
}

function b64urlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

// Signed session token: base64url(payload).hex(hmac). Payload carries the user id.
export async function createSession(userId, secret) {
  const payload = JSON.stringify({ uid: userId, exp: Date.now() + SESSION_TTL_MS });
  const body = b64urlEncode(payload);
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return `${body}.${bytesToHex(sig)}`;
}

// Verify + decode a session token. Returns { uid } or null.
export async function verifySession(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sigHex] = parts;
  if (!body || !sigHex || !/^[0-9a-f]+$/.test(sigHex) || sigHex.length % 2 !== 0) return null;
  const key = await hmacKey(secret);
  const sigBytes = Uint8Array.from(sigHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  // crypto.subtle.verify is constant-time.
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body));
  if (!valid) return null;
  let payload;
  try { payload = JSON.parse(b64urlDecode(body)); } catch { return null; }
  if (!payload?.uid || !payload?.exp || Date.now() > payload.exp) return null;
  return { uid: payload.uid };
}

export function sessionCookie(token) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return null;
}

// Resolve the logged-in user from the session cookie. Returns the user row
// { id, customer_id, email, naam, role } or null. Used by portal + admin routes.
export async function getSessionUser(request, env) {
  if (!env.PORTAL_SESSION_SECRET || !env.PORTAL_DB) return null;
  const token = readCookie(request, SESSION_COOKIE);
  const session = await verifySession(token, env.PORTAL_SESSION_SECRET);
  if (!session) return null;
  return env.PORTAL_DB
    .prepare('SELECT id, customer_id, email, naam, role FROM users WHERE id = ?')
    .bind(session.uid).first();
}

// Shared OAuth token-refresh helper for Google Calendar API.
// Multi-tenant: tokens stored in KV under a caller-supplied key, e.g.
// 'oauth:google:admin' (default, single-tenant admin path) or
// 'oauth:google:cust:<customerId>' (per-klant agenda-koppeling, Task 11).

const ADMIN_KV_KEY = 'oauth:google:admin';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const EXPIRY_BUFFER_MS = 60_000;

export async function getAccessToken(env, kvKey = ADMIN_KV_KEY) {
  if (!env.GOOGLE_TOKENS) {
    throw new Error('KV namespace GOOGLE_TOKENS not bound. Configure in Cloudflare Worker settings.');
  }
  const stored = await env.GOOGLE_TOKENS.get(kvKey, 'json');
  if (!stored) {
    throw new Error('No admin tokens. Visit /api/google/initiate?key=<GOOGLE_OAUTH_INIT_KEY> to authorize.');
  }
  if (Date.now() < stored.expires_at - EXPIRY_BUFFER_MS) {
    return stored.access_token;
  }
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: stored.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) {
    // Never forward/log Google's raw error body — only the HTTP status.
    throw new Error(`Token refresh failed: HTTP ${r.status}`);
  }
  const fresh = await r.json();
  const updated = {
    ...stored,
    access_token: fresh.access_token,
    expires_at: Date.now() + fresh.expires_in * 1000,
  };
  await env.GOOGLE_TOKENS.put(kvKey, JSON.stringify(updated));
  return updated.access_token;
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ ok: false, error: message }, status);
}

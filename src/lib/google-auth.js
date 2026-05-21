// Shared OAuth token-refresh helper for Google Calendar API.
// Single-tenant: admin's tokens stored in KV under key 'oauth:google:admin'.

const KV_KEY = 'oauth:google:admin';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const EXPIRY_BUFFER_MS = 60_000;

export async function getAccessToken(env) {
  if (!env.GOOGLE_TOKENS) {
    throw new Error('KV namespace GOOGLE_TOKENS not bound. Configure in Cloudflare Worker settings.');
  }
  const stored = await env.GOOGLE_TOKENS.get(KV_KEY, 'json');
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
    const txt = await r.text();
    throw new Error(`Token refresh failed: ${r.status} ${txt}`);
  }
  const fresh = await r.json();
  const updated = {
    ...stored,
    access_token: fresh.access_token,
    expires_at: Date.now() + fresh.expires_in * 1000,
  };
  await env.GOOGLE_TOKENS.put(KV_KEY, JSON.stringify(updated));
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

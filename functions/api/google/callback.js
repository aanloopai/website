// Step 2 of OAuth: receive code, exchange for tokens, store refresh_token in KV.
import { errorResponse } from '../_lib/google-auth.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const KV_KEY = 'oauth:google:admin';

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) return errorResponse(`OAuth declined: ${oauthError}`, 400);
  if (!code || !state) return errorResponse('Missing code or state', 400);

  const stateValid = await env.GOOGLE_TOKENS.get(`oauth:state:${state}`);
  if (!stateValid) return errorResponse('Invalid or expired state', 400);
  await env.GOOGLE_TOKENS.delete(`oauth:state:${state}`);

  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!r.ok) {
    const txt = await r.text();
    return errorResponse(`Token exchange failed: ${r.status} ${txt}`, 500);
  }
  const tokens = await r.json();
  if (!tokens.refresh_token) {
    return errorResponse(
      'No refresh_token returned. Revoke prior consent at myaccount.google.com/permissions for this app and retry.',
      500,
    );
  }
  await env.GOOGLE_TOKENS.put(
    KV_KEY,
    JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      scope: tokens.scope,
      created_at: Date.now(),
    }),
  );
  const html = `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>Aanloop AI Calendar gekoppeld</title></head>
<body style="font-family:system-ui,sans-serif;padding:2rem;max-width:640px;margin:0 auto;background:#0b1220;color:#e5e7eb">
  <h1 style="color:#60a5fa">Google Calendar gekoppeld</h1>
  <p>Refresh-token opgeslagen in Cloudflare KV. De boeking-API is nu actief.</p>
  <p style="margin-top:1.5rem"><a style="color:#93c5fd" href="/demo-inplannen/">Test de boekingspagina &rarr;</a></p>
  <p style="margin-top:2rem;color:#94a3b8;font-size:.875rem">Scope: ${tokens.scope}</p>
</body></html>`;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

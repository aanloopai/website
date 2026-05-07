// Step 1 of OAuth: redirect admin to Google consent screen.
// Use only by admin once. Protected by GOOGLE_OAUTH_INIT_KEY query param.

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
];

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const adminKey = url.searchParams.get('key');
  if (!env.GOOGLE_OAUTH_INIT_KEY || adminKey !== env.GOOGLE_OAUTH_INIT_KEY) {
    return new Response('Forbidden — admin key required', { status: 403 });
  }
  if (!env.GOOGLE_CLIENT_ID) {
    return new Response('Missing GOOGLE_CLIENT_ID env var', { status: 500 });
  }
  if (!env.GOOGLE_TOKENS) {
    return new Response('KV namespace GOOGLE_TOKENS not bound', { status: 500 });
  }
  const state = crypto.randomUUID();
  await env.GOOGLE_TOKENS.put(`oauth:state:${state}`, '1', { expirationTtl: 600 });
  const redirect = new URL(GOOGLE_AUTH_URL);
  redirect.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  redirect.searchParams.set('redirect_uri', `${url.origin}/api/google/callback`);
  redirect.searchParams.set('response_type', 'code');
  redirect.searchParams.set('scope', SCOPES.join(' '));
  redirect.searchParams.set('access_type', 'offline');
  redirect.searchParams.set('prompt', 'consent');
  redirect.searchParams.set('state', state);
  return Response.redirect(redirect.toString(), 302);
}

// Customer portal routes (C2) — wired into src/worker.js.
// Passwordless magic-link auth + read-only dashboard data from D1.
import { jsonResponse, errorResponse } from './google-auth.js';
import {
  SESSION_COOKIE, MAGIC_LINK_TTL_MS,
  sha256Hex, randomToken, createSession, verifySession,
  sessionCookie, clearCookie, readCookie,
} from './auth.js';

const SITE_ORIGIN = 'https://aanloopai.nl';
const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

// Same response whether or not the email exists — prevents account enumeration.
const GENERIC_REQUEST_OK = {
  ok: true,
  message: 'Als dit e-mailadres bij ons bekend is, ontvangt u binnen enkele minuten een inloglink.',
};

function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safeParse(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

// Best-effort KV rate-limiter. Reuses the GOOGLE_TOKENS KV namespace with a
// portal: prefix; if KV is unbound the limiter is skipped (fails open).
async function rateLimited(env, key, limit, windowSec) {
  if (!env.GOOGLE_TOKENS) return false;
  const kvKey = `portal:rl:${key}`;
  const current = parseInt((await env.GOOGLE_TOKENS.get(kvKey)) || '0', 10);
  if (current >= limit) return true;
  await env.GOOGLE_TOKENS.put(kvKey, String(current + 1), { expirationTtl: windowSec });
  return false;
}

async function sendMagicLinkEmail(apiKey, email, naam, link) {
  const firstName = (naam || '').split(' ')[0] || 'daar';
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
    <p>Hallo ${escapeHtml(firstName)},</p>
    <p>U vroeg een inloglink aan voor het Aanloop AI klantportaal. Klik op de knop hieronder om in te loggen:</p>
    <p style="margin:28px 0">
      <a href="${escapeHtml(link)}" style="display:inline-block;background:#4f46e5;color:#fff;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:600">Inloggen op het portaal</a>
    </p>
    <p style="font-size:13px;color:#64748b">Deze link is 15 minuten geldig en kan één keer gebruikt worden. Heeft u dit niet aangevraagd? Dan kunt u deze mail negeren.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
    <p style="font-size:12px;color:#64748b">Aanloop AI — aanloopai.nl — KvK 88606902</p>
  </body></html>`;
  const res = await fetch(BREVO_API, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Aanloop AI', email: 'hello@aanloopai.nl' },
      to: [{ email, name: naam || email }],
      subject: 'Uw inloglink voor het Aanloop AI klantportaal',
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Brevo magic-link HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

// POST /api/auth/request  { email }
export async function handleAuthRequest(request, env) {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
  if (!env.PORTAL_DB) return errorResponse('Klantportaal is nog niet geconfigureerd', 503);

  let body;
  try { body = await request.json(); } catch { return errorResponse('Ongeldige aanvraag', 400); }
  const email = (body?.email || '').toString().trim().toLowerCase();
  if (!isValidEmail(email)) return errorResponse('Ongeldig e-mailadres', 400);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (await rateLimited(env, `ip:${ip}`, 5, 600) ||
      await rateLimited(env, `email:${await sha256Hex(email)}`, 3, 600)) {
    return errorResponse('Te veel verzoeken. Probeer het over 10 minuten opnieuw.', 429);
  }

  const customer = await env.PORTAL_DB
    .prepare('SELECT id, naam FROM customers WHERE email = ?')
    .bind(email).first();

  // Only generate + send a link when the customer exists; response is identical either way.
  if (customer) {
    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const now = Date.now();
    await env.PORTAL_DB
      .prepare('INSERT INTO magic_links (token_hash, customer_id, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)')
      .bind(tokenHash, customer.id, now + MAGIC_LINK_TTL_MS, now).run();

    const link = `${SITE_ORIGIN}/api/auth/verify?token=${token}`;
    if (env.BREVO_API_KEY) {
      try {
        await sendMagicLinkEmail(env.BREVO_API_KEY, email, customer.naam, link);
      } catch (err) {
        console.error('[portal] magic-link email failed:', err.message || err);
      }
    }
  }
  return jsonResponse(GENERIC_REQUEST_OK);
}

// GET /api/auth/verify?token=...
export async function handleAuthVerify(request, env) {
  const url = new URL(request.url);
  const fail = () => Response.redirect(`${url.origin}/portal/login?error=link`, 302);
  if (!env.PORTAL_DB || !env.PORTAL_SESSION_SECRET) return fail();

  const token = url.searchParams.get('token') || '';
  if (!token) return fail();

  const tokenHash = await sha256Hex(token);
  const row = await env.PORTAL_DB
    .prepare('SELECT customer_id, expires_at, used FROM magic_links WHERE token_hash = ?')
    .bind(tokenHash).first();
  if (!row || row.used || Date.now() > row.expires_at) return fail();

  // Single-use: consume the token before issuing the session.
  await env.PORTAL_DB
    .prepare('UPDATE magic_links SET used = 1 WHERE token_hash = ?')
    .bind(tokenHash).run();

  const session = await createSession(row.customer_id, env.PORTAL_SESSION_SECRET);
  return new Response(null, {
    status: 302,
    headers: { Location: `${url.origin}/portal/`, 'Set-Cookie': sessionCookie(session) },
  });
}

// GET|POST /api/auth/logout
export async function handleAuthLogout(request, env) {
  const url = new URL(request.url);
  return new Response(null, {
    status: 302,
    headers: { Location: `${url.origin}/portal/login`, 'Set-Cookie': clearCookie() },
  });
}

// Resolve the authenticated customer from the session cookie, or null.
async function authenticate(request, env) {
  if (!env.PORTAL_SESSION_SECRET || !env.PORTAL_DB) return null;
  const token = readCookie(request, SESSION_COOKIE);
  const session = await verifySession(token, env.PORTAL_SESSION_SECRET);
  if (!session) return null;
  return env.PORTAL_DB
    .prepare('SELECT id, email, naam, bedrijf, plan, created_at FROM customers WHERE id = ?')
    .bind(session.cid).first();
}

// GET /api/portal/me
export async function handlePortalMe(request, env) {
  const customer = await authenticate(request, env);
  if (!customer) return errorResponse('Niet ingelogd', 401);
  return jsonResponse({ ok: true, customer });
}

// GET /api/portal/services
export async function handlePortalServices(request, env) {
  const customer = await authenticate(request, env);
  if (!customer) return errorResponse('Niet ingelogd', 401);
  const { results } = await env.PORTAL_DB
    .prepare('SELECT id, type, naam, status, details, created_at FROM services WHERE customer_id = ? ORDER BY created_at DESC')
    .bind(customer.id).all();
  const services = (results || []).map((s) => ({ ...s, details: safeParse(s.details) }));
  return jsonResponse({ ok: true, services });
}

// GET /api/portal/documents
export async function handlePortalDocuments(request, env) {
  const customer = await authenticate(request, env);
  if (!customer) return errorResponse('Niet ingelogd', 401);
  const { results } = await env.PORTAL_DB
    .prepare('SELECT id, titel, url, type, created_at FROM documents WHERE customer_id = ? ORDER BY created_at DESC')
    .bind(customer.id).all();
  return jsonResponse({ ok: true, documents: results || [] });
}

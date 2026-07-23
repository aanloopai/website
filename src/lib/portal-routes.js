// Customer portal routes (schema v2) — wired into src/worker.js.
// Passwordless magic-link auth + customer-facing dashboard / requests / team.
import { jsonResponse, errorResponse } from './google-auth.js';
import {
  MAGIC_LINK_TTL_MS, INVITE_TTL_MS,
  sha256Hex, randomToken, randomId, createSession,
  sessionCookie, clearCookie, getSessionUser,
} from './auth.js';
import { handleCheckoutStart, cancelSubscription } from './mollie.js';
import { getCatalogProduct, getCatalogTier } from '../data/portal-catalog.ts';
import { dealVoorOrder } from './crm.js';
import { escapeHtml } from './escape.js';
import { alertStaff } from './notify.js';
import { onboardingState } from './onboarding.js';
import { getIntakeSchema } from '../data/intake-schemas.ts';
import { activateOrder } from './activation.js';
import { handleAgendaInitiate, handleAgendaCallback } from './agenda-oauth.js';

const SITE_ORIGIN = 'https://aanloopai.nl';
const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
// Catalogusprijzen zijn EXCL. btw — zelfde omrekening als mollie.js's
// handleCheckoutStart, zodat een deal-waarde hier overeenkomt met wat er
// straks daadwerkelijk via Mollie in rekening wordt gebracht.
const BTW_RATE = 0.21;

// CSRF guard — defence in depth on top of SameSite=Strict. Fails CLOSED for
// mutating methods: a missing Origin header is treated the same as a wrong
// one and rejected. Same-origin fetch() always sends an Origin header on
// POST/PUT/PATCH/DELETE (per the Fetch spec), so this does not break any
// legitimate same-origin call from the portal frontend. GET is left
// permissive — it must not mutate state, so it is not this guard's concern.
// No server-to-server caller is expected to reach this guard: the Mollie
// webhook (the only server-to-server POST in this app) is wired directly to
// handleMollieWebhook in worker.js and never passes through checkOrigin.
function checkOrigin(request) {
  if (!MUTATING_METHODS.has(request.method)) return null;
  const origin = request.headers.get('Origin');
  if (origin !== SITE_ORIGIN) return errorResponse('Verboden (origin)', 403);
  return null;
}
const BREVO_API = 'https://api.brevo.com/v3/smtp/email';
const AANLOOP_EMAIL = 'hello@aanloopai.nl';

// ── helpers ────────────────────────────────────────────────────────────────
function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function safeParse(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}
// Customer-side write permission. kijker = read-only.
function canWrite(role) { return role === 'eigenaar' || role === 'bewerker'; }

function mailLayout(inner) {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">${inner}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
    <p style="font-size:12px;color:#64748b">Aanloop AI — aanloopai.nl — KvK 88606902</p>
  </body></html>`;
}
function mailButton(href, label) {
  return `<p style="margin:28px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#4f46e5;color:#fff;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:600">${escapeHtml(label)}</a></p>`;
}
export async function sendMail(env, to, toNaam, subject, innerHtml) {
  // Throws instead of no-opping: a missing key means the magic link never
  // arrives, and the caller must be able to tell the user that rather than
  // claim "check your inbox" for a mail that was never sent.
  if (!env.BREVO_API_KEY) throw new Error('BREVO_API_KEY niet geconfigureerd');
  const res = await fetch(BREVO_API, {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Aanloop AI', email: AANLOOP_EMAIL },
      to: [{ email: to, name: toNaam || to }],
      subject,
      htmlContent: mailLayout(innerHtml),
    }),
  });
  if (!res.ok) throw new Error(`Brevo HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
// Internal notification to the Aanloop team.
async function notifyAanloop(env, subject, lines) {
  try {
    await sendMail(env, AANLOOP_EMAIL, 'Aanloop AI', `[Portaal] ${subject}`,
      `<p>${escapeHtml(lines).replace(/\n/g, '<br>')}</p>`);
  } catch (err) {
    console.error('[portal] notifyAanloop failed:', err.message || err);
  }
}

// Best-effort KV rate-limiter (reuses GOOGLE_TOKENS KV, portal: prefix).
async function rateLimited(env, key, limit, windowSec) {
  if (!env.GOOGLE_TOKENS) return false;
  const kvKey = `portal:rl:${key}`;
  const current = parseInt((await env.GOOGLE_TOKENS.get(kvKey)) || '0', 10);
  if (current >= limit) return true;
  await env.GOOGLE_TOKENS.put(kvKey, String(current + 1), { expirationTtl: windowSec });
  return false;
}

// ── staff password-login helpers ────────────────────────────────────────────
// STAFF_PASSWORD_HASH format: "<salt-hex>:<derived-key-hex>", derived via
// PBKDF2-SHA256 / 100000 iterations / 256-bit output (same params used to
// verify below). Independent of the magic-link crypto in src/lib/auth.js —
// this is a local, self-contained helper set for the staff-only fallback.
const pwEncoder = new TextEncoder();

function bytesToHexLocal(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  if (typeof hex !== 'string' || !/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

// Constant-time string compare — no early return, always walks the full
// length once the length check passes, so timing does not leak which byte
// of the derived hash first mismatched.
function constantTimeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyStaffPassword(password, hashConfig) {
  const [saltHex, expectedHex] = (hashConfig || '').split(':');
  if (!saltHex || !expectedHex) return false;
  const saltBytes = hexToBytes(saltHex);
  if (!saltBytes) return false;
  const keyMaterial = await crypto.subtle.importKey('raw', pwEncoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256,
  );
  return constantTimeEqualHex(bytesToHexLocal(derivedBits), expectedHex.toLowerCase());
}

// ── auth: magic-link request / verify / logout ──────────────────────────────
export async function handleAuthRequest(request, env) {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
  if (!env.PORTAL_DB) return errorResponse('Klantportaal is nog niet geconfigureerd', 503);

  let body;
  try { body = await request.json(); } catch { return errorResponse('Ongeldige aanvraag', 400); }
  const email = (body?.email || '').toString().trim().toLowerCase();
  if (!isValidEmail(email)) return errorResponse('Ongeldig e-mailadres', 400);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (await rateLimited(env, `ip:${ip}`, 6, 600) ||
      await rateLimited(env, `email:${await sha256Hex(email)}`, 3, 600)) {
    return errorResponse('Te veel verzoeken. Probeer het over 10 minuten opnieuw.', 429);
  }

  const user = await env.PORTAL_DB
    .prepare('SELECT id, naam FROM users WHERE email = ?')
    .bind(email).first();

  // Identical response whether or not the account exists (no enumeration).
  if (user) {
    const token = randomToken();
    const now = Date.now();
    await env.PORTAL_DB
      .prepare('INSERT INTO magic_links (token_hash, user_id, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)')
      .bind(await sha256Hex(token), user.id, now + MAGIC_LINK_TTL_MS, now).run();
    try {
      await sendMail(env, email, user.naam, 'Uw inloglink voor het Aanloop AI klantportaal',
        `<p>Hallo ${escapeHtml((user.naam || '').split(' ')[0] || 'daar')},</p>
         <p>Klik op de knop hieronder om in te loggen op het Aanloop AI portaal:</p>
         ${mailButton(`${SITE_ORIGIN}/portal/verify?token=${token}`, 'Inloggen op het portaal')}
         <p style="font-size:13px;color:#64748b">Deze link is 15 minuten geldig en kan één keer gebruikt worden. Niet aangevraagd? Negeer deze mail.</p>`);
    } catch (err) {
      // This used to be logged and then answered with "check your inbox" — the
      // customer waited for a mail that was never sent, and no one was told the
      // portal login was down. Say it out loud instead, and page staff.
      //
      // Enumeration trade-off: during a mail outage a known address gets 502
      // while an unknown one gets 200, which leaks existence *for the duration
      // of the outage*. A login that silently never arrives is the worse
      // failure, and the alert below is what makes that window short.
      const message = err.message || String(err);
      console.error('[portal] magic-link email failed:', message);
      await alertStaff(env, 'Inloglink kon niet worden verstuurd',
        `Klant ${email} vroeg een magic link aan, maar de mail is mislukt: ${message}\n\n`
        + 'Zolang dit niet is opgelost kan geen enkele klant inloggen op het portaal.');
      return errorResponse('We konden de inloglink nu niet versturen. Probeer het over enkele minuten opnieuw of mail hello@aanloopai.nl.', 502);
    }
  }
  return jsonResponse({
    ok: true,
    message: 'Als dit e-mailadres bij ons bekend is, ontvangt u binnen enkele minuten een inloglink.',
  });
}

// STAFF-ONLY password login. Customer accounts (role !== 'staff') can NEVER
// authenticate here — magic-link (handleAuthRequest above) remains their only
// path. This is a fallback for the Aanloop team so staff login does not
// depend on Brevo mail delivery. Every failure path (unknown email, wrong
// role, wrong password) returns the SAME generic 401 message — no account
// enumeration, no signal about which check failed.
export async function handleAuthPasswordLogin(request, env) {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
  // Same CSRF guard as every other session-minting POST (verify, invite-accept).
  // Was the one mutating auth route without it.
  const originErr = checkOrigin(request);
  if (originErr) return originErr;
  if (!env.PORTAL_DB || !env.PORTAL_SESSION_SECRET) return errorResponse('Klantportaal is nog niet geconfigureerd', 503);
  if (!env.STAFF_PASSWORD_HASH) return errorResponse('Wachtwoord-login niet geconfigureerd', 503);

  let body;
  try { body = await request.json(); } catch { return errorResponse('Ongeldige aanvraag', 400); }
  const email = (body?.email || '').toString().trim().toLowerCase();
  const password = (body?.password || '').toString();
  if (!isValidEmail(email)) return errorResponse('Ongeldig e-mailadres', 400);
  if (!password) return errorResponse('Ongeldige inloggegevens', 401);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (await rateLimited(env, `pwip:${ip}`, 6, 600) ||
      await rateLimited(env, `pwemail:${await sha256Hex(email)}`, 5, 600)) {
    return errorResponse('Te veel verzoeken. Probeer het over 10 minuten opnieuw.', 429);
  }

  const user = await env.PORTAL_DB
    .prepare('SELECT id, naam, role FROM users WHERE email = ?')
    .bind(email).first();
  // Same generic response whether the account does not exist, belongs to a
  // customer (non-staff), or the password is wrong — checked below.
  if (!user || user.role !== 'staff') return errorResponse('Ongeldige inloggegevens', 401);

  const valid = await verifyStaffPassword(password, env.STAFF_PASSWORD_HASH);
  if (!valid) return errorResponse('Ongeldige inloggegevens', 401);

  // Session-mint identical to handleAuthVerify's success path below
  // (this file, ~L269-277: last_login update, createSession, Set-Cookie via
  // sessionCookie() with the same HttpOnly/Secure/SameSite/Max-Age/Path).
  await env.PORTAL_DB.prepare('UPDATE users SET last_login = ? WHERE id = ?').bind(Date.now(), user.id).run();
  const session = await createSession(user.id, env.PORTAL_SESSION_SECRET);
  return new Response(JSON.stringify({ ok: true, redirect: '/admin/' }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'Set-Cookie': sessionCookie(session) },
  });
}

// POST-only token consumption (new flow: e-mail link → /portal/verify page →
// same-origin form-POST). POST keeps the raw token out of server access
// logs, browser history, and Referer headers — and stops e-mail security
// scanners from silently burning the single-use token by pre-fetching.
//
// GET is accepted only as a redirect shim to the /portal/verify interstitial
// (legacy direct-link e-mails may still point at this endpoint). It must
// NEVER consume the token or mint a session cookie: because this handler
// SETS a fresh cookie, SameSite=Strict does not protect a GET that mints —
// an attacker could otherwise plant <img src="/api/auth/verify?token=X">
// to silently log a victim into the attacker's account (login-CSRF /
// session fixation). Routing GET through the interstitial page means the
// actual consumption only ever happens via same-origin POST, which is
// covered by the checkOrigin() guard below.
export async function handleAuthVerify(request, env) {
  const url = new URL(request.url);
  const isPost = request.method === 'POST';
  const failRedirect = () => Response.redirect(`${url.origin}/portal/login?error=link`, 302);
  const failJson = () => errorResponse('Ongeldige of verlopen link', 400);
  const fail = () => (isPost ? failJson() : failRedirect());
  if (!env.PORTAL_DB || !env.PORTAL_SESSION_SECRET) return fail();

  if (!isPost) {
    const token = url.searchParams.get('token') || '';
    if (!token) return fail();
    return Response.redirect(`${url.origin}/portal/verify?token=${encodeURIComponent(token)}`, 302);
  }

  // CSRF / origin guard — must run before any token consumption or cookie mint.
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  let token = '';
  try {
    const form = await request.formData();
    token = (form.get('token') || '').toString();
  } catch { return fail(); }
  if (!token) return fail();

  const tokenHash = await sha256Hex(token);
  const row = await env.PORTAL_DB
    .prepare('SELECT user_id, expires_at, used FROM magic_links WHERE token_hash = ?')
    .bind(tokenHash).first();
  if (!row || row.used || Date.now() > row.expires_at) return fail();

  // Atomic single-use claim (compare-and-swap) — a raced double-POST of the
  // same token must not both pass the pre-check above and mint two sessions.
  const claim = await env.PORTAL_DB
    .prepare('UPDATE magic_links SET used = 1 WHERE token_hash = ? AND used = 0')
    .bind(tokenHash).run();
  if (claim.meta?.changes !== 1) return fail();

  await env.PORTAL_DB.prepare('UPDATE users SET last_login = ? WHERE id = ?').bind(Date.now(), row.user_id).run();

  const user = await env.PORTAL_DB.prepare('SELECT role FROM users WHERE id = ?').bind(row.user_id).first();
  const dest = user?.role === 'staff' ? '/admin/' : '/portal/';
  const session = await createSession(row.user_id, env.PORTAL_SESSION_SECRET);
  return new Response(JSON.stringify({ ok: true, redirect: dest }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'Set-Cookie': sessionCookie(session) },
  });
}

export async function handleAuthLogout(request, env) {
  // A bare GET force-logout link is a (low-severity) CSRF vector — require
  // POST so a third-party page cannot silently clear a visitor's session.
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
  const url = new URL(request.url);
  return new Response(null, {
    status: 302,
    headers: { Location: `${url.origin}/portal/login`, 'Set-Cookie': clearCookie() },
  });
}

// Minimal same-origin self-submitting form — used to convert the unsafe GET
// entry point into a same-origin POST navigation. There is no dedicated
// Astro interstitial page for invite-accept (unlike /portal/verify for the
// magic-link flow), so this inline page fills that role. Token is hex
// (sha256Hex / randomToken output) but is still escaped defensively before
// being placed in an HTML attribute.
function inviteAcceptForm(url, token) {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:420px;margin:80px auto;padding:24px;text-align:center;color:#0f172a">
    <p>Uitnodiging accepteren…</p>
    <form id="f" method="POST" action="${escapeHtml(url.pathname)}">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <noscript><button type="submit">Doorgaan</button></noscript>
    </form>
    <script>document.getElementById('f').submit();</script>
  </body></html>`;
}

// ── team-invite accept ──────────────────────────────────────────────────────
// POST-only token consumption — mirrors handleAuthVerify's login-CSRF fix.
// This handler also mints a session cookie, so GET must never consume the
// invite token; it only serves a same-origin auto-submitting form that
// re-POSTs the token, which is then covered by the checkOrigin() guard.
export async function handleInviteAccept(request, env) {
  const url = new URL(request.url);
  const isPost = request.method === 'POST';
  const fail = (e) => Response.redirect(`${url.origin}/portal/login?error=${e}`, 302);
  if (!env.PORTAL_DB || !env.PORTAL_SESSION_SECRET) return fail('invite');

  if (!isPost) {
    const token = url.searchParams.get('token') || '';
    if (!token) return fail('invite');
    return new Response(inviteAcceptForm(url, token), {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  // CSRF / origin guard — must run before any token consumption or cookie mint.
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  let token = '';
  try {
    const form = await request.formData();
    token = (form.get('token') || '').toString();
  } catch { return fail('invite'); }
  if (!token) return fail('invite');

  const tokenHash = await sha256Hex(token);
  const invite = await env.PORTAL_DB
    .prepare('SELECT id, customer_id, email, role, expires_at, accepted FROM team_invites WHERE token_hash = ?')
    .bind(tokenHash).first();
  if (!invite || invite.accepted || Date.now() > invite.expires_at) return fail('invite');
  // Re-validate role enum on accept — a corrupted/malicious team_invites row
  // must never be able to inject 'staff' or other unexpected roles.
  if (!['eigenaar', 'bewerker', 'kijker'].includes(invite.role)) return fail('invite');

  const email = invite.email.toLowerCase();
  const existing = await env.PORTAL_DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return fail('bestaat'); // email already has an account

  // Atomic single-use claim (compare-and-swap) — claim the invite before
  // granting its effect, so a raced double-POST cannot create two accounts
  // (or one account plus an orphaned insert) off one invite.
  const claim = await env.PORTAL_DB
    .prepare('UPDATE team_invites SET accepted = 1 WHERE id = ? AND accepted = 0')
    .bind(invite.id).run();
  if (claim.meta?.changes !== 1) return fail('invite');

  const userId = randomId('usr');
  await env.PORTAL_DB
    .prepare('INSERT INTO users (id, customer_id, email, naam, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(userId, invite.customer_id, email, email.split('@')[0], invite.role, new Date().toISOString().slice(0, 10)).run();
  await env.PORTAL_DB.prepare('UPDATE users SET last_login = ? WHERE id = ?').bind(Date.now(), userId).run();

  const session = await createSession(userId, env.PORTAL_SESSION_SECRET);
  return new Response(null, {
    status: 302,
    headers: { Location: `${url.origin}/portal/`, 'Set-Cookie': sessionCookie(session) },
  });
}

// ── portal API dispatcher (/api/portal/*) ───────────────────────────────────
export async function handlePortalApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CSRF / origin guard for mutating requests (POST/PATCH/DELETE).
  const csrf = checkOrigin(request);
  if (csrf) return csrf;

  try {
    // Agenda-OAuth callback: dispatched BEFORE the session gate below, on
    // purpose. It is reached via a cross-site 302 redirect FROM
    // accounts.google.com, so the SameSite=Strict portal-session cookie
    // (auth.js's sessionCookie) is never attached by the browser — that's not
    // a bug, it's what SameSite=Strict does on cross-site top-level
    // navigation. The verified state HMAC inside handleAgendaCallback is the
    // sole authorization for this route; see its own comment for detail.
    if (path === '/api/portal/onboarding/agenda/callback') return await handleAgendaCallback(env, url, request);

    const user = await getSessionUser(request, env);
    // Staff accounts must use /api/admin; reject them here to avoid dual-role privilege confusion.
    if (!user || !user.customer_id || user.role === 'staff') return errorResponse('Niet ingelogd', 401);

    if (path === '/api/portal/me') return await portalMe(env, user);
    if (path === '/api/portal/overview') return await portalOverview(env, user);
    if (path === '/api/portal/services') return await portalServices(env, user, url);
    if (path === '/api/portal/requests') return await portalRequests(env, user);
    if (path === '/api/portal/service-request' && method === 'POST') return await createServiceRequest(request, env, user);
    if (path === '/api/portal/invoices') return await portalInvoices(env, user);
    if (path === '/api/portal/tickets') {
      return method === 'POST' ? await createTicket(request, env, user) : await portalTickets(env, user);
    }
    if (path === '/api/portal/settings') {
      return method === 'PATCH' ? await updateSettings(request, env, user) : await portalSettings(env, user);
    }
    if (path === '/api/portal/team') return await portalTeam(env, user);
    if (path === '/api/portal/team/invite' && method === 'POST') return await inviteTeam(request, env, user);
    if (path === '/api/portal/team/role' && method === 'PATCH') return await changeRole(request, env, user);
    if (path === '/api/portal/team/remove' && method === 'POST') return await removeMember(request, env, user);
    if (path === '/api/portal/orders') {
      return method === 'POST' ? await createOrder(request, env, user) : await listOrders(env, user);
    }
    if (path === '/api/portal/order') {
      return method === 'PATCH' ? await saveOrder(request, env, user) : await getOrder(env, user, url);
    }
    if (path === '/api/portal/order/submit' && method === 'POST') return await submitOrder(request, env, user);
    if (path === '/api/portal/onboarding') {
      return method === 'POST' ? await postOnboarding(request, env, user) : await getOnboarding(env, user, url);
    }
    // Task 11: per-tenant Google-agenda OAuth `initiate`. GET-only — the
    // session gate above (getSessionUser → 401 if missing) covers "sessie
    // vereist"; order-ownership check happens inside the handler. Its sibling
    // `callback` route is dispatched earlier, above the session gate — see
    // the comment there.
    if (path === '/api/portal/onboarding/agenda/initiate') return await handleAgendaInitiate(env, user, url);
    if (path === '/api/portal/service-config' && method === 'PATCH') return await updateServiceConfig(request, env, user);
    if (path === '/api/portal/checkout/start' && method === 'POST') return await handleCheckoutStart(request, env, user);
    if (path === '/api/portal/subscription/cancel' && method === 'POST') return await portalCancelSubscription(request, env, user);
    if (path === '/api/portal/invoice') return await portalInvoice(env, user, url);
    return errorResponse('Niet gevonden', 404);
  } catch (err) {
    console.error('[portal] API error:', err.message || err);
    return errorResponse('Er ging iets mis', 500);
  }
}

async function portalMe(env, user) {
  const customer = await env.PORTAL_DB
    .prepare('SELECT id, bedrijf, kvk, adres, postcode, stad, telefoon, factuur_email FROM customers WHERE id = ?')
    .bind(user.customer_id).first();
  return jsonResponse({
    ok: true,
    user: { id: user.id, email: user.email, naam: user.naam, role: user.role },
    customer,
  });
}

async function portalOverview(env, user) {
  const cid = user.customer_id;
  const db = env.PORTAL_DB;
  const services = (await db.prepare('SELECT id, product_key, naam, tier, status FROM services WHERE customer_id = ? ORDER BY created_at').bind(cid).all()).results || [];
  const openReq = await db.prepare("SELECT COUNT(*) AS n FROM service_requests WHERE customer_id = ? AND status IN ('open','in_behandeling')").bind(cid).first();
  const openOrders = await db.prepare("SELECT COUNT(*) AS n FROM service_orders WHERE customer_id = ? AND status IN ('concept','ingediend','in_uitvoering')").bind(cid).first();
  const openTickets = await db.prepare("SELECT COUNT(*) AS n FROM support_tickets WHERE customer_id = ? AND status IN ('open','in_behandeling')").bind(cid).first();
  const openInvoice = await db.prepare("SELECT periode, bedrag_cent, status FROM invoices WHERE customer_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1").bind(cid).first();
  const customer = await db.prepare('SELECT bedrijf, kvk, adres FROM customers WHERE id = ?').bind(cid).first();
  const teamCount = await db.prepare('SELECT COUNT(*) AS n FROM users WHERE customer_id = ?').bind(cid).first();

  const onboarding = [
    { label: 'Account aangemaakt', done: true },
    { label: 'Bedrijfsgegevens aangevuld', done: !!(customer?.kvk && customer?.adres) },
    { label: 'Eerste dienst actief', done: services.some((s) => s.status === 'actief') },
    { label: 'Teamlid uitgenodigd', done: (teamCount?.n || 0) > 1 },
  ];
  return jsonResponse({
    ok: true,
    bedrijf: customer?.bedrijf || '',
    services,
    openRequests: openReq?.n || 0,
    openOrders: openOrders?.n || 0,
    openTickets: openTickets?.n || 0,
    openInvoice: openInvoice || null,
    onboarding,
  });
}

async function portalServices(env, user, url) {
  const id = url.searchParams.get('id');
  if (id) {
    const s = await env.PORTAL_DB
      .prepare('SELECT id, product_key, naam, tier, status, config_json, provisioning_json, started_at, created_at FROM services WHERE id = ? AND customer_id = ?')
      .bind(id, user.customer_id).first();
    if (!s) return errorResponse('Dienst niet gevonden', 404);
    return jsonResponse({ ok: true, service: { ...s, config: safeParse(s.config_json), provisioning: safeParse(s.provisioning_json) } });
  }
  const list = (await env.PORTAL_DB
    .prepare('SELECT id, product_key, naam, tier, status, config_json, provisioning_json, started_at FROM services WHERE customer_id = ? ORDER BY created_at')
    .bind(user.customer_id).all()).results || [];
  return jsonResponse({ ok: true, services: list.map((s) => ({ ...s, config: safeParse(s.config_json), provisioning: safeParse(s.provisioning_json) })) });
}

async function portalRequests(env, user) {
  const list = (await env.PORTAL_DB
    .prepare('SELECT id, type, service_id, product_key, bericht, status, admin_notitie, created_at, handled_at FROM service_requests WHERE customer_id = ? ORDER BY created_at DESC')
    .bind(user.customer_id).all()).results || [];
  return jsonResponse({ ok: true, requests: list });
}

async function createServiceRequest(request, env, user) {
  if (!canWrite(user.role)) return errorResponse('U heeft geen rechten om aanvragen te doen', 403);
  const body = await request.json().catch(() => null);
  const type = body?.type;
  const valid = ['upgrade', 'downgrade', 'pause', 'resume', 'new_product', 'cancel'];
  if (!valid.includes(type)) return errorResponse('Ongeldig aanvraagtype', 400);

  // Ownership check — service_id must belong to the caller's own customer,
  // mirroring the id=? AND customer_id=? guard used by every other mutating
  // handler in this file (createOrder, saveOrder, updateServiceConfig, ...).
  const serviceId = body.service_id || null;
  if (serviceId) {
    const svc = await env.PORTAL_DB
      .prepare('SELECT id FROM services WHERE id = ? AND customer_id = ?')
      .bind(serviceId, user.customer_id).first();
    if (!svc) return errorResponse('Dienst niet gevonden', 400);
  }
  // Pin product_key to the static catalog, same as createOrder — prevents
  // arbitrary values leaking into downstream admin/provisioning views.
  const productKey = body.product_key || null;
  if (productKey && !getCatalogProduct(productKey)) return errorResponse('Onbekend product', 400);

  const id = randomId('req');
  await env.PORTAL_DB
    .prepare('INSERT INTO service_requests (id, customer_id, user_id, type, service_id, product_key, bericht, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.customer_id, user.id, type,
      serviceId, productKey,
      (body.bericht || '').toString().slice(0, 2000), 'open', Date.now()).run();

  await notifyAanloop(env, `Nieuwe aanvraag (${type})`,
    `Klant-id: ${user.customer_id}\nDoor: ${user.naam} (${user.email})\nDienst: ${body.service_id || '-'}\nProduct: ${body.product_key || '-'}\nBericht: ${body.bericht || '-'}`);
  return jsonResponse({ ok: true, id, message: 'Uw aanvraag is ontvangen. We nemen binnen 1 werkdag contact met u op.' });
}

async function portalInvoices(env, user) {
  const list = (await env.PORTAL_DB
    .prepare('SELECT id, factuurnummer, periode, bedrag_cent, subtotaal_cent, btw_cent, status, pdf_url, created_at FROM invoices WHERE customer_id = ? ORDER BY created_at DESC')
    .bind(user.customer_id).all()).results || [];
  return jsonResponse({ ok: true, invoices: list });
}

// Single invoice + customer + product — for the legal factuur view.
async function portalInvoice(env, user, url) {
  const id = url.searchParams.get('id');
  if (!id) return errorResponse('Factuur-id ontbreekt', 400);
  const inv = await env.PORTAL_DB.prepare(
    'SELECT id, factuurnummer, periode, bedrag_cent, subtotaal_cent, btw_cent, status, subscription_id, created_at FROM invoices WHERE id = ? AND customer_id = ?',
  ).bind(id, user.customer_id).first();
  if (!inv) return errorResponse('Factuur niet gevonden', 404);
  const customer = await env.PORTAL_DB.prepare(
    'SELECT bedrijf, kvk, adres, postcode, stad, btw_id FROM customers WHERE id = ?',
  ).bind(user.customer_id).first();
  let product = null;
  if (inv.subscription_id) {
    product = await env.PORTAL_DB.prepare('SELECT product_key, tier, betaling FROM subscriptions WHERE id = ? AND customer_id = ?')
      .bind(inv.subscription_id, user.customer_id).first();
  }
  return jsonResponse({ ok: true, invoice: inv, customer, product });
}

// Authenticated subscription cancellation. Only eigenaar/bewerker (not the
// read-only kijker role) may cancel — matches the write-gate used elsewhere
// in this file (canWrite). Origin/CSRF and session checks already happened
// in handlePortalApi before this is reached.
async function portalCancelSubscription(request, env, user) {
  if (!canWrite(user.role)) return errorResponse('U heeft geen rechten om een abonnement op te zeggen', 403);
  const body = await request.json().catch(() => null);
  const subscriptionId = (body?.subscriptionId || '').toString().trim();
  if (!subscriptionId) return errorResponse('Abonnement-id ontbreekt', 400);

  const res = await cancelSubscription(env, { subscriptionId, customerId: user.customer_id });
  if (!res.ok) {
    const status = res.error === 'Abonnement niet gevonden' ? 404 : 400;
    return errorResponse(res.error || 'Kon abonnement niet opzeggen', status);
  }
  return jsonResponse({ ok: true, message: 'Abonnement opgezegd' });
}

async function portalTickets(env, user) {
  const list = (await env.PORTAL_DB
    .prepare('SELECT id, onderwerp, bericht, status, admin_antwoord, created_at, updated_at FROM support_tickets WHERE customer_id = ? ORDER BY created_at DESC')
    .bind(user.customer_id).all()).results || [];
  return jsonResponse({ ok: true, tickets: list });
}

async function createTicket(request, env, user) {
  if (!canWrite(user.role)) return errorResponse('U heeft geen rechten om vragen te stellen', 403);
  const body = await request.json().catch(() => null);
  const onderwerp = (body?.onderwerp || '').toString().trim().slice(0, 200);
  const bericht = (body?.bericht || '').toString().trim().slice(0, 4000);
  if (!onderwerp || !bericht) return errorResponse('Onderwerp en bericht zijn verplicht', 400);

  const id = randomId('tkt');
  const now = Date.now();
  await env.PORTAL_DB
    .prepare('INSERT INTO support_tickets (id, customer_id, user_id, onderwerp, bericht, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.customer_id, user.id, onderwerp, bericht, 'open', now, now).run();

  await notifyAanloop(env, `Nieuw supportticket: ${onderwerp}`,
    `Klant-id: ${user.customer_id}\nDoor: ${user.naam} (${user.email})\n\n${bericht}`);
  return jsonResponse({ ok: true, id, message: 'Uw vraag is verstuurd. We reageren zo snel mogelijk.' });
}

async function portalSettings(env, user) {
  const customer = await env.PORTAL_DB
    .prepare('SELECT bedrijf, kvk, adres, postcode, stad, telefoon, factuur_email FROM customers WHERE id = ?')
    .bind(user.customer_id).first();
  const fresh = await env.PORTAL_DB.prepare('SELECT naam, notif_json FROM users WHERE id = ?').bind(user.id).first();
  return jsonResponse({
    ok: true,
    customer,
    profiel: { naam: fresh?.naam || user.naam, email: user.email, role: user.role },
    notificaties: safeParse(fresh?.notif_json) || {},
  });
}

async function updateSettings(request, env, user) {
  const body = await request.json().catch(() => null);
  if (!body?.section) return errorResponse('Ongeldige aanvraag', 400);

  if (body.section === 'bedrijf') {
    if (user.role !== 'eigenaar') return errorResponse('Alleen de eigenaar kan bedrijfsgegevens wijzigen', 403);
    await env.PORTAL_DB
      .prepare('UPDATE customers SET kvk = ?, adres = ?, postcode = ?, stad = ?, telefoon = ?, factuur_email = ? WHERE id = ?')
      .bind((body.kvk || '').slice(0, 20), (body.adres || '').slice(0, 200), (body.postcode || '').slice(0, 12),
        (body.stad || '').slice(0, 100), (body.telefoon || '').slice(0, 40), (body.factuur_email || '').slice(0, 160),
        user.customer_id).run();
  } else if (body.section === 'profiel') {
    const naam = (body.naam || '').toString().trim().slice(0, 120);
    if (!naam) return errorResponse('Naam is verplicht', 400);
    await env.PORTAL_DB.prepare('UPDATE users SET naam = ? WHERE id = ?').bind(naam, user.id).run();
  } else if (body.section === 'notificaties') {
    const notifStr = JSON.stringify(body.notif || {});
    if (notifStr.length > 4096) return errorResponse('Notificatie-instellingen te groot', 400);
    await env.PORTAL_DB.prepare('UPDATE users SET notif_json = ? WHERE id = ?')
      .bind(notifStr, user.id).run();
  } else {
    return errorResponse('Onbekende sectie', 400);
  }
  return jsonResponse({ ok: true, message: 'Opgeslagen' });
}

async function portalTeam(env, user) {
  const list = (await env.PORTAL_DB
    .prepare('SELECT id, email, naam, role, last_login, created_at FROM users WHERE customer_id = ? ORDER BY created_at')
    .bind(user.customer_id).all()).results || [];
  const invites = (await env.PORTAL_DB
    .prepare('SELECT id, email, role, accepted, created_at FROM team_invites WHERE customer_id = ? AND accepted = 0 ORDER BY created_at DESC')
    .bind(user.customer_id).all()).results || [];
  return jsonResponse({ ok: true, leden: list, openUitnodigingen: invites, currentUserId: user.id });
}

async function inviteTeam(request, env, user) {
  if (user.role !== 'eigenaar') return errorResponse('Alleen de eigenaar kan teamleden uitnodigen', 403);
  const body = await request.json().catch(() => null);
  const email = (body?.email || '').toString().trim().toLowerCase();
  const role = body?.role;
  if (!isValidEmail(email)) return errorResponse('Ongeldig e-mailadres', 400);
  if (!['eigenaar', 'bewerker', 'kijker'].includes(role)) return errorResponse('Ongeldige rol', 400);

  const existing = await env.PORTAL_DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return errorResponse('Dit e-mailadres heeft al een account', 409);

  const token = randomToken();
  const now = Date.now();
  await env.PORTAL_DB
    .prepare('INSERT INTO team_invites (id, customer_id, email, role, token_hash, expires_at, accepted, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)')
    .bind(randomId('inv'), user.customer_id, email, role, await sha256Hex(token), now + INVITE_TTL_MS, now).run();

  const customer = await env.PORTAL_DB.prepare('SELECT bedrijf FROM customers WHERE id = ?').bind(user.customer_id).first();
  try {
    await sendMail(env, email, email.split('@')[0], `Uitnodiging voor het Aanloop AI portaal — ${customer?.bedrijf || ''}`,
      `<p>Hallo,</p>
       <p><strong>${escapeHtml(user.naam)}</strong> nodigt u uit voor het Aanloop AI klantportaal van
       <strong>${escapeHtml(customer?.bedrijf || '')}</strong>, met de rol <strong>${escapeHtml(role)}</strong>.</p>
       ${mailButton(`${SITE_ORIGIN}/api/team-invite/accept?token=${token}`, 'Uitnodiging accepteren')}
       <p style="font-size:13px;color:#64748b">Deze uitnodiging is 7 dagen geldig.</p>`);
  } catch (err) {
    // The invite row exists and its token is valid, but the mail never left.
    // Telling the owner "verstuurd" would leave them waiting on a colleague who
    // was never actually invited.
    const message = err.message || String(err);
    console.error('[portal] invite email failed:', message);
    await alertStaff(env, 'Team-uitnodiging kon niet worden verstuurd',
      `Uitnodiging voor ${email} (klant ${user.customer_id}) is opgeslagen, maar de mail is mislukt: ${message}`);
    return errorResponse(`De uitnodiging voor ${email} is opgeslagen, maar de e-mail kon niet worden verstuurd. Probeer het later opnieuw of mail hello@aanloopai.nl.`, 502);
  }
  return jsonResponse({ ok: true, message: `Uitnodiging verstuurd naar ${email}.` });
}

async function changeRole(request, env, user) {
  if (user.role !== 'eigenaar') return errorResponse('Alleen de eigenaar kan rollen wijzigen', 403);
  const body = await request.json().catch(() => null);
  const targetId = body?.user_id;
  const role = body?.role;
  if (!targetId || !['eigenaar', 'bewerker', 'kijker'].includes(role)) return errorResponse('Ongeldige aanvraag', 400);
  if (targetId === user.id) return errorResponse('U kunt uw eigen rol niet wijzigen', 400);

  const target = await env.PORTAL_DB.prepare('SELECT id, role FROM users WHERE id = ? AND customer_id = ?')
    .bind(targetId, user.customer_id).first();
  if (!target) return errorResponse('Teamlid niet gevonden', 404);

  await env.PORTAL_DB.prepare('UPDATE users SET role = ? WHERE id = ? AND customer_id = ?')
    .bind(role, targetId, user.customer_id).run();
  return jsonResponse({ ok: true, message: 'Rol bijgewerkt' });
}

// ── service orders / intake ─────────────────────────────────────────────────
async function createOrder(request, env, user) {
  if (!canWrite(user.role)) return errorResponse('U heeft geen rechten om een aanvraag te starten', 403);
  const body = await request.json().catch(() => null);
  const productKey = (body?.product_key || '').toString().trim();
  if (!productKey) return errorResponse('Product ontbreekt', 400);
  // Pin product_key to the static catalog — prevents arbitrary values leaking
  // into provisioning + downstream Mollie descriptions.
  if (!getCatalogProduct(productKey)) return errorResponse('Onbekend product', 400);
  const id = randomId('ord');
  await env.PORTAL_DB
    .prepare('INSERT INTO service_orders (id, customer_id, user_id, product_key, tier, intake_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.customer_id, user.id, productKey, (body.tier || null), '{}', 'concept', Date.now()).run();
  return jsonResponse({ ok: true, id });
}

async function listOrders(env, user) {
  const list = (await env.PORTAL_DB
    .prepare('SELECT id, product_key, tier, status, created_at, submitted_at FROM service_orders WHERE customer_id = ? ORDER BY created_at DESC')
    .bind(user.customer_id).all()).results || [];
  return jsonResponse({ ok: true, orders: list });
}

async function getOrder(env, user, url) {
  const id = url.searchParams.get('id');
  if (!id) return errorResponse('Aanvraag-id ontbreekt', 400);
  const o = await env.PORTAL_DB
    .prepare('SELECT id, product_key, tier, intake_json, status, created_at, submitted_at FROM service_orders WHERE id = ? AND customer_id = ?')
    .bind(id, user.customer_id).first();
  if (!o) return errorResponse('Aanvraag niet gevonden', 404);
  return jsonResponse({ ok: true, order: { ...o, intake: safeParse(o.intake_json) || {} } });
}

// Onboarding-state voor de post-pay wizard (Plak B/C). IDOR-scope identiek
// aan getOrder hierboven: id=? AND customer_id=? in dezelfde query, dus een
// order van een andere klant geeft exact dezelfde 404 als een onbekende
// order-id — geen enumeratie of state-lek over de tenant-grens heen.
async function getOnboarding(env, user, url) {
  const id = url.searchParams.get('order');
  if (!id) return errorResponse('Aanvraag-id ontbreekt', 400);
  const order = await env.PORTAL_DB
    .prepare('SELECT id, product_key, intake_json FROM service_orders WHERE id = ? AND customer_id = ?')
    .bind(id, user.customer_id).first();
  if (!order) return errorResponse('Aanvraag niet gevonden', 404);

  const agendaGekoppeld = env.GOOGLE_TOKENS
    ? (await env.GOOGLE_TOKENS.get(`oauth:google:cust:${user.customer_id}`)) != null
    : false;
  const state = onboardingState(order, agendaGekoppeld);
  // Bestaande intake-waarden (bv. bedrijfsnaam uit de funnel) horen bij deze
  // order en dus bij deze ingelogde klant (order is hierboven al gescoped op
  // id=? AND customer_id=?) — geen leak. De wizard gebruikt dit om
  // reeds-ingevulde velden voor te vullen i.p.v. leeg te tonen.
  return jsonResponse({
    ok: true, ...state, answers: safeParse(order.intake_json) || {}, schema: getIntakeSchema(state.productKey),
  });
}

// Keys that would reach the object prototype via bracket assignment
// (`merged[stepKey] = ...`) rather than defining an own property — skipped
// defensively so a crafted `answers` body can never repoint merged's
// [[Prototype]]. JSON.parse itself is not affected by this (it defines own
// properties directly), only the plain-object bracket-assignment below is.
const UNSAFE_STEP_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
// Defensive cap on the merged intake_json — same kind of size guard as
// updateSettings' notifStr.length check above; the intake wizard has no
// hard-coded per-field limit today (saveOrder/submitOrder store whatever the
// wizard sends), so this only stops a pathological/abusive payload, not a
// realistic one.
const MAX_INTAKE_JSON_LENGTH = 50000;

// Deep-merges incoming per-step answers into the existing intake_json.
// `answers` is nested exactly like intake_json itself — `answers[step.key]`
// — so each present step gets its OWN sub-object merged over the existing
// one; steps the caller didn't mention are left completely untouched. This
// is the one thing that must never regress here: a customer finishing step
// 5 of the onboarding wizard must not wipe out what they filled in at step 1.
function mergeIntakeAnswers(existing, answers) {
  const merged = { ...(existing || {}) };
  for (const stepKey of Object.keys(answers || {})) {
    if (UNSAFE_STEP_KEYS.has(stepKey)) continue;
    const incoming = answers[stepKey];
    // Only nested step objects are merged — a flat/garbage value (e.g. an
    // attacker sending `answers.tier = 'Enterprise'`) is silently ignored
    // rather than written into intake_json under a bogus key.
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) continue;
    const existingStep = existing?.[stepKey] || {};
    const mergedStep = { ...existingStep };
    for (const field of Object.keys(incoming)) {
      // Defense-in-depth: an accidental/empty submit must never blank out a
      // value the customer already filled in — skip empty strings so the
      // pre-filled existing value survives.
      if (incoming[field] === '') continue;
      mergedStep[field] = incoming[field];
    }
    merged[stepKey] = mergedStep;
  }
  return merged;
}

// POST /api/portal/onboarding — slaat de antwoorden van de onboarding-wizard
// op en her-provisioneert de order. Sessie/eigenaarschap identiek aan
// getOnboarding hierboven (id=? AND customer_id=? → 404, geen sessie → 401,
// via handlePortalApi). `answers.tier`/`product_key`/prijs kunnen dit
// endpoint NOOIT bereiken: alleen intake_json wordt geschreven, de
// service_orders.tier/product_key-kolommen worden hier niet aangeraakt.
async function postOnboarding(request, env, user) {
  if (!canWrite(user.role)) return errorResponse('Geen rechten', 403);
  const body = await request.json().catch(() => null);
  const id = (body?.order_id || '').toString();
  if (!id) return errorResponse('Aanvraag-id ontbreekt', 400);
  if (!body?.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) {
    return errorResponse('Ongeldige antwoorden', 400);
  }

  const order = await env.PORTAL_DB
    .prepare('SELECT id, customer_id, product_key, tier, intake_json, status, voorstel_id FROM service_orders WHERE id = ? AND customer_id = ?')
    .bind(id, user.customer_id).first();
  if (!order) return errorResponse('Aanvraag niet gevonden', 404);

  const existingIntake = safeParse(order.intake_json) || {};
  const merged = mergeIntakeAnswers(existingIntake, body.answers);
  const mergedJson = JSON.stringify(merged);
  if (mergedJson.length > MAX_INTAKE_JSON_LENGTH) return errorResponse('Antwoorden te groot', 400);

  await env.PORTAL_DB.prepare('UPDATE service_orders SET intake_json = ? WHERE id = ?')
    .bind(mergedJson, id).run();

  const result = await activateOrder(env, { ...order, intake_json: mergedJson });
  if (result.status === 'actief') {
    return jsonResponse({ ok: true, actief: true });
  }

  const agendaGekoppeld = env.GOOGLE_TOKENS
    ? (await env.GOOGLE_TOKENS.get(`oauth:google:cust:${user.customer_id}`)) != null
    : false;
  const state = onboardingState({ ...order, intake_json: mergedJson }, agendaGekoppeld);
  return jsonResponse({
    ok: true, ...state, answers: merged, schema: getIntakeSchema(state.productKey),
  });
}

async function saveOrder(request, env, user) {
  if (!canWrite(user.role)) return errorResponse('Geen rechten', 403);
  const body = await request.json().catch(() => null);
  if (!body?.id) return errorResponse('Aanvraag-id ontbreekt', 400);
  const o = await env.PORTAL_DB
    .prepare('SELECT id, status FROM service_orders WHERE id = ? AND customer_id = ?')
    .bind(body.id, user.customer_id).first();
  if (!o) return errorResponse('Aanvraag niet gevonden', 404);
  if (o.status !== 'concept') return errorResponse('Deze aanvraag is al ingediend', 409);
  await env.PORTAL_DB.prepare('UPDATE service_orders SET intake_json = ? WHERE id = ?')
    .bind(JSON.stringify(body.intake || {}), body.id).run();
  return jsonResponse({ ok: true });
}

async function submitOrder(request, env, user) {
  if (!canWrite(user.role)) return errorResponse('Geen rechten', 403);
  const body = await request.json().catch(() => null);
  if (!body?.id) return errorResponse('Aanvraag-id ontbreekt', 400);
  const o = await env.PORTAL_DB
    .prepare('SELECT id, product_key, tier, status FROM service_orders WHERE id = ? AND customer_id = ?')
    .bind(body.id, user.customer_id).first();
  if (!o) return errorResponse('Aanvraag niet gevonden', 404);
  if (o.status !== 'concept') return errorResponse('Deze aanvraag is al ingediend', 409);
  if (body.intake) {
    await env.PORTAL_DB.prepare('UPDATE service_orders SET intake_json = ? WHERE id = ?')
      .bind(JSON.stringify(body.intake), body.id).run();
  }
  await env.PORTAL_DB.prepare('UPDATE service_orders SET status = ?, submitted_at = ? WHERE id = ?')
    .bind('ingediend', Date.now(), body.id).run();

  // F3: open een services-deal voor deze order — dealVoorOrder is idempotent
  // (op order_id) en slikt zijn eigen fouten, blokkeert dus nooit de indiening.
  const tier = getCatalogTier(o.product_key, o.tier);
  const waardeCent = tier?.prijsCent ? Math.round(tier.prijsCent * (1 + BTW_RATE)) : 0;
  const customer = await env.PORTAL_DB.prepare('SELECT bedrijf FROM customers WHERE id = ?').bind(user.customer_id).first();
  await dealVoorOrder(env, {
    orderId: o.id,
    customerId: user.customer_id,
    naam: `${customer?.bedrijf || user.naam} — ${o.product_key}${o.tier ? ` ${o.tier}` : ''}`,
    waardeCent,
  });

  await notifyAanloop(env, 'Nieuwe aanvraag — intake compleet',
    `Klant-id: ${user.customer_id}\nProduct: ${o.product_key} (${o.tier || '-'})\nDoor: ${user.naam} (${user.email})\nAanvraag: ${o.id}\nBekijk de volledige intake in het admin-panel.`);
  return jsonResponse({ ok: true, message: 'Uw aanvraag is ingediend. We nemen het in behandeling.' });
}

// Customer edits the configuration of their own service.
async function updateServiceConfig(request, env, user) {
  if (!canWrite(user.role)) return errorResponse('Geen rechten', 403);
  const body = await request.json().catch(() => null);
  if (!body?.service_id) return errorResponse('Dienst-id ontbreekt', 400);
  const s = await env.PORTAL_DB
    .prepare('SELECT id FROM services WHERE id = ? AND customer_id = ?')
    .bind(body.service_id, user.customer_id).first();
  if (!s) return errorResponse('Dienst niet gevonden', 404);
  await env.PORTAL_DB.prepare('UPDATE services SET config_json = ? WHERE id = ?')
    .bind(JSON.stringify(body.config || {}), body.service_id).run();
  return jsonResponse({ ok: true, message: 'Instellingen opgeslagen' });
}

async function removeMember(request, env, user) {
  if (user.role !== 'eigenaar') return errorResponse('Alleen de eigenaar kan teamleden verwijderen', 403);
  const body = await request.json().catch(() => null);
  const targetId = body?.user_id;
  if (!targetId) return errorResponse('Ongeldige aanvraag', 400);
  if (targetId === user.id) return errorResponse('U kunt uzelf niet verwijderen', 400);

  const target = await env.PORTAL_DB.prepare('SELECT id, role FROM users WHERE id = ? AND customer_id = ?')
    .bind(targetId, user.customer_id).first();
  if (!target) return errorResponse('Teamlid niet gevonden', 404);

  // Never leave the account without an eigenaar.
  const eigenaren = await env.PORTAL_DB
    .prepare("SELECT COUNT(*) AS n FROM users WHERE customer_id = ? AND role = 'eigenaar'")
    .bind(user.customer_id).first();
  if (target.role === 'eigenaar' && (eigenaren?.n || 0) <= 1) {
    return errorResponse('Er moet minstens één eigenaar zijn', 400);
  }

  // M3: user_id on support_tickets / service_requests / service_orders is
  // NOT NULL REFERENCES users(id) (migrations 0003_portal_v2.sql,
  // 0005_orders.sql) — the columns are not nullable, so NULLing out or
  // reassigning ownership is not a safe option here without a separate
  // product decision on who inherits the records. D1 enforces FK constraints
  // by default, so a hard DELETE FROM users would throw on ANY referencing
  // row regardless of status (a closed/afgerond ticket blocks it just as
  // much as an open one). Guard up front with a clear 409 instead of letting
  // that surface as an unhandled 500 after magic_links has already been
  // deleted.
  const refCounts = await env.PORTAL_DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM support_tickets   WHERE user_id = ?) +
       (SELECT COUNT(*) FROM service_requests  WHERE user_id = ?) +
       (SELECT COUNT(*) FROM service_orders    WHERE user_id = ?) AS n`,
  ).bind(targetId, targetId, targetId).first();
  if ((refCounts?.n || 0) > 0) {
    return errorResponse(
      'Kan teamlid niet verwijderen: er zijn nog tickets, aanvragen of bestellingen aan dit teamlid gekoppeld.',
      409,
    );
  }

  try {
    // Defence-in-depth — scope the writes to this customer too, not just the
    // pre-check SELECT, so a future bug or race cannot delete cross-tenant.
    // Batched (mirrors mollie.js's payment+subscription batch) so the
    // magic_links delete and the user delete commit atomically — no window
    // where magic_links is gone but the user row (still FK-referenced
    // elsewhere) survives, or vice versa.
    await env.PORTAL_DB.batch([
      env.PORTAL_DB.prepare(
        'DELETE FROM magic_links WHERE user_id = ? AND user_id IN (SELECT id FROM users WHERE customer_id = ?)',
      ).bind(targetId, user.customer_id),
      env.PORTAL_DB.prepare('DELETE FROM users WHERE id = ? AND customer_id = ?')
        .bind(targetId, user.customer_id),
    ]);
  } catch (err) {
    console.error('[portal] removeMember failed:', err.message || err);
    return errorResponse('Kon teamlid niet verwijderen', 500);
  }
  return jsonResponse({ ok: true, message: 'Teamlid verwijderd' });
}

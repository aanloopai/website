// Customer portal routes (schema v2) — wired into src/worker.js.
// Passwordless magic-link auth + customer-facing dashboard / requests / team.
import { jsonResponse, errorResponse } from './google-auth.js';
import {
  MAGIC_LINK_TTL_MS, INVITE_TTL_MS,
  sha256Hex, randomToken, randomId, createSession,
  sessionCookie, clearCookie, getSessionUser,
} from './auth.js';

const SITE_ORIGIN = 'https://aanloopai.nl';
const BREVO_API = 'https://api.brevo.com/v3/smtp/email';
const AANLOOP_EMAIL = 'hello@aanloopai.nl';

// ── helpers ────────────────────────────────────────────────────────────────
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
async function sendMail(env, to, toNaam, subject, innerHtml) {
  if (!env.BREVO_API_KEY) return;
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
         ${mailButton(`${SITE_ORIGIN}/api/auth/verify?token=${token}`, 'Inloggen op het portaal')}
         <p style="font-size:13px;color:#64748b">Deze link is 15 minuten geldig en kan één keer gebruikt worden. Niet aangevraagd? Negeer deze mail.</p>`);
    } catch (err) {
      console.error('[portal] magic-link email failed:', err.message || err);
    }
  }
  return jsonResponse({
    ok: true,
    message: 'Als dit e-mailadres bij ons bekend is, ontvangt u binnen enkele minuten een inloglink.',
  });
}

export async function handleAuthVerify(request, env) {
  const url = new URL(request.url);
  const fail = () => Response.redirect(`${url.origin}/portal/login?error=link`, 302);
  if (!env.PORTAL_DB || !env.PORTAL_SESSION_SECRET) return fail();

  const token = url.searchParams.get('token') || '';
  if (!token) return fail();

  const tokenHash = await sha256Hex(token);
  const row = await env.PORTAL_DB
    .prepare('SELECT user_id, expires_at, used FROM magic_links WHERE token_hash = ?')
    .bind(tokenHash).first();
  if (!row || row.used || Date.now() > row.expires_at) return fail();

  await env.PORTAL_DB.prepare('UPDATE magic_links SET used = 1 WHERE token_hash = ?').bind(tokenHash).run();
  await env.PORTAL_DB.prepare('UPDATE users SET last_login = ? WHERE id = ?').bind(Date.now(), row.user_id).run();

  const user = await env.PORTAL_DB.prepare('SELECT role FROM users WHERE id = ?').bind(row.user_id).first();
  const dest = user?.role === 'staff' ? '/admin/' : '/portal/';
  const session = await createSession(row.user_id, env.PORTAL_SESSION_SECRET);
  return new Response(null, {
    status: 302,
    headers: { Location: `${url.origin}${dest}`, 'Set-Cookie': sessionCookie(session) },
  });
}

export async function handleAuthLogout(request, env) {
  const url = new URL(request.url);
  return new Response(null, {
    status: 302,
    headers: { Location: `${url.origin}/portal/login`, 'Set-Cookie': clearCookie() },
  });
}

// ── team-invite accept ──────────────────────────────────────────────────────
export async function handleInviteAccept(request, env) {
  const url = new URL(request.url);
  const fail = (e) => Response.redirect(`${url.origin}/portal/login?error=${e}`, 302);
  if (!env.PORTAL_DB || !env.PORTAL_SESSION_SECRET) return fail('invite');

  const token = url.searchParams.get('token') || '';
  if (!token) return fail('invite');

  const tokenHash = await sha256Hex(token);
  const invite = await env.PORTAL_DB
    .prepare('SELECT id, customer_id, email, role, expires_at, accepted FROM team_invites WHERE token_hash = ?')
    .bind(tokenHash).first();
  if (!invite || invite.accepted || Date.now() > invite.expires_at) return fail('invite');

  const email = invite.email.toLowerCase();
  const existing = await env.PORTAL_DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return fail('bestaat'); // email already has an account

  const userId = randomId('usr');
  await env.PORTAL_DB
    .prepare('INSERT INTO users (id, customer_id, email, naam, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(userId, invite.customer_id, email, email.split('@')[0], invite.role, new Date().toISOString().slice(0, 10)).run();
  await env.PORTAL_DB.prepare('UPDATE team_invites SET accepted = 1 WHERE id = ?').bind(invite.id).run();
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

  const user = await getSessionUser(request, env);
  if (!user || !user.customer_id) return errorResponse('Niet ingelogd', 401);

  try {
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
    openTickets: openTickets?.n || 0,
    openInvoice: openInvoice || null,
    onboarding,
  });
}

async function portalServices(env, user, url) {
  const id = url.searchParams.get('id');
  if (id) {
    const s = await env.PORTAL_DB
      .prepare('SELECT id, product_key, naam, tier, status, config_json, started_at, created_at FROM services WHERE id = ? AND customer_id = ?')
      .bind(id, user.customer_id).first();
    if (!s) return errorResponse('Dienst niet gevonden', 404);
    return jsonResponse({ ok: true, service: { ...s, config: safeParse(s.config_json) } });
  }
  const list = (await env.PORTAL_DB
    .prepare('SELECT id, product_key, naam, tier, status, config_json, started_at FROM services WHERE customer_id = ? ORDER BY created_at')
    .bind(user.customer_id).all()).results || [];
  return jsonResponse({ ok: true, services: list.map((s) => ({ ...s, config: safeParse(s.config_json) })) });
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

  const id = randomId('req');
  await env.PORTAL_DB
    .prepare('INSERT INTO service_requests (id, customer_id, user_id, type, service_id, product_key, bericht, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.customer_id, user.id, type,
      (body.service_id || null), (body.product_key || null),
      (body.bericht || '').toString().slice(0, 2000), 'open', Date.now()).run();

  await notifyAanloop(env, `Nieuwe aanvraag (${type})`,
    `Klant-id: ${user.customer_id}\nDoor: ${user.naam} (${user.email})\nDienst: ${body.service_id || '-'}\nProduct: ${body.product_key || '-'}\nBericht: ${body.bericht || '-'}`);
  return jsonResponse({ ok: true, id, message: 'Uw aanvraag is ontvangen. We nemen binnen 1 werkdag contact met u op.' });
}

async function portalInvoices(env, user) {
  const list = (await env.PORTAL_DB
    .prepare('SELECT id, periode, bedrag_cent, status, pdf_url, created_at FROM invoices WHERE customer_id = ? ORDER BY created_at DESC')
    .bind(user.customer_id).all()).results || [];
  return jsonResponse({ ok: true, invoices: list });
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
    await env.PORTAL_DB.prepare('UPDATE users SET notif_json = ? WHERE id = ?')
      .bind(JSON.stringify(body.notif || {}), user.id).run();
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
    console.error('[portal] invite email failed:', err.message || err);
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

  await env.PORTAL_DB.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, targetId).run();
  return jsonResponse({ ok: true, message: 'Rol bijgewerkt' });
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

  await env.PORTAL_DB.prepare('DELETE FROM magic_links WHERE user_id = ?').bind(targetId).run();
  await env.PORTAL_DB.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run();
  return jsonResponse({ ok: true, message: 'Teamlid verwijderd' });
}

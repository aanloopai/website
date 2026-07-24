// Admin panel routes (schema v2) — wired into src/worker.js as /api/admin/*.
// Staff-only: manage customers, services, requests, tickets, invoices.
import { jsonResponse, errorResponse } from './google-auth.js';
import { randomId, getSessionUser } from './auth.js';
import { escapeHtml } from './escape.js';
import { activateOrder } from './activation.js';
import { teardownProvisioning } from './elevenlabs.js';
import { canProvision } from './provisioners/index.js';
import {
  outreachProspects, outreachMailDetail, outreachImport,
  outreachGenerateMail, outreachEvaluateMail, outreachUpdateMail,
  outreachUpdateProspect, outreachReplySuggestion,
  outreachImproveMail, outreachPipeline, outreachSendMail,
} from './outreach.js';
import {
  crmActivities, crmDeals, crmTimeline, crmPipelineData, crmSearch, logCrmActivity,
} from './crm.js';
import { aiFields, aiOnderzoek, aiUsage } from './ai-crm.js';

const BREVO_API = 'https://api.brevo.com/v3/smtp/email';
const AANLOOP_EMAIL = 'hello@aanloopai.nl';
const BTW_RATE = 0.21;

function today() { return new Date().toISOString().slice(0, 10); }

async function mailCustomer(env, to, naam, subject, innerHtml) {
  if (!env.BREVO_API_KEY) return;
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">${innerHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
    <p style="font-size:12px;color:#64748b">Aanloop AI — aanloopai.nl — KvK 88606902</p></body></html>`;
  const res = await fetch(BREVO_API, {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Aanloop AI', email: AANLOOP_EMAIL },
      to: [{ email: to, name: naam || to }],
      subject, htmlContent: html,
    }),
  });
  if (!res.ok) throw new Error(`Brevo HTTP ${res.status}`);
}

// ── dispatcher (/api/admin/*) ───────────────────────────────────────────────
const ADMIN_SITE_ORIGIN = 'https://aanloopai.nl';
const ADMIN_MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export async function handleAdminApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CSRF / origin guard for mutating admin requests.
  if (ADMIN_MUTATING.has(method)) {
    const origin = request.headers.get('Origin');
    if (origin && origin !== ADMIN_SITE_ORIGIN) return errorResponse('Verboden (origin)', 403);
  }

  const user = await getSessionUser(request, env);
  if (!user || user.role !== 'staff') return errorResponse('Geen toegang', 403);

  try {
    if (path === '/api/admin/me') {
      return jsonResponse({ ok: true, user: { id: user.id, email: user.email, naam: user.naam, role: user.role } });
    }
    if (path === '/api/admin/overview') return await adminOverview(env);
    if (path === '/api/admin/customers') {
      return method === 'POST' ? await createCustomer(request, env) : await listCustomers(env);
    }
    if (path === '/api/admin/customer') {
      return method === 'PATCH' ? await updateCustomer(request, env) : await customerDetail(env, url);
    }
    if (path === '/api/admin/user' && method === 'POST') return await createUser(request, env);
    if (path === '/api/admin/service' && method === 'POST') return await createService(request, env);
    if (path === '/api/admin/service' && method === 'PATCH') return await updateService(request, env);
    if (path === '/api/admin/requests') return await listRequests(env, url);
    if (path === '/api/admin/request' && method === 'PATCH') return await fulfillRequest(request, env);
    if (path === '/api/admin/tickets') return await listTickets(env, url);
    if (path === '/api/admin/ticket' && method === 'PATCH') return await answerTicket(request, env);
    if (path === '/api/admin/invoice' && method === 'POST') return await createInvoice(request, env);
    if (path === '/api/admin/orders') return await listOrders(env, url);
    if (path === '/api/admin/order') {
      return method === 'PATCH' ? await updateOrder(request, env) : await orderDetail(env, url);
    }
    if (path === '/api/admin/leads') return await listLeads(env, url);
    if (path === '/api/admin/lead' && method === 'PATCH') return await updateLead(request, env);
    if (path === '/api/admin/leadgen/leads') return await leadgenLeads(env);
    if (path === '/api/admin/leadgen/prospects') return await leadgenProspects(env);
    if (path === '/api/admin/leadgen/verkoop' && method === 'POST') return await leadgenVerkoop(request, env);
    if (path === '/api/admin/outreach/prospects') return await outreachProspects(env);
    if (path === '/api/admin/outreach/mail') {
      return method === 'POST' ? await outreachUpdateMail(request, env) : await outreachMailDetail(env, url);
    }
    if (path === '/api/admin/outreach/import' && method === 'POST') return await outreachImport(request, env);
    if (path === '/api/admin/outreach/generate' && method === 'POST') return await outreachGenerateMail(request, env);
    if (path === '/api/admin/outreach/evaluate' && method === 'POST') return await outreachEvaluateMail(request, env);
    if (path === '/api/admin/outreach/improve' && method === 'POST') return await outreachImproveMail(request, env);
    if (path === '/api/admin/outreach/pipeline' && method === 'POST') return await outreachPipeline(request, env);
    if (path === '/api/admin/outreach/prospect' && method === 'POST') return await outreachUpdateProspect(request, env);
    if (path === '/api/admin/outreach/reply' && method === 'POST') return await outreachReplySuggestion(request, env);
    if (path === '/api/admin/outreach/send' && method === 'POST') return await outreachSendMail(request, env);
    if (path === '/api/admin/crm/activities') return await crmActivities(request, env);
    if (path === '/api/admin/crm/deals') return await crmDeals(request, env);
    if (path === '/api/admin/crm/timeline') return await crmTimeline(request, env);
    if (path === '/api/admin/crm/pipeline') return await crmPipelineData(request, env);
    if (path === '/api/admin/search') return await crmSearch(request, env);
    if (path === '/api/admin/ai/fields') return await aiFields(request, env);
    if (path === '/api/admin/ai/onderzoek' && method === 'POST') return await aiOnderzoek(request, env);
    if (path === '/api/admin/ai/usage') return await aiUsage(env);
    return errorResponse('Niet gevonden', 404);
  } catch (err) {
    console.error('[admin] API error:', err.message || err);
    return errorResponse('Er ging iets mis', 500);
  }
}

// created_at is ISO date on customers, epoch ms on requests/tickets — normalize.
function toMs(v) {
  if (typeof v === 'number') return v;
  const t = Date.parse(`${v}T00:00:00Z`);
  return Number.isFinite(t) ? t : 0;
}

async function adminOverview(env) {
  const db = env.PORTAL_DB;
  const klanten = await db.prepare('SELECT COUNT(*) AS n FROM customers').first();
  const actieve = await db.prepare("SELECT COUNT(*) AS n FROM services WHERE status = 'actief'").first();
  const openOrders = await db.prepare("SELECT COUNT(*) AS n FROM service_orders WHERE status IN ('ingediend','in_uitvoering')").first();
  const openTkt = await db.prepare("SELECT COUNT(*) AS n FROM support_tickets WHERE status IN ('open','in_behandeling')").first();

  const recentOrd = (await db.prepare(
    "SELECT o.product_key, o.submitted_at, o.created_at, c.bedrijf FROM service_orders o JOIN customers c ON c.id = o.customer_id WHERE o.status != 'concept' ORDER BY o.created_at DESC LIMIT 6",
  ).all()).results || [];
  const recentReq = (await db.prepare(
    'SELECT r.type, r.created_at, c.bedrijf FROM service_requests r JOIN customers c ON c.id = r.customer_id ORDER BY r.created_at DESC LIMIT 6',
  ).all()).results || [];
  const recentTkt = (await db.prepare(
    'SELECT t.onderwerp, t.created_at, c.bedrijf FROM support_tickets t JOIN customers c ON c.id = t.customer_id ORDER BY t.created_at DESC LIMIT 6',
  ).all()).results || [];
  const recentCust = (await db.prepare('SELECT bedrijf, created_at FROM customers ORDER BY created_at DESC LIMIT 6').all()).results || [];

  const activity = [];
  recentCust.forEach((c) => activity.push({ kind: 'klant', label: `${c.bedrijf} toegevoegd als klant`, when: toMs(c.created_at) }));
  recentOrd.forEach((o) => activity.push({ kind: 'aanvraag', label: `Nieuwe aanvraag (${o.product_key}) — ${o.bedrijf}`, when: o.submitted_at || toMs(o.created_at) }));
  recentReq.forEach((r) => activity.push({ kind: 'wijziging', label: `Wijziging (${r.type}) — ${r.bedrijf}`, when: toMs(r.created_at) }));
  recentTkt.forEach((t) => activity.push({ kind: 'ticket', label: `Supportvraag "${t.onderwerp}" — ${t.bedrijf}`, when: toMs(t.created_at) }));
  activity.sort((a, b) => b.when - a.when);

  const attention = [];
  const aOrd = (await db.prepare(
    "SELECT o.product_key, c.bedrijf FROM service_orders o JOIN customers c ON c.id = o.customer_id WHERE o.status = 'ingediend' ORDER BY o.submitted_at LIMIT 8",
  ).all()).results || [];
  const aReq = (await db.prepare(
    "SELECT r.type, c.bedrijf FROM service_requests r JOIN customers c ON c.id = r.customer_id WHERE r.status = 'open' ORDER BY r.created_at LIMIT 8",
  ).all()).results || [];
  const aTkt = (await db.prepare(
    "SELECT t.onderwerp, c.bedrijf FROM support_tickets t JOIN customers c ON c.id = t.customer_id WHERE t.status = 'open' ORDER BY t.created_at LIMIT 8",
  ).all()).results || [];
  aOrd.forEach((o) => attention.push({ kind: 'aanvraag', label: `Nieuwe aanvraag ${o.product_key} — ${o.bedrijf}`, href: '/admin/aanvragen' }));
  aReq.forEach((r) => attention.push({ kind: 'wijziging', label: `${r.type} — ${r.bedrijf}`, href: '/admin/aanvragen' }));
  aTkt.forEach((t) => attention.push({ kind: 'ticket', label: `${t.onderwerp} — ${t.bedrijf}`, href: '/admin/support' }));

  return jsonResponse({
    ok: true,
    kpi: {
      klanten: klanten?.n || 0,
      actieveDiensten: actieve?.n || 0,
      openAanvragen: openOrders?.n || 0,
      openTickets: openTkt?.n || 0,
    },
    activity: activity.slice(0, 8),
    attention,
  });
}

async function listCustomers(env) {
  const list = (await env.PORTAL_DB.prepare(
    `SELECT c.id, c.bedrijf, c.stad, c.created_at,
       (SELECT COUNT(*) FROM services s WHERE s.customer_id = c.id) AS dienst_count,
       (SELECT COUNT(*) FROM users u WHERE u.customer_id = c.id) AS user_count,
       (SELECT COUNT(*) FROM service_requests r WHERE r.customer_id = c.id AND r.status IN ('open','in_behandeling')) AS open_requests
     FROM customers c ORDER BY c.created_at DESC LIMIT 200`,
  ).all()).results || [];
  const openReq = await env.PORTAL_DB.prepare("SELECT COUNT(*) AS n FROM service_requests WHERE status IN ('open','in_behandeling')").first();
  const openTkt = await env.PORTAL_DB.prepare("SELECT COUNT(*) AS n FROM support_tickets WHERE status IN ('open','in_behandeling')").first();
  return jsonResponse({ ok: true, customers: list, totals: { openRequests: openReq?.n || 0, openTickets: openTkt?.n || 0 } });
}

async function createCustomer(request, env) {
  const b = await request.json().catch(() => null);
  const bedrijf = (b?.bedrijf || '').toString().trim();
  const eigenaarEmail = (b?.eigenaar_email || '').toString().trim().toLowerCase();
  const eigenaarNaam = (b?.eigenaar_naam || '').toString().trim();
  if (!bedrijf) return errorResponse('Bedrijfsnaam is verplicht', 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eigenaarEmail)) return errorResponse('Geldig e-mailadres voor de eigenaar is verplicht', 400);

  const exists = await env.PORTAL_DB.prepare('SELECT id FROM users WHERE email = ?').bind(eigenaarEmail).first();
  if (exists) return errorResponse('Dit e-mailadres heeft al een account', 409);

  const customerId = randomId('cust');
  await env.PORTAL_DB.prepare(
    'INSERT INTO customers (id, bedrijf, kvk, adres, postcode, stad, telefoon, factuur_email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(customerId, bedrijf, b.kvk || null, b.adres || null, b.postcode || null, b.stad || null,
    b.telefoon || null, b.factuur_email || eigenaarEmail, today()).run();
  await env.PORTAL_DB.prepare(
    'INSERT INTO users (id, customer_id, email, naam, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(randomId('usr'), customerId, eigenaarEmail, eigenaarNaam || eigenaarEmail.split('@')[0], 'eigenaar', today()).run();

  try {
    await mailCustomer(env, eigenaarEmail, eigenaarNaam, 'Welkom bij het Aanloop AI klantportaal',
      `<p>Hallo ${escapeHtml(eigenaarNaam.split(' ')[0] || 'daar')},</p>
       <p>Er is een klantportaal voor <strong>${escapeHtml(bedrijf)}</strong> voor u aangemaakt. U kunt inloggen — geen wachtwoord nodig:</p>
       <p style="margin:24px 0"><a href="https://aanloopai.nl/portal/login" style="display:inline-block;background:#4f46e5;color:#fff;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:600">Naar het klantportaal</a></p>
       <p>Vul uw e-mailadres in en u ontvangt direct een veilige inloglink.</p>`);
  } catch (err) {
    console.error('[admin] welcome email failed:', err.message || err);
  }
  return jsonResponse({ ok: true, customer_id: customerId, message: 'Klant aangemaakt' });
}

async function updateCustomer(request, env) {
  const b = await request.json().catch(() => null);
  if (!b?.id) return errorResponse('Klant-id ontbreekt', 400);
  await env.PORTAL_DB.prepare(
    'UPDATE customers SET bedrijf = ?, kvk = ?, adres = ?, postcode = ?, stad = ?, telefoon = ?, factuur_email = ? WHERE id = ?',
  ).bind((b.bedrijf || '').slice(0, 200), (b.kvk || '').slice(0, 20), (b.adres || '').slice(0, 200),
    (b.postcode || '').slice(0, 12), (b.stad || '').slice(0, 100), (b.telefoon || '').slice(0, 40),
    (b.factuur_email || '').slice(0, 160), b.id).run();
  return jsonResponse({ ok: true, message: 'Klantgegevens bijgewerkt' });
}

async function customerDetail(env, url) {
  const id = url.searchParams.get('id');
  if (!id) return errorResponse('Klant-id ontbreekt', 400);
  const db = env.PORTAL_DB;
  const customer = await db.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first();
  if (!customer) return errorResponse('Klant niet gevonden', 404);
  const users = (await db.prepare('SELECT id, email, naam, role, last_login, created_at FROM users WHERE customer_id = ? ORDER BY created_at').bind(id).all()).results || [];
  const services = (await db.prepare('SELECT id, product_key, naam, tier, status, config_json, provisioning_json, started_at, created_at FROM services WHERE customer_id = ? ORDER BY created_at').bind(id).all()).results || [];
  const invoices = (await db.prepare('SELECT id, periode, bedrag_cent, status, pdf_url, created_at FROM invoices WHERE customer_id = ? ORDER BY created_at DESC').bind(id).all()).results || [];
  return jsonResponse({ ok: true, customer, users, services, invoices });
}

async function createUser(request, env) {
  const b = await request.json().catch(() => null);
  const email = (b?.email || '').toString().trim().toLowerCase();
  if (!b?.customer_id || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorResponse('Klant-id en geldig e-mailadres zijn verplicht', 400);
  if (!['eigenaar', 'bewerker', 'kijker'].includes(b.role)) return errorResponse('Ongeldige rol', 400);
  const exists = await env.PORTAL_DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (exists) return errorResponse('Dit e-mailadres heeft al een account', 409);
  await env.PORTAL_DB.prepare(
    'INSERT INTO users (id, customer_id, email, naam, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(randomId('usr'), b.customer_id, email, (b.naam || email.split('@')[0]).slice(0, 120), b.role, today()).run();
  return jsonResponse({ ok: true, message: 'Gebruiker toegevoegd' });
}

async function createService(request, env) {
  const b = await request.json().catch(() => null);
  if (!b?.customer_id || !b?.product_key || !b?.naam) return errorResponse('Klant, product en naam zijn verplicht', 400);
  const status = ['actief', 'onboarding', 'gepauzeerd'].includes(b.status) ? b.status : 'onboarding';
  await env.PORTAL_DB.prepare(
    'INSERT INTO services (id, customer_id, product_key, naam, tier, status, config_json, started_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(randomId('svc'), b.customer_id, b.product_key, b.naam.slice(0, 120), b.tier || null, status,
    b.config ? JSON.stringify(b.config) : null, b.started_at || null, today()).run();
  return jsonResponse({ ok: true, message: 'Dienst toegevoegd' });
}

export async function updateService(request, env) {
  const b = await request.json().catch(() => null);
  if (!b?.id) return errorResponse('Dienst-id ontbreekt', 400);
  const current = await env.PORTAL_DB.prepare(
    'SELECT status, tier, naam, config_json, started_at, provisioning_json, order_id, product_key FROM services WHERE id = ?',
  ).bind(b.id).first();
  if (!current) return errorResponse('Dienst niet gevonden', 404);
  const status = ['actief', 'onboarding', 'gepauzeerd'].includes(b.status) ? b.status : current.status;

  // Pauzeren: de agent+kennisbank echt opruimen (nooit een spookdienst laten
  // doorpraten) en provisioning_json wissen, zodat een latere hervatting
  // hieronder ziet dat er opnieuw geprovisioned moet worden.
  if (status === 'gepauzeerd' && current.status !== 'gepauzeerd') {
    await teardownProvisioning(env, safeParseJson(current.provisioning_json));
    await env.PORTAL_DB.prepare(
      'UPDATE services SET naam = ?, tier = ?, status = ?, config_json = ?, started_at = ?, provisioning_json = NULL WHERE id = ?',
    ).bind((b.naam ?? current.naam).slice(0, 120), b.tier ?? current.tier, status,
      b.config !== undefined ? JSON.stringify(b.config) : current.config_json, current.started_at, b.id).run();
    return jsonResponse({ ok: true, message: 'Dienst gepauzeerd' });
  }

  // Hervatten: als er geen geldige provisioning meer is (nooit gedraaid, of
  // eerder mislukt) en dit product zichzelf kan (her)inrichten, laat
  // activateOrder de re-provisioning + de service/order-status zelf bepalen
  // — niet hier overschrijven met een losse UPDATE.
  if (status === 'actief') {
    const prov = safeParseJson(current.provisioning_json);
    const provisioningLeeg = !current.provisioning_json || prov.status === 'fout';
    if (provisioningLeeg && canProvision(current.product_key) && current.order_id) {
      const order = await env.PORTAL_DB.prepare('SELECT * FROM service_orders WHERE id = ?').bind(current.order_id).first();
      if (order) {
        await activateOrder(env, order);
        return jsonResponse({ ok: true, message: 'Dienst hervat' });
      }
    }
  }

  // Anders: naam/tier/config/status bijwerken zonder teardown of re-provisioning.
  // Stamp started_at the first time a service becomes actief.
  const startedAt = (status === 'actief' && !current.started_at) ? today() : current.started_at;
  await env.PORTAL_DB.prepare(
    'UPDATE services SET naam = ?, tier = ?, status = ?, config_json = ?, started_at = ? WHERE id = ?',
  ).bind((b.naam ?? current.naam).slice(0, 120), b.tier ?? current.tier, status,
    b.config !== undefined ? JSON.stringify(b.config) : current.config_json, startedAt, b.id).run();
  return jsonResponse({ ok: true, message: 'Dienst bijgewerkt' });
}

async function listRequests(env, url) {
  const status = url.searchParams.get('status');
  const base = `SELECT r.id, r.customer_id, r.user_id, r.type, r.service_id, r.product_key, r.bericht,
      r.status, r.admin_notitie, r.created_at, r.handled_at, c.bedrijf, u.naam AS user_naam, u.email AS user_email
    FROM service_requests r
    JOIN customers c ON c.id = r.customer_id
    JOIN users u ON u.id = r.user_id`;
  const q = status
    ? env.PORTAL_DB.prepare(`${base} WHERE r.status = ? ORDER BY r.created_at DESC LIMIT 200`).bind(status)
    : env.PORTAL_DB.prepare(`${base} ORDER BY r.created_at DESC LIMIT 200`);
  return jsonResponse({ ok: true, requests: (await q.all()).results || [] });
}

async function fulfillRequest(request, env) {
  const b = await request.json().catch(() => null);
  if (!b?.id || !['open', 'in_behandeling', 'afgerond', 'afgewezen'].includes(b.status)) {
    return errorResponse('Ongeldige aanvraag', 400);
  }
  const handledAt = (b.status === 'afgerond' || b.status === 'afgewezen') ? Date.now() : null;
  await env.PORTAL_DB.prepare(
    'UPDATE service_requests SET status = ?, admin_notitie = ?, handled_at = ? WHERE id = ?',
  ).bind(b.status, (b.admin_notitie || '').slice(0, 2000), handledAt, b.id).run();
  return jsonResponse({ ok: true, message: 'Aanvraag bijgewerkt' });
}

async function listTickets(env, url) {
  const status = url.searchParams.get('status');
  const base = `SELECT t.id, t.customer_id, t.onderwerp, t.bericht, t.status, t.admin_antwoord,
      t.created_at, t.updated_at, c.bedrijf, u.naam AS user_naam, u.email AS user_email
    FROM support_tickets t
    JOIN customers c ON c.id = t.customer_id
    JOIN users u ON u.id = t.user_id`;
  const q = status
    ? env.PORTAL_DB.prepare(`${base} WHERE t.status = ? ORDER BY t.created_at DESC LIMIT 200`).bind(status)
    : env.PORTAL_DB.prepare(`${base} ORDER BY t.created_at DESC LIMIT 200`);
  return jsonResponse({ ok: true, tickets: (await q.all()).results || [] });
}

async function answerTicket(request, env) {
  const b = await request.json().catch(() => null);
  if (!b?.id || !['open', 'in_behandeling', 'beantwoord', 'gesloten'].includes(b.status)) {
    return errorResponse('Ongeldige aanvraag', 400);
  }
  const ticket = await env.PORTAL_DB.prepare(
    `SELECT t.onderwerp, u.email, u.naam, u.notif_json FROM support_tickets t JOIN users u ON u.id = t.user_id WHERE t.id = ?`,
  ).bind(b.id).first();
  if (!ticket) return errorResponse('Ticket niet gevonden', 404);

  await env.PORTAL_DB.prepare(
    'UPDATE support_tickets SET admin_antwoord = ?, status = ?, updated_at = ? WHERE id = ?',
  ).bind((b.admin_antwoord || '').slice(0, 4000), b.status, Date.now(), b.id).run();

  // Respect the customer's notification preference (default: on).
  const wantsMail = safeParseJson(ticket.notif_json).ticket_antwoord !== false;
  if (wantsMail && b.admin_antwoord && (b.status === 'beantwoord' || b.status === 'gesloten')) {
    try {
      await mailCustomer(env, ticket.email, ticket.naam, `Antwoord op uw vraag: ${ticket.onderwerp}`,
        `<p>Hallo ${escapeHtml((ticket.naam || '').split(' ')[0] || 'daar')},</p>
         <p>We hebben gereageerd op uw vraag <strong>"${escapeHtml(ticket.onderwerp)}"</strong>:</p>
         <p style="padding:12px 16px;background:#f8fafc;border-left:3px solid #4f46e5;border-radius:6px">${escapeHtml(b.admin_antwoord).replace(/\n/g, '<br>')}</p>
         <p>U kunt het volledige ticket bekijken in het <a href="https://aanloopai.nl/portal/support">klantportaal</a>.</p>`);
    } catch (err) {
      console.error('[admin] ticket answer email failed:', err.message || err);
    }
  }
  return jsonResponse({ ok: true, message: 'Ticket bijgewerkt' });
}

// ── service orders / intake ─────────────────────────────────────────────────
function safeParseJson(s) {
  if (!s) return {};
  try { return JSON.parse(s); } catch { return {}; }
}

async function listOrders(env, url) {
  const status = url.searchParams.get('status');
  const base = `SELECT o.id, o.customer_id, o.product_key, o.tier, o.status, o.created_at,
      o.submitted_at, c.bedrijf, u.naam AS user_naam, u.email AS user_email
    FROM service_orders o
    JOIN customers c ON c.id = o.customer_id
    JOIN users u ON u.id = o.user_id`;
  const q = status
    ? env.PORTAL_DB.prepare(`${base} WHERE o.status = ? ORDER BY o.created_at DESC LIMIT 200`).bind(status)
    : env.PORTAL_DB.prepare(`${base} ORDER BY o.created_at DESC LIMIT 200`);
  return jsonResponse({ ok: true, orders: (await q.all()).results || [] });
}

async function orderDetail(env, url) {
  const id = url.searchParams.get('id');
  if (!id) return errorResponse('Aanvraag-id ontbreekt', 400);
  const o = await env.PORTAL_DB.prepare('SELECT * FROM service_orders WHERE id = ?').bind(id).first();
  if (!o) return errorResponse('Aanvraag niet gevonden', 404);
  const c = await env.PORTAL_DB.prepare('SELECT id, bedrijf FROM customers WHERE id = ?').bind(o.customer_id).first();
  return jsonResponse({ ok: true, order: { ...o, intake: safeParseJson(o.intake_json) }, customer: c });
}

// Exported for testability only — has no authorization check of its own. Callers
// MUST route through handleAdminApi() above, which gates on getSessionUser()
// + role === 'staff' before dispatching here. Never wire this into a path that
// skips that dispatcher.
export async function updateOrder(request, env) {
  const b = await request.json().catch(() => null);
  const valid = ['concept', 'ingediend', 'in_uitvoering', 'actief', 'geannuleerd'];
  if (!b?.id || !valid.includes(b.status)) return errorResponse('Ongeldige aanvraag', 400);
  const o = await env.PORTAL_DB.prepare('SELECT * FROM service_orders WHERE id = ?').bind(b.id).first();
  if (!o) return errorResponse('Aanvraag niet gevonden', 404);

  // 'actief' runs the same activateOrder() the Mollie webhook uses: the service
  // row is materialised and, where supported, the agent is provisioned —
  // idempotently. The happy path already activated itself when the payment came
  // in, so this click is a manual override / retry after a failure.
  //
  // manual:true lets staff declare a human-delivered product done. It does NOT
  // let anyone mark an auto-provisionable product live without a successful
  // provisioning run — activateOrder decides that, not this handler.
  if (b.status === 'actief') {
    const result = await activateOrder(env, o, { manual: true });
    if (result.blocked) {
      return errorResponse('Deze aanvraag is geannuleerd. Zet hem eerst op "ingediend" voordat je hem activeert.', 409);
    }
    if (result.status === 'wacht_op_klant') {
      // Currently unreachable: activateOrder() only returns wacht_op_klant when
      // manual is falsy (see activation.js), and the call above always passes
      // manual: true. Left in place as a safety net for the day this handler
      // (or a future caller of activateOrder from here) stops forcing manual:true.
      // NOT a failure: this is the self-serve funnel's normal intermediate
      // state (spec §5) — the agent provisioned fine, but the deep intake
      // hasn't happened yet. activateOrder() never calls alertStaff() for
      // this outcome, so pointing staff at "de alert" would send them
      // looking for something that, by design, was never sent.
      return jsonResponse({
        ok: true,
        status: result.status,
        message: 'Dienst aangemaakt en het account is ingericht, maar de order wacht nog op de diepe intake van de klant (self-serve funnel) — dit is normaal, geen storing.',
      });
    }
    if (result.status !== 'actief') {
      // Do not report success for an activation that did not complete: the
      // service exists but is not live. Staff already got the alert from
      // activateOrder(), which also parked the order on in_uitvoering.
      return jsonResponse({
        ok: true,
        status: result.status,
        message: 'Dienst aangemaakt, maar de inrichting is niet afgerond — order staat op in_uitvoering. Zie de alert voor de oorzaak.',
      });
    }
    return jsonResponse({ ok: true, status: 'actief', message: 'Aanvraag actief — dienst is ingericht.' });
  }

  await env.PORTAL_DB.prepare('UPDATE service_orders SET status = ? WHERE id = ?').bind(b.status, b.id).run();
  return jsonResponse({ ok: true, status: b.status, message: 'Aanvraag bijgewerkt' });
}

// ── inbound leads (public forms) ────────────────────────────────────────────
async function listLeads(env, url) {
  const status = url.searchParams.get('status');
  const base = `SELECT id, created_at, form_type, email, naam, bedrijf, telefoon, bericht,
      status, mail_status, mail_error, notitie FROM inbound_leads`;
  const q = status
    ? env.PORTAL_DB.prepare(`${base} WHERE status = ? ORDER BY created_at DESC LIMIT 200`).bind(status)
    : env.PORTAL_DB.prepare(`${base} ORDER BY created_at DESC LIMIT 200`);
  return jsonResponse({ ok: true, leads: (await q.all()).results || [] });
}

async function updateLead(request, env) {
  const b = await request.json().catch(() => null);
  const valid = ['nieuw', 'in_behandeling', 'gewonnen', 'verloren'];
  if (!b?.id) return errorResponse('Lead-id ontbreekt', 400);
  if (b.status !== undefined && !valid.includes(b.status)) return errorResponse('Ongeldige status', 400);

  const sets = [];
  const binds = [];
  if (b.status !== undefined) { sets.push('status = ?'); binds.push(b.status); }
  if (b.notitie !== undefined) { sets.push('notitie = ?'); binds.push(String(b.notitie).slice(0, 2000)); }
  if (!sets.length) return errorResponse('Niets om bij te werken', 400);
  binds.push(b.id);

  const res = await env.PORTAL_DB.prepare(`UPDATE inbound_leads SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
  if (!res.meta?.changes) return errorResponse('Lead niet gevonden', 404);
  return jsonResponse({ ok: true, message: 'Lead bijgewerkt' });
}

async function createInvoice(request, env) {
  const b = await request.json().catch(() => null);
  const bedrag = parseInt(b?.bedrag_cent, 10);
  if (!b?.customer_id || !b?.periode || !Number.isFinite(bedrag)) {
    return errorResponse('Klant, periode en bedrag zijn verplicht', 400);
  }
  const status = b.status === 'betaald' ? 'betaald' : 'open';
  const subtotaal = Math.round(bedrag / (1 + BTW_RATE));
  const btw = bedrag - subtotaal;

  const year = new Date().getFullYear();
  const cName = `factuur-${year}`;
  // Atomic single-statement counter — no COUNT()+1 race. Uses the SAME counter
  // key/sequence as webhook-created invoices (mollie.js createInvoice) so
  // admin- and webhook-created invoices share one factuurnummer sequence.
  await env.PORTAL_DB.prepare('INSERT OR IGNORE INTO counters (name, n) VALUES (?, 0)').bind(cName).run();
  const seq = await env.PORTAL_DB.prepare('UPDATE counters SET n = n + 1 WHERE name = ? RETURNING n').bind(cName).first();
  const factuurnummer = `${year}-${String(seq?.n || 1).padStart(4, '0')}`;

  await env.PORTAL_DB.prepare(
    'INSERT INTO invoices (id, customer_id, periode, bedrag_cent, status, factuurnummer, subtotaal_cent, btw_cent, pdf_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(randomId('inv'), b.customer_id, b.periode.toString().slice(0, 40), bedrag, status,
    factuurnummer, subtotaal, btw, (b.pdf_url || '').toString().slice(0, 500) || null, today()).run();
  return jsonResponse({ ok: true, message: 'Factuur toegevoegd' });
}

// ── leadgen (keukeninbeeld.nl partner feed) ─────────────────────────────────
async function leadgenLeads(env) {
  if (!env.KEUKENINBEELD_TOKEN) return errorResponse('Leadgen niet geconfigureerd', 503);
  try {
    const upstream = await fetch(`https://keukeninbeeld.nl/api/leads?token=${env.KEUKENINBEELD_TOKEN}`);
    if (!upstream.ok) return errorResponse(`Leadgen-bron onbereikbaar (${upstream.status})`, 502);
    const data = await upstream.json();
    return jsonResponse(data);
  } catch (err) {
    console.error('[admin] leadgen leads fetch failed:', err.message || err);
    return errorResponse('Leadgen-bron onbereikbaar', 502);
  }
}

async function leadgenProspects(env) {
  if (!env.KEUKENINBEELD_TOKEN) return errorResponse('Leadgen niet geconfigureerd', 503);
  try {
    const upstream = await fetch(`https://keukeninbeeld.nl/api/prospects?token=${env.KEUKENINBEELD_TOKEN}`);
    if (!upstream.ok) return errorResponse(`Leadgen-bron onbereikbaar (${upstream.status})`, 502);
    const data = await upstream.json();
    return jsonResponse(data);
  } catch (err) {
    console.error('[admin] leadgen prospects fetch failed:', err.message || err);
    return errorResponse('Leadgen-bron onbereikbaar', 502);
  }
}

// ── F3.2: verkoop registreren — een keukeninbeeld-lead verkopen aan een
// outreach-prospect (koper). Atomiciteit: eerst naar keukeninbeeld.nl
// schrijven, pas bij succes lokaal (crm_deals + prospect-status) muteren —
// zo staat er nooit een lokale "verkocht"-registratie zonder dat de upstream
// bron het ook weet.
async function leadgenVerkoop(request, env) {
  if (!env.KEUKENINBEELD_TOKEN) return errorResponse('Leadgen niet geconfigureerd', 503);
  const body = await request.json().catch(() => null);

  const leadId = Number(body?.lead_id);
  const koperProspectId = Number(body?.koper_prospect_id);
  const prijsEur = Number(body?.prijs_eur);
  const exclusief = !!body?.exclusief;

  if (!Number.isInteger(leadId) || leadId <= 0) return errorResponse('Ongeldig lead_id', 400);
  if (!Number.isInteger(koperProspectId) || koperProspectId <= 0) return errorResponse('Ongeldig koper_prospect_id', 400);
  if (!Number.isFinite(prijsEur) || prijsEur <= 0) return errorResponse('Ongeldige prijs', 400);

  const koper = await env.PORTAL_DB.prepare('SELECT id, bedrijfsnaam, status FROM outreach_prospects WHERE id = ?')
    .bind(koperProspectId).first();
  if (!koper) return errorResponse('Koper-prospect niet gevonden', 404);

  // Idempotentie: een lead mag maar één keer verkocht worden. Zonder deze guard
  // maakt een dubbele submit (dubbelklik/retry) twee crm_deals én een tweede
  // upstream-verkoop bij keukeninbeeld.nl. lead_id staat niet als kolom op
  // crm_deals, maar wél in de meta van de 'lead verkocht'-activity — check daar
  // vóór de upstream-write, zodat we ook geen dubbele bron-mutatie veroorzaken.
  const alVerkocht = await env.PORTAL_DB.prepare(
    `SELECT id FROM crm_activities
     WHERE soort = 'status_change' AND json_extract(meta_json, '$.lead_id') = ?
     LIMIT 1`,
  ).bind(leadId).first();
  if (alVerkocht) return errorResponse('Deze lead is al verkocht', 409);

  try {
    const upstream = await fetch(`https://keukeninbeeld.nl/api/verkopen?token=${env.KEUKENINBEELD_TOKEN}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lead_id: leadId, koper: koper.bedrijfsnaam, prijs_eur: prijsEur, exclusief: exclusief ? 1 : 0,
      }),
    });
    if (!upstream.ok) return errorResponse(`Verkoop registreren bij keukeninbeeld.nl mislukt (${upstream.status})`, 502);
  } catch (err) {
    console.error('[admin] leadgen verkoop upstream mislukt:', err.message || err);
    return errorResponse('Verkoop registreren bij keukeninbeeld.nl mislukt', 502);
  }

  const waardeCent = Math.round(prijsEur * 100);
  const inserted = await env.PORTAL_DB.prepare(
    `INSERT INTO crm_deals (entity_type, entity_id, naam, pipeline, stage, waarde_cent, kans_pct, status, won_at, bron)
     VALUES ('prospect', ?, ?, 'outreach', 'gewonnen', ?, 100, 'won', ?, 'leadgen')`,
  ).bind(koperProspectId, `Lead verkoop — ${koper.bedrijfsnaam}`, waardeCent, today()).run();
  const dealId = inserted.meta.last_row_id;

  await env.PORTAL_DB.prepare('UPDATE outreach_prospects SET status = ? WHERE id = ?')
    .bind('klant', koperProspectId).run();
  await logCrmActivity(env, {
    entityType: 'prospect', entityId: koperProspectId, soort: 'status_change',
    titel: `Klant geworden — lead verkocht (€${prijsEur})`,
    meta: { deal_id: dealId, lead_id: leadId, prijs_eur: prijsEur, exclusief },
  });

  return jsonResponse({ ok: true, deal_id: dealId });
}

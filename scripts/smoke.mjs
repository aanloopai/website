#!/usr/bin/env node
/**
 * End-to-end smoke test for the Aanloop AI worker.
 *
 * Exercises both journeys against a running worker:
 *   1. prospect  — public forms (/api/submit), validation, honeypot, persistence
 *   2. customer  — magic-link login, every /api/portal/* route, order lifecycle
 *
 * Run against a local `wrangler dev --local` (default) or a deployed origin:
 *   node scripts/smoke.mjs                        # http://127.0.0.1:8787, seeds local D1
 *   BASE=https://aanloopai.nl node scripts/smoke.mjs --read-only
 *
 * --read-only skips every test that writes, so it is safe against production.
 *
 * Local mode seeds a throwaway customer + user straight into the local D1 and
 * mints its own magic-link token, so the login leg runs for real without a mail
 * provider. Every seeded row is deleted again in the finally block.
 */
import { execSync } from 'node:child_process';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const READ_ONLY = process.argv.includes('--read-only');
const LOCAL = BASE.includes('127.0.0.1') || BASE.includes('localhost');
// checkOrigin() in portal-routes.js compares against this exact literal.
const ORIGIN = 'https://aanloopai.nl';

let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail++;
    failures.push(`${name} — ${detail}`);
    console.log(`  FAIL  ${name} — ${detail}`);
  }
}
function section(title) {
  console.log(`\n=== ${title} ===`);
}

// A fresh client IP per call: the public endpoints are IP-rate-limited (5
// submits / 10 min), which would otherwise make a second run of this suite fail
// on 429s that say nothing about the code under test. Locally CF-Connecting-IP
// is trusted as-is; against production this header is set by the edge and ours
// is ignored, which is exactly what we want.
const randomIp = () => `203.0.113.${1 + Math.floor(Math.random() * 250)}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(path, { method = 'GET', body, cookie, origin = true, form, ip = randomIp() } = {}) {
  const headers = { 'CF-Connecting-IP': ip };
  if (origin && method !== 'GET') headers.Origin = ORIGIN;
  if (cookie) headers.Cookie = cookie;
  let payload;
  if (form) {
    payload = new URLSearchParams(form).toString();
    headers['content-type'] = 'application/x-www-form-urlencoded';
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    headers['content-type'] = 'application/json';
  }

  // `wrangler d1 execute --local` touches the same .wrangler state the dev
  // server holds, which makes it drop in-flight connections. Retry the
  // transport, never the assertion.
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, { method, headers, body: payload, redirect: 'manual' });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch { /* html or empty body */ }
      return { status: res.status, headers: res.headers, text, json };
    } catch (err) {
      lastErr = err;
      await sleep(400);
    }
  }
  throw lastErr;
}

// ── local D1 helpers ───────────────────────────────────────────────────────
function d1(sql) {
  // execSync + shell so this works on Windows (npx.cmd is not directly spawnable).
  // SQL is built from test-controlled literals only — never from request data.
  const out = execSync(
    `npx wrangler d1 execute aanloop-portal --local --json --command "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const start = out.indexOf('[');
  if (start === -1) return [];
  try { return JSON.parse(out.slice(start))[0]?.results ?? []; } catch { return []; }
}

const sha256Hex = (s) => createHash('sha256').update(s).digest('hex');

function seedCustomer() {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const customerId = `smoke-cust-${stamp}`;
  const userId = `smoke-user-${stamp}`;
  const email = `smoke+${stamp}@example.com`;
  const token = randomBytes(32).toString('hex');
  const expires = Date.now() + 15 * 60 * 1000;
  const day = new Date().toISOString().slice(0, 10);
  d1(`INSERT INTO customers (id, bedrijf, factuur_email, created_at) VALUES ('${customerId}', 'Smoke BV', '${email}', '${day}')`);
  d1(`INSERT INTO users (id, customer_id, email, naam, role, created_at) VALUES ('${userId}', '${customerId}', '${email}', 'Smoke Tester', 'eigenaar', '${day}')`);
  d1(`INSERT INTO magic_links (token_hash, user_id, expires_at, used, created_at) VALUES ('${sha256Hex(token)}', '${userId}', ${expires}, 0, ${Date.now()})`);
  return { customerId, userId, email, token };
}

function cleanupCustomer(customerId, userId) {
  for (const t of ['service_orders', 'service_requests', 'support_tickets', 'invoices', 'services']) {
    d1(`DELETE FROM ${t} WHERE customer_id = '${customerId}'`);
  }
  d1(`DELETE FROM magic_links WHERE user_id = '${userId}'`);
  d1(`DELETE FROM users WHERE id = '${userId}'`);
  d1(`DELETE FROM customers WHERE id = '${customerId}'`);
}

// ── 1. infrastructure ──────────────────────────────────────────────────────
async function testHealth() {
  section('infra');
  const r = await req('/api/health');
  check('GET /api/health → 200', r.status === 200, `status=${r.status}`);
  check('health payload has status:ok', r.json?.status === 'ok', JSON.stringify(r.json));
}

// ── 2. prospect journey ────────────────────────────────────────────────────
async function testProspect() {
  section('prospect (public forms)');

  const invalid = await req('/api/submit', { method: 'POST', form: { form_type: 'contact', email: 'not-an-email', naam: 'X' } });
  check('POST /api/submit rejects an invalid email (400)', invalid.status === 400, `status=${invalid.status} body=${invalid.text.slice(0, 120)}`);

  const honey = await req('/api/submit', {
    method: 'POST',
    form: { form_type: 'contact', email: 'bot@example.com', naam: 'Bot', botcheck: 'i-am-a-bot' },
  });
  check('POST /api/submit honeypot returns a fake success', honey.status === 200 && honey.json?.success === true, `status=${honey.status}`);

  if (READ_ONLY) {
    console.log('  SKIP  live submit (read-only mode)');
    return;
  }

  const email = `smoke-lead+${Date.now()}@example.com`;
  const r = await req('/api/submit', {
    method: 'POST',
    form: { form_type: 'contact', email, naam: 'Smoke Prospect', bedrijf: 'Smoke BV', bericht: 'smoke test', privacy: 'on' },
  });
  check('POST /api/submit is accepted (200)', r.status === 200, `status=${r.status} body=${r.text.slice(0, 160)}`);

  if (!LOCAL) return;

  const rows = d1(`SELECT id, status, form_type FROM inbound_leads WHERE email = '${email}'`);
  check('submit persists an inbound_leads row', rows.length === 1, `rows=${rows.length}`);
  check('lead lands in status "nieuw"', rows[0]?.status === 'nieuw', `status=${rows[0]?.status}`);
  if (rows.length) d1(`DELETE FROM inbound_leads WHERE email = '${email}'`);

  // A dead mail provider must never lose the lead: D1 write happens before the mail.
  const email2 = `smoke-lead2+${Date.now()}@example.com`;
  const r2 = await req('/api/submit', { method: 'POST', form: { form_type: 'demo', email: email2, naam: 'Mail Down' } });
  const rows2 = d1(`SELECT id FROM inbound_leads WHERE email = '${email2}'`);
  check('lead survives a failing mail provider', rows2.length === 1, `rows=${rows2.length} submit_status=${r2.status}`);
  if (rows2.length) d1(`DELETE FROM inbound_leads WHERE email = '${email2}'`);
}

// ── 3. customer journey ────────────────────────────────────────────────────
async function testCustomer() {
  section('customer (portal)');

  const anon = await req('/api/portal/me');
  check('GET /api/portal/me without a session → 401', anon.status === 401, `status=${anon.status}`);

  const noOrigin = await req('/api/portal/tickets', { method: 'POST', body: { onderwerp: 'x', bericht: 'y' }, origin: false });
  check('mutating call without an Origin header → 403', noOrigin.status === 403, `status=${noOrigin.status}`);

  if (!LOCAL) {
    console.log('  SKIP  logged-in journey (needs a local D1 seed)');
    return;
  }

  // Unique address per run: the email-hash rate limit (3 / 10 min) would
  // otherwise 429 the second run of the day and hide the real behaviour.
  const unknown = await req('/api/auth/request', { method: 'POST', body: { email: `nobody-${Date.now()}@example.com` } });
  check('POST /api/auth/request stays enumeration-safe for an unknown email', unknown.status === 200, `status=${unknown.status} body=${unknown.text.slice(0, 120)}`);

  const { customerId, userId, email, token } = seedCustomer();
  try {
    const known = await req('/api/auth/request', { method: 'POST', body: { email } });
    check('POST /api/auth/request for a known email reports the mail outage honestly',
      known.status === 502, `status=${known.status} body=${known.text.slice(0, 140)}`);

    const getVerify = await req(`/api/auth/verify?token=${token}`);
    check('GET /api/auth/verify does NOT consume the token (302, no cookie)',
      getVerify.status === 302 && !getVerify.headers.get('set-cookie'), `status=${getVerify.status}`);

    const verify = await req('/api/auth/verify', { method: 'POST', form: { token } });
    const setCookie = verify.headers.get('set-cookie') || '';
    check('POST /api/auth/verify mints a session', verify.status === 200 && setCookie.includes('aanloop_portal_session'), `status=${verify.status} body=${verify.text.slice(0, 120)}`);
    check('session cookie is HttpOnly + Secure + SameSite=Strict',
      /HttpOnly/i.test(setCookie) && /Secure/i.test(setCookie) && /SameSite=Strict/i.test(setCookie), setCookie.split(';').slice(1).join(';').trim());

    const cookie = setCookie.split(';')[0];

    const replay = await req('/api/auth/verify', { method: 'POST', form: { token } });
    check('magic-link token is single-use (replay rejected)', replay.status >= 400, `status=${replay.status}`);

    const me = await req('/api/portal/me', { cookie });
    check('GET /api/portal/me with a session → 200', me.status === 200, `status=${me.status}`);
    check('/api/portal/me returns the seeded customer', me.json?.user?.email === email, JSON.stringify(me.json).slice(0, 120));

    for (const path of ['/api/portal/overview', '/api/portal/services', '/api/portal/requests',
      '/api/portal/invoices', '/api/portal/tickets', '/api/portal/settings', '/api/portal/team', '/api/portal/orders']) {
      const r = await req(path, { cookie });
      check(`GET ${path} → 200`, r.status === 200, `status=${r.status} body=${r.text.slice(0, 100)}`);
    }

    const ticket = await req('/api/portal/tickets', { method: 'POST', cookie, body: { onderwerp: 'Smoke', bericht: 'Smoke ticket' } });
    check('POST /api/portal/tickets creates a ticket', ticket.status === 200 && ticket.json?.ok, `status=${ticket.status} body=${ticket.text.slice(0, 120)}`);

    const order = await req('/api/portal/orders', { method: 'POST', cookie, body: { product_key: 'emma', tier: 'starter' } });
    const orderId = order.json?.id;
    check('POST /api/portal/orders creates a concept order', order.status === 200 && !!orderId, `status=${order.status} body=${order.text.slice(0, 160)}`);

    if (orderId) {
      const saved = await req('/api/portal/order', { method: 'PATCH', cookie, body: { id: orderId, intake: { bedrijf: 'Smoke BV' } } });
      check('PATCH /api/portal/order saves the intake', saved.status === 200, `status=${saved.status} body=${saved.text.slice(0, 120)}`);

      const got = await req(`/api/portal/order?id=${orderId}`, { cookie });
      check('GET /api/portal/order returns the order', got.status === 200 && got.json?.order?.id === orderId, `status=${got.status}`);
    }

    // IDOR: a second customer must not be able to read the first customer's order.
    const other = seedCustomer();
    try {
      const otherVerify = await req('/api/auth/verify', { method: 'POST', form: { token: other.token } });
      const otherCookie = (otherVerify.headers.get('set-cookie') || '').split(';')[0];
      const idor = await req(`/api/portal/order?id=${orderId}`, { cookie: otherCookie });
      check('another customer cannot read this order (IDOR)', idor.status === 404 || idor.status === 403, `status=${idor.status}`);
    } finally {
      cleanupCustomer(other.customerId, other.userId);
    }

    const logout = await req('/api/auth/logout', { method: 'POST', cookie });
    check('POST /api/auth/logout clears the cookie', /Max-Age=0/.test(logout.headers.get('set-cookie') || ''), logout.headers.get('set-cookie') || 'no cookie');
  } finally {
    cleanupCustomer(customerId, userId);
  }
}

// ── 4. admin surface + activation ──────────────────────────────────────────
// Mints its own staff session with the local PORTAL_SESSION_SECRET (same
// construction as createSession() in src/lib/auth.js) so the admin routes and
// activateOrder() are exercised for real, without a password or a mail round-trip.
function staffCookie(userId, secret) {
  const payload = JSON.stringify({ uid: userId, exp: Date.now() + 3600_000 });
  const body = Buffer.from(payload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const sig = createHmac('sha256', secret).update(body).digest('hex');
  return `aanloop_portal_session=${body}.${sig}`;
}

function localSecret() {
  try {
    const m = readFileSync('.dev.vars', 'utf8').match(/^PORTAL_SESSION_SECRET=(.+)$/m);
    return m?.[1]?.trim() || null;
  } catch { return null; }
}

async function testAdmin() {
  section('admin + activation');
  for (const path of ['/api/admin/orders', '/api/admin/requests', '/api/admin/leads']) {
    const r = await req(path);
    check(`GET ${path} without a staff session is refused`, r.status === 401 || r.status === 403, `status=${r.status}`);
  }

  const secret = LOCAL ? localSecret() : null;
  if (!secret) {
    console.log('  SKIP  staff journey (needs local .dev.vars PORTAL_SESSION_SECRET)');
    return;
  }

  const stamp = `${Date.now()}`;
  const staffId = `smoke-staff-${stamp}`;
  const day = new Date().toISOString().slice(0, 10);
  d1(`INSERT INTO users (id, customer_id, email, naam, role, created_at) VALUES ('${staffId}', NULL, 'smoke-staff+${stamp}@example.com', 'Smoke Staff', 'staff', '${day}')`);
  const cookie = staffCookie(staffId, secret);

  const { customerId, userId } = seedCustomer();
  const orderId = `smoke-ord-${stamp}`;
  d1(`INSERT INTO service_orders (id, customer_id, user_id, product_key, tier, status, created_at) VALUES ('${orderId}', '${customerId}', '${userId}', 'emma', 'starter', 'ingediend', ${Date.now()})`);

  try {
    const leads = await req('/api/admin/leads', { cookie });
    check('GET /api/admin/leads with a staff session → 200', leads.status === 200 && Array.isArray(leads.json?.leads), `status=${leads.status} body=${leads.text.slice(0, 120)}`);

    const orders = await req('/api/admin/orders', { cookie });
    check('GET /api/admin/orders with a staff session → 200', orders.status === 200, `status=${orders.status}`);

    // The core fix: activating an order materialises the service the customer
    // paid for. Without an ElevenLabs key this product cannot be provisioned,
    // so it must stop at in_uitvoering and NOT claim to be active.
    const activate = await req('/api/admin/order', { method: 'PATCH', cookie, body: { id: orderId, status: 'actief' } });
    check('PATCH /api/admin/order → actief runs activation', activate.status === 200, `status=${activate.status} body=${activate.text.slice(0, 160)}`);

    const svc = d1(`SELECT id, status FROM services WHERE order_id = '${orderId}'`);
    check('activation materialises a service row', svc.length === 1, `rows=${svc.length}`);

    const ord = d1(`SELECT status FROM service_orders WHERE id = '${orderId}'`);
    check('unprovisionable order stops at in_uitvoering (never a false "actief")',
      ord[0]?.status === 'in_uitvoering', `status=${ord[0]?.status}`);

    // Idempotency: a webhook replay / second click must not create a 2nd service.
    await req('/api/admin/order', { method: 'PATCH', cookie, body: { id: orderId, status: 'actief' } });
    const svc2 = d1(`SELECT id FROM services WHERE order_id = '${orderId}'`);
    check('activation is idempotent (no duplicate service)', svc2.length === 1, `rows=${svc2.length}`);

    // A cancelled order must never provision (it would bill for an agent the
    // customer walked away from).
    d1(`UPDATE service_orders SET status = 'geannuleerd' WHERE id = '${orderId}'`);
    const cancelled = await req('/api/admin/order', { method: 'PATCH', cookie, body: { id: orderId, status: 'actief' } });
    check('a cancelled order cannot be activated', cancelled.status === 409, `status=${cancelled.status}`);

    // Already provisioned + already live: re-saving must NOT downgrade it back
    // to in_uitvoering, and must not provision a second agent.
    const liveId = `smoke-ord-live-${stamp}`;
    d1(`INSERT INTO service_orders (id, customer_id, user_id, product_key, tier, status, created_at) VALUES ('${liveId}', '${customerId}', '${userId}', 'emma', 'starter', 'actief', ${Date.now()})`);
    d1(`INSERT INTO services (id, customer_id, product_key, naam, tier, status, order_id, provisioning_json, created_at) VALUES ('smoke-svc-${stamp}', '${customerId}', 'emma', 'emma', 'starter', 'onboarding', '${liveId}', '{"status":"ok","agent_id":"ag_smoke"}', '${day}')`);
    const resave = await req('/api/admin/order', { method: 'PATCH', cookie, body: { id: liveId, status: 'actief' } });
    const liveAfter = d1(`SELECT status FROM service_orders WHERE id = '${liveId}'`);
    check('re-saving a live order keeps it actief (no false downgrade)',
      resave.status === 200 && liveAfter[0]?.status === 'actief', `http=${resave.status} status=${liveAfter[0]?.status}`);

    // Human-delivered product (not auto-provisionable): staff CAN declare it done.
    const manualId = `smoke-ord-manual-${stamp}`;
    d1(`INSERT INTO service_orders (id, customer_id, user_id, product_key, tier, status, created_at) VALUES ('${manualId}', '${customerId}', '${userId}', 'website', 'starter', 'ingediend', ${Date.now()})`);
    const manual = await req('/api/admin/order', { method: 'PATCH', cookie, body: { id: manualId, status: 'actief' } });
    const manualAfter = d1(`SELECT status FROM service_orders WHERE id = '${manualId}'`);
    check('staff can activate a human-delivered product', manual.status === 200 && manualAfter[0]?.status === 'actief',
      `http=${manual.status} status=${manualAfter[0]?.status}`);

    d1(`DELETE FROM services WHERE order_id IN ('${liveId}', '${manualId}')`);
    d1(`DELETE FROM service_orders WHERE id IN ('${liveId}', '${manualId}')`);
  } finally {
    d1(`DELETE FROM services WHERE order_id = '${orderId}'`);
    d1(`DELETE FROM service_orders WHERE id = '${orderId}'`);
    cleanupCustomer(customerId, userId);
    d1(`DELETE FROM users WHERE id = '${staffId}'`);
  }
}

const run = async () => {
  console.log(`Smoke test → ${BASE}${READ_ONLY ? ' (read-only)' : ''}`);
  await testHealth();
  await testProspect();
  await testCustomer();
  await testAdmin();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
};

run().catch((e) => { console.error(e); process.exit(1); });

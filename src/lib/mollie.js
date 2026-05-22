// Mollie payments + recurring subscriptions (V4 Sprint D).
// Checkout: customer pays the first payment with iDEAL -> Mollie creates a SEPA
// mandate -> monthly subscription. Webhook is unsigned: always re-fetch.
import { jsonResponse, errorResponse } from './google-auth.js';
import { randomId } from './auth.js';
import { getCatalogTier } from '../data/portal-catalog.ts';

const SITE = 'https://aanloopai.nl';
const MOLLIE = 'https://api.mollie.com/v2';
const BTW_RATE = 0.21;

function euros(cents) { return (Number(cents) / 100).toFixed(2); }

async function mollieFetch(apiKey, method, path, body) {
  const res = await fetch(`${MOLLIE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Mollie ${method} ${path} HTTP ${res.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return {}; }
}

// ── checkout: POST /api/portal/checkout/start  { order_id } ─────────────────
export async function handleCheckoutStart(request, env, user) {
  if (!env.MOLLIE_API_KEY) return errorResponse('Betalingen zijn nog niet geconfigureerd', 503);
  if (user.role === 'kijker') return errorResponse('Geen rechten', 403);

  const body = await request.json().catch(() => null);
  if (!body?.order_id) return errorResponse('Aanvraag-id ontbreekt', 400);

  const order = await env.PORTAL_DB
    .prepare('SELECT id, customer_id, product_key, tier, status FROM service_orders WHERE id = ? AND customer_id = ?')
    .bind(body.order_id, user.customer_id).first();
  if (!order) return errorResponse('Aanvraag niet gevonden', 404);
  if (order.status !== 'concept') return errorResponse('Deze aanvraag is al ingediend', 409);

  const tier = getCatalogTier(order.product_key, order.tier);
  if (!tier || tier.betaling === 'aanvraag' || !tier.prijsCent) {
    return errorResponse('Voor dit pakket is geen online betaling beschikbaar.', 400);
  }

  const customer = await env.PORTAL_DB
    .prepare('SELECT id, bedrijf, factuur_email, mollie_customer_id FROM customers WHERE id = ?')
    .bind(user.customer_id).first();

  try {
  let mollieCustomerId = customer?.mollie_customer_id;
  if (!mollieCustomerId) {
    const mc = await mollieFetch(env.MOLLIE_API_KEY, 'POST', '/customers', {
      name: customer?.bedrijf || user.naam,
      email: customer?.factuur_email || user.email,
      locale: 'nl_NL',
      metadata: { customer_id: user.customer_id },
    });
    mollieCustomerId = mc.id;
    await env.PORTAL_DB.prepare('UPDATE customers SET mollie_customer_id = ? WHERE id = ?')
      .bind(mollieCustomerId, user.customer_id).run();
  }

  const recurring = tier.betaling === 'maandelijks';
  const subId = randomId('sub');
  await env.PORTAL_DB.prepare(
    'INSERT INTO subscriptions (id, customer_id, order_id, product_key, tier, bedrag_cent, betaling, status, mollie_customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(subId, user.customer_id, order.id, order.product_key, order.tier, tier.prijsCent,
    tier.betaling, 'pending_payment', mollieCustomerId, Date.now()).run();

  // Mollie needs an explicit website profile when the key is not bound to a
  // single default one (common on fresh accounts / multi-profile orgs).
  let profileId;
  try {
    const prof = await mollieFetch(env.MOLLIE_API_KEY, 'GET', '/profiles/me');
    profileId = prof.id;
  } catch { /* leave undefined — Mollie may still resolve it */ }

  const paymentBody = {
    amount: { currency: 'EUR', value: euros(tier.prijsCent) },
    description: `Aanloop AI — ${order.product_key} ${order.tier} (${order.id})`,
    sequenceType: recurring ? 'first' : 'oneoff',
    customerId: mollieCustomerId,
    redirectUrl: `${SITE}/portal/checkout?order=${order.id}`,
    webhookUrl: `${SITE}/api/webhooks/mollie`,
    metadata: { order_id: order.id, subscription_id: subId, customer_id: user.customer_id },
  };
  if (profileId) paymentBody.profileId = profileId;
  const payment = await mollieFetch(env.MOLLIE_API_KEY, 'POST', '/payments', paymentBody);

  await env.PORTAL_DB.prepare(
    'INSERT INTO payments (id, customer_id, subscription_id, order_id, bedrag_cent, status, sequence_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(payment.id, user.customer_id, subId, order.id, tier.prijsCent,
    payment.status || 'open', recurring ? 'first' : 'oneoff', Date.now()).run();

  const checkoutUrl = payment._links && payment._links.checkout && payment._links.checkout.href;
  if (!checkoutUrl) return errorResponse('Kon de betaalpagina niet openen', 502);
  return jsonResponse({ ok: true, checkoutUrl });
  } catch (err) {
    console.error('[mollie] checkout start failed:', err.message || err);
    return errorResponse(`Betaling kon niet worden gestart: ${String(err.message || err).slice(0, 300)}`, 502);
  }
}

// ── webhook: POST /api/webhooks/mollie  (body: id=tr_...) ───────────────────
export async function handleMollieWebhook(request, env) {
  if (!env.MOLLIE_API_KEY || !env.PORTAL_DB) return new Response('ok', { status: 200 });
  let id = '';
  try {
    const form = await request.formData();
    id = (form.get('id') || '').toString();
  } catch { return new Response('bad', { status: 400 }); }
  if (!id.startsWith('tr_')) return new Response('ok', { status: 200 });

  try {
    const payment = await mollieFetch(env.MOLLIE_API_KEY, 'GET', `/payments/${id}`);
    const row = await env.PORTAL_DB.prepare('SELECT id, status, subscription_id, order_id FROM payments WHERE id = ?').bind(id).first();
    const subId = row?.subscription_id || (payment.metadata && payment.metadata.subscription_id) || null;
    const orderId = row?.order_id || (payment.metadata && payment.metadata.order_id) || null;

    if (!row) {
      await env.PORTAL_DB.prepare(
        'INSERT OR IGNORE INTO payments (id, customer_id, subscription_id, order_id, bedrag_cent, status, sequence_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(id, payment.customerId || '', subId, orderId,
        Math.round(Number(payment.amount?.value || 0) * 100), payment.status,
        payment.sequenceType || 'recurring', Date.now()).run();
    } else if (row.status === payment.status) {
      return new Response('ok', { status: 200 }); // idempotent: no transition
    } else {
      await env.PORTAL_DB.prepare('UPDATE payments SET status = ?, paid_at = ? WHERE id = ?')
        .bind(payment.status, payment.status === 'paid' ? new Date().toISOString() : null, id).run();
    }

    if (payment.status === 'paid') await onPaid(env, payment, subId, orderId);
    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('[mollie] webhook error:', err.message || err);
    return new Response('retry', { status: 500 });
  }
}

async function onPaid(env, payment, subId, orderId) {
  const db = env.PORTAL_DB;
  const seq = payment.sequenceType;
  const sub = subId ? await db.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(subId).first() : null;

  if (seq === 'first' && sub && sub.status === 'pending_payment') {
    try {
      const created = await mollieFetch(env.MOLLIE_API_KEY, 'POST', `/customers/${sub.mollie_customer_id}/subscriptions`, {
        amount: { currency: 'EUR', value: euros(sub.bedrag_cent) },
        interval: '1 month',
        description: `Aanloop AI ${sub.product_key} ${sub.tier || ''} — ${sub.id}`,
        webhookUrl: `${SITE}/api/webhooks/mollie`,
        metadata: { subscription_id: sub.id, customer_id: sub.customer_id },
      });
      await db.prepare('UPDATE subscriptions SET status = ?, mollie_subscription_id = ?, next_payment_date = ? WHERE id = ?')
        .bind('active', created.id || null, created.nextPaymentDate || null, sub.id).run();
    } catch (err) {
      console.error('[mollie] subscription create failed:', err.message || err);
      await db.prepare("UPDATE subscriptions SET status = 'active' WHERE id = ?").bind(sub.id).run();
    }
  } else if (seq === 'oneoff' && sub && sub.status === 'pending_payment') {
    await db.prepare("UPDATE subscriptions SET status = 'completed' WHERE id = ?").bind(sub.id).run();
  }

  if (orderId) {
    const o = await db.prepare('SELECT status FROM service_orders WHERE id = ?').bind(orderId).first();
    if (o && o.status === 'concept') {
      await db.prepare('UPDATE service_orders SET status = ?, submitted_at = ? WHERE id = ?')
        .bind('ingediend', Date.now(), orderId).run();
    }
  }
  await createInvoice(env, payment, sub);
}

async function createInvoice(env, payment, sub) {
  const db = env.PORTAL_DB;
  const exists = await db.prepare('SELECT id FROM invoices WHERE payment_id = ?').bind(payment.id).first();
  if (exists) return;

  const customerId = sub?.customer_id || payment.customerId || '';
  const bedragCent = Math.round(Number(payment.amount?.value || 0) * 100);
  const subtotaal = Math.round(bedragCent / (1 + BTW_RATE));
  const btw = bedragCent - subtotaal;

  const year = new Date().getFullYear();
  const cnt = await db.prepare('SELECT COUNT(*) AS n FROM invoices WHERE factuurnummer LIKE ?').bind(`${year}-%`).first();
  const factuurnummer = `${year}-${String((cnt?.n || 0) + 1).padStart(4, '0')}`;
  const periode = new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

  await db.prepare(
    'INSERT INTO invoices (id, customer_id, periode, bedrag_cent, status, factuurnummer, subtotaal_cent, btw_cent, payment_id, subscription_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(randomId('inv'), customerId, periode, bedragCent, 'betaald', factuurnummer,
    subtotaal, btw, payment.id, sub?.id || null, new Date().toISOString().slice(0, 10)).run();
}

// ── reconciliation cron — re-check stale open payments ──────────────────────
export async function reconcilePayments(env) {
  if (!env.MOLLIE_API_KEY || !env.PORTAL_DB) return;
  const cutoff = Date.now() - 20 * 60 * 1000;
  const stale = (await env.PORTAL_DB
    .prepare("SELECT id, subscription_id, order_id FROM payments WHERE status IN ('open','pending') AND created_at < ?")
    .bind(cutoff).all()).results || [];
  for (const p of stale) {
    try {
      const payment = await mollieFetch(env.MOLLIE_API_KEY, 'GET', `/payments/${p.id}`);
      if (payment.status !== 'open' && payment.status !== 'pending') {
        await env.PORTAL_DB.prepare('UPDATE payments SET status = ? WHERE id = ?').bind(payment.status, p.id).run();
        if (payment.status === 'paid') await onPaid(env, payment, p.subscription_id, p.order_id);
      }
    } catch (err) {
      console.error('[mollie] reconcile error:', err.message || err);
    }
  }
}

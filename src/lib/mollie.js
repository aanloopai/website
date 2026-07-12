// Mollie payments (V4 Sprint D — geen SEPA-incasso).
// Model: elke betaling is een losse iDEAL-betaling (sequenceType oneoff).
// Maandelijkse diensten: een cron maakt elke maand een nieuwe iDEAL-betaling
// en mailt de klant de betaallink. Webhook is unsigned: altijd re-fetchen.
import { jsonResponse, errorResponse } from './google-auth.js';
import { randomId, sha256Hex } from './auth.js';
import { getCatalogTier } from '../data/portal-catalog.ts';
import { dealWonVoorOrder } from './crm.js';

const SITE = 'https://aanloopai.nl';
const MOLLIE = 'https://api.mollie.com/v2';
const BTW_RATE = 0.21;
const TR_ID = /^tr_[a-zA-Z0-9]{6,40}$/;

// Stable per-deployment secret derived from PORTAL_SESSION_SECRET — appended to
// the Mollie webhookUrl as ?k=<token>; the webhook handler rejects mismatches.
async function webhookToken(secret) {
  return (await sha256Hex(`${secret}|mollie-webhook`)).slice(0, 32);
}
async function buildWebhookUrl(env) {
  const t = await webhookToken(env.PORTAL_SESSION_SECRET || '');
  return `${SITE}/api/webhooks/mollie?k=${t}`;
}

// L2: constant-time string compare — no early-exit on first mismatch, so the
// URL-token check below doesn't leak timing info. WebCrypto has no built-in
// timingSafeEqual, so this is the small equal-length XOR-accumulation version.
function constantTimeEqual(a, b) {
  const aBytes = new TextEncoder().encode(a || '');
  const bBytes = new TextEncoder().encode(b || '');
  const len = Math.max(aBytes.length, bBytes.length, 1);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] || 0) ^ (bBytes[i] || 0);
  }
  return diff === 0;
}

function euros(cents) { return (Number(cents) / 100).toFixed(2); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function addMonth(dateStr) {
  const d = dateStr ? new Date(`${dateStr}T00:00:00Z`) : new Date();
  // L1: clamp to the last valid day of the target month — plain setUTCMonth(m+1)
  // overflows (Jan 31 + 1mo → Mar 3) because Feb has fewer days. Set day=1 first
  // so the month-advance can't itself overflow, then clamp back down.
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const daysInTargetMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, daysInTargetMonth));
  return d.toISOString().slice(0, 10);
}

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

// Resolve the website profile. A profile-restricted (live) key is bound to one
// profile — /profiles/me works, /profiles list is 403. An org-level key needs
// the list. Returns null when neither resolves (then we omit profileId — a
// restricted key still resolves it server-side).
async function getProfileId(apiKey) {
  try {
    const me = await mollieFetch(apiKey, 'GET', '/profiles/me');
    if (me && me.id) return me.id;
  } catch { /* org-level key — fall through to the list */ }
  try {
    const list = await mollieFetch(apiKey, 'GET', '/profiles?limit=20');
    const profiles = (list._embedded && list._embedded.profiles) || [];
    for (const p of profiles) {
      try {
        const m = await mollieFetch(apiKey, 'GET', `/methods?profileId=${p.id}`);
        const ids = ((m._embedded && m._embedded.methods) || []).map((x) => x.id);
        if (ids.includes('ideal')) return p.id;
      } catch { /* try next */ }
    }
    if (profiles.length) return (profiles.find((p) => p.status === 'verified') || profiles[0]).id;
  } catch { /* none */ }
  return null;
}

// Diagnostic — activated methods on the key's profile.
async function profilesDebug(apiKey) {
  try {
    const m = await mollieFetch(apiKey, 'GET', '/methods');
    const ids = ((m._embedded && m._embedded.methods) || []).map((x) => x.id);
    return `methodes: ${ids.join(',') || 'GEEN'}`;
  } catch (e) { return `debug-fout: ${e.message}`; }
}

async function sendMail(env, to, naam, subject, innerHtml) {
  if (!env.BREVO_API_KEY || !to) return;
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Aanloop AI', email: 'hello@aanloopai.nl' },
      to: [{ email: to, name: naam || to }],
      subject,
      htmlContent: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">${innerHtml}<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"><p style="font-size:12px;color:#64748b">Aanloop AI — aanloopai.nl — KvK 88606902</p></body></html>`,
    }),
  });
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

  // Duplicate-checkout guard (H5): order.status only advances after onPaid, so
  // two checkout starts fired before either payment settles would otherwise
  // both pass the check above and create two active subscriptions → double
  // billing. Defense-in-depth on top of the UNIQUE(order_id) index.
  const existingSub = await env.PORTAL_DB
    .prepare("SELECT id, status FROM subscriptions WHERE order_id = ? AND status IN ('pending_payment', 'active') ORDER BY created_at DESC LIMIT 1")
    .bind(order.id).first();
  if (existingSub) {
    if (existingSub.status === 'active') {
      return errorResponse('Deze aanvraag heeft al een actief abonnement', 409);
    }
    // pending_payment — try to idempotently re-use the still-open checkout URL
    // instead of creating a second Mollie payment for the same order.
    const existingPayment = await env.PORTAL_DB
      .prepare('SELECT id FROM payments WHERE subscription_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(existingSub.id).first();
    if (existingPayment) {
      try {
        const payment = await mollieFetch(env.MOLLIE_API_KEY, 'GET', `/payments/${existingPayment.id}`);
        const checkoutUrl = payment._links && payment._links.checkout && payment._links.checkout.href;
        if (checkoutUrl && (payment.status === 'open' || payment.status === 'pending')) {
          return jsonResponse({ ok: true, checkoutUrl });
        }
      } catch (err) {
        console.error('[mollie] re-fetch existing checkout failed:', err.message || err);
      }
    }
    return errorResponse('Er is al een checkout gestart voor deze aanvraag. Probeer het opnieuw of neem contact op met support.', 409);
  }

  const tier = getCatalogTier(order.product_key, order.tier);
  if (!tier || tier.betaling === 'aanvraag' || !tier.prijsCent) {
    return errorResponse('Voor dit pakket is geen online betaling beschikbaar.', 400);
  }
  // Catalogusprijzen zijn EXCL. btw — de klant betaalt incl. 21%.
  const inclCent = Math.round(tier.prijsCent * (1 + BTW_RATE));
  const maandelijks = tier.betaling === 'maandelijks';

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

    const subId = randomId('sub');
    await env.PORTAL_DB.prepare(
      'INSERT INTO subscriptions (id, customer_id, order_id, product_key, tier, bedrag_cent, betaling, status, mollie_customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(subId, user.customer_id, order.id, order.product_key, order.tier, inclCent,
      tier.betaling, 'pending_payment', mollieCustomerId, Date.now()).run();

    const profileId = await getProfileId(env.MOLLIE_API_KEY);

    const webhookUrl = await buildWebhookUrl(env);
    const paymentBody = {
      amount: { currency: 'EUR', value: euros(inclCent) },
      description: `Aanloop AI — ${order.product_key} ${order.tier} (${order.id})`,
      sequenceType: 'oneoff',
      customerId: mollieCustomerId,
      redirectUrl: `${SITE}/portal/checkout?order=${order.id}`,
      webhookUrl,
      metadata: { order_id: order.id, subscription_id: subId, customer_id: user.customer_id },
    };
    if (profileId) paymentBody.profileId = profileId;
    const payment = await mollieFetch(env.MOLLIE_API_KEY, 'POST', '/payments', paymentBody);

    await env.PORTAL_DB.prepare(
      'INSERT INTO payments (id, customer_id, subscription_id, order_id, bedrag_cent, status, sequence_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(payment.id, user.customer_id, subId, order.id, inclCent,
      payment.status || 'open', maandelijks ? 'eerste' : 'eenmalig', Date.now()).run();

    const checkoutUrl = payment._links && payment._links.checkout && payment._links.checkout.href;
    if (!checkoutUrl) return errorResponse('Kon de betaalpagina niet openen', 502);
    return jsonResponse({ ok: true, checkoutUrl });
  } catch (err) {
    console.error('[mollie] checkout start failed:', err.message || err);
    // Log details server-side; never leak Mollie internals or profile data to the client.
    return errorResponse('De betaling kon niet worden gestart. Probeer het opnieuw of neem contact op met support.', 502);
  }
}

// ── webhook: POST /api/webhooks/mollie?k=<token>  (body: id=tr_...) ─────────
export async function handleMollieWebhook(request, env) {
  if (!env.MOLLIE_API_KEY || !env.PORTAL_DB) return new Response('ok', { status: 200 });

  // 1. URL-secret check — drops spurious / DoS calls before any Mollie API hit.
  //    L2: constant-time compare so a mismatch can't be timed byte-by-byte.
  const url = new URL(request.url);
  const expected = await webhookToken(env.PORTAL_SESSION_SECRET || '');
  if (!constantTimeEqual(url.searchParams.get('k') || '', expected)) return new Response('ok', { status: 200 });

  // 2. Parse + strict id-shape check.
  let id = '';
  try {
    const form = await request.formData();
    id = (form.get('id') || '').toString();
  } catch { return new Response('bad', { status: 400 }); }
  if (!TR_ID.test(id)) return new Response('ok', { status: 200 });

  try {
    const payment = await mollieFetch(env.MOLLIE_API_KEY, 'GET', `/payments/${id}`);
    let row = await env.PORTAL_DB.prepare('SELECT id, status, subscription_id, order_id FROM payments WHERE id = ?').bind(id).first();

    // 3. Unknown payment id: ONLY accept when it's clearly one of ours that lost
    //    its DB row mid-billing (metadata.subscription_id matches a real
    //    subscription owned by the same Mollie customer). Anything else = no-op.
    if (!row) {
      const mSubId = payment.metadata && payment.metadata.subscription_id;
      const sub = mSubId
        ? await env.PORTAL_DB.prepare('SELECT id, customer_id, mollie_customer_id FROM subscriptions WHERE id = ?').bind(mSubId).first()
        : null;
      if (!sub || !payment.customerId || sub.mollie_customer_id !== payment.customerId) {
        return new Response('ok', { status: 200 });
      }
      await env.PORTAL_DB.prepare(
        'INSERT OR IGNORE INTO payments (id, customer_id, subscription_id, order_id, bedrag_cent, status, sequence_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(id, sub.customer_id, mSubId, payment.metadata?.order_id || null,
        Math.round(Number(payment.amount?.value || 0) * 100), 'open', 'maand', Date.now()).run();
      row = { id, status: 'open', subscription_id: mSubId, order_id: payment.metadata?.order_id || null };
    }

    const subId = row.subscription_id || (payment.metadata && payment.metadata.subscription_id) || null;
    const orderId = row.order_id || (payment.metadata && payment.metadata.order_id) || null;

    // 4. Compare-and-swap transitions — only the worker that flips state runs the
    //    business logic, even under concurrent webhook retries.
    if (payment.status === 'paid') {
      const r = await env.PORTAL_DB.prepare(
        "UPDATE payments SET status = 'paid', paid_at = ? WHERE id = ? AND status != 'paid'",
      ).bind(new Date().toISOString(), id).run();
      if (r.meta?.changes === 1) await onPaid(env, payment, subId, orderId);
    } else if (payment.status === 'failed' || payment.status === 'canceled' || payment.status === 'expired') {
      const r = await env.PORTAL_DB.prepare(
        'UPDATE payments SET status = ? WHERE id = ? AND status != ?',
      ).bind(payment.status, id, payment.status).run();
      if (r.meta?.changes === 1) await onFailed(env, subId);
    }
    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('[mollie] webhook error:', err.message || err);
    return new Response('retry', { status: 500 });
  }
}

async function onPaid(env, payment, subId, orderId) {
  const db = env.PORTAL_DB;
  const sub = subId ? await db.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(subId).first() : null;

  if (sub) {
    if (sub.status === 'pending_payment') {
      // First payment of the subscription.
      if (sub.betaling === 'maandelijks') {
        await db.prepare("UPDATE subscriptions SET status = 'active', next_payment_date = ? WHERE id = ?")
          .bind(addMonth(todayStr()), sub.id).run();
      } else {
        await db.prepare("UPDATE subscriptions SET status = 'completed' WHERE id = ?").bind(sub.id).run();
      }
    } else if (sub.status === 'past_due') {
      // A late monthly payment arrived — re-activate.
      await db.prepare("UPDATE subscriptions SET status = 'active' WHERE id = ?").bind(sub.id).run();
    }
  }

  if (orderId) {
    const o = await db.prepare('SELECT status FROM service_orders WHERE id = ?').bind(orderId).first();
    if (o && o.status === 'concept') {
      await db.prepare('UPDATE service_orders SET status = ?, submitted_at = ? WHERE id = ?')
        .bind('ingediend', Date.now(), orderId).run();
    }
  }
  await createInvoice(env, payment, sub);

  // F3: CRM-deal op gewonnen zetten — nooit de betaal-flow blokkeren,
  // dealWonVoorOrder slikt zijn eigen fouten (zie crm.js).
  const bedragCent = Math.round(Number(payment.amount?.value || 0) * 100);
  await dealWonVoorOrder(env, { orderId, waardeCent: bedragCent });
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
  const cName = `factuur-${year}`;
  // Atomic single-statement counter — no COUNT()+1 race.
  await db.prepare('INSERT OR IGNORE INTO counters (name, n) VALUES (?, 0)').bind(cName).run();
  const seq = await db.prepare('UPDATE counters SET n = n + 1 WHERE name = ? RETURNING n').bind(cName).first();
  const factuurnummer = `${year}-${String(seq?.n || 1).padStart(4, '0')}`;
  const periode = new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

  await db.prepare(
    'INSERT INTO invoices (id, customer_id, periode, bedrag_cent, status, factuurnummer, subtotaal_cent, btw_cent, payment_id, subscription_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(randomId('inv'), customerId, periode, bedragCent, 'betaald', factuurnummer,
    subtotaal, btw, payment.id, sub?.id || null, new Date().toISOString().slice(0, 10)).run();
}

// ── dunning — a monthly payment failed/expired ──────────────────────────────
async function onFailed(env, subId) {
  if (!subId) return;
  const sub = await env.PORTAL_DB.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(subId).first();
  // Only an active (running) subscription triggers dunning. A failed first
  // payment just means the customer abandoned checkout.
  if (!sub || sub.status !== 'active') return;

  await env.PORTAL_DB.prepare("UPDATE subscriptions SET status = 'past_due' WHERE id = ?").bind(subId).run();
  try {
    await sendMail(env, 'hello@aanloopai.nl', 'Aanloop AI', '[Portaal] Maandbetaling mislukt',
      `<p>Maandbetaling mislukt voor abonnement <strong>${sub.id}</strong> (klant ${sub.customer_id}). Status: past_due.</p>`);
  } catch (e) { console.error('[mollie] dunning admin mail:', e.message || e); }
  try {
    const owner = await env.PORTAL_DB
      .prepare("SELECT email, naam FROM users WHERE customer_id = ? AND role = 'eigenaar' ORDER BY created_at LIMIT 1")
      .bind(sub.customer_id).first();
    if (owner) {
      await sendMail(env, owner.email, owner.naam, 'Betaling mislukt — actie nodig',
        `<p>Hallo ${(owner.naam || '').split(' ')[0] || 'daar'},</p>
         <p>Uw maandbetaling voor Aanloop AI is helaas niet gelukt. U ontvangt binnenkort een nieuwe betaallink, of u kunt direct contact met ons opnemen.</p>
         <p style="margin:24px 0"><a href="${SITE}/portal/facturatie" style="display:inline-block;background:#4f46e5;color:#fff;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:600">Naar facturatie</a></p>`);
    }
  } catch (e) { console.error('[mollie] dunning customer mail:', e.message || e); }
}

// ── cancel: called from the portal (customer or admin action) ───────────────
// Tenant-scoped: only cancels a subscription that belongs to customerId. Sets
// status = 'canceled' (never deletes the row) which stops billMonthlySubscriptions
// (it only selects status = 'active'). Idempotent for an already-canceled sub.
export async function cancelSubscription(env, { subscriptionId, customerId }) {
  const sub = await env.PORTAL_DB
    .prepare('SELECT id, status FROM subscriptions WHERE id = ? AND customer_id = ?')
    .bind(subscriptionId, customerId).first();
  if (!sub) return { ok: false, error: 'Abonnement niet gevonden' };

  if (sub.status === 'canceled') return { ok: true };
  if (sub.status === 'completed') {
    return { ok: false, error: 'Dit abonnement is al afgerond en kan niet worden geannuleerd' };
  }

  await env.PORTAL_DB.prepare("UPDATE subscriptions SET status = 'canceled' WHERE id = ?")
    .bind(sub.id).run();
  return { ok: true };
}

// ── cron: maandelijkse betaallinks versturen ────────────────────────────────
// Voor elke actieve maand-subscription waarvan next_payment_date verstreken is:
// maak een iDEAL-betaling, mail de klant de link, schuif de datum een maand op.
export async function billMonthlySubscriptions(env) {
  if (!env.MOLLIE_API_KEY || !env.PORTAL_DB) return;
  const today = todayStr();
  const due = (await env.PORTAL_DB.prepare(
    "SELECT * FROM subscriptions WHERE status = 'active' AND betaling = 'maandelijks' AND next_payment_date IS NOT NULL AND next_payment_date <= ?",
  ).bind(today).all()).results || [];
  if (!due.length) return;

  const profileId = await getProfileId(env.MOLLIE_API_KEY);
  const webhookUrl = await buildWebhookUrl(env);
  for (const sub of due) {
    try {
      // M6: claim this subscription BEFORE creating the Mollie payment. Two
      // overlapping cron invocations can both SELECT the same due row above;
      // without a claim, both would create a payment for the same cycle
      // (double-bill). The CAS UPDATE only succeeds while next_payment_date
      // still matches what we just read — the invocation that loses the race
      // sees changes !== 1 and skips this sub entirely (mirrors the payment/
      // webhook CAS pattern used elsewhere in this file).
      const claimedFrom = sub.next_payment_date;
      const nextDate = addMonth(claimedFrom || today);
      const claim = await env.PORTAL_DB.prepare(
        'UPDATE subscriptions SET next_payment_date = ? WHERE id = ? AND next_payment_date = ?',
      ).bind(nextDate, sub.id, claimedFrom).run();
      if (claim.meta?.changes !== 1) continue; // another invocation already claimed it

      const paymentBody = {
        amount: { currency: 'EUR', value: euros(sub.bedrag_cent) },
        description: `Aanloop AI — ${sub.product_key} ${sub.tier || ''} maandbetaling`,
        sequenceType: 'oneoff',
        redirectUrl: `${SITE}/portal/facturatie`,
        webhookUrl,
        metadata: { subscription_id: sub.id, customer_id: sub.customer_id },
      };
      if (sub.mollie_customer_id) paymentBody.customerId = sub.mollie_customer_id;
      if (profileId) paymentBody.profileId = profileId;
      // Trade-off: if payment creation below throws AFTER the claim above
      // succeeded, next_payment_date has already moved a month forward, so
      // this sub is NOT retried this cycle — only once the new (later) date
      // passes. Acceptable: it trades a rare, logged payment-creation failure
      // for eliminating the far more likely cross-invocation double-bill.
      const payment = await mollieFetch(env.MOLLIE_API_KEY, 'POST', '/payments', paymentBody);

      await env.PORTAL_DB.prepare(
        'INSERT INTO payments (id, customer_id, subscription_id, order_id, bedrag_cent, status, sequence_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(payment.id, sub.customer_id, sub.id, null, sub.bedrag_cent,
        payment.status || 'open', 'maand', Date.now()).run();

      const link = payment._links && payment._links.checkout && payment._links.checkout.href;
      if (link) {
        const owner = await env.PORTAL_DB
          .prepare("SELECT email, naam FROM users WHERE customer_id = ? AND role = 'eigenaar' ORDER BY created_at LIMIT 1")
          .bind(sub.customer_id).first();
        if (owner) {
          await sendMail(env, owner.email, owner.naam, 'Uw maandbetaling staat klaar',
            `<p>Hallo ${(owner.naam || '').split(' ')[0] || 'daar'},</p>
             <p>Uw maandbetaling voor <strong>${sub.product_key} ${sub.tier || ''}</strong> — €${euros(sub.bedrag_cent)} incl. btw — staat klaar.</p>
             <p>Betaal eenvoudig en veilig via iDEAL:</p>
             <p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:600">Nu betalen</a></p>
             <p style="font-size:13px;color:#64748b">Werkt de knop niet? Kopieer deze link: ${link}</p>`);
        }
      }
    } catch (err) {
      console.error('[mollie] monthly billing failed for', sub.id, err.message || err);
    }
  }
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
      // CAS — only the loser of the race actually fires the business logic.
      if (payment.status === 'paid') {
        const r = await env.PORTAL_DB.prepare(
          "UPDATE payments SET status = 'paid', paid_at = ? WHERE id = ? AND status != 'paid'",
        ).bind(new Date().toISOString(), p.id).run();
        if (r.meta?.changes === 1) await onPaid(env, payment, p.subscription_id, p.order_id);
      } else if (payment.status === 'failed' || payment.status === 'canceled' || payment.status === 'expired') {
        const r = await env.PORTAL_DB.prepare(
          'UPDATE payments SET status = ? WHERE id = ? AND status != ?',
        ).bind(payment.status, p.id, payment.status).run();
        if (r.meta?.changes === 1) await onFailed(env, p.subscription_id);
      }
    } catch (err) {
      console.error('[mollie] reconcile error:', err.message || err);
    }
  }
}

// Mollie payments (V4 Sprint D — geen SEPA-incasso).
// Model: elke betaling is een losse iDEAL-betaling (sequenceType oneoff).
// Maandelijkse diensten: een cron maakt elke maand een nieuwe iDEAL-betaling
// en mailt de klant de betaallink. Webhook is unsigned: altijd re-fetchen.
import { jsonResponse, errorResponse } from './google-auth.js';
import { randomId, sha256Hex } from './auth.js';
import { getCatalogTier } from '../data/portal-catalog.ts';
import { dealWonVoorOrder } from './crm.js';
import { activateOrder } from './activation.js';
import { alertStaff } from './notify.js';

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

// Eerste betaling = maand + eenmalige setup, beide incl. btw.
// De setup-fee mag NOOIT in subscriptions.bedrag_cent belanden: dat veld drijft
// billMonthlySubscriptions en zou de fee elke maand opnieuw incasseren.
export function berekenEersteBetaling(tier) {
  const maandInclCent = Math.round((tier.prijsCent || 0) * (1 + BTW_RATE));
  const setupInclCent = Math.round((tier.setupCent || 0) * (1 + BTW_RATE));
  return { maandInclCent, setupInclCent, totaalInclCent: maandInclCent + setupInclCent };
}

// ── checkout: POST /api/portal/checkout/start  { order_id } ─────────────────
export async function handleCheckoutStart(request, env, user) {
  if (!env.MOLLIE_API_KEY) return errorResponse('Betalingen zijn nog niet geconfigureerd', 503);
  if (user.role === 'kijker') return errorResponse('Geen rechten', 403);

  const body = await request.json().catch(() => null);
  if (!body?.order_id) return errorResponse('Aanvraag-id ontbreekt', 400);

  // H-eind-B: voorstel_id (migratie 0015) kan op deze deployment nog
  // ontbreken — de checkout van GEWONE klanten mag daar nooit van afhangen.
  // Probeer eerst de volledige query; gooit D1 ("no such column"), val dan
  // terug op dezelfde query zonder die kolom. Alles verderop (de
  // funnel-prijsvergelijking) is al voorwaardelijk op `order.voorstel_id`,
  // dus een ontbrekende kolom betekent hooguit "geen funnel-prijscontrole",
  // nooit "kan niet betalen".
  let order;
  try {
    order = await env.PORTAL_DB
      .prepare('SELECT id, customer_id, product_key, tier, status, voorstel_id FROM service_orders WHERE id = ? AND customer_id = ?')
      .bind(body.order_id, user.customer_id).first();
  } catch (err) {
    console.error('[mollie] SELECT met voorstel_id mislukt (migratie 0015 nog niet toegepast?) — checkout degradeert zonder funnel-prijscheck:', err?.message || err);
    order = await env.PORTAL_DB
      .prepare('SELECT id, customer_id, product_key, tier, status FROM service_orders WHERE id = ? AND customer_id = ?')
      .bind(body.order_id, user.customer_id).first();
  }
  if (!order) return errorResponse('Aanvraag niet gevonden', 404);
  if (order.status !== 'concept') return errorResponse('Deze aanvraag is al ingediend', 409);

  // Duplicate-checkout guard (H5): order.status only advances after onPaid, so
  // two checkout starts fired before either payment settles would otherwise
  // both pass the check above and create two active subscriptions → double
  // billing. Defense-in-depth on top of the UNIQUE(order_id) index.
  //
  // No status filter here (deliberately, since the H-eind fix below): the
  // UNIQUE(order_id) index (migration 0009) means there is at most ONE
  // subscriptions row per order_id, ever, regardless of its status — so this
  // always reads that single row when it exists, whatever state it's in.
  const existingSub = await env.PORTAL_DB
    .prepare('SELECT id, status FROM subscriptions WHERE order_id = ? ORDER BY created_at DESC LIMIT 1')
    .bind(order.id).first();
  let reuseSubId = null;
  if (existingSub) {
    if (existingSub.status === 'active') {
      return errorResponse('Deze aanvraag heeft al een actief abonnement', 409);
    }
    if (existingSub.status === 'pending_payment') {
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
    if (existingSub.status !== 'canceled') {
      // Defensive: any other status (e.g. 'completed') should be unreachable
      // here — an order only reaches 'completed' after onPaid(), which also
      // flips service_orders.status away from 'concept', and the guard above
      // already 409'd on that. Refuse rather than silently reuse an unknown state.
      return errorResponse('Er is al een checkout gestart voor deze aanvraag. Probeer het opnieuw of neem contact op met support.', 409);
    }
    // H-eind fix: onFailed() (this file) cancels the subscription row when the
    // FIRST payment of an order fails, expires, or is closed by the customer
    // before completion (H-eind-A, previous round) — correctly, since the
    // subscription never became billable. But the UNIQUE(order_id) index
    // means a plain INSERT on retry then always fails with a constraint
    // violation, which the try/catch below turns into a generic 502 — the
    // customer could never pay for this order again. Reusing this row instead
    // (reset to pending_payment further down, with bedrag_cent recomputed
    // from the CURRENT catalog — never the stale amount from the failed
    // attempt) fixes that without touching the index or the dunning logic.
    //
    // Only one canceled row can ever exist per order_id (the same UNIQUE
    // index that caused the bug guarantees it), so there is no "which one do
    // we reuse" ambiguity. The old payments rows for this subscription_id
    // (the failed/expired/canceled attempt) are left untouched as history —
    // payments is already an append-only per-subscription log (see the
    // monthly billing cron below, which inserts a fresh row per cycle for
    // the same subscription_id); the new attempt just appends another one.
    reuseSubId = existingSub.id;
  }

  // Dubbel-abonnement-guard (H2): de check hierboven is per order_id en ziet
  // dus niets wanneer een ANDERE order van dezelfde klant, voor hetzelfde
  // product, al een pending/actieve subscriptions-rij heeft — bv. de wizard
  // twee keer ingevuld, waarbij de eerste checkout nooit is gestart (dus geen
  // subscriptions-rij bestond toen mintKlantEnOrder zijn eigen, gelijksoortige
  // check in voorstel-verify.js deed). Zonder deze klant+product-brede check
  // zou elke order onafhankelijk zijn eigen abonnement mogen aanmaken.
  //
  // H-eind-C: MOET ook op tier filteren, niet alleen op product_key —
  // Starter en Groei van emma-telefoon delen dezelfde product_key. Zonder
  // tier zou een klant op Starter nooit kunnen upgraden naar Groei via het
  // portaal (elke Groei-order zou 409'en op het lopende Starter-abonnement).
  // Het gat dat deze guard moest dichten (funnelorder-dubbelkoop: twee
  // voorstellen, twee orders, allebei betaald) zit uitsluitend bij DEZELFDE
  // tier — de self-serve funnel verkoopt vandaag alleen emma-telefoon/Starter
  // (src/data/funnel-map.ts) — dus die blijft met tier-scoping net zo goed
  // geblokkeerd.
  const dubbelAbonnement = await env.PORTAL_DB
    .prepare("SELECT id FROM subscriptions WHERE customer_id = ? AND product_key = ? AND tier = ? AND status IN ('pending_payment', 'active') LIMIT 1")
    .bind(order.customer_id, order.product_key, order.tier).first();
  if (dubbelAbonnement) {
    return errorResponse('Er loopt al een abonnement (of een openstaande betaling) voor dit product op uw account.', 409);
  }

  const tier = getCatalogTier(order.product_key, order.tier);
  if (!tier || tier.betaling === 'aanvraag' || !tier.prijsCent) {
    return errorResponse('Voor dit pakket is geen online betaling beschikbaar.', 400);
  }

  // Prijsvergelijking (H3): het voorstel bevriest maandbedrag + setup-fee 14
  // dagen (voorstel.js), maar hierboven wordt altijd de ACTUELE catalogus
  // gelezen. Wijzigt de prijs in die periode, dan zag de klant een ander
  // bedrag op zijn voorstel dan wat hier zou worden afgerekend. Dit is de
  // betrouwbaarste plek voor de vergelijking: handleCheckoutStart draait
  // hoe dan ook, ook wanneer iemand de checkout-URL rechtstreeks/opnieuw
  // opent (autostart=1 vanaf de magic-linkmail) zonder de voorstelpagina
  // ooit te laden — een check daar alleen zou dat pad missen. Alleen orders
  // die uit de self-serve funnel komen (voorstel_id gezet) hebben een
  // bevroren voorstelprijs om tegen af te zetten; het bestaande portaalpad
  // kent geen voorstel en blijft dus ongemoeid.
  if (order.voorstel_id && body.confirm_price !== true) {
    const voorstel = await env.PORTAL_DB
      .prepare('SELECT prijs_cent, setup_cent FROM voorstellen WHERE id = ?')
      .bind(order.voorstel_id).first();
    if (voorstel && (voorstel.prijs_cent !== tier.prijsCent || voorstel.setup_cent !== tier.setupCent)) {
      const nieuw = berekenEersteBetaling(tier);
      return jsonResponse({
        ok: false,
        error: 'De prijs is gewijzigd sinds uw voorstel. Bevestig het nieuwe bedrag om door te gaan.',
        priceChanged: true,
        nieuwMaandInclCent: nieuw.maandInclCent,
        nieuwSetupInclCent: nieuw.setupInclCent,
        nieuwTotaalInclCent: nieuw.totaalInclCent,
      }, 409);
    }
  }

  // Catalogusprijzen zijn EXCL. btw — de klant betaalt incl. 21%.
  const { maandInclCent, totaalInclCent } = berekenEersteBetaling(tier);
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

    let subId;
    if (reuseSubId) {
      // Retry after a canceled first attempt (see the H-eind comment above) —
      // reuse the existing row instead of a second INSERT, which would hit
      // the UNIQUE(order_id) index. bedrag_cent is the freshly-computed
      // maandInclCent from the CURRENT catalog price, not carried over from
      // the failed attempt.
      //
      // Race guard: nothing prevents two requests from both reading this row
      // as 'canceled' above (two tabs, or a portal click racing an autostart
      // redirect) — the SELECT above and this UPDATE are not atomic together.
      // Without a condition on the expected status, both would flip the row
      // to pending_payment and each create its own Mollie payment: two open
      // payments on one subscription. Paying one then leaves the other to
      // knock it back to past_due once it settles — a "betaling mislukt"
      // mail right after the customer paid, and the monthly cron silently
      // stopping (it only selects status = 'active'). Making the UPDATE
      // conditional on status = 'canceled' and checking changes === 1 turns
      // this into the same compare-and-swap already used for the fresh-order
      // path (the UNIQUE(order_id) index), for handleAuthVerify's magic-link
      // claim (portal-routes.js), and for the payment-status transitions
      // below in this file — only the request that actually wins the flip
      // proceeds; the loser gets the same "checkout already running" message
      // the rest of this function already uses, so a double-click reads as
      // "a payment is already waiting", not as broken.
      subId = reuseSubId;
      const claim = await env.PORTAL_DB.prepare(
        "UPDATE subscriptions SET bedrag_cent = ?, betaling = ?, status = 'pending_payment', mollie_customer_id = ? WHERE id = ? AND status = 'canceled'",
      ).bind(maandInclCent, tier.betaling, mollieCustomerId, subId).run();
      if (claim.meta?.changes !== 1) {
        return errorResponse('Er is al een checkout gestart voor deze aanvraag. Probeer het opnieuw of neem contact op met support.', 409);
      }
    } else {
      subId = randomId('sub');
      await env.PORTAL_DB.prepare(
        'INSERT INTO subscriptions (id, customer_id, order_id, product_key, tier, bedrag_cent, betaling, status, mollie_customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(subId, user.customer_id, order.id, order.product_key, order.tier, maandInclCent,
        tier.betaling, 'pending_payment', mollieCustomerId, Date.now()).run();
    }

    const profileId = await getProfileId(env.MOLLIE_API_KEY);

    const webhookUrl = await buildWebhookUrl(env);
    const paymentBody = {
      amount: { currency: 'EUR', value: euros(totaalInclCent) },
      description: `Aanloop AI — ${order.product_key} ${order.tier} (${order.id})`
        + (totaalInclCent > maandInclCent ? ' incl. eenmalige inrichting' : ''),
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
    ).bind(payment.id, user.customer_id, subId, order.id, totaalInclCent,
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
    const o = await db.prepare('SELECT * FROM service_orders WHERE id = ?').bind(orderId).first();
    if (o && o.status === 'concept') {
      await db.prepare('UPDATE service_orders SET status = ?, submitted_at = ? WHERE id = ?')
        .bind('ingediend', Date.now(), orderId).run();
    }
    // The customer has paid. portal/checkout.astro tells them "we starten direct
    // met de inrichting" — so start it, instead of parking the order on
    // 'ingediend' until a human happens to look at /admin/aanvragen.
    // activateOrder() is idempotent (unique index on services.order_id), so a
    // webhook replay or the reconcile cron re-running this is harmless. It
    // never blocks the payment flow: a failure here still leaves a paid order
    // + invoice, and staff get alerted.
    if (o && (o.status === 'concept' || o.status === 'ingediend')) {
      try {
        await activateOrder(env, o);
      } catch (err) {
        console.error('[mollie] auto-activation failed:', err?.message || err);
        await alertStaff(env, `Auto-activatie mislukt voor order ${orderId}`,
          `De betaling is binnen, maar de order kon niet automatisch worden ingericht: ${String(err?.message || err).slice(0, 300)}\n\n`
          + 'Handel de inrichting handmatig af in /admin/aanvragen.');
      }
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
  if (!sub) return;

  // H-eind-A: the FIRST payment of this subscription failed/expired/was
  // canceled (customer closed the iDEAL tab, bank declined, etc.) — this is
  // not a running subscription with a missed installment, so no dunning mail.
  // Close the dead row instead of leaving it on 'pending_payment' forever:
  // three separate guards filter on status IN ('pending_payment','active') —
  // the checkout of this order itself, the customer+product guard in
  // handleCheckoutStart, and the identical guard in voorstel-verify.js
  // (mintKlantEnOrder) — all three read a stuck 'pending_payment' row as "an
  // order is already running" and permanently refuse a retry. 'canceled' is
  // an existing terminal status (migrations/0007_billing.sql) that falls
  // outside all three, and this subscription never became billable, so
  // canceling it (rather than any status that implies it once ran) is the
  // correct and honest end state.
  if (sub.status === 'pending_payment') {
    await env.PORTAL_DB.prepare("UPDATE subscriptions SET status = 'canceled' WHERE id = ?").bind(subId).run();
    return;
  }

  // Only an active (running) subscription triggers dunning. A missed monthly
  // payment must not immediately cost the customer their subscription.
  if (sub.status !== 'active') return;

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

// Eindreview (blokkerend): onFailed() (mollie.js) zet subscriptions.status op
// 'canceled' wanneer de EERSTE betaling van een order mislukt/verloopt/wordt
// weggeklikt (H-eind-A, vorige ronde). Dat is correct. Maar de UNIQUE index op
// subscriptions.order_id (migrations/0009_subscription_order_unique.sql) ziet
// geen onderscheid naar status — hij verbiedt een TWEEDE rij voor dezelfde
// order_id, ongeacht of de eerste canceled is. handleCheckoutStart deed bij een
// retry gewoon een kale INSERT INTO subscriptions, die op die index kapotloopt.
// De INSERT zit binnen het try-blok, dus de klant kreeg de generieke 502
// "De betaling kon niet worden gestart" — bij elke volgende poging opnieuw,
// want de geannuleerde rij blijft staan.
//
// Fix: bij een canceled rij voor deze order_id wordt die rij HERGEBRUIKT
// (UPDATE terug naar pending_payment) in plaats van een tweede INSERT. Het
// bedrag komt daarbij opnieuw uit de actuele catalogus — nooit het oude,
// mogelijk verouderde bedrag van de mislukte poging.
import { describe, it, expect, afterEach } from 'vitest';
import { handleCheckoutStart, berekenEersteBetaling } from '../src/lib/mollie.js';
import { getCatalogTier } from '../src/data/portal-catalog.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

// Zelfde D1-stubstijl als test/checkout-start-bind.test.js, maar met een
// unique-index-simulatie: een tweede INSERT INTO subscriptions voor een
// order_id die al een rij heeft, gooit — precies zoals D1/SQLite dat doet op
// migrations/0009_subscription_order_unique.sql. Zo bewijst de "vóór de fix"
// run de daadwerkelijke 502 die de klant vandaag krijgt, niet een geraden fout.
function makeDbStub({ order, canceledSub = null, customer }) {
  const calls = [];
  const subscriptionOrderIds = new Set(canceledSub ? [order.id] : []);
  let subUpdateArgs = null;

  function respond(sql, args) {
    if (sql.includes('FROM service_orders WHERE id = ? AND customer_id = ?')) {
      return { first: async () => order };
    }
    if (sql.includes('FROM subscriptions WHERE order_id = ?')) {
      // Simuleert een echte D1-filter: staat "status IN" in de query-tekst,
      // dan matcht een canceled rij alleen als de query er ZELF niet op
      // filtert. Zo bewijst de "vóór de fix"-run daadwerkelijk dat de
      // huidige query een canceled rij niet ziet (existingSub = null) en de
      // klant dus via de kale INSERT in de UNIQUE-index loopt — niet een
      // toevallig geraden mock-antwoord.
      if (!canceledSub) return { first: async () => null };
      const filtertOpStatus = sql.includes('status IN');
      const matchtFilter = !filtertOpStatus || ['pending_payment', 'active'].includes(canceledSub.status);
      return { first: async () => (matchtFilter ? canceledSub : null) };
    }
    if (sql.includes('FROM subscriptions WHERE customer_id = ? AND product_key = ?')) {
      return { first: async () => null }; // geen ander lopend abonnement
    }
    if (sql.includes('FROM payments WHERE subscription_id = ?')) {
      return { first: async () => null }; // geen bestaande betaling om te hergebruiken
    }
    if (sql.includes('FROM customers WHERE id = ?')) {
      return { first: async () => customer };
    }
    if (sql.startsWith('UPDATE customers SET mollie_customer_id')) {
      return { run: async () => ({ meta: { changes: 1 } }) };
    }
    if (sql.startsWith('INSERT INTO subscriptions')) {
      return {
        run: async () => {
          const orderId = args[2]; // kolomvolgorde: id, customer_id, order_id, ...
          if (subscriptionOrderIds.has(orderId)) {
            // Simuleert SQLite UNIQUE-constraint-violatie op idx_subscriptions_order_id_unique.
            throw new Error('D1_ERROR: UNIQUE constraint failed: subscriptions.order_id');
          }
          subscriptionOrderIds.add(orderId);
          return { meta: { changes: 1 } };
        },
      };
    }
    if (sql.startsWith('UPDATE subscriptions SET')) {
      subUpdateArgs = args;
      return { run: async () => ({ meta: { changes: 1 } }) };
    }
    if (sql.startsWith('INSERT INTO payments')) {
      return { run: async () => ({ meta: { changes: 1 } }) };
    }
    throw new Error(`makeDbStub: geen canned-antwoord voor SQL: ${sql}`);
  }

  return {
    calls,
    get subUpdateArgs() { return subUpdateArgs; },
    prepare(sql) {
      return {
        bind(...args) {
          calls.push({ sql, args });
          const r = respond(sql, args);
          return {
            first: r.first || (async () => { throw new Error(`geen .first() voor: ${sql}`); }),
            run: r.run || (async () => { throw new Error(`geen .run() voor: ${sql}`); }),
            all: r.all || (async () => { throw new Error(`geen .all() voor: ${sql}`); }),
          };
        },
      };
    },
  };
}

function jsonRes(obj) {
  return { ok: true, status: 200, text: async () => JSON.stringify(obj) };
}
function makeFetchStub() {
  return async (url, opts = {}) => {
    const u = String(url);
    const method = opts.method || 'GET';
    if (u.endsWith('/profiles/me')) return jsonRes({ id: 'pfl_test123' });
    if (u.endsWith('/customers') && method === 'POST') return jsonRes({ id: 'cst_test123' });
    if (u.endsWith('/payments') && method === 'POST') {
      const body = JSON.parse(opts.body);
      return jsonRes({ id: 'tr_retry123', status: 'open', amount: body.amount, _links: { checkout: { href: 'https://mollie.com/checkout/select-method/retry123' } } });
    }
    throw new Error(`makeFetchStub: onverwachte fetch: ${method} ${u}`);
  };
}
function makeRequest(orderId, extra = {}) {
  return { json: async () => ({ order_id: orderId, ...extra }) };
}

describe('handleCheckoutStart — retry na geannuleerd abonnement (weggeklikt/geweigerde betaling)', () => {
  it('hergebruikt de geannuleerde rij i.p.v. een tweede INSERT die op de UNIQUE(order_id)-index kapotloopt', async () => {
    const tier = getCatalogTier('emma-telefoon', 'Starter');
    const { maandInclCent } = berekenEersteBetaling(tier);

    const order = { id: 'ord_retry_1', customer_id: 'cus_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept' };
    const customer = { id: 'cus_1', bedrijf: 'Testbedrijf', factuur_email: 'test@example.com', mollie_customer_id: 'cst_existing' };
    // Simuleert het resultaat van onFailed(): de eerste poging kreeg een
    // (mogelijk verouderd) lager bedrag, en de rij staat nu op canceled.
    const canceledSub = { id: 'sub_retry_1', status: 'canceled' };
    const db = makeDbStub({ order, canceledSub, customer });
    const user = { role: 'eigenaar', customer_id: 'cus_1', naam: 'Test User', email: 'test@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    globalThis.fetch = makeFetchStub();

    const res = await handleCheckoutStart(makeRequest('ord_retry_1'), env, user);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.checkoutUrl).toBeTruthy();

    // Geen nieuwe INSERT — de bestaande rij is hergebruikt.
    expect(db.calls.some((c) => c.sql.startsWith('INSERT INTO subscriptions'))).toBe(false);
    const update = db.calls.find((c) => c.sql.startsWith('UPDATE subscriptions SET'));
    expect(update).toBeTruthy();

    // Het bedrag komt uit de ACTUELE catalogus, niet uit de mislukte poging.
    expect(db.subUpdateArgs).toContain(maandInclCent);
    // De rij komt terug op pending_payment te staan (literal in de SQL, geen bind-arg).
    expect(update.sql).toContain("status = 'pending_payment'");
    // Dezelfde subscription-id wordt hergebruikt, niet een nieuwe.
    expect(update.args).toContain('sub_retry_1');
  });

  it('regressie: een order met een ACTIEF abonnement blijft geweigerd (geen tweede betaling via dit pad)', async () => {
    const order = { id: 'ord_actief_1', customer_id: 'cus_2', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept' };
    const customer = { id: 'cus_2', bedrijf: 'Testbedrijf 2', factuur_email: 'test2@example.com', mollie_customer_id: null };
    const activeSub = { id: 'sub_actief_1', status: 'active' };
    const db = makeDbStub({ order, canceledSub: activeSub, customer });
    const user = { role: 'eigenaar', customer_id: 'cus_2', naam: 'Test User 2', email: 'test2@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };
    let paymentCreated = false;
    globalThis.fetch = async (url, opts = {}) => {
      if (String(url).endsWith('/payments') && (opts.method || 'GET') === 'POST') paymentCreated = true;
      return makeFetchStub()(url, opts);
    };

    const res = await handleCheckoutStart(makeRequest('ord_actief_1'), env, user);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(paymentCreated).toBe(false);
    expect(db.calls.some((c) => c.sql.startsWith('INSERT INTO subscriptions'))).toBe(false);
    expect(db.calls.some((c) => c.sql.startsWith('UPDATE subscriptions SET'))).toBe(false);
  });
});

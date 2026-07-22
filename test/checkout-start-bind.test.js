// Regressietest voor handleCheckoutStart: legt vast dat subscriptions.bedrag_cent
// het MAANDbedrag krijgt (nooit het totaal incl. setup) terwijl Mollie en
// payments.bedrag_cent het TOTAAL incl. setup krijgen. Zie mollie.js regel 114-116:
// bedrag_cent drijft billMonthlySubscriptions, dus een fee die daar in belandt
// wordt elke maand opnieuw geïncasseerd.
import { describe, it, expect, afterEach } from 'vitest';
import { handleCheckoutStart, berekenEersteBetaling } from '../src/lib/mollie.js';
import { getCatalogTier } from '../src/data/portal-catalog.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// Minimale D1-achtige stub: elke .prepare(sql) geeft een statement terug waarvan
// .bind(...args) de argumenten opslaat (zodat de test ze kan inspecteren) en
// .first()/.run()/.all() een door de caller opgegeven canned-antwoord teruggeeft
// op basis van welke SQL-substring matcht.
function makeDbStub({ order, existingSub, customer }) {
  const calls = []; // { sql, args }

  function respond(sql) {
    if (sql.includes('FROM service_orders WHERE id = ? AND customer_id = ?')) {
      return { first: async () => order };
    }
    if (sql.includes('FROM subscriptions WHERE order_id = ?')) {
      return { first: async () => existingSub || null };
    }
    if (sql.includes('FROM customers WHERE id = ?')) {
      return { first: async () => customer };
    }
    if (sql.startsWith('UPDATE customers SET mollie_customer_id')) {
      return { run: async () => ({ meta: { changes: 1 } }) };
    }
    if (sql.startsWith('INSERT INTO subscriptions')) {
      return { run: async () => ({ meta: { changes: 1 } }) };
    }
    if (sql.startsWith('INSERT INTO payments')) {
      return { run: async () => ({ meta: { changes: 1 } }) };
    }
    // Onverwachte SQL: laat expliciet falen i.p.v. stil door te lopen.
    throw new Error(`makeDbStub: geen canned-antwoord voor SQL: ${sql}`);
  }

  return {
    calls,
    prepare(sql) {
      return {
        bind(...args) {
          calls.push({ sql, args });
          const r = respond(sql);
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

// Stub fetch voor de Mollie-aanroepen die handleCheckoutStart raakt:
// /profiles/me (klant-resolutie), /customers (nieuwe klant), /payments (create).
function makeFetchStub() {
  return async (url, opts = {}) => {
    const u = String(url);
    const method = opts.method || 'GET';

    if (u.endsWith('/profiles/me')) {
      return jsonRes({ id: 'pfl_test123' });
    }
    if (u.endsWith('/customers') && method === 'POST') {
      return jsonRes({ id: 'cst_test123' });
    }
    if (u.endsWith('/payments') && method === 'POST') {
      const body = JSON.parse(opts.body);
      return jsonRes({
        id: 'tr_test123',
        status: 'open',
        amount: body.amount,
        _links: { checkout: { href: 'https://mollie.com/checkout/select-method/test123' } },
      });
    }
    throw new Error(`makeFetchStub: onverwachte fetch: ${method} ${u}`);
  };
}

function jsonRes(obj) {
  return { ok: true, status: 200, text: async () => JSON.stringify(obj) };
}

function makeRequest(orderId) {
  return { json: async () => ({ order_id: orderId }) };
}

describe('handleCheckoutStart — subscriptions vs. Mollie/payments bedrag', () => {
  it('schrijft het maandbedrag naar subscriptions.bedrag_cent en het totaal naar Mollie + payments (tier met setup-fee)', async () => {
    const tier = getCatalogTier('emma-telefoon', 'Starter');
    expect(tier).toBeTruthy();
    expect(tier.setupCent).toBeGreaterThan(0); // deze test heeft alleen zin met een echte fee

    const { maandInclCent, totaalInclCent } = berekenEersteBetaling(tier);
    expect(totaalInclCent).toBeGreaterThan(maandInclCent); // sanity: er zit echt een fee in

    const order = { id: 'ord_1', customer_id: 'cus_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept' };
    const customer = { id: 'cus_1', bedrijf: 'Testbedrijf', factuur_email: 'test@example.com', mollie_customer_id: null };
    const db = makeDbStub({ order, existingSub: null, customer });
    const user = { role: 'eigenaar', customer_id: 'cus_1', naam: 'Test User', email: 'test@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };

    globalThis.fetch = makeFetchStub();

    const res = await handleCheckoutStart(makeRequest('ord_1'), env, user);
    const resBody = await res.json();
    expect(resBody.ok).toBe(true);

    const subInsert = db.calls.find((c) => c.sql.startsWith('INSERT INTO subscriptions'));
    const paymentInsert = db.calls.find((c) => c.sql.startsWith('INSERT INTO payments'));
    expect(subInsert).toBeTruthy();
    expect(paymentInsert).toBeTruthy();

    // Kolomvolgorde: (id, customer_id, order_id, product_key, tier, bedrag_cent, betaling, status, mollie_customer_id, created_at)
    const subBedragCent = subInsert.args[5];
    // Kolomvolgorde: (id, customer_id, subscription_id, order_id, bedrag_cent, status, sequence_type, created_at)
    const paymentBedragCent = paymentInsert.args[4];

    // 1. subscriptions.bedrag_cent = maandbedrag, NIET het totaal.
    expect(subBedragCent).toBe(maandInclCent);
    expect(subBedragCent).not.toBe(totaalInclCent);

    // 2. payments.bedrag_cent = totaal incl. setup.
    expect(paymentBedragCent).toBe(totaalInclCent);

    // 2b. Bedrag dat naar Mollie ging (amount.value) = totaal incl. setup, in euro's.
    expect(resBody.checkoutUrl).toBeTruthy();
  });

  it('legt het amount.value dat naar Mollie gaat vast als het totaal incl. setup', async () => {
    const tier = getCatalogTier('emma-telefoon', 'Starter');
    const { totaalInclCent } = berekenEersteBetaling(tier);

    const order = { id: 'ord_2', customer_id: 'cus_2', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept' };
    const customer = { id: 'cus_2', bedrijf: 'Testbedrijf 2', factuur_email: 'test2@example.com', mollie_customer_id: 'cst_existing' };
    const db = makeDbStub({ order, existingSub: null, customer });
    const user = { role: 'eigenaar', customer_id: 'cus_2', naam: 'Test User 2', email: 'test2@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };

    let capturedPaymentBody = null;
    globalThis.fetch = async (url, opts = {}) => {
      const u = String(url);
      const method = opts.method || 'GET';
      if (u.endsWith('/profiles/me')) return jsonRes({ id: 'pfl_test123' });
      if (u.endsWith('/payments') && method === 'POST') {
        capturedPaymentBody = JSON.parse(opts.body);
        return jsonRes({
          id: 'tr_test456',
          status: 'open',
          amount: capturedPaymentBody.amount,
          _links: { checkout: { href: 'https://mollie.com/checkout/select-method/test456' } },
        });
      }
      throw new Error(`onverwachte fetch: ${method} ${u}`);
    };

    await handleCheckoutStart(makeRequest('ord_2'), env, user);

    expect(capturedPaymentBody).toBeTruthy();
    const expectedEuros = (totaalInclCent / 100).toFixed(2);
    expect(capturedPaymentBody.amount.value).toBe(expectedEuros);
  });

  it('tier zonder setup-fee: totaal = maandbedrag, en subscriptions/payments krijgen hetzelfde bedrag', async () => {
    // emma/Lite heeft setupCent 0 in de catalogus — een echte fee-loze tier, geen fixture.
    const tier = getCatalogTier('emma', 'Lite');
    expect(tier).toBeTruthy();
    expect(tier.setupCent).toBe(0);

    const { maandInclCent, totaalInclCent } = berekenEersteBetaling(tier);
    expect(totaalInclCent).toBe(maandInclCent);

    const order = { id: 'ord_3', customer_id: 'cus_3', product_key: 'emma', tier: 'Lite', status: 'concept' };
    const customer = { id: 'cus_3', bedrijf: 'Testbedrijf 3', factuur_email: 'test3@example.com', mollie_customer_id: 'cst_existing3' };
    const db = makeDbStub({ order, existingSub: null, customer });
    const user = { role: 'eigenaar', customer_id: 'cus_3', naam: 'Test User 3', email: 'test3@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };

    globalThis.fetch = makeFetchStub();

    const res = await handleCheckoutStart(makeRequest('ord_3'), env, user);
    const resBody = await res.json();
    expect(resBody.ok).toBe(true);

    const subInsert = db.calls.find((c) => c.sql.startsWith('INSERT INTO subscriptions'));
    const paymentInsert = db.calls.find((c) => c.sql.startsWith('INSERT INTO payments'));
    const subBedragCent = subInsert.args[5];
    const paymentBedragCent = paymentInsert.args[4];

    expect(subBedragCent).toBe(maandInclCent);
    expect(paymentBedragCent).toBe(totaalInclCent);
    expect(subBedragCent).toBe(paymentBedragCent); // geen fee → beide gelijk
  });
});

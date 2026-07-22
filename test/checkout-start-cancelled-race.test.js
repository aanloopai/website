// Eindreview (blokkerend, vervolg op checkout-start-cancelled-retry.test.js):
// het hergebruikpad voor een geannuleerde subscriptions-rij (H-eind fix) mist
// atomiciteit. Twee gelijktijdige verzoeken op dezelfde geannuleerde rij lezen
// beide status = 'canceled', doen beide de UPDATE naar 'pending_payment', en
// creëren zo TWEE openstaande Mollie-betalingen voor hetzelfde abonnement.
// Betaalt de klant er één, dan zet de andere zijn net geactiveerde abonnement
// na afloop op 'past_due' — "betaling mislukt"-mail nadat hij net betaald
// heeft, en de maandcron stopt stilletjes (die selecteert alleen 'active').
//
// Fix: de UPDATE wordt voorwaardelijk op de verwachte status ("... WHERE id
// = ? AND status = 'canceled'"), en de aanroeper controleert changes === 1 —
// hetzelfde compare-and-swap-patroon als handleAuthVerify (portal-routes.js,
// de magic_links-claim) en de payment-statusupdates in dit bestand
// (handleMollieWebhook, reconcilePayments). Wint een ander verzoek de race,
// dan stopt dit verzoek met dezelfde 409-melding als de rest van deze functie
// geeft wanneer er al een checkout loopt.
import { describe, it, expect, afterEach } from 'vitest';
import { handleCheckoutStart } from '../src/lib/mollie.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

// Modelleert de race expliciet op DB-niveau in plaats van te vertrouwen op
// toevallige Promise-interleaving: beide verzoeken doen hun SELECT op de
// subscriptions-rij VOORDAT een van beide de UPDATE uitvoert (dat is precies
// wat "gelijktijdig" betekent), dus de SELECT-stub geeft altijd de
// geannuleerde rij terug. De UPDATE-stub houdt de ECHTE status apart bij en
// past een compare-and-swap toe — alleen de eerste UPDATE die de rij nog als
// 'canceled' aantreft slaagt (changes: 1); de tweede ziet 'pending_payment'
// en faalt (changes: 0), precies zoals D1's row-affected-count dat zou doen.
function makeRaceDbStub({ order, customer }) {
  const calls = [];
  let realSubStatus = 'canceled';
  let updateAttempts = 0;
  let updateSuccesses = 0;

  function respond(sql, args) {
    if (sql.includes('FROM service_orders WHERE id = ? AND customer_id = ?')) {
      return { first: async () => order };
    }
    if (sql.includes('FROM subscriptions WHERE order_id = ?')) {
      // Beide "gelijktijdige" verzoeken lezen de rij vóór enige UPDATE —
      // dus altijd de geannuleerde rij, ongeacht wat een ander verzoek
      // intussen al deed.
      return { first: async () => ({ id: 'sub_race_1', status: 'canceled' }) };
    }
    if (sql.includes('FROM subscriptions WHERE customer_id = ? AND product_key = ?')) {
      return { first: async () => null };
    }
    if (sql.includes('FROM customers WHERE id = ?')) {
      return { first: async () => customer };
    }
    if (sql.startsWith('UPDATE customers SET mollie_customer_id')) {
      return { run: async () => ({ meta: { changes: 1 } }) };
    }
    if (sql.startsWith('UPDATE subscriptions SET')) {
      updateAttempts += 1;
      // Detecteert of de UPDATE zelf de verwachte status afdwingt (de fix)
      // door te kijken of de WHERE-clause op status = 'canceled' filtert.
      const expectsCanceled = /WHERE[\s\S]*status\s*=\s*'canceled'/.test(sql);
      return {
        run: async () => {
          if (expectsCanceled) {
            // Voorwaardelijke UPDATE (de fix): slaagt alleen als de rij op
            // dit moment nog 'canceled' is.
            if (realSubStatus !== 'canceled') return { meta: { changes: 0 } };
            realSubStatus = 'pending_payment';
            updateSuccesses += 1;
            return { meta: { changes: 1 } };
          }
          // Onvoorwaardelijke UPDATE (vóór de fix): slaagt altijd — dit is
          // precies het gat dat de dubbele betaling veroorzaakt.
          realSubStatus = 'pending_payment';
          updateSuccesses += 1;
          return { meta: { changes: 1 } };
        },
      };
    }
    if (sql.startsWith('INSERT INTO payments')) {
      return { run: async () => ({ meta: { changes: 1 } }) };
    }
    throw new Error(`makeRaceDbStub: geen canned-antwoord voor SQL: ${sql}`);
  }

  return {
    calls,
    get updateAttempts() { return updateAttempts; },
    get updateSuccesses() { return updateSuccesses; },
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
function makeFetchStub(onPaymentCreate) {
  return async (url, opts = {}) => {
    const u = String(url);
    const method = opts.method || 'GET';
    if (u.endsWith('/profiles/me')) return jsonRes({ id: 'pfl_test123' });
    if (u.endsWith('/customers') && method === 'POST') return jsonRes({ id: 'cst_test123' });
    if (u.endsWith('/payments') && method === 'POST') {
      onPaymentCreate?.();
      const body = JSON.parse(opts.body);
      return jsonRes({
        id: `tr_race${Math.random().toString(36).slice(2, 8)}`,
        status: 'open',
        amount: body.amount,
        _links: { checkout: { href: 'https://mollie.com/checkout/select-method/race' } },
      });
    }
    throw new Error(`makeFetchStub: onverwachte fetch: ${method} ${u}`);
  };
}
function makeRequest(orderId) {
  return { json: async () => ({ order_id: orderId }) };
}

describe('handleCheckoutStart — race op het hergebruikpad van een geannuleerde subscriptions-rij', () => {
  it('precies één Mollie-betaling ontstaat wanneer twee verzoeken tegelijk dezelfde geannuleerde rij hergebruiken', async () => {
    const order = { id: 'ord_race_1', customer_id: 'cus_race', product_key: 'emma-telefoon', tier: 'Starter', status: 'concept' };
    const customer = { id: 'cus_race', bedrijf: 'Testbedrijf Race', factuur_email: 'race@example.com', mollie_customer_id: 'cst_existing' };
    const db = makeRaceDbStub({ order, customer });
    const user = { role: 'eigenaar', customer_id: 'cus_race', naam: 'Race User', email: 'race@example.com' };
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db, PORTAL_SESSION_SECRET: 'secret' };

    let paymentsCreated = 0;
    globalThis.fetch = makeFetchStub(() => { paymentsCreated += 1; });

    // Twee "gelijktijdige" pogingen op dezelfde geannuleerde rij — nabootsend
    // twee tabbladen / een dubbelklik op "opnieuw betalen".
    const [res1, res2] = await Promise.all([
      handleCheckoutStart(makeRequest('ord_race_1'), env, user),
      handleCheckoutStart(makeRequest('ord_race_1'), env, user),
    ]);
    const [body1, body2] = await Promise.all([res1.json(), res2.json()]);
    const results = [{ res: res1, body: body1 }, { res: res2, body: body2 }];

    // Kern van de fix: precies één Mollie-betaling, nooit twee.
    expect(paymentsCreated).toBe(1);

    const winners = results.filter((r) => r.res.status === 200 && r.body.ok === true);
    const losers = results.filter((r) => r.res.status !== 200);
    expect(winners.length).toBe(1);
    expect(losers.length).toBe(1);

    // De verliezer krijgt een bruikbare melding — "er staat al een betaling
    // klaar", niet een generieke/onverklaarde fout.
    expect(losers[0].res.status).toBe(409);
    expect(losers[0].body.ok).toBe(false);
    expect(typeof losers[0].body.error).toBe('string');
    expect(losers[0].body.error.length).toBeGreaterThan(0);

    // De UPDATE werd twee keer geprobeerd, maar slaagde maar één keer —
    // bewijst dat de compare-and-swap daadwerkelijk de tweede poging blokkeert
    // (en niet toevallig doordat er maar één poging plaatsvond).
    expect(db.updateAttempts).toBe(2);
    expect(db.updateSuccesses).toBe(1);
  });
});

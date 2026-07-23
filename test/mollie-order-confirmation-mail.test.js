// Punt 2 (livegang-toevoeging, 2026-07-22): een korte NL-bevestigingsmail na
// de EERSTE betaling van een order — wat is gekocht, wat is betaald, dat de
// inrichting is gestart, en de eerstvolgende stap. Zie mollie.js
// (sendOrderConfirmationMail + de isEersteBetaling-hook in onPaid) voor de
// implementatie.
//
// Exactly-once bewijs: de mail hangt aan dezelfde CAS als de rest van onPaid()
// — "UPDATE payments SET status = 'paid' WHERE id = ? AND status != 'paid'"
// — die garandeert dat onPaid() precies één keer per betaling draait, ongeacht
// of de webhook, de reconcile-cron, of allebei (racend) hem bereiken. Getest
// via reconcilePayments(), net als test/mollie-onfailed.test.js, omdat
// handleMollieWebhook() door exact dezelfde onPaid()-functie loopt (dus dit
// dekt beide paden functioneel af) en reconcilePayments() geen
// webhook-token/form-parsing-opzet nodig heeft.
//
// De maandelijkse verlenging heeft een eigen mailstroom
// (billMonthlySubscriptions) en blijft hier ONGEMOEID: renewal-betalingen
// hebben altijd order_id = null (zie billMonthlySubscriptions' INSERT) en hun
// subscriptions-rij staat nooit op 'pending_payment' (die stond immers al
// 'active'/'past_due' vóórdat de renewal-betaling ontstond) — dus de
// eerste-betaling-vlag in onPaid() is voor die betalingen altijd false.
import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';

const activateOrderMock = vi.fn();
vi.mock('../src/lib/activation.js', () => ({
  activateOrder: (...args) => activateOrderMock(...args),
}));

const dealWonVoorOrderMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../src/lib/crm.js', () => ({
  dealWonVoorOrder: (...args) => dealWonVoorOrderMock(...args),
}));

const sendMailMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../src/lib/portal-routes.js', () => ({
  sendMail: (...args) => sendMailMock(...args),
}));

const { reconcilePayments } = await import('../src/lib/mollie.js');

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
beforeEach(() => {
  activateOrderMock.mockReset();
  dealWonVoorOrderMock.mockReset().mockResolvedValue(undefined);
  sendMailMock.mockReset().mockResolvedValue(undefined);
});

function jsonRes(obj) {
  return { ok: true, status: 200, text: async () => JSON.stringify(obj) };
}

// Minimale D1-dubbel die alles dekt wat onPaid() + createInvoice() aanraken.
function makeDb({
  payments = [], subscriptions = [], serviceOrders = [], users = [], invoices = [],
} = {}) {
  const state = {
    payments: payments.map((p) => ({ ...p })),
    subscriptions: subscriptions.map((s) => ({ ...s })),
    serviceOrders: serviceOrders.map((o) => ({ ...o })),
    users: users.map((u) => ({ ...u })),
    invoices: invoices.map((i) => ({ ...i })),
    counters: {},
  };
  return {
    state,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async all() {
              if (sql.startsWith("SELECT id, subscription_id, order_id FROM payments WHERE status IN ('open','pending')")) {
                return { results: state.payments.filter((p) => p.status === 'open' || p.status === 'pending') };
              }
              throw new Error(`makeDb: geen .all() canned voor: ${sql}`);
            },
            async first() {
              if (sql.startsWith('SELECT * FROM subscriptions WHERE id = ?')) {
                return state.subscriptions.find((s) => s.id === args[0]) || null;
              }
              if (sql.startsWith('SELECT * FROM service_orders WHERE id = ?')) {
                return state.serviceOrders.find((o) => o.id === args[0]) || null;
              }
              if (sql.startsWith("SELECT email, naam FROM users WHERE customer_id = ? AND role = 'eigenaar'")) {
                return state.users.find((u) => u.customer_id === args[0] && u.role === 'eigenaar') || null;
              }
              if (sql.startsWith('SELECT id FROM invoices WHERE payment_id = ?')) {
                const inv = state.invoices.find((i) => i.payment_id === args[0]);
                return inv ? { id: inv.id } : null;
              }
              if (sql.startsWith('UPDATE counters SET n = n + 1 WHERE name = ?')) {
                const name = args[0];
                state.counters[name] = (state.counters[name] || 0) + 1;
                return { n: state.counters[name] };
              }
              throw new Error(`makeDb: geen .first() canned voor: ${sql}`);
            },
            async run() {
              if (sql.startsWith("UPDATE payments SET status = 'paid', paid_at = ? WHERE id = ? AND status != 'paid'")) {
                const [, id] = args;
                const p = state.payments.find((row) => row.id === id);
                if (!p || p.status === 'paid') return { meta: { changes: 0 } };
                p.status = 'paid';
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith('UPDATE payments SET status = ? WHERE id = ? AND status != ?')) {
                const [newStatus, id] = args;
                const p = state.payments.find((row) => row.id === id);
                if (!p || p.status === newStatus) return { meta: { changes: 0 } };
                p.status = newStatus;
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith("UPDATE subscriptions SET status = 'active', next_payment_date = ? WHERE id = ?")) {
                const s = state.subscriptions.find((row) => row.id === args[1]);
                if (s) s.status = 'active';
                return { meta: { changes: s ? 1 : 0 } };
              }
              if (sql.startsWith("UPDATE subscriptions SET status = 'completed' WHERE id = ?")) {
                const s = state.subscriptions.find((row) => row.id === args[0]);
                if (s) s.status = 'completed';
                return { meta: { changes: s ? 1 : 0 } };
              }
              if (sql.startsWith("UPDATE subscriptions SET status = 'active' WHERE id = ?")) {
                const s = state.subscriptions.find((row) => row.id === args[0]);
                if (s) s.status = 'active';
                return { meta: { changes: s ? 1 : 0 } };
              }
              if (sql.startsWith('UPDATE service_orders SET status = ?, submitted_at = ? WHERE id = ?')) {
                const o = state.serviceOrders.find((row) => row.id === args[2]);
                if (o) o.status = args[0];
                return { meta: { changes: o ? 1 : 0 } };
              }
              if (sql.startsWith('INSERT OR IGNORE INTO counters')) {
                const [name] = args;
                if (!(name in state.counters)) state.counters[name] = 0;
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith('INSERT INTO invoices')) {
                state.invoices.push({ id: args[0], payment_id: args[8] });
                return { meta: { changes: 1 } };
              }
              throw new Error(`makeDb: geen .run() canned voor: ${sql}`);
            },
          };
        },
      };
    },
  };
}

function makeFetchStub(paymentOverrides = {}) {
  return async (url) => {
    if (/\/payments\/tr_/.test(String(url))) {
      return jsonRes({ status: 'paid', amount: { currency: 'EUR', value: '603.03' }, ...paymentOverrides });
    }
    throw new Error(`onverwachte fetch: ${url}`);
  };
}

const owner = { customer_id: 'cust_1', email: 'klant@example.nl', naam: 'Jan Klant', role: 'eigenaar', created_at: 0 };
const funnelOrder = {
  id: 'ord_1', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'ingediend', voorstel_id: 'vst_1',
};
const portalOrder = {
  id: 'ord_2', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'ingediend', voorstel_id: null,
};

describe('onPaid (via reconcilePayments) — klantbevestigingsmail na de EERSTE betaling', () => {
  it('funnel-order (wacht_op_klant): stuurt de bevestigingsmail, met "nog niet live"-tekst', async () => {
    activateOrderMock.mockResolvedValue({ status: 'wacht_op_klant', serviceId: 'svc_1', provisioned: true });
    const db = makeDb({
      payments: [{ id: 'tr_1', status: 'open', subscription_id: 'sub_1', order_id: 'ord_1', created_at: 0 }],
      subscriptions: [{
        id: 'sub_1', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'pending_payment', betaling: 'maandelijks',
      }],
      serviceOrders: [funnelOrder],
      users: [owner],
    });
    globalThis.fetch = makeFetchStub();
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db };

    await reconcilePayments(env);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const [mailEnv, to, naam, subject, html] = sendMailMock.mock.calls[0];
    expect(mailEnv).toBe(env);
    expect(to).toBe('klant@example.nl');
    expect(naam).toBe('Jan Klant');
    expect(subject.toLowerCase()).toContain('bevestiging');
    expect(html).toContain('Emma');
    expect(html).toContain('Starter');
    expect(html).toContain('603.03');
    expect(html).toContain('Rond de laatste stap af'); // niet live -> verwijst naar onboarding-portaal
    expect(html).toContain('/portal/onboarding?order=ord_1'); // klikbare link met order-id
    expect(html.toLowerCase()).not.toContain('u hoeft zelf niets te doen'); // Plak C: klant rondt zelf af
    expect(html).not.toContain('marco');
  });

  it('portal-order (direct actief): stuurt de bevestigingsmail, met "live"-tekst, niet de onboarding-tekst', async () => {
    activateOrderMock.mockResolvedValue({ status: 'actief', serviceId: 'svc_2', provisioned: true });
    const db = makeDb({
      payments: [{ id: 'tr_2', status: 'open', subscription_id: 'sub_2', order_id: 'ord_2', created_at: 0 }],
      subscriptions: [{
        id: 'sub_2', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'pending_payment', betaling: 'maandelijks',
      }],
      serviceOrders: [portalOrder],
      users: [owner],
    });
    globalThis.fetch = makeFetchStub();
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db };

    await reconcilePayments(env);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const html = sendMailMock.mock.calls[0][4];
    expect(html.toLowerCase()).toContain('voltooid');
    expect(html).not.toContain('/portal/onboarding'); // live-tak blijft ongewijzigd, geen onboarding-link
    expect(html).not.toContain('Rond de laatste stap af');
  });

  it('maandelijkse verlenging (order_id null, abonnement was al active): GEEN bevestigingsmail — dat is de bestaande betaallink-mailstroom', async () => {
    const db = makeDb({
      payments: [{ id: 'tr_3', status: 'open', subscription_id: 'sub_3', order_id: null, created_at: 0 }],
      subscriptions: [{
        id: 'sub_3', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'active', betaling: 'maandelijks',
      }],
      users: [owner],
    });
    globalThis.fetch = makeFetchStub();
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db };

    await reconcilePayments(env);

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(activateOrderMock).not.toHaveBeenCalled(); // geen orderId -> ook geen activatiepoging
    expect(db.state.subscriptions[0].status).toBe('active');
  });

  it('late maandtermijn (past_due -> active reactivatie, order_id null): ook GEEN bevestigingsmail', async () => {
    const db = makeDb({
      payments: [{ id: 'tr_4', status: 'open', subscription_id: 'sub_4', order_id: null, created_at: 0 }],
      subscriptions: [{
        id: 'sub_4', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'past_due', betaling: 'maandelijks',
      }],
      users: [owner],
    });
    globalThis.fetch = makeFetchStub();
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db };

    await reconcilePayments(env);

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(db.state.subscriptions[0].status).toBe('active'); // wél gereactiveerd, dat gedrag blijft
  });

  it('replay: een tweede reconcile-cron-pas over dezelfde (al afgehandelde) betaling stuurt geen tweede mail', async () => {
    activateOrderMock.mockResolvedValue({ status: 'wacht_op_klant', serviceId: 'svc_1', provisioned: true });
    const db = makeDb({
      payments: [{ id: 'tr_5', status: 'open', subscription_id: 'sub_5', order_id: 'ord_1', created_at: 0 }],
      subscriptions: [{
        id: 'sub_5', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'pending_payment', betaling: 'maandelijks',
      }],
      serviceOrders: [{ ...funnelOrder, id: 'ord_1' }],
      users: [owner],
    });
    globalThis.fetch = makeFetchStub();
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db };

    await reconcilePayments(env); // eerste pas: pakt de open betaling op, mailt
    expect(sendMailMock).toHaveBeenCalledTimes(1);

    await reconcilePayments(env); // tweede pas: de betaling staat nu al op 'paid', dus de
    // stale-query in reconcilePayments (status IN open/pending) ziet hem niet meer terug —
    // exact de CAS/exactly-once-garantie waar de bevestigingsmail aan hangt.
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  it('mislukte mailverzending blokkeert de betaalflow niet: activatie en factuur gaan gewoon door, fout wordt gelogd', async () => {
    activateOrderMock.mockResolvedValue({ status: 'wacht_op_klant', serviceId: 'svc_1', provisioned: true });
    sendMailMock.mockRejectedValue(new Error('BREVO_API_KEY niet geconfigureerd'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const db = makeDb({
      payments: [{ id: 'tr_6', status: 'open', subscription_id: 'sub_6', order_id: 'ord_1', created_at: 0 }],
      subscriptions: [{
        id: 'sub_6', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'pending_payment', betaling: 'maandelijks',
      }],
      serviceOrders: [{ ...funnelOrder, id: 'ord_1' }],
      users: [owner],
    });
    globalThis.fetch = makeFetchStub();
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db };

    await expect(reconcilePayments(env)).resolves.not.toThrow();

    expect(db.state.payments[0].status).toBe('paid'); // betaling blijft geslaagd
    expect(activateOrderMock).toHaveBeenCalledTimes(1); // activatie ging gewoon door
    expect(db.state.invoices).toHaveLength(1); // factuur werd gewoon aangemaakt
    expect(consoleSpy).toHaveBeenCalledWith(
      '[mollie] orderbevestigingsmail mislukt:',
      'BREVO_API_KEY niet geconfigureerd',
    );
    consoleSpy.mockRestore();
  });

  it('geen bekende eigenaar (geen e-mailadres): mail wordt stil overgeslagen, betaalflow gaat door', async () => {
    activateOrderMock.mockResolvedValue({ status: 'wacht_op_klant', serviceId: 'svc_1', provisioned: true });
    const db = makeDb({
      payments: [{ id: 'tr_7', status: 'open', subscription_id: 'sub_7', order_id: 'ord_1', created_at: 0 }],
      subscriptions: [{
        id: 'sub_7', customer_id: 'cust_1', product_key: 'emma-telefoon', tier: 'Starter', status: 'pending_payment', betaling: 'maandelijks',
      }],
      serviceOrders: [{ ...funnelOrder, id: 'ord_1' }],
      users: [], // geen eigenaar bekend
    });
    globalThis.fetch = makeFetchStub();
    const env = { MOLLIE_API_KEY: 'test_key', PORTAL_DB: db };

    await expect(reconcilePayments(env)).resolves.not.toThrow();
    expect(sendMailMock).not.toHaveBeenCalled();
    expect(db.state.invoices).toHaveLength(1);
  });
});

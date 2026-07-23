// Task 13: legt vast dat de */15-cron (scheduled(), worker.js) klanten met een
// onvoltooide onboarding (service_orders.status='in_uitvoering' + service
// status='onboarding', geen fout) na 24u herinnert, max 3x, waarna alertStaff
// het overneemt en er niets meer verstuurd wordt.
//
// sendMail (portal-routes.js) en alertStaff (notify.js) zijn hier gemockt —
// zelfde stijl als provision-retry-cron.test.js — dit bestand dekt
// nudgeOnboarding() zelf (kandidaat-selectie + nudge-drempel-logica), niet
// Brevo/Telegram zelf. Tijd wordt niet gemockt (zelfde stijl als
// agenda-oauth.test.js/voorstel-claim.test.js) — offsets zijn relatief aan
// het echte Date.now() op testmoment.
import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';

const sendMailMock = vi.fn();
vi.mock('../src/lib/portal-routes.js', () => ({
  sendMail: (...args) => sendMailMock(...args),
}));

const alertStaffMock = vi.fn();
vi.mock('../src/lib/notify.js', () => ({
  alertStaff: (...args) => alertStaffMock(...args),
}));

const { nudgeOnboarding } = await import('../src/lib/onboarding-nudge.js');

beforeEach(() => {
  sendMailMock.mockReset();
  alertStaffMock.mockReset();
});

const DAG_MS = 24 * 60 * 60 * 1000;

// In-memory D1-dubbel: ondersteunt de join-kandidaat-query (geen bind-args),
// de owner-lookup in users, en de INSERT OR IGNORE / UPDATE op
// onboarding_nudges. Zelfde vorm als provision-retry-cron.test.js se makeDb.
function makeDb({
  orders = [], services = [], nudges = [], users = [],
} = {}) {
  const state = {
    orders: orders.map((o) => ({ ...o })),
    services: services.map((s) => ({ ...s })),
    nudges: nudges.map((n) => ({ ...n })),
    users: users.map((u) => ({ ...u })),
  };
  return {
    state,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (sql.startsWith('INSERT OR IGNORE INTO onboarding_nudges')) {
                const [orderId, customerId, createdAt] = args;
                if (!state.nudges.some((n) => n.order_id === orderId)) {
                  state.nudges.push({
                    order_id: orderId, customer_id: customerId, aantal: 0, laatst_genudged: null, created_at: createdAt,
                  });
                }
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith('UPDATE onboarding_nudges SET aantal')) {
                const [aantal, laatst, orderId] = args;
                const n = state.nudges.find((x) => x.order_id === orderId);
                if (n) { n.aantal = aantal; n.laatst_genudged = laatst; }
                return { meta: { changes: n ? 1 : 0 } };
              }
              throw new Error(`makeDb: geen .run() canned voor: ${sql}`);
            },
            async first() {
              if (sql.startsWith('SELECT email, naam FROM users')) {
                const customerId = args[0];
                return state.users.find((u) => u.customer_id === customerId) || null;
              }
              throw new Error(`makeDb: geen .first() canned voor: ${sql}`);
            },
            async all() {
              throw new Error(`makeDb: geen .bind().all() canned voor: ${sql}`);
            },
          };
        },
        // De kandidaat-query neemt geen bind-argumenten.
        async all() {
          if (sql.includes('FROM service_orders so') && sql.includes('JOIN services s')) {
            const results = state.orders
              .filter((o) => o.status === 'in_uitvoering')
              .map((o) => {
                const svc = state.services.find((s) => s.order_id === o.id);
                if (!svc || svc.status !== 'onboarding') return null;
                const nudge = state.nudges.find((n) => n.order_id === o.id);
                return {
                  order_id: o.id,
                  customer_id: o.customer_id,
                  order_created_at: o.created_at,
                  product_key: o.product_key,
                  provisioning_json: svc.provisioning_json,
                  nudge_aantal: nudge?.aantal,
                  nudge_laatst: nudge?.laatst_genudged,
                  nudge_created_at: nudge?.created_at,
                };
              })
              .filter(Boolean);
            return { results };
          }
          throw new Error(`makeDb: geen .all() canned voor: ${sql}`);
        },
      };
    },
  };
}

function order(overrides = {}) {
  return {
    id: 'ord_1', customer_id: 'cust_1', status: 'in_uitvoering', product_key: 'emma-telefoon', created_at: Date.now() - 2 * DAG_MS, ...overrides,
  };
}
function service(overrides = {}) {
  return {
    order_id: 'ord_1', status: 'onboarding', provisioning_json: null, ...overrides,
  };
}
function owner(overrides = {}) {
  return { customer_id: 'cust_1', email: 'klant@voorbeeld.nl', naam: 'Piet Klant', ...overrides };
}

describe('nudgeOnboarding — kandidaat-selectie en nudge-drempel', () => {
  it('nudget een onboarding-order ouder dan 24u sinds vorige nudge en hoogt aantal op', async () => {
    const db = makeDb({
      orders: [order({ id: 'ord_1' })],
      services: [service({ order_id: 'ord_1' })],
      nudges: [{
        order_id: 'ord_1', customer_id: 'cust_1', aantal: 0, laatst_genudged: Date.now() - 2 * DAG_MS, created_at: Date.now() - 2 * DAG_MS,
      }],
      users: [owner()],
    });
    const env = { PORTAL_DB: db };
    const before = Date.now();

    await nudgeOnboarding(env);

    const after = Date.now();
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock.mock.calls[0][1]).toBe('klant@voorbeeld.nl');
    expect(alertStaffMock).not.toHaveBeenCalled();
    const n = db.state.nudges.find((x) => x.order_id === 'ord_1');
    expect(n.aantal).toBe(1);
    expect(n.laatst_genudged).toBeGreaterThanOrEqual(before);
    expect(n.laatst_genudged).toBeLessThanOrEqual(after);
  });

  it('nudget een order zonder bestaande nudge-rij als de order zelf al >24u oud is', async () => {
    const db = makeDb({
      orders: [order({ id: 'ord_new', created_at: Date.now() - 2 * DAG_MS })],
      services: [service({ order_id: 'ord_new' })],
      nudges: [],
      users: [owner()],
    });
    const env = { PORTAL_DB: db };

    await nudgeOnboarding(env);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const n = db.state.nudges.find((x) => x.order_id === 'ord_new');
    expect(n.aantal).toBe(1);
  });

  it('nudget NIET binnen 24u na de vorige nudge', async () => {
    const db = makeDb({
      orders: [order({ id: 'ord_1' })],
      services: [service({ order_id: 'ord_1' })],
      nudges: [{
        order_id: 'ord_1', customer_id: 'cust_1', aantal: 1, laatst_genudged: Date.now() - 1000, created_at: Date.now() - 2 * DAG_MS,
      }],
      users: [owner()],
    });
    const env = { PORTAL_DB: db };

    await nudgeOnboarding(env);

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(alertStaffMock).not.toHaveBeenCalled();
    const n = db.state.nudges.find((x) => x.order_id === 'ord_1');
    expect(n.aantal).toBe(1);
  });

  it('bij de 3e nudge (aantal 2→3): staff-alert i.p.v. klant-mail, en aantal wordt 3', async () => {
    const db = makeDb({
      orders: [order({ id: 'ord_1' })],
      services: [service({ order_id: 'ord_1' })],
      nudges: [{
        order_id: 'ord_1', customer_id: 'cust_1', aantal: 2, laatst_genudged: Date.now() - 2 * DAG_MS, created_at: Date.now() - 4 * DAG_MS,
      }],
      users: [owner()],
    });
    const env = { PORTAL_DB: db };

    await nudgeOnboarding(env);

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(alertStaffMock).toHaveBeenCalledTimes(1);
    expect(alertStaffMock.mock.calls[0][1]).toMatch(/onboarding niet af/i);
    const n = db.state.nudges.find((x) => x.order_id === 'ord_1');
    expect(n.aantal).toBe(3);
  });

  it('doet niets meer zodra aantal>=3, ook na 24u', async () => {
    const db = makeDb({
      orders: [order({ id: 'ord_1' })],
      services: [service({ order_id: 'ord_1' })],
      nudges: [{
        order_id: 'ord_1', customer_id: 'cust_1', aantal: 3, laatst_genudged: Date.now() - 10 * DAG_MS, created_at: Date.now() - 20 * DAG_MS,
      }],
      users: [owner()],
    });
    const env = { PORTAL_DB: db };

    await nudgeOnboarding(env);

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(alertStaffMock).not.toHaveBeenCalled();
    const n = db.state.nudges.find((x) => x.order_id === 'ord_1');
    expect(n.aantal).toBe(3);
  });

  it('een fout-order (provisioning_json.status=fout) wordt NIET genudged', async () => {
    const db = makeDb({
      orders: [order({ id: 'ord_fout' })],
      services: [service({
        order_id: 'ord_fout', provisioning_json: JSON.stringify({ status: 'fout', error: 'boom', attempts: 1 }),
      })],
      nudges: [],
      users: [owner()],
    });
    const env = { PORTAL_DB: db };

    await nudgeOnboarding(env);

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(alertStaffMock).not.toHaveBeenCalled();
    expect(db.state.nudges.find((x) => x.order_id === 'ord_fout')).toBeUndefined();
  });

  it('een niet-provisionable (human-delivered) product wordt NIET genudged, ook al staat het >24u op in_uitvoering/onboarding', async () => {
    const db = makeDb({
      orders: [order({ id: 'ord_seo', product_key: 'seo-maatwerk' })],
      services: [service({ order_id: 'ord_seo' })],
      nudges: [],
      users: [owner()],
    });
    const env = { PORTAL_DB: db };

    await nudgeOnboarding(env);

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(alertStaffMock).not.toHaveBeenCalled();
    expect(db.state.nudges.find((x) => x.order_id === 'ord_seo')).toBeUndefined();
  });

  it('een order met status actief/services buiten onboarding wordt niet als kandidaat gezien', async () => {
    const db = makeDb({
      orders: [order({ id: 'ord_actief', status: 'actief' })],
      services: [service({ order_id: 'ord_actief', status: 'actief' })],
      nudges: [],
      users: [owner()],
    });
    const env = { PORTAL_DB: db };

    await nudgeOnboarding(env);

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(alertStaffMock).not.toHaveBeenCalled();
  });

  it('best-effort: een fout bij één order (INSERT OR IGNORE gooit) blokkeert de andere niet', async () => {
    const db = makeDb({
      orders: [order({ id: 'ord_boom' }), order({ id: 'ord_ok', customer_id: 'cust_ok' })],
      services: [service({ order_id: 'ord_boom' }), service({ order_id: 'ord_ok' })],
      nudges: [],
      users: [owner({ customer_id: 'cust_ok' })],
    });
    // ord_boom's nudge-insert gooit een db-fout (gesimuleerd) — ord_ok moet
    // alsnog verwerkt worden.
    const originalPrepare = db.prepare.bind(db);
    db.prepare = (sql) => {
      const stmt = originalPrepare(sql);
      if (sql.startsWith('INSERT OR IGNORE INTO onboarding_nudges')) {
        return {
          bind: (...args) => {
            const bound = stmt.bind(...args);
            if (args[0] === 'ord_boom') {
              return { ...bound, run: async () => { throw new Error('db boom (simulated)'); } };
            }
            return bound;
          },
        };
      }
      return stmt;
    };
    const env = { PORTAL_DB: db };

    await expect(nudgeOnboarding(env)).resolves.toBeUndefined();

    expect(db.state.nudges.find((x) => x.order_id === 'ord_boom')).toBeUndefined();
    const okNudge = db.state.nudges.find((x) => x.order_id === 'ord_ok');
    expect(okNudge?.aantal).toBe(1);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });
});

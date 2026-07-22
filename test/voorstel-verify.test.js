import { describe, it, expect } from 'vitest';
import { mintKlantEnOrder } from '../src/lib/voorstel-verify.js';

// D1-dubbel met de tabellen die deze functie raakt.
function fakeDb() {
  const db = { customers: [], users: [], orders: [], subscriptions: [] };
  const first = (sql, args) => {
    if (sql.includes('FROM users WHERE email')) return db.users.find((u) => u.email === args[0]) || null;
    if (sql.includes('FROM service_orders WHERE voorstel_id')) return db.orders.find((o) => o.voorstel_id === args[0]) || null;
    if (sql.includes('FROM subscriptions')) {
      return db.subscriptions.find((s) => s.customer_id === args[0] && s.product_key === args[1]) || null;
    }
    return null;
  };
  return {
    data: db,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() { return first(sql, args); },
            async run() {
              if (sql.startsWith('INSERT INTO customers')) db.customers.push({ id: args[0], bedrijf: args[1] });
              if (sql.startsWith('INSERT INTO users')) db.users.push({ id: args[0], customer_id: args[1], email: args[2], naam: args[3], role: args[4] });
              if (sql.startsWith('INSERT OR IGNORE INTO service_orders')) {
                if (!db.orders.some((o) => o.voorstel_id === args[6])) {
                  db.orders.push({ id: args[0], customer_id: args[1], user_id: args[2], product_key: args[3], tier: args[4], voorstel_id: args[6], status: 'concept' });
                }
              }
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

const VOORSTEL = { id: 'vst_1', product_key: 'emma-telefoon', tier_naam: 'Starter' };

describe('mintKlantEnOrder', () => {
  it('maakt customer, user en order voor een nieuwe klant', async () => {
    const env = { PORTAL_DB: fakeDb() };
    const res = await mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'jan@example.nl', klant: { name: 'Jan', company: 'Jansen' } });
    expect(env.PORTAL_DB.data.customers).toHaveLength(1);
    expect(env.PORTAL_DB.data.users[0].role).toBe('eigenaar');
    expect(res.orderId).toBeTruthy();
    expect(res.bestondAl).toBe(false);
  });

  it('hergebruikt een bestaande klant in plaats van een tweede aan te maken', async () => {
    const env = { PORTAL_DB: fakeDb() };
    env.PORTAL_DB.data.customers.push({ id: 'cust_1', bedrijf: 'Jansen' });
    env.PORTAL_DB.data.users.push({ id: 'usr_1', customer_id: 'cust_1', email: 'jan@example.nl', naam: 'Jan', role: 'eigenaar' });
    const res = await mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'jan@example.nl', klant: { name: 'Jan' } });
    expect(env.PORTAL_DB.data.customers).toHaveLength(1);
    expect(res.userId).toBe('usr_1');
    expect(res.bestondAl).toBe(true);
  });

  it('is idempotent: hetzelfde voorstel levert nooit twee orders', async () => {
    const env = { PORTAL_DB: fakeDb() };
    const a = await mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'jan@example.nl', klant: {} });
    const b = await mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'jan@example.nl', klant: {} });
    expect(env.PORTAL_DB.data.orders).toHaveLength(1);
    expect(a.orderId).toBe(b.orderId);
  });

  it('weigert wanneer er al een actief abonnement voor hetzelfde product is', async () => {
    const env = { PORTAL_DB: fakeDb() };
    env.PORTAL_DB.data.customers.push({ id: 'cust_1', bedrijf: 'Jansen' });
    env.PORTAL_DB.data.users.push({ id: 'usr_1', customer_id: 'cust_1', email: 'jan@example.nl', naam: 'Jan', role: 'eigenaar' });
    env.PORTAL_DB.data.subscriptions.push({ customer_id: 'cust_1', product_key: 'emma-telefoon', status: 'active' });
    await expect(
      mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'jan@example.nl', klant: {} }),
    ).rejects.toThrow(/al een actief abonnement/i);
  });
});

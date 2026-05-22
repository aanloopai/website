-- Aanloop AI portal — billing / Mollie (V4 Sprint D).
-- Apply: wrangler d1 execute aanloop-portal --remote --file=migrations/0007_billing.sql

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     TEXT PRIMARY KEY,            -- sub_xxxxxxxx
  customer_id            TEXT NOT NULL REFERENCES customers(id),
  order_id               TEXT,                        -- service_orders.id
  product_key            TEXT NOT NULL,
  tier                   TEXT,
  bedrag_cent            INTEGER NOT NULL,            -- price incl. BTW
  betaling               TEXT NOT NULL,               -- maandelijks | eenmalig
  status                 TEXT NOT NULL DEFAULT 'pending_payment',
                         -- pending_payment | active | past_due | canceled | completed
  mollie_customer_id     TEXT,
  mollie_subscription_id TEXT,
  next_payment_date      TEXT,
  created_at             INTEGER NOT NULL             -- epoch ms
);

-- Mollie payments — `id` is the Mollie tr_ id; used for webhook idempotency.
CREATE TABLE IF NOT EXISTS payments (
  id              TEXT PRIMARY KEY,                   -- Mollie payment id (tr_...)
  customer_id     TEXT NOT NULL,
  subscription_id TEXT,
  order_id        TEXT,
  bedrag_cent     INTEGER NOT NULL,
  status          TEXT NOT NULL,                      -- open|pending|paid|failed|canceled|expired
  sequence_type   TEXT,                               -- first|recurring|oneoff
  paid_at         TEXT,
  created_at      INTEGER NOT NULL
);

ALTER TABLE customers ADD COLUMN mollie_customer_id TEXT;
ALTER TABLE customers ADD COLUMN btw_id TEXT;

ALTER TABLE invoices ADD COLUMN factuurnummer  TEXT;
ALTER TABLE invoices ADD COLUMN subtotaal_cent INTEGER;
ALTER TABLE invoices ADD COLUMN btw_cent       INTEGER;
ALTER TABLE invoices ADD COLUMN payment_id     TEXT;
ALTER TABLE invoices ADD COLUMN subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);

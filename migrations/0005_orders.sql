-- Aanloop AI portal — service orders / intake (V4 Sprint A).
-- Apply: wrangler d1 execute aanloop-portal --remote --file=migrations/0005_orders.sql

-- A service_order = a customer's request for a new service, with the full
-- intake questionnaire captured as JSON. Becomes a `services` row once active.
CREATE TABLE IF NOT EXISTS service_orders (
  id           TEXT PRIMARY KEY,            -- ord_xxxxxxxx
  customer_id  TEXT NOT NULL REFERENCES customers(id),
  user_id      TEXT NOT NULL REFERENCES users(id),
  product_key  TEXT NOT NULL,               -- matches portal-catalog.ts / intake-schemas.ts
  tier         TEXT,
  intake_json  TEXT,                        -- JSON: { stepKey: { fieldName: value } }
  status       TEXT NOT NULL DEFAULT 'concept', -- concept|ingediend|in_uitvoering|actief|geannuleerd
  created_at   INTEGER NOT NULL,            -- epoch ms
  submitted_at INTEGER                      -- epoch ms, set when status -> ingediend
);

-- Link a provisioned service back to the order it came from.
ALTER TABLE services ADD COLUMN order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_customer ON service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON service_orders(status);

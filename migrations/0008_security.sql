-- Aanloop AI portal — security hardening (V4 pre-go-live).
-- Apply: wrangler d1 execute aanloop-portal --remote --file=migrations/0008_security.sql

-- Atomic counters — replaces COUNT(*)+1 for things like invoice numbers.
-- Read & increment in one statement: UPDATE counters SET n=n+1 WHERE name=? RETURNING n.
CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  n    INTEGER NOT NULL DEFAULT 0
);

-- Seed the current year's invoice counter from existing invoices so the next
-- factuurnummer continues correctly.
INSERT INTO counters (name, n) VALUES (
  'factuur-' || strftime('%Y', 'now'),
  COALESCE(
    (SELECT MAX(CAST(substr(factuurnummer, 6) AS INTEGER))
       FROM invoices
       WHERE factuurnummer LIKE strftime('%Y', 'now') || '-%'),
    0
  )
)
ON CONFLICT(name) DO NOTHING;

-- Prevent double-provisioning when an order is activated twice concurrently.
-- order_id is nullable for legacy services; SQLite treats multiple NULLs as
-- distinct, so a partial-unique works for non-NULL values.
CREATE UNIQUE INDEX IF NOT EXISTS idx_services_order_id_unique ON services(order_id) WHERE order_id IS NOT NULL;

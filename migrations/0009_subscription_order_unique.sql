-- Aanloop AI portal — H5 fix: prevent duplicate subscriptions per order_id.
-- Apply: wrangler d1 execute aanloop-portal --remote --file=migrations/0009_subscription_order_unique.sql
--
-- WARNING: if the prod `subscriptions` table already contains duplicate
-- non-NULL order_id rows (e.g. from the H5 race before the mollie.js guard
-- was added), this CREATE UNIQUE INDEX will FAIL. Run the diagnostic query
-- below first and dedup any offending rows before applying this migration.
--
-- SELECT order_id, COUNT(*) FROM subscriptions WHERE order_id IS NOT NULL GROUP BY order_id HAVING COUNT(*)>1;

-- Prevent duplicate active/pending subscriptions for the same order — mirrors
-- idx_services_order_id_unique from 0008_security.sql. order_id is nullable;
-- SQLite treats multiple NULLs as distinct, so a partial-unique works for
-- non-NULL values only.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_order_id_unique ON subscriptions(order_id) WHERE order_id IS NOT NULL;

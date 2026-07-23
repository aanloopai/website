-- Plak C: onboarding-nudges. Apply: npx wrangler d1 execute aanloop-portal --remote --file=migrations/0017_onboarding.sql
-- LET OP: draai exact één keer (M-goedkeuring vereist).
CREATE TABLE IF NOT EXISTS onboarding_nudges (
  order_id        TEXT PRIMARY KEY REFERENCES service_orders(id),
  customer_id     TEXT NOT NULL,
  aantal          INTEGER NOT NULL DEFAULT 0,
  laatst_genudged INTEGER,
  created_at      INTEGER NOT NULL
);

-- Portal v2 seed (Faz 1). Aanloop staff user + one synthetic test customer.
-- Apply: wrangler d1 execute aanloop-portal --remote --file=migrations/0004_portal_v2_seed.sql
-- The staff row is real (Aanloop admin); the customer rows are synthetic test data.
--
-- HYGIENE NOTE (L11): the INSERT below hardcodes a real staff email
-- address in this git-tracked SQL file (PII in source control). Left unchanged
-- here since it may be a required seed value — flagging only, not removing/
-- parameterizing. If this can be replaced with an env var / secrets-managed
-- value or a placeholder, do that in a follow-up, not as a silent SQL edit.

-- Aanloop staff (admin) — logs in at /admin.
INSERT OR IGNORE INTO users (id, customer_id, email, naam, role, notif_json, last_login, created_at) VALUES
  ('usr_staff01', NULL, 'doganagahm@gmail.com', 'Mustafa Agah Dogan', 'staff', NULL, NULL, '2026-05-22');

-- Synthetic test customer + team.
INSERT OR IGNORE INTO customers (id, bedrijf, kvk, adres, postcode, stad, telefoon, factuur_email, onboarding_json, created_at) VALUES
  ('cust_demo', 'Voorbeeld BV', '12345678', 'Voorbeeldstraat 1', '1000 AA', 'Amsterdam', '+31 20 000 0000', 'factuur@voorbeeld.nl', NULL, '2026-05-22');

INSERT OR IGNORE INTO users (id, customer_id, email, naam, role, notif_json, last_login, created_at) VALUES
  ('usr_demo01', 'cust_demo', 'eigenaar@voorbeeld.nl', 'Demo Eigenaar', 'eigenaar', NULL, NULL, '2026-05-22');

INSERT OR IGNORE INTO services (id, customer_id, product_key, naam, tier, status, config_json, started_at, created_at) VALUES
  ('svc_demo1', 'cust_demo', 'marco', 'Marco AI-receptionist', 'Starter', 'actief', '{"telefoonnummer":"+31 20 000 0000","openingstijden":"Ma-Vr 09:00-17:00","talen":"NL, EN"}', '2026-05-01', '2026-05-01'),
  ('svc_demo2', 'cust_demo', 'emma', 'Emma WhatsApp-assistent', 'Lite', 'onboarding', NULL, NULL, '2026-05-20');

INSERT OR IGNORE INTO invoices (id, customer_id, periode, bedrag_cent, status, pdf_url, created_at) VALUES
  ('inv_demo1', 'cust_demo', 'Mei 2026', 64600, 'open', NULL, '2026-05-01');

-- Example seed data (C1). Synthetic — REPLACE with real customers or delete
-- after testing the portal end-to-end.
-- Apply: wrangler d1 execute aanloop-portal --remote --file=migrations/0002_seed_example.sql

INSERT OR IGNORE INTO customers (id, email, naam, bedrijf, plan, created_at) VALUES
  ('cust_demo_0001', 'demo@voorbeeld.nl', 'Demo Klant', 'Voorbeeld BV', 'marco-lite', '2026-05-22');

INSERT OR IGNORE INTO services (id, customer_id, type, naam, status, details, created_at) VALUES
  ('svc_demo_0001', 'cust_demo_0001', 'voice-ai', 'Marco AI-receptionist', 'actief', '{"telefoonnummer":"+31 10 000 0000"}', '2026-05-22'),
  ('svc_demo_0002', 'cust_demo_0001', 'whatsapp-ai', 'Emma WhatsApp-assistent', 'onboarding', NULL, '2026-05-22');

INSERT OR IGNORE INTO documents (id, customer_id, titel, url, type, created_at) VALUES
  ('doc_demo_0001', 'cust_demo_0001', 'Onboarding-handleiding', 'https://aanloopai.nl/', 'rapport', '2026-05-22');

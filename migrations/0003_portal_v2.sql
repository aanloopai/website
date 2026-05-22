-- Aanloop AI customer portal — schema v2 (Faz 1).
-- Clean rebuild. Supersedes 0001/0002 — only test data is lost.
-- Apply: wrangler d1 execute aanloop-portal --remote --file=migrations/0003_portal_v2.sql

DROP TABLE IF EXISTS magic_links;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS customers;

-- A customer = a company / account.
CREATE TABLE customers (
  id              TEXT PRIMARY KEY,           -- cust_xxxxxxxx
  bedrijf         TEXT NOT NULL,
  kvk             TEXT,
  adres           TEXT,
  postcode        TEXT,
  stad            TEXT,
  telefoon        TEXT,
  factuur_email   TEXT,
  onboarding_json TEXT,                       -- JSON: per-step completion flags
  created_at      TEXT NOT NULL               -- ISO date YYYY-MM-DD
);

-- A user = a person who logs in. Belongs to a customer, except Aanloop staff
-- (customer_id NULL, role 'staff').
CREATE TABLE users (
  id          TEXT PRIMARY KEY,               -- usr_xxxxxxxx
  customer_id TEXT REFERENCES customers(id),  -- NULL for staff
  email       TEXT NOT NULL UNIQUE,
  naam        TEXT NOT NULL,
  role        TEXT NOT NULL,                  -- eigenaar | bewerker | kijker | staff
  notif_json  TEXT,                           -- JSON: notification preferences
  last_login  INTEGER,                        -- epoch ms
  created_at  TEXT NOT NULL
);

-- Passwordless magic-link tokens — raw token stored only as SHA-256 hash.
CREATE TABLE magic_links (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  expires_at  INTEGER NOT NULL,               -- epoch ms
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

-- Pending team-member invitations.
CREATE TABLE team_invites (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  email       TEXT NOT NULL,
  role        TEXT NOT NULL,                  -- eigenaar | bewerker | kijker
  token_hash  TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,
  accepted    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE TABLE services (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  product_key TEXT NOT NULL,                  -- matches portal-catalog.ts key
  naam        TEXT NOT NULL,
  tier        TEXT,
  status      TEXT NOT NULL DEFAULT 'onboarding', -- actief | onboarding | gepauzeerd
  config_json TEXT,                           -- JSON: plain-language config summary
  started_at  TEXT,
  created_at  TEXT NOT NULL
);

-- Customer-initiated change requests (handled by Aanloop staff).
CREATE TABLE service_requests (
  id            TEXT PRIMARY KEY,
  customer_id   TEXT NOT NULL REFERENCES customers(id),
  user_id       TEXT NOT NULL REFERENCES users(id),
  type          TEXT NOT NULL,                -- upgrade|downgrade|pause|resume|new_product|cancel
  service_id    TEXT,                         -- for changes to an existing service
  product_key   TEXT,                         -- for new_product requests
  bericht       TEXT,
  status        TEXT NOT NULL DEFAULT 'open', -- open|in_behandeling|afgerond|afgewezen
  admin_notitie TEXT,
  created_at    INTEGER NOT NULL,
  handled_at    INTEGER
);

CREATE TABLE support_tickets (
  id             TEXT PRIMARY KEY,
  customer_id    TEXT NOT NULL REFERENCES customers(id),
  user_id        TEXT NOT NULL REFERENCES users(id),
  onderwerp      TEXT NOT NULL,
  bericht        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open', -- open|in_behandeling|beantwoord|gesloten
  admin_antwoord TEXT,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);

CREATE TABLE invoices (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  periode     TEXT NOT NULL,                  -- e.g. "2026-05" or "Mei 2026"
  bedrag_cent INTEGER NOT NULL,               -- amount in cents
  status      TEXT NOT NULL DEFAULT 'open',   -- open | betaald
  pdf_url     TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE documents (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  titel       TEXT NOT NULL,
  url         TEXT NOT NULL,
  type        TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX idx_users_customer    ON users(customer_id);
CREATE INDEX idx_magic_links_user  ON magic_links(user_id);
CREATE INDEX idx_invites_customer  ON team_invites(customer_id);
CREATE INDEX idx_services_customer ON services(customer_id);
CREATE INDEX idx_requests_customer ON service_requests(customer_id);
CREATE INDEX idx_requests_status   ON service_requests(status);
CREATE INDEX idx_tickets_customer  ON support_tickets(customer_id);
CREATE INDEX idx_tickets_status    ON support_tickets(status);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_documents_customer ON documents(customer_id);

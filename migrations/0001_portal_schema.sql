-- Aanloop AI customer portal — D1 schema (C1).
-- Apply: wrangler d1 execute aanloop-portal --remote --file=migrations/0001_portal_schema.sql

CREATE TABLE IF NOT EXISTS customers (
  id          TEXT PRIMARY KEY,           -- e.g. cust_xxxxxxxx
  email       TEXT NOT NULL UNIQUE,
  naam        TEXT NOT NULL,
  bedrijf     TEXT,
  plan        TEXT,                       -- e.g. marco-lite, emma-lite
  created_at  TEXT NOT NULL               -- ISO date YYYY-MM-DD
);

-- Passwordless magic-link tokens. The raw token is never stored — only its
-- SHA-256 hash. Single-use (used=1) and time-boxed (expires_at).
CREATE TABLE IF NOT EXISTS magic_links (
  token_hash  TEXT PRIMARY KEY,           -- sha-256 hex of the raw token
  customer_id TEXT NOT NULL REFERENCES customers(id),
  expires_at  INTEGER NOT NULL,           -- epoch ms
  used        INTEGER NOT NULL DEFAULT 0, -- 0 = unused, 1 = consumed
  created_at  INTEGER NOT NULL            -- epoch ms
);

CREATE TABLE IF NOT EXISTS services (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  type        TEXT NOT NULL,              -- voice-ai | whatsapp-ai | workflow
  naam        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'onboarding', -- actief | onboarding | gepauzeerd
  details     TEXT,                       -- optional JSON string
  created_at  TEXT NOT NULL               -- ISO date YYYY-MM-DD
);

CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  titel       TEXT NOT NULL,
  url         TEXT NOT NULL,              -- http(s) link
  type        TEXT,                       -- factuur | rapport | contract
  created_at  TEXT NOT NULL               -- ISO date YYYY-MM-DD
);

CREATE INDEX IF NOT EXISTS idx_magic_links_customer ON magic_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires  ON magic_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_services_customer    ON services(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer   ON documents(customer_id);

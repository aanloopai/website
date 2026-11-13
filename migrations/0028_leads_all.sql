-- LEAD-1: portfolio-wide lead ledger (PII-minimal, no name/email/phone/message).
-- Filled by POST /api/leads/ingest (fth|alfa|kib|zoekeen) and directly by the
-- aanloop /api/submit pipeline (site='aanloop'). answered_at is for LEAD-2 (SLA).
CREATE TABLE IF NOT EXISTS leads_all (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  site          TEXT NOT NULL,
  lead_id       TEXT NOT NULL,
  form          TEXT NOT NULL DEFAULT '',
  landing       TEXT NOT NULL DEFAULT '',
  referrer_host TEXT NOT NULL DEFAULT '',
  utm_source    TEXT NOT NULL DEFAULT '',
  utm_medium    TEXT NOT NULL DEFAULT '',
  utm_campaign  TEXT NOT NULL DEFAULT '',
  ts            TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'received',
  received_at   INTEGER NOT NULL,
  answered_at   INTEGER,
  UNIQUE (site, lead_id)
);
CREATE INDEX IF NOT EXISTS idx_leads_all_received ON leads_all (received_at);

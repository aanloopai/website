-- Inbound leads — every public form submission, persisted.
--
-- Before this table, /api/submit was fire-and-forget: it sent two Brevo emails
-- and kept no record. If Brevo was down (or the API key was rotated, or the
-- free-plan credits ran out) the submission was lost — the visitor got a 502
-- and nobody at Aanloop ever learned that someone had tried to reach them.
-- Staff also had no list of open leads anywhere: /admin/aanvragen only shows
-- orders placed by customers who already had a portal login.
--
-- The row is now written BEFORE any mail is attempted, so mail is a
-- notification channel, not the system of record.
CREATE TABLE IF NOT EXISTS inbound_leads (
  id           TEXT PRIMARY KEY,
  created_at   INTEGER NOT NULL,          -- epoch ms
  form_type    TEXT NOT NULL,             -- contact | demo | aanvraag | roi_calculator | ...
  email        TEXT NOT NULL,
  naam         TEXT,
  bedrijf      TEXT,
  telefoon     TEXT,
  bericht      TEXT,
  fields_json  TEXT,                      -- full submitted payload (minus honeypot)
  status       TEXT NOT NULL DEFAULT 'nieuw',      -- nieuw | in_behandeling | gewonnen | verloren
  mail_status  TEXT NOT NULL DEFAULT 'pending',    -- pending | verzonden | mislukt
  mail_error   TEXT,                      -- why the notification/autoresponse failed
  notitie      TEXT,                      -- staff note
  ip           TEXT
);

CREATE INDEX IF NOT EXISTS idx_inbound_leads_created ON inbound_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_leads_status  ON inbound_leads (status);
CREATE INDEX IF NOT EXISTS idx_inbound_leads_email   ON inbound_leads (email);

-- Demo-intake (2026-09-19) — referentiekopie. Het schema wordt door
-- src/lib/demo-intake.js bij eerste gebruik aangemaakt (CREATE TABLE IF NOT
-- EXISTS), net als visibility/discovery: er is geen lokale wrangler-auth om
-- migraties remote toe te passen.
CREATE TABLE IF NOT EXISTS lead_intake (
  lead_id      TEXT PRIMARY KEY,        -- inbound_leads.id
  mail_at      INTEGER,                 -- laatste uitnodiging (epoch ms)
  mail_count   INTEGER NOT NULL DEFAULT 0,
  answered_at  INTEGER,                 -- epoch ms
  answers_json TEXT                     -- { dienst: [..], doel, huidig, vorm, moment }
);

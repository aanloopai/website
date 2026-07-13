-- Aanloop AI portal — F1.3b: pre-sale intake wizard (aanloopai.nl/start) storage.
-- Captures service selection + answers before forwarding to Hetzner/fleetclaw.
-- Apply: wrangler d1 execute aanloop-portal --remote --file=migrations/0014_intake_requests.sql
--
-- forwarded: 0 = not yet forwarded to Hetzner (INTAKE_WEBHOOK_URL) or the forward
-- attempt failed; 1 = forwarded successfully. Rows with forwarded=0 are NOT lost —
-- this table is the durable record even when the webhook forward fails. A retry
-- sweep (cron over forwarded=0 rows) is Faz 1.4, not built yet — do not add one
-- without also handling idempotency on the Hetzner receiving side.
CREATE TABLE IF NOT EXISTS intake_requests (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,           -- 'agenda-assistant' | 'voice-agent' | 'whatsapp-bot' | 'ai-scan-consult'
  customer_json TEXT NOT NULL,        -- {email,name,company,phone,lang}
  answers_json TEXT NOT NULL,         -- service-specific Q&A, JSON-encoded (SERVICE_QUESTIONS in src/pages/start.astro)
  consent INTEGER NOT NULL DEFAULT 0, -- AVG-toestemming, moet 1 zijn (server-side gevalideerd in handleIntake)
  forwarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_intake_requests_forwarded ON intake_requests(forwarded) WHERE forwarded = 0;
CREATE INDEX IF NOT EXISTS idx_intake_requests_service ON intake_requests(service_id);

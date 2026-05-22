-- Aanloop AI portal — provisioning metadata (V4 Sprint C1).
-- Apply: wrangler d1 execute aanloop-portal --remote --file=migrations/0006_provisioning.sql

-- Stores the result of automatic provisioning (ElevenLabs agent, phone number).
-- JSON shape: { status, agent_id, kb_id, error, provisioned_at }
ALTER TABLE services ADD COLUMN provisioning_json TEXT;

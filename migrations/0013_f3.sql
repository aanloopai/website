-- Aanloop AI portal — F3: deals<->orders/Mollie-koppeling + verkoop-registratie
-- + outreach 'klant'-eindstadium. Apply:
-- wrangler d1 execute aanloop-portal --remote --file=migrations/0013_f3.sql
--
-- LET OP: ALTER TABLE ... ADD COLUMN faalt als deze migratie een tweede keer
-- draait (SQLite kent geen "ADD COLUMN IF NOT EXISTS"). Alleen eenmalig
-- toepassen. Nooit DROP/recreate — bestaande crm_deals-rijen blijven intact.
--
-- crm_stages-kolommen geverifieerd tegen migrations/0011_crm_core.sql:
-- (pipeline, stage, volgorde, rot_dagen) — geen zorunlu_checklist_json-kolom
-- aanwezig, dus die wordt hier niet meegegeven.
ALTER TABLE crm_deals ADD COLUMN order_id TEXT;
ALTER TABLE crm_deals ADD COLUMN bron TEXT; -- 'outreach'|'website'|'referral'|'leadgen'|'handmatig'
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_deals_order ON crm_deals(order_id) WHERE order_id IS NOT NULL;

-- Nieuw eindstadium voor de outreach-pipeline: een prospect die klant is
-- geworden (via een betaalde order of een verkochte leadgen-lead). Geen
-- rot-check (rot_dagen NULL) — zelfde patroon als de andere eindstadia
-- (geinteresseerd/afgewezen).
INSERT OR IGNORE INTO crm_stages (pipeline, stage, volgorde, rot_dagen) VALUES ('outreach','klant',6,NULL);

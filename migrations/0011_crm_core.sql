-- Aanloop AI portal — F1 CRM core: activiteiten-tijdlijn, deals/pipeline en
-- pipeline-stage-configuratie (rot-drempels). Apply:
-- wrangler d1 execute aanloop-portal --remote --file=migrations/0011_crm_core.sql
--
-- entity_id staat als INTEGER omdat outreach_prospects.id en crm_deals.id
-- beide AUTOINCREMENT INTEGER zijn — maar customers.id is TEXT ("cust_xxxx").
-- SQLite's INTEGER-kolomaffiniteit dwingt géén harde integer-cast af: een
-- TEXT-waarde die niet naar integer converteert wordt gewoon als TEXT
-- opgeslagen (manifest typing). entity_type='customer' rijen werken dus
-- correct met een TEXT customer-id in deze kolom.
CREATE TABLE IF NOT EXISTS crm_activities (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,                 -- prospect | customer | deal
  entity_id   INTEGER NOT NULL,
  soort       TEXT NOT NULL,                 -- email_out | email_in | call | note | status_change | task | ai
  titel       TEXT,
  body        TEXT,
  meta_json   TEXT,
  pinned      INTEGER NOT NULL DEFAULT 0,
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_crm_activities_entity ON crm_activities(entity_type, entity_id, created_at);

CREATE TABLE IF NOT EXISTS crm_deals (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type          TEXT,                 -- prospect | customer | NULL (losstaande deal)
  entity_id            INTEGER,
  naam                 TEXT NOT NULL,
  pipeline             TEXT NOT NULL DEFAULT 'services',  -- outreach | services
  stage                TEXT NOT NULL,
  waarde_cent          INTEGER NOT NULL DEFAULT 0,
  kans_pct             INTEGER NOT NULL DEFAULT 50,
  verwachte_sluiting   TEXT,
  status               TEXT NOT NULL DEFAULT 'open',       -- open | won | lost
  won_at               TEXT,
  lost_reden           TEXT,
  created_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Stage-configuratie per pipeline: sorteervolgorde + rot-drempel (dagen sinds
-- laatste contact/aanmaak voordat een kaart als "rottend" geldt). rot_dagen
-- NULL = geen rot-check voor deze stage (bv. eindstadia geinteresseerd/
-- afgewezen/gewonnen/verloren).
CREATE TABLE IF NOT EXISTS crm_stages (
  pipeline   TEXT NOT NULL,
  stage      TEXT NOT NULL,
  volgorde   INTEGER NOT NULL,
  rot_dagen  INTEGER,
  PRIMARY KEY (pipeline, stage)
);

INSERT OR IGNORE INTO crm_stages (pipeline, stage, volgorde, rot_dagen) VALUES
  ('outreach', 'nieuw',          1, 7),
  ('outreach', 'mail1',          2, 5),
  ('outreach', 'followup',       3, 5),
  ('outreach', 'geinteresseerd', 4, 3),
  ('outreach', 'afgewezen',      5, NULL),
  ('services', 'lead',           1, 7),
  ('services', 'offerte',        2, 7),
  ('services', 'onderhandeling', 3, 7),
  ('services', 'gewonnen',       4, NULL),
  ('services', 'verloren',       5, NULL);

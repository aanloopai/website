-- Aanloop AI portal — outreach_prospects / outreach_mails formaliseren.
-- Apply: wrangler d1 execute aanloop-portal --remote --file=migrations/0010_outreach.sql
--
-- Beide tabellen bestaan al LIVE — ze zijn ad-hoc aangemaakt (buiten het
-- migratiesysteem om) toen het outreach-platform (src/lib/outreach.js) werd
-- gebouwd. Deze migratie voegt ze alsnog toe aan de migratiegeschiedenis
-- (CREATE TABLE IF NOT EXISTS, dus een no-op op de bestaande live DB) zodat
-- verse omgevingen (nieuwe D1-database, lokale dev) ze ook krijgen. De
-- kolomvolgorde/-namen zijn 1-op-1 afgeleid uit de INSERT/SELECT-statements
-- in src/lib/outreach.js — GEEN kolommen verzonnen. Nooit DROP/recreate:
-- de live data moet intact blijven.

CREATE TABLE IF NOT EXISTS outreach_prospects (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  site                  TEXT NOT NULL DEFAULT 'keukeninbeeld.nl',
  sector                TEXT NOT NULL DEFAULT 'keuken',
  bedrijfsnaam          TEXT NOT NULL,
  stad                  TEXT,
  website               TEXT,
  email                 TEXT,
  telefoon              TEXT,
  rating                TEXT,
  reviews               TEXT,
  notities              TEXT,
  golf                  TEXT,
  status                TEXT NOT NULL DEFAULT 'nieuw',
  volgende_actie        TEXT,
  volgende_actie_datum  TEXT,
  laatste_contact       TEXT,
  created_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outreach_mails (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  prospect_id           INTEGER NOT NULL,
  soort                 TEXT NOT NULL,
  onderwerp             TEXT,
  body                  TEXT,
  status                TEXT NOT NULL DEFAULT 'concept',
  gegenereerd_door      TEXT,
  verzonden_at          INTEGER,
  evaluatie             TEXT,
  created_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- F0: automatisch verzenden via Brevo + bron-tracking voor prospects die niet
-- (meer) uit de keukeninbeeld-CSV-sync komen.
ALTER TABLE outreach_mails ADD COLUMN message_id TEXT;
ALTER TABLE outreach_mails ADD COLUMN verzonden_via TEXT;
ALTER TABLE outreach_prospects ADD COLUMN bron TEXT DEFAULT 'keukeninbeeld';

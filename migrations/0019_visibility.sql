-- Zichtbaarheid: portfolio-wide Search Console + Google Bedrijfsprofiel
-- metrics (admin/zichtbaarheid). Reference copy — the worker applies the
-- identical CREATE TABLE IF NOT EXISTS statements itself on first use
-- (src/lib/visibility.js ensureVisibilitySchema), because there is no local
-- wrangler auth for `d1 execute --remote`. Running this file is optional and
-- idempotent: npx wrangler d1 execute aanloop-portal --remote --file=migrations/0019_visibility.sql

CREATE TABLE IF NOT EXISTS visibility_sites (
  key           TEXT PRIMARY KEY,           -- 'alfa', 'fth', 'pasfoto', ...
  naam          TEXT NOT NULL,
  host          TEXT NOT NULL,              -- www.alfareclame.nl
  eigenaar      TEXT NOT NULL DEFAULT 'eigen', -- eigen | klant | onbekend
  customer_id   TEXT,                       -- customers.id (optional koppeling)
  gsc_property  TEXT,                       -- sc-domain:… or https://…/ as seen by the service account
  gbp_location  TEXT,                       -- locations/<id> (Business Profile)
  gbp_titel     TEXT,
  actief        INTEGER NOT NULL DEFAULT 1,
  gsc_last_sync INTEGER,                    -- epoch ms
  gbp_last_sync INTEGER,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS visibility_gsc_daily (
  site_key    TEXT NOT NULL,
  datum       TEXT NOT NULL,                -- YYYY-MM-DD
  clicks      INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr         REAL NOT NULL DEFAULT 0,      -- percentage (GSC ctr*100)
  position    REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (site_key, datum)
);

CREATE TABLE IF NOT EXISTS visibility_gsc_top (
  site_key      TEXT NOT NULL,
  dim           TEXT NOT NULL,              -- query | page
  sleutel       TEXT NOT NULL,
  clicks        INTEGER NOT NULL DEFAULT 0,
  impressions   INTEGER NOT NULL DEFAULT 0,
  ctr           REAL NOT NULL DEFAULT 0,
  position      REAL NOT NULL DEFAULT 0,
  periode_dagen INTEGER NOT NULL DEFAULT 28,
  updated_at    INTEGER NOT NULL,
  PRIMARY KEY (site_key, dim, sleutel)
);

CREATE TABLE IF NOT EXISTS visibility_gbp_daily (
  site_key TEXT NOT NULL,
  datum    TEXT NOT NULL,
  metric   TEXT NOT NULL,                   -- BUSINESS_IMPRESSIONS_DESKTOP_MAPS, CALL_CLICKS, ...
  waarde   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (site_key, datum, metric)
);

-- Gedrag op de site: per-hit funnel (entry/exit/flow) on top of the
-- Zichtbaarheid tables from 0019_visibility.sql. Reference copy — the
-- worker applies the identical CREATE TABLE/INDEX IF NOT EXISTS statements
-- itself on first use (src/lib/visibility.js ensureVisibilitySchema),
-- because there is no local wrangler auth for `d1 execute --remote`.
-- Running this file is optional and idempotent:
--   npx wrangler d1 execute aanloop-portal --remote --file=migrations/0020_visibility_hits.sql

CREATE TABLE IF NOT EXISTS visibility_hits (
  site_key TEXT NOT NULL,
  ts       INTEGER NOT NULL,          -- epoch ms, for the retention prune + window filter
  datum    TEXT NOT NULL,             -- YYYY-MM-DD
  sid      TEXT NOT NULL,             -- per-tab random id (sessionStorage), no personal data
  seq      INTEGER NOT NULL,          -- page order within the session (1 = landing)
  t        TEXT NOT NULL,             -- view | leave | tel | whatsapp | route | mail | form | form_start | demo | custom
  path     TEXT NOT NULL,
  ref      TEXT,                      -- bare referrer host, only on seq 1 and only when it is not the site's own host
  src      TEXT,                      -- utm_source
  med      TEXT,                      -- utm_medium
  dev      TEXT,                      -- m | d
  sec      INTEGER,                   -- seconds on page (leave only), 0-3600
  sc       INTEGER,                   -- max scroll depth % (leave only), 0-100
  meta     TEXT                       -- custom event name / estimator step, <=80 chars
);

CREATE INDEX IF NOT EXISTS ix_vh_site_ts  ON visibility_hits(site_key, ts);
CREATE INDEX IF NOT EXISTS ix_vh_site_sid ON visibility_hits(site_key, sid, seq);

-- Plak A: self-serve koopweg. Zie docs/superpowers/specs/2026-07-22-selfserve-funnel-design.md
-- Apply: npx wrangler d1 execute aanloop-portal --remote --file=migrations/0015_voorstellen.sql
--
-- LET OP: dit bestand bevat een ALTER TABLE en is daarmee NIET herhaalbaar.
-- Draai het exact één keer (zelfde regel als migrations/0013_f3.sql).

-- Een gegenereerd voorstel. token = publieke capability (256 bit, randomToken()).
CREATE TABLE IF NOT EXISTS voorstellen (
  id            TEXT PRIMARY KEY,          -- vst_xxxxxxxx
  token         TEXT NOT NULL UNIQUE,      -- 64 hex chars, staat in de publieke URL
  intake_id     TEXT NOT NULL,             -- intake_requests.id
  service_id    TEXT NOT NULL,             -- wizard-dienst (voice-agent, ...)
  product_key   TEXT NOT NULL,             -- catalogus product_key
  tier_naam     TEXT NOT NULL,             -- exacte catalogus-tiernaam ('Starter')
  prijs_cent    INTEGER NOT NULL,          -- maandbedrag EXCL btw
  setup_cent    INTEGER NOT NULL DEFAULT 0,-- eenmalige inrichting EXCL btw
  roi_json      TEXT NOT NULL,             -- output van berekenRoi()
  copy_json     TEXT NOT NULL,             -- {kop, tekst, bronnen}
  status        TEXT NOT NULL DEFAULT 'open', -- open | geclaimd | omgezet
  expires_at    INTEGER NOT NULL,          -- epoch ms
  created_at    INTEGER NOT NULL           -- epoch ms
);
CREATE INDEX IF NOT EXISTS idx_voorstellen_intake ON voorstellen(intake_id);

-- Verificatietoken voor "Ja, ik start". Bestaat los van magic_links omdat er op
-- dit moment nog geen users-rij is om naar te verwijzen.
CREATE TABLE IF NOT EXISTS voorstel_claims (
  token_hash  TEXT PRIMARY KEY,            -- sha256Hex(raw token)
  voorstel_id TEXT NOT NULL REFERENCES voorstellen(id),
  email       TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,            -- epoch ms
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_voorstel_claims_voorstel ON voorstel_claims(voorstel_id);

-- Eén voorstel kan hooguit één order worden. Dit is de dubbele-order-guard:
-- de bestaande guard in mollie.js:132 werkt per order, niet per klant+product.
ALTER TABLE service_orders ADD COLUMN voorstel_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_orders_voorstel
  ON service_orders(voorstel_id) WHERE voorstel_id IS NOT NULL;

-- Aanloop AI portal — Discovery: müşterinin kendi dokümanına kişisel-link erişimi.
-- Token yalnız SHA-256 hash olarak saklanır; doküman başına tek aktif satır
-- (revoked_at IS NULL). Not: worker (src/lib/discovery-klant.js) bu şemayı ilk
-- çağrıda idempotent olarak kendisi de kurar — bu dosya kanonik referans.
CREATE TABLE IF NOT EXISTS disc_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT, doc_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT, last_seen_at TEXT);
CREATE INDEX IF NOT EXISTS idx_disc_access_doc ON disc_access(doc_id);

-- Aanloop AI portal — Discovery Hub: müşteri keşif/intake görüşmeleri.
-- Şablonlar blueprint'tir; müşteri dokümanları snapshot'tır (kopya). Şablon
-- düzenlemek mevcut dokümanları ASLA değiştirmez.
-- Not: worker (src/lib/discovery.js ensureDiscoverySchema) bu şemayı ilk API
-- çağrısında idempotent olarak kendisi de kurar — bu dosya kanonik referans.
-- Elle uygulama: wrangler d1 execute aanloop-portal --remote --file=migrations/0018_discovery.sql

CREATE TABLE IF NOT EXISTS disc_clients (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  contact    TEXT,
  notes      TEXT,
  archived   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disc_templates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disc_template_sections (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  title       TEXT NOT NULL,
  guidance    TEXT,
  sort        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_disc_tsec_tpl ON disc_template_sections(template_id, sort);

CREATE TABLE IF NOT EXISTS disc_template_questions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL,
  sort       INTEGER NOT NULL DEFAULT 0,
  type       TEXT NOT NULL,            -- text | textarea | checkbox | checklist | table
  label      TEXT NOT NULL,
  sub_items  TEXT,                     -- JSON array (yardımcı alt sorular)
  guidance   TEXT,
  config     TEXT                      -- JSON (ör. tablo kolonları)
);
CREATE INDEX IF NOT EXISTS idx_disc_tq_sec ON disc_template_questions(section_id, sort);

CREATE TABLE IF NOT EXISTS disc_docs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   INTEGER NOT NULL,
  title       TEXT NOT NULL,
  template_id INTEGER,                 -- yalnız bilgi amaçlı referans
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_disc_docs_client ON disc_docs(client_id);

CREATE TABLE IF NOT EXISTS disc_doc_sections (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id   INTEGER NOT NULL,
  title    TEXT NOT NULL,
  guidance TEXT,
  sort     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_disc_dsec_doc ON disc_doc_sections(doc_id, sort);

CREATE TABLE IF NOT EXISTS disc_doc_questions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_section_id INTEGER NOT NULL,
  sort           INTEGER NOT NULL DEFAULT 0,
  type           TEXT NOT NULL,
  label          TEXT NOT NULL,
  sub_items      TEXT,
  guidance       TEXT,
  config         TEXT
);
CREATE INDEX IF NOT EXISTS idx_disc_dq_sec ON disc_doc_questions(doc_section_id, sort);

CREATE TABLE IF NOT EXISTS disc_answers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_question_id INTEGER NOT NULL UNIQUE,
  value           TEXT,                -- JSON (tipe göre string/bool/array)
  answered        INTEGER NOT NULL DEFAULT 0,  -- ilerleme sayacı için önhesap
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- seed_version vb. — seed içeriği güncellemeleri (upgradeSeed) bu sayaçla koşar.
CREATE TABLE IF NOT EXISTS disc_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

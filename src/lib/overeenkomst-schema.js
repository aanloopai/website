// Generated from migrations/0024_overeenkomsten.sql (kept in sync by hand; migration stays as documentation).
// Every statement is idempotent so it can run lazily at request time.
export const SCHEMA_STATEMENTS = [
  "CREATE TABLE IF NOT EXISTS agr_templates ( id TEXT PRIMARY KEY, slug TEXT NOT NULL, version TEXT NOT NULL, title TEXT NOT NULL, body_markdown TEXT NOT NULL, effective_from INTEGER, created_at INTEGER NOT NULL, UNIQUE(slug, version))",
  "CREATE TABLE IF NOT EXISTS agreements ( id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', variables_json TEXT NOT NULL DEFAULT '{}', created_by TEXT, created_at INTEGER NOT NULL, sent_at INTEGER, signed_at INTEGER, pdf_key TEXT, pdf_sha256 TEXT, evidence_sha256 TEXT)",
  "CREATE INDEX IF NOT EXISTS idx_agreements_customer ON agreements(customer_id)",
  "CREATE TABLE IF NOT EXISTS agreement_documents ( id TEXT PRIMARY KEY, agreement_id TEXT NOT NULL, template_id TEXT NOT NULL, template_slug TEXT NOT NULL, template_version TEXT NOT NULL, order_index INTEGER NOT NULL, title TEXT NOT NULL, rendered_markdown TEXT NOT NULL, content_sha256 TEXT NOT NULL, UNIQUE(agreement_id, order_index))",
  "CREATE TABLE IF NOT EXISTS agr_doc_opens ( agreement_document_id TEXT NOT NULL, user_id TEXT NOT NULL, opened_at INTEGER NOT NULL, PRIMARY KEY(agreement_document_id, user_id))",
  "CREATE TABLE IF NOT EXISTS agr_consents ( id TEXT PRIMARY KEY, agreement_document_id TEXT NOT NULL, user_id TEXT NOT NULL, scrolled_to_end_at INTEGER NOT NULL, time_on_document_sec INTEGER NOT NULL, checkbox_at INTEGER NOT NULL, ip TEXT, user_agent TEXT, created_at INTEGER NOT NULL, superseded INTEGER NOT NULL DEFAULT 0)",
  "CREATE INDEX IF NOT EXISTS idx_consents_doc ON agr_consents(agreement_document_id)",
  "CREATE TABLE IF NOT EXISTS agr_otp ( id TEXT PRIMARY KEY, agreement_id TEXT NOT NULL, user_id TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, verified_at INTEGER, created_at INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS agr_signatures ( id TEXT PRIMARY KEY, agreement_id TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL, typed_name TEXT NOT NULL, signature_key TEXT NOT NULL, otp_verified_at INTEGER NOT NULL, signed_at INTEGER NOT NULL, ip TEXT, user_agent TEXT, evidence_sha256 TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS upload_items ( id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, label TEXT NOT NULL, description TEXT, type TEXT NOT NULL, required INTEGER NOT NULL DEFAULT 1, accepted_ext TEXT, max_mb INTEGER NOT NULL DEFAULT 25, multi INTEGER NOT NULL DEFAULT 0, max_files INTEGER NOT NULL DEFAULT 1, order_index INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS idx_upload_items_customer ON upload_items(customer_id)",
  "CREATE TABLE IF NOT EXISTS uploads ( id TEXT PRIMARY KEY, upload_item_id TEXT NOT NULL, customer_id TEXT NOT NULL, user_id TEXT NOT NULL, file_key TEXT, original_name TEXT, mime TEXT, size_bytes INTEGER, text_value TEXT, created_at INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS idx_uploads_item ON uploads(upload_item_id)",
  "CREATE TABLE IF NOT EXISTS portal_audit_log ( id TEXT PRIMARY KEY, customer_id TEXT, actor TEXT NOT NULL, action TEXT NOT NULL, meta_json TEXT, ip TEXT, created_at INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS idx_audit_customer ON portal_audit_log(customer_id, created_at)",
  "CREATE TABLE IF NOT EXISTS portal_assets ( key TEXT PRIMARY KEY, value_b64 TEXT NOT NULL, mime TEXT NOT NULL, created_at INTEGER NOT NULL)",
];

// Column additions (migrations 0026+). Not idempotent in SQLite: the runner ignores 'duplicate column'.
export const SCHEMA_ALTERS = [
  'ALTER TABLE agr_signatures ADD COLUMN accepted_all_at INTEGER',
  'ALTER TABLE agr_signatures ADD COLUMN amounts_accepted_at INTEGER',
];

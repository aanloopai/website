-- Aanloop AI portal — F2 AI-laag: dynamische AI-velden op entiteiten
-- (prospect eerst) + AI-gebruik-teller voor kostenbewaking. Apply:
-- wrangler d1 execute aanloop-portal --remote --file=migrations/0012_ai.sql

-- ai_fields: definitie van een AI-veld per entiteitstype. prompt_template
-- bevat een {{record}}-placeholder die src/lib/ai-crm.js vult met compacte
-- JSON van het onderliggende record (+ recente activiteit).
CREATE TABLE IF NOT EXISTS ai_fields (
  entity_type     TEXT NOT NULL,
  veld_naam       TEXT NOT NULL,
  label           TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  PRIMARY KEY (entity_type, veld_naam)
);

INSERT OR IGNORE INTO ai_fields (entity_type, veld_naam, label, prompt_template) VALUES
  ('prospect', 'icp_fit', 'ICP-fit',
   'Gegeven dit keukenzaak-prospectrecord: {{record}}

Scoor 1-10 hoe goed dit bedrijf past bij het ideale klantprofiel (ICP) van de leadgen-dienst van keukeninbeeld.nl: een Nederlandse keukenzaak met fysieke showroom, actieve website en aanwezige (Google-)reviews. Geef ook een reden van 1 zin.

Geef het resultaat terug als STRICT JSON in exact dit formaat, zonder markdown-codeblok eromheen:
{"score": 1-10, "reden": "een regel toelichting"}'),

  ('prospect', 'deal_risk', 'Risico',
   'Gegeven dit keukenzaak-prospectrecord inclusief recente activiteit: {{record}}

Classificeer het risico dat dit prospect "koud" wordt (geen reactie meer geeft, opvolging stokt): laag, middel of hoog. Geef een korte reden.

Geef het resultaat terug als STRICT JSON in exact dit formaat, zonder markdown-codeblok eromheen:
{"risico": "laag|middel|hoog", "reden": "..."}'),

  ('prospect', 'volgende_actie_ai', 'Volgende beste actie',
   'Gegeven dit keukenzaak-prospectrecord: {{record}}

Stel EEN concrete volgende actie voor, in het Nederlands, maximaal 15 woorden.

Geef het resultaat terug als STRICT JSON in exact dit formaat, zonder markdown-codeblok eromheen:
{"actie": "..."}');

-- ai_field_values: gecachte AI-antwoorden per entiteit+veld. waarde is JSON
-- (het geparste antwoord, niet de ruwe Gemini-tekst).
CREATE TABLE IF NOT EXISTS ai_field_values (
  entity_type TEXT NOT NULL,
  entity_id   INTEGER NOT NULL,
  veld_naam   TEXT NOT NULL,
  waarde      TEXT,
  model       TEXT,
  updated_at  TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (entity_type, entity_id, veld_naam)
);

-- ai_usage: dagteller per feature (kostenbewaking — zie /admin dashboard
-- "Emma AI-verbruik"-kaart).
CREATE TABLE IF NOT EXISTS ai_usage (
  dag     TEXT NOT NULL,
  feature TEXT NOT NULL,
  calls   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dag, feature)
);

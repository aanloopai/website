-- Blanket acceptance timestamp on the signature (step 4 'Samenvatting').
ALTER TABLE agr_signatures ADD COLUMN accepted_all_at INTEGER;

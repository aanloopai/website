-- Timestamp of the explicit confirmation of the payable amounts (step 4 'Te betalen bedragen').
ALTER TABLE agr_signatures ADD COLUMN amounts_accepted_at INTEGER;

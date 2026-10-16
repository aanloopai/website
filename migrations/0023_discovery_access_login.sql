-- Aanloop AI portal — Discovery: klant-login met gebruikersnaam + wachtwoord.
-- kind = 'link' (persoonlijke link, token_hash) | 'login' (username + pw_hash,
-- PBKDF2-SHA256; token_hash = hash van een nooit uitgegeven willekeurig token).
-- Eén actieve rij per (doc_id, kind). Worker (src/lib/discovery.js) voegt deze
-- kolommen ook zelf idempotent toe — dit bestand is de kanonieke referentie.
ALTER TABLE disc_access ADD COLUMN kind TEXT NOT NULL DEFAULT 'link';
ALTER TABLE disc_access ADD COLUMN username TEXT;
ALTER TABLE disc_access ADD COLUMN pw_hash TEXT;

# Lessons

- **2026-10-09 (klantenportaal):** Eerst het bestaande portaal in kaart brengen voorkwam een tweede auth/DB-laag; spec-URL's (`/klanten`) zijn redirects geworden, geen aparte app.
- **2026-10-09:** De repo is publiek — klantgegevens en handtekening-assets horen in D1 (buiten git om), nooit in migraties of `private/`.
- **2026-10-09:** D1-migraties worden niet door `deploy.yml` toegepast; vóór de merge handmatig `wrangler d1 execute aanloop-portal --remote --file=…` draaien, anders 500 op de nieuwe routes.
- **2026-10-09:** Geen R2-binding/-rechten op de CI-token → KV met 25 MiB-limiet als opslag; een R2-binding zou de deploy stil kunnen breken.
- **2026-10-09:** Sjabloontekst bevriezen bij de eerste consent (niet bij versturen): KvK/btw worden pas door de klant ingevuld.

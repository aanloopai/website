# LinkedIn Company Page — Aanloop AI

Doel: officiële Aanloop AI bedrijfspagina aanmaken. Mustafa-personal profile linkt hier als employer. Authority + KvK-verificatie + API-access voor toekomstige posts.

Aanmaken: https://www.linkedin.com/company/setup/new/ (ingelogd als Mustafa)

---

## Velden in de create-wizard (verbatim invullen)

### Page identity

| Veld | Waarde |
|------|--------|
| Page name | `Aanloop AI` |
| LinkedIn public URL | `linkedin.com/company/aanloop-ai` *(slug `aanloop-ai`)* |
| Website | `https://aanloopai.nl` |
| Industry | `Software Development` *(fallback: `IT Services and IT Consulting`)* |
| Company size | `1-10 employees` |
| Company type | `Privately Held` |
| Year founded | `2026` |
| Headquarter — Country | `Netherlands` |
| Headquarter — City | `Rotterdam` |
| Phone | `+31 6 247 41 597` |

### Tagline (max 120 chars)

```
AI agents voor het Nederlandse MKB — Marco (telefoon) en Emma (WhatsApp). KvK 88606902.
```

Karaktertelling: 87 chars.

### About / Overview (max 2.000 chars)

```
Aanloop AI ontwikkelt AI agents voor het Nederlandse MKB. Marco is een AI-receptionist die telefoongesprekken aanneemt, de agenda koppelt en leads routeert. Emma is een WhatsApp-agent die in seconden antwoordt op klantvragen, getraind op de kennisbank van het bedrijf, met menselijke handover wanneer nodig. De AI-Website Bundel combineert beiden met een nieuwe website voor €4.950 setup + €397/mnd.

Wat ons onderscheidt:
• Transparante prijzen — Starter €597/mnd, Groei €1.197/mnd, Partner op maat. Geen "offerte aanvragen".
• Nederlandse cases, Nederlandse compliance — AVG-conform, data binnen de EU.
• Geen white-label of doorverkoop — eigen tooling, agents getraind per klant.
• Founder-led — Mustafa Agah Dogan, BSc Computer Engineering (2012), 20 jaar IT-ervaring, Big 4 consultancy-achtergrond.

Voor wie:
MKB-eigenaren in horeca, vastgoed, zorg, accountancy, financieel-planning, hypotheken, pensioenadvies, beauty, bouw, logistiek en webshops die hun klantcontact 24/7 willen afhandelen zonder personeel uit te breiden.

KvK: 88606902
Rotterdam, Nederland
Demo plannen: aanloopai.nl/demo-inplannen/
WhatsApp: +31 6 247 41 597
```

Karaktertelling: ~1.150 chars.

### Specialties (max 20 tags, comma-separated)

```
AI Agents, Conversational AI, AI Receptionist, WhatsApp Business API, Voice AI, Customer Service Automation, MKB Automatisering, AI voor MKB, Process Automation, AVG-compliant AI, Nederlands MKB, Lead Routing, Appointment Scheduling, AI Chatbot, Generative AI, Business Automation
```

---

## Visuele assets (upload)

| Veld | Bestand | Dimensies |
|------|---------|-----------|
| Logo | `public/brand/png/logo-mark-300.png` | 300×300 |
| Cover image | `public/brand/png/logo-horizontal-1584x396.png` | 1584×396 |

Logo-fallback (high-res): `public/brand/png/logo-mark-1080.png`.

---

## Verificatie

LinkedIn vraagt voor "verified business" een KvK-nummer. Aanloop AI is geregistreerd bij Kamer van Koophandel onder **88606902**. Vul dit in bij Page settings → Verification.

LinkedIn cross-checkt automatisch tegen het KvK-handelsregister. Resultaat: een ✓ "Verified" badge zichtbaar op de page.

---

## Post-creation stappen

1. **Mustafa-personal profile**: Experience-sectie aanpassen, Aanloop AI selecteren als employer (drop-down toont de pagina zodra die live is).
2. **Page admin instellen**: alleen Mustafa als super-admin tot er een tweede teamlid is.
3. **Eerste post**: launch-announcement met de bundel-USP + link naar `aanloopai.nl/diensten/ai-website-bundel-mkb-nederland/`.
4. **Featured-sectie** (page heeft die later via "Showcase pages" of pinned posts):
   - Demo inplannen
   - Tarieven
   - Onderzoek MKB AI 2026
5. **Cross-link**: voeg de canonical page-URL toe aan `Organization.sameAs[]` in de homepage schema (zoek de plek waar IG / X-handles ingevoerd zijn en breid uit met LinkedIn).

---

## Checklist

- [ ] Page name + URL slug ingevuld
- [ ] Industry/size/type/foundedYear/HQ ingevuld
- [ ] Tagline (max 120 chars) ingevuld
- [ ] About/Overview ingevuld (NL)
- [ ] Specialties tags toegevoegd
- [ ] Logo geüpload (300×300)
- [ ] Cover geüpload (1584×396)
- [ ] KvK 88606902 ingevuld voor verificatie
- [ ] Eerste post gepubliceerd
- [ ] Mustafa-profile Experience updated naar employer = Aanloop AI page
- [ ] Page URL gedeeld → `MEMORY.md` updaten

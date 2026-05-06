# LOCAL-DIRECTORY-EXPANSION.md
# Aanloop AI -- Platform Submission Packages
# Datum: 2026-05-06 | Status: Copy-paste ready

---

## 1. APPLE MAPS CONNECT
**URL:** https://mapsconnect.apple.com
**Signaalwaarde:** Apple Intelligence (Siri, iOS Maps) citeert Apple Maps-data als primaire lokale bron.

### Stap-voor-stap account aanmaken

1. Ga naar https://mapsconnect.apple.com
2. Log in met Apple ID (gebruik hallo@aanloopai.nl of een dedicated bedrijfs-Apple ID)
3. Klik op "Add New Place" -- of claim bestaand vermeld als gevonden
4. Zoek op "Aanloop AI" -- geen treffer: klik "Add a New Business"
5. Vul alle velden in (zie onder)
6. Kies verificatiemethode: phone call of postcard (Rotterdam adres vereist)
7. Bevestig verificatiecode -- listing live binnen 3-5 werkdagen

### Profiel velden

| Veld | Invullen |
|------|---------|
| Business Name | Aanloop AI BV |
| Category | Consulting and Advising (primair) + Computer Software (secundair) |
| Street Address | [Kantooradres Rotterdam conform KvK-inschrijving] |
| City / Region | Rotterdam, Zuid-Holland |
| Postal Code | [postcode conform KvK] |
| Country | Nederland |
| Phone | [Zakelijk telefoonnummer] |
| Website | https://www.aanloopai.nl |
| Hours | Ma-Vr 09:00-17:30 |
| Description (200 chars) | AI-automatisering voor het Nederlandse MKB. Marco en Emma bellen, mailen en plannen 24/7, met NL datasoevereiniteit. Transparante tarieven, geen lock-in. |
| Photos | Logo 1024x1024 PNG, kantoorgebouw, team-foto (min. 3 afbeeldingen) |

### Verificatieproces
- Apple stuurt PIN per telefoon of ansichtkaart naar geregistreerd adres
- Bewaar PIN voor toekomstige updates
- Na goedkeuring: listing zichtbaar in Apple Maps, Siri-resultaten en Apple Intelligence lokale queries

### AI-engine consequenties
Apple Intelligence (iOS 18+) gebruikt Maps-data voor lokale zakelijke antwoorden. Volledige listing verhoogt citatieskans bij vragen als "Welk AI-bureau zit in Rotterdam?".

---

## 2. BING PLACES FOR BUSINESS
**URL:** https://www.bingplaces.com
**Signaalwaarde:** Bing Copilot + ChatGPT (GPT-4o gebruikt Bing Search) trekt lokale bedrijfsgegevens van Bing Places.

### Stap-voor-stap

1. Ga naar https://www.bingplaces.com
2. Klik "Get Started" -- log in met Microsoft-account (of maak aan met hallo@aanloopai.nl)
3. Zoek op bedrijfsnaam of telefoonnummer
4. Listing gevonden: klik "Claim this business"
5. Niet gevonden: klik "Create a new business listing"
6. Verificatie: phone call of postcard

### Profiel velden

| Veld | Waarde |
|------|--------|
| Business Name | Aanloop AI BV |
| Category | Business Consulting (primair); Artificial Intelligence of Software Company (secundair) |
| Address | [KvK-adres Rotterdam] |
| Phone | [Zakelijk nummer] |
| Website | https://www.aanloopai.nl |
| Email | hallo@aanloopai.nl |
| Hours | Ma-Vr 09:00-17:30 |
| Short Description | AI-automatisering voor het Nederlandse MKB. Telefonische AI-receptionist (Marco), e-mail AI-assistent (Emma) en AI-websites. NL datasoevereiniteit. |
| Social profiles | LinkedIn: linkedin.com/company/aanloop-ai |

**Long Description:**
Aanloop AI BV is een Rotterdam-gebaseerd AI-bureau gespecialiseerd in bedrijfsautomatisering voor het Nederlandse MKB. Onze producten -- Marco (AI-receptionist), Emma (AI-e-mailassistent) en de AI-Website Bundel -- zorgen voor 24/7 klantcontact zonder extra personeel. Alle dataverwerking vindt plaats binnen Nederland (NL datasoevereiniteit, AVG-compliant). KvK: 88606902.

### ChatGPT-signaal
ChatGPT (GPT-4o met Bing-browsing) gebruikt Bing Places als primaire bron voor lokale bedrijfsdata. Volledige listing = directe invloed op ChatGPT lokale antwoorden.

---

## 3. TRUSTPILOT COMPANY PROFIEL
**URL:** https://business.trustpilot.com
**Signaalwaarde:** AggregateRating schema van echte Trustpilot-reviews verhoogt E-E-A-T-signaal + Google Rich Snippets.

### Free tier aanmaken

1. Ga naar https://business.trustpilot.com/signup
2. Vul in:
   - Bedrijfsnaam: Aanloop AI BV
   - Website: https://www.aanloopai.nl
   - Naam: Daan Verhoeven
   - E-mail: hallo@aanloopai.nl
   - KvK/VAT: 88606902
3. Domain ownership verificatie: TXT-record toevoegen aan DNS OF HTML-bestand uploaden naar root
4. Profiel compleet maken (zie onder)

### Profiel velden

| Veld | Waarde |
|------|--------|
| Company Name | Aanloop AI BV |
| Website | https://www.aanloopai.nl |
| Category | Business Consulting and Services |
| Description | AI-automatisering voor het Nederlandse MKB. Marco beantwoordt telefoontjes 24/7, Emma verwerkt e-mails automatisch. Transparante tarieven, geen verborgen kosten, NL datasoevereiniteit. |
| Logo | PNG 400x400 px |
| Cover image | 1200x300 px |
| Address | [Rotterdam adres] |
| Email | hallo@aanloopai.nl |

### Review verzamel e-mail template (5 klanten, handmatig sturen)

**Onderwerp:** Kort verzoekje -- jouw ervaring met Aanloop AI

Hoi [Voornaam],

Dank voor het vertrouwen in Aanloop AI. We zijn benieuwd hoe je onze samenwerking hebt ervaren.

Zou je 2 minuten willen nemen om een eerlijke review te plaatsen op Trustpilot?
https://nl.trustpilot.com/evaluate/aanloopai.nl

Je hoeft geen roman te schrijven -- een paar zinnen over wat je hebt ervaren is al heel waardevol.

Hartelijke groet,
Daan Verhoeven
Aanloop AI BV

**Verzendstrategie:**
- Stuur naar 5 meest tevreden klanten (handmatig, persoonlijk)
- Timing: 1-2 weken na succesvolle go-live van Marco/Emma
- Geen incentive aanbieden (Trustpilot beleid)
- Follow-up na 5 dagen als geen reactie

### Schema-integratie (ALLEEN na 10+ echte reviews)

Voeg toe aan `<head>` van `/tarieven/` en `/cases/`:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Aanloop AI BV",
  "url": "https://www.aanloopai.nl",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "[ECHT TRUSTPILOT GEMIDDELDE]",
    "reviewCount": "[ECHT AANTAL REVIEWS]",
    "bestRating": "5",
    "worstRating": "1"
  }
}
```

**KRITISCH:** Nooit mock/placeholder waarden. Uitsluitend echte Trustpilot-data gebruiken.

---

## 4. FUTURETOOLS.IO
**URL:** https://www.futuretools.io/submit-a-tool
**Aanpak:** Submit Marco als primaire tool, Emma apart. Aanloop AI als provider.

### Marco -- Submissie velden

| Veld | Waarde |
|------|--------|
| Tool Name | Marco by Aanloop AI |
| Tool URL | https://www.aanloopai.nl/producten/marco-ai-receptionist |
| Provider | Aanloop AI BV |
| Category | Voice AI / Customer Support / Business Tools |
| Pricing | Paid (Starter EUR 597/mnd, geen gratis tier) |
| Short Description EN (200 chars) | Marco is an AI phone receptionist for Dutch SMEs. Answers calls 24/7, books appointments, qualifies leads in Dutch. GDPR-compliant, no per-minute costs. From EUR 597/month. |
| Long Description EN | Marco is an AI-powered phone receptionist built for Dutch small and medium-sized businesses. Answers calls 24/7, qualifies leads, books appointments entirely in Dutch. Dutch data sovereignty, GDPR-compliant. Flat-rate from EUR 597/month. No hidden fees. Provided by Aanloop AI BV, Rotterdam. |
| Tags | voice-ai, receptionist, phone-automation, lead-qualification, appointment-booking, dutch, smb, b2b |
| Logo | Aanloop AI logo PNG 512x512 |

### Emma -- Submissie velden (apart indienen)

| Veld | Waarde |
|------|--------|
| Tool Name | Emma by Aanloop AI |
| Tool URL | https://www.aanloopai.nl/producten/emma-ai-e-mailassistent |
| Category | Email / Productivity / Business Tools |
| Pricing | Paid -- EUR 197/mnd standalone |
| Short Description EN (200 chars) | Emma is an AI email assistant for Dutch SMEs. Reads, drafts and routes business emails automatically in Dutch. GDPR-compliant. Standalone from EUR 197/month. |

---

## 5. THERESANAIFORTHAT.COM (TAAFT)
**Submit URL:** https://theresanaiforthat.com/submit/

### Marco -- Submissie formulier

| Veld | Waarde |
|------|--------|
| Tool Name | Marco -- AI Phone Receptionist |
| Tool Website | https://www.aanloopai.nl/producten/marco-ai-receptionist |
| Short Description EN (150 chars) | 24/7 AI phone receptionist for Dutch SMEs. Handles calls, books appointments, qualifies leads in Dutch. GDPR-compliant. |
| Category | Voice AI (primair) + Customer Service (secundair) |
| Use Cases | Phone answering, appointment booking, lead qualification, after-hours coverage, receptionist automation |
| Pricing | Paid -- EUR 597/month Starter |
| Free Trial | Nee (demo beschikbaar op aanvraag) |
| Tags | dutch, voice-ai, smb, receptionist, phone, automation, gdpr, netherlands |

### Emma -- Submissie formulier

| Veld | Waarde |
|------|--------|
| Tool Name | Emma -- AI Email Assistant |
| Tool Website | https://www.aanloopai.nl/producten/emma-ai-e-mailassistent |
| Short Description EN (150 chars) | AI email assistant for Dutch SMEs. Reads, drafts and routes business emails automatically in Dutch. GDPR-compliant. |
| Category | Email AI + Productivity |
| Pricing | Paid -- EUR 197/month standalone |
| Tags | dutch, email-ai, automation, smb, gdpr, netherlands, inbox-management |

---

## 6. LEMONIO.COM
**Aanpak:** Marco en Emma als afzonderlijke tools indienen voor maximale zichtbaarheid.

### Marco -- Lemonio profiel

| Veld | Waarde |
|------|--------|
| Tool Name | Marco -- AI Receptionist (NL) |
| Website | https://www.aanloopai.nl/producten/marco-ai-receptionist |
| One-liner EN | 24/7 Dutch-language AI phone receptionist for SMEs -- answers calls, books meetings, qualifies leads. |
| Full Description EN | Marco is a Dutch-language AI phone receptionist for SMEs in the Netherlands. Handles inbound calls 24/7, books appointments, qualifies leads, escalates urgent matters. All data stays in NL (Dutch data sovereignty). Flat-rate from EUR 597/month -- no per-minute billing. Aanloop AI BV, KvK 88606902, Rotterdam. |
| Category | Voice AI / Business Automation / Customer Service |
| Pricing | Paid -- from EUR 597/month |
| Language | Dutch (NL) |
| Deployment | SaaS / Cloud |
| Compliance | GDPR / AVG |

### Emma -- Lemonio profiel

| Veld | Waarde |
|------|--------|
| Tool Name | Emma -- AI Email Assistant (NL) |
| Website | https://www.aanloopai.nl/producten/emma-ai-e-mailassistent |
| One-liner EN | AI-powered email assistant for Dutch SMEs -- reads, drafts and routes business emails automatically. |
| Full Description EN | Emma reads incoming business emails, drafts replies, and routes messages to the right team member. Built for Dutch-language business email. Standalone EUR 197/month, or bundled with Marco at EUR 1.197/month (Groei). GDPR-compliant, Dutch data sovereignty. Aanloop AI BV, Rotterdam. |
| Category | Email AI / Productivity / Business Automation |
| Pricing | Paid -- from EUR 197/month standalone |

---

## 7. TOEKOMSTIGE DIRECTORIES (lagere prioriteit)

| Platform | Timing | Actie |
|----------|--------|-------|
| Product Hunt | Bij launch AI-Website Bundel als SaaS | PH-pagina + maker-profiel Daan Verhoeven |
| G2 Crowd | 10+ klanten beschikbaar | Aparte agent al gedekt |
| Capterra | 10+ klanten beschikbaar | Aparte agent al gedekt |
| SaaSworthy | Q3 2026 | Submit Marco als SaaS tool |
| aitools.fyi | Nu mogelijk | Zelfde template als FutureTools |
| TopAI.tools | Nu mogelijk | Marco + Emma apart |
| AI Valley | Nu mogelijk | Zelfde EN-beschrijvingen |
| OpenFuture.AI | Nu mogelijk | Zelfde EN-beschrijvingen |

---

## PRICING REFERENTIE (canonical)

| Product | Prijs |
|---------|-------|
| Emma standalone | EUR 197/mnd |
| Marco Starter | EUR 597/mnd |
| Marco + Emma Groei | EUR 1.197/mnd |
| AI-Website Bundel | EUR 4.950 setup + EUR 397/mnd |

*USD indicatief voor EN-directories: Emma ca. 215 USD, Marco ca. 650 USD, Groei ca. 1.300 USD. Gebruik EUR als primaire valuta.*

---

## UITVOERINGSPLANNING (Eisenhower)

| Prioriteit | Actie | Reden |
|-----------|-------|-------|
| Q1 -- Nu + urgent | Bing Places aanmaken | ChatGPT/Copilot signaal direct |
| Q1 -- Nu + urgent | Trustpilot profiel claimen + 5 review-mails sturen | Sociale bewijslast opbouwen |
| Q2 -- Nu, niet urgent | FutureTools Marco + Emma indienen | Backlink + AI directory signaal |
| Q2 -- Nu, niet urgent | TAAFT Marco + Emma indienen | Backlink + category ranking |
| Q2 -- Nu, niet urgent | Lemonio Marco + Emma indienen | Backlink |
| Q3 -- Niet nu | Apple Maps Connect | Minder direct effect dan Bing |
| Q4 -- Defer | Product Hunt | Wacht op SaaS-variant AI-Website Bundel |

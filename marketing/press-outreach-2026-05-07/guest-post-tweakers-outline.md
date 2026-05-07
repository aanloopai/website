# Guest post outline — Tweakers.net / Tweakers Pro
**Datum:** 7 mei 2026
**Onderwerp:** Hoe je een GDPR-compliant AI-receptionist self-host op n8n + Docker + ElevenLabs

---

## Intro-pitch (voor redactie)

Dit artikel richt zich op technisch-onderlegde lezers die een AI-receptionist willen bouwen op self-hosted infrastructuur, met volledige controle over data en zonder Amerikaanse cloud-afhankelijkheid. De stack die beschreven wordt — n8n, Docker Compose, ElevenLabs API, EU-hostingprovider — is dezelfde die Aanloop AI in productie draait voor klanten in zorg en financieel advies. De nadruk ligt op architectuurkeuzes en AVG-compliance, niet op commerciële productpromotie.

Geschatte lengte: 1.800-2.200 woorden. Beschikbaar voor redactionele aanpassing.

---

## Outline

### H2: Waarom self-hosted en niet SaaS?

- **H3:** Datasovereiniteit als harde eis in zorg en juridisch
- **H3:** Kostenprofiel: SaaS per-minuut vs. vaste infrastructuurkosten

---

### H2: Stack-keuze en verantwoording

- **H3:** n8n als orkestratielaag — open source, self-hosted, EU-getoetst
- **H3:** ElevenLabs API voor Nederlandse voice — taalmodel en stemkeuze
- **H3:** Telefonie-ingang: SIP-trunk koppeling of Twilio EU-endpoint
- **H3:** Opslag: PostgreSQL voor transcripts + S3-compatible opslag in EU (bijv. Hetzner Object Storage)

---

### H2: Docker Compose architectuur

- **H3:** Minimale service-definitie (n8n + PostgreSQL + reverse proxy)
- **H3:** Secrets management — geen plain-text env vars in productie
- **H3:** Health checks en container restart-policies

---

### H2: AVG-redactie-flow

- **H3:** Welke data wordt vastgelegd en hoe lang
- **H3:** Transcript-pseudonimisering na afloop gesprek
- **H3:** DPA-vereisten: wat je als data controller moet regelen met ElevenLabs als verwerker
- **H3:** Rechten van betrokkenen — inzage en verwijdering vanuit n8n workflow

---

### H2: Monitoring en alerting

- **H3:** Uptime-check via externe monitor
- **H3:** n8n execution logs: wat bewaren, wat verwijderen
- **H3:** Escalatie-flow als AI-assistent vastloopt of gesprek niet herkent

---

### H2: Beperkingen en trade-offs

- Latency op ElevenLabs API vs. on-premise TTS
- Onderhoudslast self-hosted vs. managed service
- Wanneer self-hosted zinvol is (hoog volume, stricte datavereisten) vs. wanneer managed de betere keuze is

---

**Over de auteur**

Mustafa Agah Dogan, oprichter Aanloop AI B.V. (Rotterdam) · magahdogan@aanloopai.nl · KvK 88606902

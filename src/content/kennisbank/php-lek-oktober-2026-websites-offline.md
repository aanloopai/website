---
title: "PHP-lek 21 oktober 2026: waarom DigiD en honderden websites offline gingen"
seoTitle: "PHP-lek oktober 2026: waarom websites offline gingen"
description: "Door twee PHP-lekken gingen op 21 oktober 2026 DigiD, MijnOverheid en vele andere sites offline. Wat er gebeurde en wat het voor uw website betekent."
excerpt: "Op woensdag 21 oktober 2026 gingen DigiD, MijnOverheid, de Tweede Kamer, RTL Nieuws en een lange rij andere Nederlandse websites uit voorzorg offline. Oorzaak: twee kritieke lekken in PHP, de programmeertaal onder een groot deel van het web. Een overzicht van wat er gebeurde, wie geraakt werd en wat u nu moet doen."
published: 2026-10-22
category: "Beveiliging"
readingMinutes: 7
draft: false
---

Woensdag 21 oktober 2026 was voor het Nederlandse web een uitzonderlijke dag. DigiD, MijnOverheid, de websites van de Tweede Kamer en RTL Nieuws, Overheid.nl, het Havenbedrijf Rotterdam, de KNVB en meerdere ziekenhuizen gingen uit voorzorg offline. De Rijksoverheid meldde die middag: *"Door 2 lekken in de software die op veel websites gebruikt wordt, zijn woensdag 21 oktober 2026 een aantal websites uit voorzorg offline gehaald. Ook een aantal websites van overheidsinstanties in Nederland."*

De software in kwestie is **PHP**: de programmeertaal waarop onder meer WordPress, WooCommerce, Joomla, Drupal en Magento draaien. Volgens W3Techs (geciteerd door Reuters) gebruikt ongeveer 75% van de websites waarvan de servertaal herkenbaar is PHP. Dat verklaart de schaal.

## Direct antwoord

- **Wat:** twee kritieke lekken in PHP, **CVE-2026-109618** en **CVE-2026-109619**, elk met een CVSS-score van 9.2. Ze maken het mogelijk om van buitenaf code uit te voeren op de webserver (remote code execution).
- **Wie:** elke webserver die PHP 5.4 of nieuwer draait, volgens beveiligingsbedrijf Sansec.
- **Oplossing:** updaten naar PHP **8.5.12, 8.4.27, 8.3.36 of 8.2.35**. Die versies verschenen op 21 oktober.
- **Onderhoudsmodus helpt niet.** Sansec: *"The maintenance modes in Magento and WordPress do not help, because PHP parses each request before the application check."* Een "we zijn zo terug"-pagina in WordPress of Magento beschermt u dus niet.
- **Status 22 oktober:** DigiD, MijnOverheid en de meeste ziekenhuissites zijn weer bereikbaar. Experts waarschuwen dat het lek nog maanden doorwerkt bij sites die niet updaten.

## Tijdlijn

| Moment | Wat er gebeurde |
|---|---|
| 1 augustus 2026 | Onderzoekers van Calif vinden een lek met behulp van een taalmodel en melden het bij het PHP-team (Reuters). |
| vóór 21 oktober | Ook Wiz vindt met AI-tooling een lek. Calif en Wiz stemmen de bekendmaking af met het PHP-team. |
| 21 oktober, ~07:43 UTC | Sansec ziet de eerste aanvalspogingen die de lekken misbruiken. |
| 21 oktober, 11:03 | Het NCSC publiceert een eerste waarschuwing en adviseert te updaten of systemen offline te halen. Het NCSC haalt ook de eigen website uit voorzorg offline. |
| 21 oktober, middag | DigiD, MijnOverheid, de Tweede Kamer, RTL Nieuws, Overheid.nl, het Havenbedrijf Rotterdam, de KNVB en ziekenhuizen gaan offline. |
| 21 oktober, 14:30 en 15:50 | Het NCSC werkt zijn advies bij. |
| 21 oktober, 15:13 | De Rijksoverheid bevestigt dat overheidssites uit voorzorg offline zijn gehaald. |
| 21 oktober, rond 16:00 | Het PHP-project publiceert de gepatchte versies. |
| 22 oktober | DigiD, MijnOverheid en ziekenhuissites komen weer online. |

## Waarom offline halen, en niet gewoon even wachten?

Het lek zit in PHP zelf, niet in een plugin of thema. PHP verwerkt elk binnenkomend verzoek voordat WordPress, Magento of een ander systeem er iets mee doet. Daardoor helpen de gebruikelijke maatregelen niet: geen onderhoudsmodus, geen beveiligingsplugin, geen wachtwoordwijziging. Wie nog niet kon updaten, had maar één zekere maatregel: de site uit de lucht halen.

Het ging ook niet alleen om websites. Volgens NRC lag in de ouderenzorg het digitale medicatiesysteem Medimo stil, waardoor de gangbare medicatielogistiek in instellingen onmogelijk werd.

## Ook buiten Nederland

Reuters meldt dat ook overheden in Frankrijk, Denemarken en Finland sites offline haalden. Het Franse ministerie van Binnenlandse Zaken zette al zijn sites in onderhoud, in Finland deed de ICT-dienst Valtori hetzelfde. Wikipedia en het Internet Archive waren kort onbereikbaar. Volgens Censys draaiden van de ongeveer 2,6 miljoen gescande hosts er op 21 oktober zo'n 1,5 miljoen een ongepatchte PHP-versie.

Automattic meldde dat WordPress.com en Tumblr veilig waren. Het grootste risico ligt volgens experts bij **kleinere sites op gedeelde hosting**, waar de ondernemer zelf niet bepaalt wanneer PHP wordt bijgewerkt.

## Het AI-aspect

Beide lekken zijn gevonden met behulp van AI: Calif gebruikte een taalmodel, Wiz zijn eigen AI-tooling. Dat werkt twee kanten op. Beveiligingsexperts waarschuwen in Reuters voor een "race to exploit": aanvallers zetten dezelfde technieken in om sneller misbruik te maken dan beheerders kunnen patchen. De tijd tussen bekendmaking en aanval wordt korter. Voor websites die maar af en toe onderhoud krijgen, is dat het eigenlijke risico.

## Wat betekent dit voor uw website?

Draait uw website of webshop op WordPress, WooCommerce, Joomla, Drupal, Magento of een ander PHP-systeem? Dan moet uw PHP-versie **nu** op 8.5.12, 8.4.27, 8.3.36 of 8.2.35 staan. Op een oudere PHP-versie (8.1 of lager) bent u niet geholpen met deze patches: dan is upgraden of tijdelijk offline halen nodig.

Loop onze [checklist: is mijn website kwetsbaar voor het PHP-lek?](/kennisbank/is-mijn-website-kwetsbaar-php-lek-checklist/) stap voor stap door. Lukt dat niet zelf, of weet u niet wie uw server beheert? Dan helpen wij met [website-beveiliging en onderhoud](/diensten/website-beveiliging-onderhoud/): de update, een controle op misbruik, en desgewenst een overstap naar een website zonder PHP.

**Was aanloopai.nl zelf geraakt?** Nee. Onze eigen website draait niet op PHP: het zijn statische pagina's die via Cloudflare worden geserveerd. Meer daarover op onze pagina [Beveiliging](/beveiliging/).

## Bronnen

- NCSC, community-pagina "PHP" met updates van 21 oktober 2026 (11:03, 14:30, 15:50): community.ncsc.nl/p/php
- Rijksoverheid, bericht van 21 oktober 2026, 15:13
- Sansec, "PHP2Shell" (21 oktober 2026): sansec.io/research/php2shell
- Reuters, berichtgeving van 21 oktober 2026 (Calif, Wiz, Censys, W3Techs, Automattic)
- NOS-liveblog, NRC, Reformatorisch Dagblad en Bright (21 en 22 oktober 2026)

Dit artikel beschrijft de situatie op 22 oktober 2026. Volg voor het actuele advies het NCSC.

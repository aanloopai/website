---
title: "PHP-lek 21 oktober 2026: waarom DigiD en tal van websites offline gingen"
seoTitle: "PHP-lek oktober 2026: waarom websites offline gingen"
description: "Door twee PHP-lekken gingen op 21 oktober 2026 DigiD, MijnOverheid en andere sites offline. Wat er gebeurde en wat het voor uw website betekent."
excerpt: "Op woensdag 21 oktober 2026 gingen DigiD, MijnOverheid, de Tweede Kamer en andere Nederlandse websites uit voorzorg offline. Oorzaak: twee kritieke lekken in PHP, de programmeertaal onder een groot deel van het web. Een overzicht van wat er gebeurde en wat u nu moet doen."
published: 2026-10-22
category: "Beveiliging"
readingMinutes: 7
draft: false
updated: 2026-11-06
bronnen: ["ncsc-php", "ro-php-offline", "sansec-php2shell", "nos-php-liveblog"]
faq:
  - q: "Wat was het PHP-lek van 21 oktober 2026?"
    a: "Het ging om twee kritieke kwetsbaarheden in PHP, CVE-2026-109618 en CVE-2026-109619. PHP is de programmeertaal onder onder meer WordPress en Magento. Het NCSC meldde dat de lekken vermoedelijk in alle huidige PHP-versies zitten."
  - q: "Waarom gingen DigiD en MijnOverheid offline?"
    a: "Dat gebeurde uit voorzorg, omdat de lekken in PHP zelf zitten en een update op dat moment nog niet beschikbaar was. Het NCSC adviseerde eigenaren van PHP-websites zelf een risicoafweging te maken en hun site eventueel preventief offline te halen tot de update er was."
  - q: "Welke PHP-versie moet ik hebben na het PHP-lek?"
    a: "Het NCSC adviseert te upgraden naar PHP 8.5.12, 8.4.27, 8.3.36 of 8.2.35. Voor PHP 7.4, 8.0 en 8.1 stelde het PHP-team minimale broncodepatches beschikbaar. Gebruikers van Linux-distributies passen de updates van hun leverancier toe."
  - q: "Moet ik mijn website offline halen vanwege het PHP-lek?"
    a: "Niet per se. Sansec schrijft dat u uw webshop niet offline hoeft te halen, maar wel PHP moet updaten. Het NCSC raadt een risicoafweging per systeem aan. Alleen een beveiligingsupdate verhelpt de kwetsbaarheden volledig."
---

Woensdag 21 oktober 2026 was voor het Nederlandse web een uitzonderlijke dag. Volgens het NOS-liveblog gingen onder meer de Tweede Kamer, de KNVB en de Unie van Waterschappen uit de lucht. De Rijksoverheid meldde dat ook Overheid.nl, MijnOverheid.nl en DigiD uit voorzorg offline werden gehaald. De Rijksoverheid schreef: *"Door 2 lekken in de software die op veel websites gebruikt wordt, zijn woensdag 21 oktober 2026 een aantal websites uit voorzorg offline gehaald."*

De software in kwestie is **PHP**: de programmeertaal waarop onder meer WordPress, WooCommerce, Joomla, Drupal en Magento draaien. Volgens de NOS gebruikt circa 70 procent van alle websites PHP of een variatie daarop. Dat verklaart de schaal.

## Direct antwoord

- **Wat:** twee kritieke lekken in PHP, **CVE-2026-109618** en **CVE-2026-109619**. Volgens het NCSC maken ze het mogelijk om op afstand code uit te voeren (remote code execution). Gevolgen kunnen zijn dat webservers worden overgenomen, gegevens lekken of websites onbereikbaar worden.
- **Wie:** het NCSC meldt dat de lekken vermoedelijk in alle huidige PHP-versies zitten. Sansec schrijft dat ze aanwezig zijn in elke ongepatchte PHP-versie sinds 5.4.
- **Oplossing:** updaten naar PHP **8.5.12, 8.4.27, 8.3.36 of 8.2.35**. Dit zijn de gepatchte versies die Sansec en het NCSC noemen.
- **Offline halen:** het NCSC adviseert tot de update er is een risicoafweging per systeem te maken en eventueel het systeem uit te schakelen. Sansec stelt dat u uw webshop niet offline hoeft te halen, maar PHP wel moet updaten.
- **Status op 21 oktober:** volgens de NOS was de website van DigiD die avond om 20:27 weer online.

## Tijdlijn

| Moment | Wat er gebeurde |
|---|---|
| 11 augustus 2026 | Volgens de PHP Foundation (via de NOS) wordt het eerste lek gevonden. Onderzoekers van Calif vonden het in samenwerking met OpenAI met behulp van een AI-model. |
| 24 augustus 2026 | Wiz meldt, onafhankelijk van Calif, een tweede lek. Ook Wiz gebruikte daarvoor AI (NOS). |
| 21 oktober, 07:43 UTC | Sansec meldt dat Cloudflare op dit moment de eerste aanvalspogingen zag, vóór de officiële release van de patches. |
| 21 oktober, 11:03 | Het NCSC publiceert de eerste waarschuwing en adviseert zich voor te bereiden op patchen. |
| 21 oktober, 15:13 | De Rijksoverheid bericht dat meerdere websites uit voorzorg offline zijn gehaald en dat er nog geen signalen zijn dat de lekken actief worden misbruikt. |
| 21 oktober, 16:00 | Tijdstip waarop het NCSC (update van 14:30) de patches verwacht. |
| 21 oktober, 20:27 | De website van DigiD is weer online (NOS). |

## Waarom offline halen, en niet gewoon even wachten?

Het lek zit in PHP zelf, niet in een plugin of thema. Het NCSC schrijft dat de mitigerende maatregelen die PHP beschikbaar stelt niet voldoende zijn om de kwetsbaarheden weg te nemen, en dat ze bij pogingen tot misbruik kunnen leiden tot een denial of service. Alleen het installeren van een beveiligingsupdate verhelpt de kwetsbaarheden volledig. Onze lezing, niet een bevinding uit de bronnen: een onderhoudsmodus in WordPress of Magento helpt niet tegen dit lek, omdat PHP zelf kwetsbaar is.

Organisaties die niet direct konden updaten, kozen daarom voor de zekere route. Het NCSC haalde zijn eigen website ook uit voorzorg offline, en Sansec noemt daarnaast onder meer Tweakers, de Tweede Kamer en Security.NL. Zo'n besluit hoort bij een risicoafweging, die het NCSC per systeem adviseert.

Later nuanceert Sansec het beeld: massaal misbruik is minder waarschijnlijk dan eerst verwacht, omdat een aanval specifieke kennis van de doelserver en specifieke omstandigheden vereist. Sansec adviseert PHP daarom toch te updaten.

## Het AI-aspect

Beide lekken zijn gevonden met behulp van AI. Volgens de NOS vonden onderzoekers van Calif, samen met OpenAI, het eerste lek met een specifiek AI-model, en gebruikte Wiz ook AI voor het tweede lek. Onze lezing, niet een bevinding uit de bronnen: wie PHP-servers beheert, kan er niet van uitgaan dat een lek lang onopgemerkt blijft. Voor websites die maar af en toe onderhoud krijgen, is dat een extra reden om updates snel door te voeren.

## Wat betekent dit voor uw website?

Draait uw website of webshop op WordPress, WooCommerce, Joomla, Drupal, Magento of een ander PHP-systeem? Controleer dan uw PHP-versie. Het NCSC adviseert te upgraden naar PHP 8.5.12, 8.4.27, 8.3.36 of 8.2.35.

Draait u PHP 8.1 of ouder? Dan publiceert PHP.net volgens Sansec geen gepatchte release. Het PHP-team stelde wel minimale broncodepatches beschikbaar voor PHP 7.4, 8.0 en 8.1, en verschillende pakketbeheerders brachten eigen backports uit. Het NCSC adviseert gebruikers van Linux-distributies de beveiligingsupdates van hun leverancier toe te passen. Beheert u uw eigen server niet, vraag dan uw hostingprovider om de update.

Loop onze [checklist: is mijn website kwetsbaar voor het PHP-lek?](/kennisbank/is-mijn-website-kwetsbaar-php-lek-checklist/) stap voor stap door. Lukt dat niet zelf, of weet u niet wie uw server beheert? Dan helpen wij met [website-beveiliging en onderhoud](/diensten/website-beveiliging-onderhoud/): de update, een controle op misbruik, en desgewenst een overstap naar een website zonder PHP.

**Was aanloopai.nl zelf geraakt?** Nee. Onze eigen website draait niet op PHP: het zijn statische pagina's die via Cloudflare worden geserveerd. Meer daarover op onze pagina [Beveiliging](/beveiliging/).

Dit artikel beschrijft de situatie op 21 oktober 2026. Volg voor het actuele advies het NCSC.

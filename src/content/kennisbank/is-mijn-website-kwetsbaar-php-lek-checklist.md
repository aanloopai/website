---
title: "Is mijn website kwetsbaar voor het PHP-lek? Checklist in 7 stappen"
seoTitle: "PHP-lek: is mijn website kwetsbaar? Checklist"
description: "Checklist na het PHP-lek van 21 oktober 2026: draait uw site op PHP, welke versie is veilig, wanneer offline halen en hoe u misbruik vindt."
excerpt: "Na de PHP-lekken van 21 oktober 2026 (CVE-2026-109618 en CVE-2026-109619) wilt u maar één ding weten: loopt mijn website risico? Deze checklist helpt u in zeven stappen. Ook als u geen techneut bent."
published: 2026-10-22
category: "Beveiliging"
readingMinutes: 6
draft: false
updated: 2026-11-06
bronnen: ["ncsc-php", "sansec-php2shell", "ro-php-offline", "nos-php-liveblog"]
faq:
  - q: "Hoe weet ik of mijn website op PHP draait?"
    a: "Grote kans van wel als uw site is gebouwd met WordPress, WooCommerce, Joomla, Drupal of Magento. Staat er in uw hostingpakket een instelling voor de PHP-versie, dan draait er PHP. Twijfelt u, vraag het dan aan uw webbouwer of hostingpartij."
  - q: "Welke PHP-versie is veilig na het PHP-lek?"
    a: "Het NCSC adviseert te upgraden naar PHP 8.5.12, 8.4.27, 8.3.36 of 8.2.35. Voor PHP 7.4, 8.0 en 8.1 stelde het PHP-team minimale broncodepatches beschikbaar, en Linux-distributies kunnen eigen updates leveren."
  - q: "Moet ik mijn website offline halen als ik niet direct kan updaten?"
    a: "Dat is een afweging. Het NCSC adviseert per systeem een risicoafweging te maken en eventueel het systeem uit te schakelen. Sansec schrijft dat u uw webshop niet offline hoeft te halen, maar PHP wel moet updaten. Overleg met uw hoster."
  - q: "Hoe controleer ik of mijn website al is misbruikt?"
    a: "Sansec meldt dat de eerste aanvalspogingen al op 21 oktober om 07:43 UTC werden gezien, vóór de patch. Kijk daarom naar onbekende beheerders, nieuwe of gewijzigde bestanden en onverwachte doorverwijzingen, en zet bij twijfel een back-up van vóór die datum terug."
---

Op 21 oktober 2026 gingen DigiD, MijnOverheid en andere websites uit voorzorg offline door twee kritieke lekken in PHP. Wat er precies gebeurde leest u in ons artikel over [het PHP-lek van oktober 2026](/kennisbank/php-lek-oktober-2026-websites-offline/). Hier staat wat u als ondernemer moet doen.

Dit is een praktische checklist, geen garantie. Volg voor het actuele officiële advies het NCSC.

## Stap 1: draait mijn website op PHP?

Grote kans van wel als uw site gebouwd is met:

- **WordPress** of **WooCommerce**
- **Joomla**, **Drupal** of **Magento**
- **PrestaShop** of een ander open-source webshoppakket dat u zelf host
- een website die "op maat" is gebouwd door een webbureau op gedeelde hosting

Snel checken:

1. Gaat `uwdomein.nl/wp-admin` naar een inlogscherm? Dan is het WordPress, en dus PHP.
2. Kijk in uw hostingpakket. Ziet u een instelling "PHP-versie"? Dan draait er PHP.
3. Twijfel? Vraag het uw webbouwer of hostingpartij: "Draait mijn site op PHP, en op welke versie?"

Gehoste platforms zoals Shopify, Wix en Squarespace beheren de server zelf. Daar regelt het platform de update, niet u.

## Stap 2: welke PHP-versie draait er?

In het controlepaneel van uw hoster (Plesk, DirectAdmin, cPanel of een eigen paneel) staat de PHP-versie meestal onder "PHP-instellingen". In WordPress vindt u de versie ook in het beheer onder de site-gezondheid (Engels: *Site Health*), tabblad **Info**, onderdeel **Server**.

## Stap 3: staat de versie op een gepatchte release?

Volgens Sansec en het NCSC zijn dit de versies met de oplossing:

| PHP-tak | Gepatchte versie (minimaal) |
|---|---|
| 8.5 | 8.5.12 |
| 8.4 | 8.4.27 |
| 8.3 | 8.3.36 |
| 8.2 | 8.2.35 |
| 8.1 of ouder | **geen reguliere release van PHP.net** — zie hieronder |

Staat u op een lagere versie binnen dezelfde tak? Update zo snel mogelijk.

Draait u PHP 8.1 of ouder? Het NCSC schrijft dat die versies niet meer regulier door het PHP-project worden ondersteund. Voor PHP 7.4, 8.0 en 8.1 stelde het PHP-team vanwege de ernst wel minimale broncodepatches beschikbaar, en verschillende pakketbeheerders brachten backports uit (Sansec). Gebruikt u een Linux-distributie, pas dan de beveiligingsupdates van uw leverancier toe. Een upgrade naar een nieuwere tak kan plugins of thema's breken, dus test die eerst op een kopie.

## Stap 4: kan ik niet direct updaten? Maak een afweging

Het NCSC adviseert totdat de kwetsbaarheden zijn verholpen per systeem een risicoafweging te maken, en daarbij ook uitschakelen van het systeem te overwegen. De mitigerende maatregelen die PHP beschikbaar stelt, zijn volgens het NCSC niet voldoende om de kwetsbaarheden weg te nemen. Alleen een beveiligingsupdate verhelpt ze volledig. Onze lezing, niet een bevinding uit de bronnen: een onderhoudsmodus in WordPress of Magento helpt niet tegen dit lek, omdat PHP zelf kwetsbaar is.

Sansec zegt daarover dat u uw webshop niet offline hoeft te halen, maar PHP wel moet updaten. Het lek zit in PHP zelf, niet in uw plugins of thema. Vraag uw hoster dus welke gepatchte versie beschikbaar is en wanneer die wordt ingesteld.

## Stap 5: was mijn site al gehackt?

Sansec meldt dat Cloudflare de eerste aanvalspogingen op 21 oktober om 07:43 UTC zag, vóór de officiële release van de patches. Ook als u nu bent bijgewerkt, is het zinvol te controleren of er iemand binnen is geweest:

- **Nieuwe beheerders:** staan er gebruikers met beheerrechten die u niet kent?
- **Vreemde bestanden:** nieuwe `.php`-bestanden in de map voor uploads (bij WordPress: `wp-content/uploads`), of bestanden met rare namen in de hoofdmap.
- **Gewijzigde bestanden:** bestanden met een wijzigingsdatum van 21 oktober of later die u niet zelf heeft aangepast.
- **Onverwachte doorverwijzingen** of spam-pagina's in Google onder uw domein.
- **Webshop:** wijzigingen in de afrekenpagina of betaalinstellingen.

Twijfelt u? Zet dan een back-up terug van vóór 21 oktober, update daarna PHP en wijzig alle wachtwoorden en API-sleutels (beheer, database, FTP/SFTP, betaalprovider).

## Stap 6: wie is verantwoordelijk, ik of mijn hoster?

Bij **gedeelde hosting** bepaalt de hoster welke PHP-versies beschikbaar zijn. U kiest vaak alleen uit een lijstje. Controleer of uw hoster de gepatchte versies al aanbiedt, en stel die in. Sansec adviseert: beheert u uw eigen server niet, vraag dan uw hostingprovider om de update. Bij een **VPS of eigen server** bent u (of uw beheerder) zelf verantwoordelijk.

## Stap 7: voorkom de volgende keer

Dit was niet het laatste lek. Volgens de NOS zijn beide lekken met behulp van AI gevonden. Drie maatregelen maken het verschil:

1. **Iemand die het opvolgt.** Een beheerder die security-updates doorvoert zodra ze uitkomen, niet bij de volgende onderhoudsronde.
2. **Dagelijkse back-ups**, buiten de server zelf bewaard, zodat u kunt terugzetten.
3. **Minder aanvalsoppervlak.** Een website die geen server-side code draait (een statische site), heeft geen PHP om aan te vallen.

## Hulp nodig?

Kunt u een van deze stappen niet zelf uitvoeren, of weet u niet wie uw server beheert? Aanloop AI helpt met [website-beveiliging en onderhoud](/diensten/website-beveiliging-onderhoud/): PHP updaten, controleren op misbruik, en desgewenst overstappen naar een website zonder PHP. [Neem contact op](/contact/).

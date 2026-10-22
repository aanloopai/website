---
title: "Is mijn website kwetsbaar voor het PHP-lek? Checklist in 7 stappen"
seoTitle: "PHP-lek: is mijn website kwetsbaar? Checklist"
description: "Checklist na het PHP-lek van 21 oktober 2026: draait uw site op PHP, welke versie is veilig, waarom onderhoudsmodus niet helpt en hoe u misbruik vindt."
excerpt: "Na de PHP-lekken van 21 oktober 2026 (CVE-2026-109618 en CVE-2026-109619) wilt u maar één ding weten: loopt mijn website risico? Deze checklist helpt u in zeven stappen. Ook als u geen techneut bent."
published: 2026-10-22
category: "Beveiliging"
readingMinutes: 6
draft: false
---

Op 21 oktober 2026 gingen DigiD, MijnOverheid en honderden andere sites offline door twee kritieke lekken in PHP. Wat er precies gebeurde leest u in ons artikel over [het PHP-lek van oktober 2026](/kennisbank/php-lek-oktober-2026-websites-offline/). Hier staat wat u als ondernemer moet doen.

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

Volgens Sansec en het PHP-project zijn dit de versies met de oplossing:

| PHP-tak | Veilige versie (minimaal) |
|---|---|
| 8.5 | 8.5.12 |
| 8.4 | 8.4.27 |
| 8.3 | 8.3.36 |
| 8.2 | 8.2.35 |
| 8.1 of ouder | **geen patch** — upgraden naar een tak hierboven |

Staat u op een lagere versie binnen dezelfde tak? Update zo snel mogelijk. Draait u nog op PHP 8.1, 7.x of ouder? Die takken krijgen van het PHP-project geen beveiligingsupdates meer. Dan is een upgrade nodig, en die kan plugins of thema's breken. Test dat eerst op een kopie.

## Stap 4: kan ik niet direct updaten? Haal de site offline

Dit is de stap die veel ondernemers verrast. Een onderhoudspagina in WordPress of Magento beschermt u **niet**. Sansec: *"The maintenance modes in Magento and WordPress do not help, because PHP parses each request before the application check."*

Het lek zit vóór WordPress, in PHP zelf. Offline halen betekent dus: de site op serverniveau uitzetten (via uw hoster), of al het verkeer blokkeren voordat het PHP bereikt. Een beveiligingsplugin is geen alternatief.

## Stap 5: was mijn site al gehackt?

Aanvallen begonnen volgens Sansec al op 21 oktober rond 07:43 UTC, dus vóórdat de patch er was. Ook als u nu bent bijgewerkt, is het zinvol te controleren of er iemand binnen is geweest:

- **Nieuwe beheerders:** staan er gebruikers met beheerrechten die u niet kent?
- **Vreemde bestanden:** nieuwe `.php`-bestanden in de map voor uploads (bij WordPress: `wp-content/uploads`), of bestanden met rare namen in de hoofdmap.
- **Gewijzigde bestanden:** bestanden met een wijzigingsdatum van 21 oktober of later die u niet zelf heeft aangepast.
- **Onverwachte doorverwijzingen** of spam-pagina's in Google onder uw domein.
- **Webshop:** wijzigingen in de afrekenpagina of betaalinstellingen. Bij webshops worden vaak skimmers geplaatst die betaalgegevens onderscheppen.

Twijfelt u? Zet dan een back-up terug van vóór 21 oktober, update daarna PHP en wijzig alle wachtwoorden en API-sleutels (beheer, database, FTP/SFTP, betaalprovider).

## Stap 6: wie is verantwoordelijk, ik of mijn hoster?

Bij **gedeelde hosting** bepaalt de hoster welke PHP-versies beschikbaar zijn. U kiest vaak alleen uit een lijstje. Controleer of uw hoster de gepatchte versies al aanbiedt, en stel die in. Bij een **VPS of eigen server** bent u (of uw beheerder) zelf verantwoordelijk.

Volgens experts lopen juist kleine sites op gedeelde hosting het grootste risico. Niet omdat ze interessanter zijn, maar omdat niemand er actief op let.

## Stap 7: voorkom de volgende keer

Dit was niet het laatste lek. Beide lekken zijn met AI gevonden, en aanvallers gebruiken dezelfde technieken. De tijd tussen bekendmaking en misbruik wordt korter. Drie maatregelen maken het verschil:

1. **Iemand die het opvolgt.** Een beheerder die security-updates doorvoert zodra ze uitkomen, niet bij de volgende onderhoudsronde.
2. **Dagelijkse back-ups**, buiten de server zelf bewaard, zodat u kunt terugzetten.
3. **Minder aanvalsoppervlak.** Een website die geen server-side code draait (een statische site), heeft geen PHP om aan te vallen.

## Hulp nodig?

Kunt u een van deze stappen niet zelf uitvoeren, of weet u niet wie uw server beheert? Aanloop AI helpt met [website-beveiliging en onderhoud](/diensten/website-beveiliging-onderhoud/): PHP updaten, controleren op misbruik, en desgewenst overstappen naar een website zonder PHP. [Neem contact op](/contact/).

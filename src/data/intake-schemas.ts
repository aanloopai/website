// Intake schemas (V4 Sprint A). Per-product structured questionnaires that
// capture everything Aanloop needs to set up a service. The intake wizard
// (src/pages/portal/intake.astro) renders these generically; the admin panel
// reads the captured answers back. A schema key matches services.product_key.

export type IntakeFieldType =
  | 'text' | 'textarea' | 'tel' | 'email' | 'url'
  | 'select' | 'multiselect' | 'faqlist'
  // `consent`: één checkbox, waarde boolean; required → moet true zijn.
  // `info`: tekstblok zonder input — wordt niet verzameld, niet gevalideerd
  // en niet in de samenvatting getoond. (Leadpartner-intake, 2026-09-16.)
  | 'consent' | 'info';

/** Toon dit veld alleen als `field` (zelfde stap) één van `in` bevat. */
export interface IntakeShowIf {
  field: string;
  in: string[];
}

export interface IntakeField {
  name: string;
  /** Verplicht behalve voor `info` (daar is `text` de inhoud). */
  label?: string;
  type: IntakeFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  hint?: string;
  /** `info`: de tekst van het blok. */
  text?: string;
  /**
   * `consent`: label met (uitsluitend) een relatieve <a>-link, statisch uit
   * dit bestand. De renderer laat alleen `<a href="/...">` door — nooit
   * gebruikersinvoer.
   */
  labelHtml?: string;
  showIf?: IntakeShowIf;
}

export interface IntakeStep {
  key: string;
  title: string;
  intro?: string;
  fields: IntakeField[];
}

export interface IntakeSchema {
  steps: IntakeStep[];
}

const EMMA_TELEFOON: IntakeSchema = {
  steps: [
    {
      key: 'bedrijf',
      title: 'Uw bedrijf',
      intro: 'Zodat Emma zich correct voorstelt aan uw bellers.',
      fields: [
        { name: 'bedrijfsnaam', label: 'Bedrijfsnaam', type: 'text', required: true },
        { name: 'branche', label: 'Branche', type: 'text', required: true, placeholder: 'bijv. tandartspraktijk, webshop' },
        { name: 'website', label: 'Website', type: 'url', placeholder: 'https://' },
        { name: 'medewerkers', label: 'Aantal medewerkers', type: 'select', options: ['1-5', '6-20', '21-50', '50+'] },
      ],
    },
    {
      key: 'bereikbaarheid',
      title: 'Bereikbaarheid',
      fields: [
        { name: 'huidig_nummer', label: 'Huidig telefoonnummer', type: 'tel', required: true, hint: 'Het nummer waarop u nu gebeld wordt.' },
        { name: 'openingstijden', label: 'Openingstijden', type: 'textarea', required: true, placeholder: 'Ma-Vr 09:00-17:00\nZa gesloten' },
        { name: 'buiten_tijden', label: 'Buiten openingstijden', type: 'select', required: true,
          options: ['Emma neemt altijd op (24/7)', 'Alleen tijdens openingstijden', 'Voicemail buiten openingstijden'] },
      ],
    },
    {
      key: 'afhandeling',
      title: 'Gespreksafhandeling',
      intro: 'Wat moet Emma met inkomende gesprekken doen?',
      fields: [
        { name: 'taken', label: 'Emma mag', type: 'multiselect', required: true,
          options: ['Afspraken inplannen', 'Doorverbinden naar een medewerker', 'Een bericht aannemen', 'Veelgestelde vragen beantwoorden'] },
        { name: 'doorverbind_nummers', label: 'Doorverbindnummers', type: 'textarea', placeholder: 'Verkoop — 010 123 4567\nSupport — 010 123 4568' },
        { name: 'escalatie', label: 'Escalatiecontact', type: 'text', hint: 'Wie belt Emma bij een urgente situatie?' },
      ],
    },
    {
      key: 'kennis',
      title: 'Kennis & toon',
      fields: [
        { name: 'faq', label: 'Veelgestelde vragen', type: 'faqlist', hint: 'Vragen die bellers vaak stellen, met het juiste antwoord.' },
        { name: 'diensten', label: 'Uw diensten / producten', type: 'textarea', placeholder: 'Korte omschrijving van wat u aanbiedt.' },
        { name: 'toon', label: 'Gewenste toon', type: 'select', required: true, options: ['Formeel', 'Zakelijk en warm', 'Informeel'] },
      ],
    },
    {
      key: 'integraties',
      title: 'Integraties',
      fields: [
        { name: 'agenda', label: 'Agenda-koppeling', type: 'select', options: ['Google Agenda', 'Outlook / Microsoft 365', 'Geen / weet ik nog niet'] },
        { name: 'crm', label: 'CRM-systeem', type: 'text', placeholder: 'bijv. HubSpot, Pipedrive — leeg laten indien geen' },
      ],
    },
  ],
};

const EMMA: IntakeSchema = {
  steps: [
    {
      key: 'bedrijf',
      title: 'Uw bedrijf',
      fields: [
        { name: 'bedrijfsnaam', label: 'Bedrijfsnaam', type: 'text', required: true },
        { name: 'branche', label: 'Branche', type: 'text', required: true },
        { name: 'website', label: 'Website', type: 'url', placeholder: 'https://' },
      ],
    },
    {
      key: 'kanaal',
      title: 'Kanaal',
      intro: 'Emma start direct als chat op uw website; WhatsApp wordt parallel aangesloten.',
      fields: [
        { name: 'whatsapp_nummer', label: 'Gewenst WhatsApp-nummer', type: 'tel', hint: 'Mag een nieuw of bestaand zakelijk nummer zijn.' },
        { name: 'openingstijden', label: 'Openingstijden', type: 'textarea', placeholder: 'Emma antwoordt 24/7; hier geeft u aan wanneer mensen beschikbaar zijn.' },
      ],
    },
    {
      key: 'kennis',
      title: 'Kennis',
      fields: [
        { name: 'faq', label: 'Veelgestelde vragen', type: 'faqlist', required: true },
        { name: 'productcatalogus', label: 'Producten / diensten', type: 'textarea' },
        { name: 'talen', label: 'Talen', type: 'multiselect', required: true, options: ['Nederlands', 'Engels', 'Duits', 'Frans'] },
      ],
    },
    {
      key: 'afhandeling',
      title: 'Afhandeling',
      fields: [
        { name: 'handover', label: 'Overdracht naar mens', type: 'select', required: true,
          options: ['Emma handelt alles zelf af', 'Emma schakelt een mens in bij twijfel', 'Emma schakelt door op verzoek van de klant'] },
        { name: 'handover_contact', label: 'Naar wie wordt doorgeschakeld?', type: 'text' },
      ],
    },
  ],
};

const SEO: IntakeSchema = {
  steps: [
    {
      key: 'website',
      title: 'Uw website',
      fields: [
        { name: 'website_url', label: 'Website-URL', type: 'url', required: true, placeholder: 'https://' },
        { name: 'branche', label: 'Branche', type: 'text', required: true },
        { name: 'doelregio', label: 'Doelregio', type: 'text', placeholder: 'bijv. Rotterdam, heel Nederland' },
      ],
    },
    {
      key: 'doelen',
      title: 'Doelen',
      fields: [
        { name: 'doelen', label: 'Wat wilt u bereiken?', type: 'textarea', required: true },
        { name: 'zoekwoorden', label: 'Belangrijkste zoekwoorden', type: 'textarea', placeholder: 'Eén per regel' },
        { name: 'concurrenten', label: 'Concurrenten', type: 'textarea', placeholder: 'Websites van concurrenten' },
      ],
    },
    {
      key: 'toegang',
      title: 'Toegang',
      fields: [
        { name: 'gsc', label: 'Google Search Console', type: 'select', options: ['Heb ik, ik geef toegang', 'Heb ik niet', 'Weet ik niet'] },
        { name: 'analytics', label: 'Google Analytics', type: 'select', options: ['Heb ik, ik geef toegang', 'Heb ik niet', 'Weet ik niet'] },
      ],
    },
  ],
};

const GEO: IntakeSchema = {
  steps: [
    {
      key: 'website',
      title: 'Uw website',
      fields: [
        { name: 'website_url', label: 'Website-URL', type: 'url', required: true, placeholder: 'https://' },
        { name: 'branche', label: 'Branche', type: 'text', required: true },
      ],
    },
    {
      key: 'doelen',
      title: 'AI-zichtbaarheid',
      intro: 'GEO maakt u vindbaar in ChatGPT, Claude, Perplexity en Google AI.',
      fields: [
        { name: 'doelen', label: 'Wat wilt u bereiken?', type: 'textarea', required: true },
        { name: 'kernonderwerpen', label: 'Kernonderwerpen / expertise', type: 'textarea', required: true,
          hint: 'Waarop wilt u dat AI uw bedrijf noemt?' },
        { name: 'concurrenten', label: 'Concurrenten', type: 'textarea' },
      ],
    },
  ],
};

const GENERIC: IntakeSchema = {
  steps: [
    {
      key: 'project',
      title: 'Uw project',
      intro: 'Vertel ons wat u nodig heeft — dit is maatwerk, dus hoe meer detail hoe beter.',
      fields: [
        { name: 'bedrijfsnaam', label: 'Bedrijfsnaam', type: 'text', required: true },
        { name: 'beschrijving', label: 'Wat heeft u nodig?', type: 'textarea', required: true },
        { name: 'doelen', label: 'Doelen', type: 'textarea' },
        { name: 'deadline', label: 'Gewenste opleverdatum', type: 'text', placeholder: 'bijv. binnen 2 maanden' },
        { name: 'budget', label: 'Budgetindicatie', type: 'select',
          options: ['< €2.500', '€2.500 - €7.500', '€7.500 - €15.000', '> €15.000', 'Weet ik nog niet'] },
      ],
    },
  ],
};

// Leadpartner-intake (uitzendbranche, B2B-leads). Betaling: aanvraag —
// eindigt met 'Aanvraag indienen', geen checkout. Verborgen in de catalogus;
// een order ontstaat alleen via de admin-uitnodiging (/api/admin/intake-invite).
// Bron: Desktop/aanloopai-portal-leadpartner-intake.md §4 (16 sep 2026).
const LEADPARTNER: IntakeSchema = {
  steps: [
    {
      key: 'bedrijf',
      title: 'Uw bedrijf',
      intro: 'Zodat wij aanvragen kunnen selecteren die echt bij u passen.',
      fields: [
        { name: 'bedrijfsnaam', label: 'Bedrijfsnaam', type: 'text', required: true },
        { name: 'kvk', label: 'KvK-nummer', type: 'text', required: true },
        { name: 'website', label: 'Website', type: 'url', placeholder: 'https://' },
        { name: 'vestigingsadres', label: 'Vestigingsadres', type: 'text', required: true },
        { name: 'contactpersoon', label: 'Contactpersoon en functie', type: 'text', required: true, placeholder: 'bijv. Jan de Vries — eigenaar' },
        { name: 'actief_sinds', label: 'Sinds wanneer bemiddelt u personeel?', type: 'select', required: true, options: ['Minder dan 1 jaar', '1–3 jaar', '3–5 jaar', 'Meer dan 5 jaar'] },
        { name: 'team', label: 'Hoeveel mensen werken er bij u op kantoor (intercedenten, sales, planning)?', type: 'select', options: ['Alleen ikzelf', '2–5', '6–20', 'Meer dan 20'] },
        { name: 'flexkrachten', label: 'Hoeveel flexkrachten heeft u gemiddeld aan het werk?', type: 'select', options: ['0–10', '11–50', '51–200', 'Meer dan 200', 'Wij starten net'] },
      ],
    },
    {
      key: 'registratie',
      title: 'Registratie & keurmerken',
      intro: 'Opdrachtgevers vragen hier steeds vaker naar. Met deze informatie kunnen wij aanvragen beter op u afstemmen.',
      fields: [
        { name: 'info_registratie', type: 'info', text: 'Vanaf 1 januari 2027 geldt de Wet toelating terbeschikkingstelling van arbeidskrachten (Wtta). Aanmelden voor het overgangsrecht kan van 1 november tot en met 31 december 2026.' },
        { name: 'kvk_uitlenen', label: "Staat 'ter beschikking stellen van arbeidskrachten' als activiteit bij uw KvK-inschrijving?", type: 'select', required: true, options: ['Ja', 'Nee', 'Weet ik niet'] },
        { name: 'sna', label: 'SNA-keurmerk (NEN 4400-1)', type: 'select', required: true, options: ['Ja, geregistreerd', 'Aangevraagd / in behandeling', 'Nee', 'Weet ik niet'] },
        { name: 'wtta', label: 'Uw planning voor de Wtta-toelating', type: 'select', required: true, options: ['Al voorbereid / aangemeld', 'Wij melden ons aan tussen 1 nov en 31 dec 2026', 'Nog niet mee bezig', 'Niet van toepassing (wij lenen geen personeel uit)'] },
        { name: 'cao', label: 'Welke cao past u toe?', type: 'select', options: ['ABU', 'NBBU', 'Anders', 'Weet ik niet'] },
        { name: 'g_rekening', label: 'G-rekening', type: 'select', options: ['Ja', 'Aangevraagd', 'Nee'] },
        { name: 'registratie_toelichting', label: 'Toelichting (optioneel)', type: 'textarea' },
      ],
    },
    {
      key: 'dienstverlening',
      title: 'Uw dienstverlening',
      fields: [
        { name: 'vormen', label: 'Welke vormen biedt u aan?', type: 'multiselect', required: true, options: ['Uitzenden', 'Detacheren', 'Payrolling', 'Werving & selectie (vaste plaatsing)', 'Zzp-bemiddeling'] },
        { name: 'functies', label: 'Voor welke functies levert u personeel?', type: 'multiselect', required: true, options: ['Orderpicker / magazijnmedewerker', 'Heftruck- / reachtruckchauffeur', 'Productiemedewerker', 'Inpakker / lijnwerk', 'Chauffeur C/CE', 'Bestelbuschauffeur (B)', 'Schoonmaakmedewerker', 'Teamleider / voorman', 'Anders'] },
        { name: 'functies_anders', label: 'Andere functies', type: 'text', showIf: { field: 'functies', in: ['Anders'] } },
        { name: 'certificaten', label: 'Welke certificaten hebben uw kandidaten vaak?', type: 'multiselect', options: ['Heftruckcertificaat', 'Reachtruckcertificaat', 'VCA', 'Code 95', 'Digitale tachograafkaart', 'Geen specifieke certificaten'] },
        { name: 'talen', label: 'Welke talen spreken uw kandidaten?', type: 'multiselect', options: ['Nederlands', 'Engels', 'Pools', 'Roemeens', 'Bulgaars', 'Portugees', 'Spaans', 'Turks', 'Arabisch', 'Anders'] },
        { name: 'huisvesting', label: 'Regelt u huisvesting en vervoer voor (internationale) medewerkers?', type: 'select', options: ['Huisvesting en vervoer', 'Alleen vervoer', 'Nee', 'Niet van toepassing'] },
        { name: 'levertijd', label: 'Hoe snel kunt u meestal iemand laten starten?', type: 'select', required: true, options: ['Binnen 24 uur', 'Binnen 48 uur', 'Binnen een week', 'Binnen twee weken', 'Langer'] },
        { name: 'capaciteit', label: 'Hoeveel nieuwe krachten kunt u per week maximaal extra plaatsen?', type: 'select', required: true, options: ['1–2', '3–5', '6–10', 'Meer dan 10'] },
      ],
    },
    {
      key: 'opdrachtgever',
      title: 'Uw ideale opdrachtgever',
      intro: 'Welk bedrijf wilt u als lead ontvangen?',
      fields: [
        { name: 'sectoren', label: 'Sectoren van de opdrachtgever', type: 'multiselect', required: true, options: ['Logistiek / distributiecentra', 'E-commerce fulfilment', 'Productie — food', 'Productie — non-food / metaal', 'Transport & vervoer', 'Schoonmaak / facilitair', 'Bouw & infra', 'Groothandel', 'Anders'] },
        { name: 'sectoren_anders', label: 'Andere sectoren', type: 'text', showIf: { field: 'sectoren', in: ['Anders'] } },
        { name: 'bedrijfsgrootte', label: 'Grootte van de opdrachtgever (medewerkers)', type: 'multiselect', required: true, options: ['1–10', '11–50', '51–250', 'Meer dan 250'] },
        { name: 'type_inzet', label: 'Soort personeelsbehoefte', type: 'select', required: true, options: ['Tijdelijk (piek, ziekte, project)', 'Structureel', 'Beide'] },
        { name: 'min_personen', label: 'Vanaf hoeveel personen per aanvraag is het voor u interessant?', type: 'select', required: true, options: ['Vanaf 1 persoon', 'Vanaf 2 personen', 'Vanaf 5 personen', 'Vanaf 10 personen'] },
        { name: 'min_duur', label: 'Minimale duur van de inzet', type: 'select', options: ['Geen minimum', 'Minimaal 1 week', 'Minimaal 1 maand', 'Minimaal 3 maanden'] },
        { name: 'diensten_ploegen', label: 'Welke roosters kunt u invullen?', type: 'multiselect', options: ['Dagdienst', '2-ploegen', '3-ploegen', 'Nachtdienst', 'Weekend'] },
        { name: 'uitsluitingen', label: 'Bedrijven die u niet als lead wilt ontvangen', type: 'textarea', hint: 'Bijvoorbeeld bestaande klanten of bedrijven waar u niet mee wilt werken. Eén per regel.' },
        { name: 'tarief_indicatie', label: 'Indicatie van uw uurtarief voor opdrachtgevers (optioneel)', type: 'text', hint: 'Helpt ons aanvragen met een passend budget te selecteren. Wordt niet gedeeld.' },
      ],
    },
    {
      key: 'werkgebied',
      title: 'Werkgebied',
      fields: [
        { name: 'basis', label: 'Vanuit welke plaats werkt u?', type: 'text', required: true, placeholder: 'bijv. Amsterdam' },
        { name: 'straal', label: 'Maximale afstand van de opdrachtgever tot uw basis', type: 'select', required: true, options: ['Tot 25 km', 'Tot 50 km', 'Tot 75 km', 'Tot 100 km', 'Tot 150 km', 'Heel Nederland'] },
        { name: 'voorkeursgebieden', label: "Plaatsen, regio's of postcodes met voorkeur", type: 'textarea', placeholder: 'bijv. Amsterdam, Zaandam, Schiphol, Almere, 10xx–15xx' },
        { name: 'uitgesloten_gebieden', label: 'Gebieden waar u niet wilt leveren', type: 'textarea' },
        { name: 'vervoer_kandidaten', label: 'Hoe reizen uw kandidaten naar de opdrachtgever?', type: 'multiselect', options: ['Eigen vervoer', 'Openbaar vervoer', 'Wij regelen busvervoer', 'Verschilt per kandidaat'] },
      ],
    },
    {
      key: 'leadkwaliteit',
      title: 'Wat is voor u een goede lead?',
      fields: [
        { name: 'verplichte_gegevens', label: 'Welke gegevens moet een lead minimaal bevatten?', type: 'multiselect', required: true, options: ['Bedrijfsnaam', 'Naam en functie contactpersoon', 'Telefoonnummer', 'E-mailadres', 'Aantal personen', 'Functie(s)', 'Gewenste startdatum', 'Duur van de inzet', 'Werklocatie', 'Werktijden / rooster'] },
        { name: 'beslisser', label: 'Moet de contactpersoon een beslisser zijn?', type: 'select', required: true, options: ['Ja, eigenaar / directie', 'Ja, HR of operationeel manager', 'Maakt niet uit, als het bedrijf maar personeel zoekt'] },
        { name: 'startdatum', label: 'Binnen welke termijn moet de opdrachtgever willen starten?', type: 'select', required: true, options: ['Direct (binnen 1 week)', 'Binnen 1 maand', 'Binnen 3 maanden', 'Maakt niet uit'] },
        { name: 'geen_lead', label: 'Wanneer is een aanvraag voor u géén bruikbare lead?', type: 'textarea', required: true, hint: 'bijv. alleen vaste functies op hbo-niveau, particulieren, bedrijven buiten mijn regio.' },
        { name: 'info_reclamatie', type: 'info', text: 'Een lead die onbereikbaar is, foutieve gegevens bevat, buiten uw werkgebied valt of dubbel is, kunt u binnen 48 uur melden. Die lead wordt dan niet in rekening gebracht.' },
      ],
    },
    {
      key: 'levering',
      title: 'Levering & opvolging',
      fields: [
        { name: 'kanaal', label: 'Hoe wilt u leads ontvangen?', type: 'multiselect', required: true, options: ['E-mail', 'WhatsApp', 'Koppeling met ons CRM / ATS'] },
        { name: 'lead_email', label: 'E-mailadres voor leads', type: 'email', required: true },
        { name: 'lead_telefoon', label: 'WhatsApp-nummer voor leads', type: 'tel', showIf: { field: 'kanaal', in: ['WhatsApp'] } },
        { name: 'crm', label: 'Welk CRM / ATS gebruikt u?', type: 'text', placeholder: 'bijv. Carerix, Mysolution, Bullhorn, Excel', showIf: { field: 'kanaal', in: ['Koppeling met ons CRM / ATS'] } },
        { name: 'reactietijd', label: 'Hoe snel belt u een nieuwe lead?', type: 'select', required: true, options: ['Binnen 1 uur', 'Binnen 4 uur', 'Dezelfde werkdag', 'Volgende werkdag'] },
        { name: 'bereikbaar', label: 'Wanneer bent u bereikbaar voor nieuwe leads?', type: 'textarea', placeholder: 'bijv. Ma–Vr 07:00–18:00, Za 08:00–12:00' },
        { name: 'terugkoppeling', label: 'Wilt u per lead kort de uitkomst doorgeven (gesprek, offerte, gewonnen)?', type: 'select', required: true, options: ['Ja', 'Liever niet'], hint: 'Hiermee verbeteren wij de selectie van toekomstige aanvragen.' },
      ],
    },
    {
      key: 'volume',
      title: 'Volume & planning',
      fields: [
        { name: 'volume_maand', label: 'Hoeveel leads per maand wilt u maximaal ontvangen?', type: 'select', required: true, options: ['Tot 5', '5–10', '10–20', 'Meer dan 20'] },
        { name: 'volume_dag', label: 'Maximaal per dag', type: 'select', options: ['1', '2', '3', 'Geen daglimiet'] },
        { name: 'exclusief', label: 'Leadmodel', type: 'select', required: true, options: ['Exclusief (alleen voor mij)', 'Exclusief, en ik wil ook graag regio-exclusiviteit bespreken'] },
        { name: 'startmoment', label: 'Per wanneer wilt u starten?', type: 'select', required: true, options: ['Zo snel mogelijk', 'Binnen een maand', 'Later, in overleg'] },
        { name: 'budget_lead', label: 'Welke prijs per lead vindt u reëel? (optioneel)', type: 'select', options: ['Tot €25', '€25–€50', '€50–€100', 'Meer dan €100', 'Weet ik nog niet'], hint: 'De definitieve prijs spreken wij samen af.' },
      ],
    },
    {
      key: 'huidig',
      title: 'Huidige klantwerving',
      fields: [
        { name: 'kanalen_nu', label: 'Hoe vindt u nu nieuwe opdrachtgevers?', type: 'multiselect', options: ['Koude acquisitie (bellen / langsgaan)', 'LinkedIn', 'Netwerk en doorverwijzingen', 'Google / eigen website', 'Leadplatforms', 'Nog geen vaste aanpak'] },
        { name: 'platforms_ervaring', label: 'Heeft u eerder leads gekocht? Zo ja, waar en wat was uw ervaring?', type: 'textarea' },
        { name: 'conversie', label: 'Van de 10 opdrachtgevers die u spreekt, hoeveel worden klant?', type: 'select', options: ['0–1', '2–3', '4–5', 'Meer dan 5', 'Weet ik niet'] },
        { name: 'usp', label: 'Waarom kiest een opdrachtgever voor u?', type: 'textarea', required: true, hint: 'Dit gebruiken wij om de juiste aanvragen bij u te laten landen.' },
      ],
    },
    {
      key: 'afronding',
      title: 'Administratie & akkoord',
      fields: [
        { name: 'factuur_email', label: 'E-mailadres voor facturen', type: 'email', required: true },
        { name: 'btw', label: 'Btw-nummer', type: 'text', required: true },
        { name: 'factuuradres', label: 'Factuuradres (als afwijkend van vestigingsadres)', type: 'textarea' },
        { name: 'opmerkingen', label: 'Overige opmerkingen of vragen', type: 'textarea' },
        { name: 'akkoord_voorwaarden', label: 'Ik ga akkoord met de leadvoorwaarden', labelHtml: 'Ik ga akkoord met de <a href="/leads-kopen/voorwaarden/" target="_blank" rel="noopener" class="p-link">leadvoorwaarden</a>', type: 'consent', required: true },
        { name: 'akkoord_overeenkomst', label: 'Ik begrijp dat er vóór de eerste levering een overeenkomst over de verwerking van persoonsgegevens wordt getekend', type: 'consent', required: true },
      ],
    },
  ],
};

export const INTAKE_SCHEMAS: Record<string, IntakeSchema> = {
  'emma-telefoon': EMMA_TELEFOON,
  emma: EMMA,
  seo: SEO,
  geo: GEO,
  'seo-geo-bundel': SEO,
  leadpartner: LEADPARTNER,
};

export function getIntakeSchema(productKey: string): IntakeSchema {
  return INTAKE_SCHEMAS[productKey] || GENERIC;
}

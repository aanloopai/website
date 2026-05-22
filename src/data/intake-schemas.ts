// Intake schemas (V4 Sprint A). Per-product structured questionnaires that
// capture everything Aanloop needs to set up a service. The intake wizard
// (src/pages/portal/intake.astro) renders these generically; the admin panel
// reads the captured answers back. A schema key matches services.product_key.

export type IntakeFieldType =
  | 'text' | 'textarea' | 'tel' | 'email' | 'url'
  | 'select' | 'multiselect' | 'faqlist';

export interface IntakeField {
  name: string;
  label: string;
  type: IntakeFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  hint?: string;
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

const MARCO: IntakeSchema = {
  steps: [
    {
      key: 'bedrijf',
      title: 'Uw bedrijf',
      intro: 'Zodat Marco zich correct voorstelt aan uw bellers.',
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
          options: ['Marco neemt altijd op (24/7)', 'Alleen tijdens openingstijden', 'Voicemail buiten openingstijden'] },
      ],
    },
    {
      key: 'afhandeling',
      title: 'Gespreksafhandeling',
      intro: 'Wat moet Marco met inkomende gesprekken doen?',
      fields: [
        { name: 'taken', label: 'Marco mag', type: 'multiselect', required: true,
          options: ['Afspraken inplannen', 'Doorverbinden naar een medewerker', 'Een bericht aannemen', 'Veelgestelde vragen beantwoorden'] },
        { name: 'doorverbind_nummers', label: 'Doorverbindnummers', type: 'textarea', placeholder: 'Verkoop — 010 123 4567\nSupport — 010 123 4568' },
        { name: 'escalatie', label: 'Escalatiecontact', type: 'text', hint: 'Wie belt Marco bij een urgente situatie?' },
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

export const INTAKE_SCHEMAS: Record<string, IntakeSchema> = {
  marco: MARCO,
  emma: EMMA,
  seo: SEO,
  geo: GEO,
  'seo-geo-bundel': SEO,
};

export function getIntakeSchema(productKey: string): IntakeSchema {
  return INTAKE_SCHEMAS[productKey] || GENERIC;
}

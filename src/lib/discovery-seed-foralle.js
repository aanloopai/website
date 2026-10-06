// Discovery Hub — "Keukenzaak - Foralle": Ron'un KENDİSİNİN doldurduğu bölüm.
// Görüşme dokümanından (discovery-seed-keuken.js) AYRI bir doküman: Ron kendi
// girişiyle (discovery-klant.js, /portal/vragenlijst/) yalnız bunu görür.
// Kural: YALNIZ Hollandaca — etiket, açıklama, seçenek; TR/intern metin yok.
// Şifre ASLA sorulmaz (domein/hosting soruları "wie beheert", login değil).
//
// Sürüm: içerik değişince `version` artır. Cevap girilmiş doküman snapshot
// olarak KALIR; boş doküman yeni içerikle yeniden kurulur (ensureExtraSeed).

const t = (label, guidance = '') => ({ type: 'text', label, sub_items: [], guidance });
const ta = (label, guidance = '') => ({ type: 'textarea', label, sub_items: [], guidance });
const cl = (label, items, guidance = '') => ({ type: 'checklist', label, sub_items: items, guidance });

const UPLOAD_HINT = 'Bestanden kunt u hier niet uploaden. Zet een link neer (WeTransfer, Google Drive, Dropbox) of mail ze naar hello@aanloopai.nl.';

const SECTIONS = [
  {
    title: '1. Bedrijfsgegevens',
    guidance: 'Voor de website (contactpagina, colofon) en de overeenkomst.',
    questions: [
      t('Officiële bedrijfsnaam en handelsnaam'),
      t('KvK-nummer en btw-nummer'),
      t('Adres van de showroom'),
      ta('Openingstijden van de showroom', 'Ook: alleen op afspraak, avond of zaterdag?'),
      ta('Telefoonnummer, e-mailadres en WhatsApp-nummer die op de website mogen'),
      t('Contactpersoon voor dagelijks contact (naam + telefoon)'),
      ta('Factuurgegevens: factuuradres en e-mailadres voor facturen'),
    ],
  },
  {
    title: '2. Over Foralle',
    guidance: 'Deze antwoorden worden de basis voor de teksten op de website.',
    questions: [
      ta('Sinds wanneer bestaat Foralle en hoe groot is het team?', 'Bijvoorbeeld verkoop, tekenaar, montage.'),
      ta('Uw verhaal in een paar zinnen: waarom bent u begonnen en wat maakt Foralle anders?'),
      ta('Welke merken keukens, apparatuur en werkbladen verkoopt u?'),
      t('Gemiddelde levertijd van bestelling tot montage'),
      t('Garantie: hoeveel jaar en waarop?'),
      cl('Wat biedt u nog meer aan?', ['Inmeten aan huis', 'Eigen montage', 'Badkamers', 'Inbouwkasten', 'Complete renovatie (sloop, leidingen, tegels)', 'Betalen in termijnen / financiering']),
      ta("In welke plaatsen of regio's werkt u — en waar juist niet?"),
    ],
  },
  {
    title: '3. Website & online',
    guidance: 'Vul hier nooit wachtwoorden in. Wij vragen toegang later veilig aan via een uitnodiging.',
    questions: [
      t('Huidige domeinnaam (bijv. foralle.nl) en bij welke partij die geregistreerd is'),
      ta('Is er nu een website? Wie beheert die en mag die offline als de nieuwe live gaat?'),
      t('Zakelijke e-mail: bij welke partij loopt die?'),
      t('Google Bedrijfsprofiel: bestaat het en wie is eigenaar?'),
      ta('Social media: links naar uw accounts (Instagram, Facebook, TikTok, …)'),
      t('Reviews: waar staan ze en hoeveel ongeveer? (Google, Trustpilot, Klantenvertellen)'),
      ta('Twee of drie websites die u mooi vindt — en waarom'),
      ta('Drie concurrenten in uw regio (naam + website)'),
      cl('In welke talen moet de website zijn?', ['Nederlands', 'Engels', 'Turks']),
      t('Mogen er vanaf-prijzen op de website staan?'),
    ],
  },
  {
    title: '4. Materiaal aanleveren',
    guidance: UPLOAD_HINT,
    questions: [
      ta('Logo en huisstijl (kleuren, lettertype)', 'Het liefst het logo als vectorbestand (.svg, .ai, .eps of .pdf).'),
      ta("Foto's van de showroom, geplaatste keukens en het team", "Hebben klanten toestemming gegeven om foto's van hun keuken te tonen?"),
      t('Prijslijst of vanaf-prijzen (bijv. Excel), als die er is'),
    ],
  },
  {
    title: '5. Aanvragen (leads)',
    guidance: 'Zo sturen we alleen aanvragen door die bij u passen.',
    questions: [
      ta('Wat is voor u een goede aanvraag?', 'Bijvoorbeeld minimaal budget, maximale afstand, binnen hoeveel maanden verbouwen, koop of huur.'),
      t('Hoeveel aanvragen kunt u per week of per maand aan?'),
      cl('Hoe wilt u aanvragen ontvangen?', ['E-mail', 'WhatsApp', 'Telefoon', 'Eigen systeem / CRM']),
      t('Wie belt aanvragen terug, en hoe snel?'),
    ],
  },
  {
    title: '6. Tot slot',
    guidance: '',
    questions: [
      ta('Is er nog iets dat wij moeten weten?', 'Bijvoorbeeld een tweede vestiging, een webshop, of afspraken met een vorige partij.'),
    ],
  },
];

export const FORALLE_TEMPLATE = {
  name: 'Keukenzaak - Foralle',
  description: 'Door de klant zelf in te vullen (alleen Nederlands). Ron opent dit via zijn persoonlijke inloglink op /portal/vragenlijst/ en ziet alleen dit document.',
  sections: SECTIONS,
};

// Şablon adları: bu şablonlardan açılan dokümanlara TR "Bölüm notları" eklenmez.
export const CLIENT_TEMPLATE_NAMES = [FORALLE_TEMPLATE.name];

export const FORALLE_SEED = {
  key: 'seed_foralle_ron',
  version: 1,
  template: FORALLE_TEMPLATE,
  // KEUKEN_SEED ile aynı müşteri (isimle bulunur) — Ron'un kartında ikinci doküman.
  client: {
    name: 'Ron (keukenzaak)',
    contact: 'via Ömer / Kitchen To You',
    notes: 'Eerste gesprek 6 okt 2026 in de showroom. Doel: één gesprek + één opvolgmail, daarna direct starten.',
  },
};

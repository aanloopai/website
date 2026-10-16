// Discovery Hub — leadpartner-şablonu (ilk partner: Erik, Keukenstunter Amsterdam
// Westpoort; aanmelding via keukeninbeeld.nl, mailwisseling 5–6 okt 2026, daarna
// telefonisch). Ron-şablonundan farkı: partner SİTE istemiyor, LEAD alıyor —
// form = partner-intake (werkgebied, leadcriteria, capaciteit, opvolging,
// AVG, facturatie). Partner doldurur (/portal/vragenlijst/), M doğrular.
//
// Soru kimlikleri (P01…P40) KALICI — asla yeniden numaralama; yeni soru = P41+.
// Satır biçimi: [qid, prio, vraag_nl, vraag_tr, antwoord_type, keuzes?]
//   prio: 'star' (★ zorunlu) · 'normaal' · 'later'
//
// GİZLİLİK: repo PUBLIC. Telefon, e-posta, adres, KvK, şifre bu dosyaya ASLA
// girmez (guard: test/discovery-leadpartner.test.js). Partner kendisi yazar.
// keukeninbeeld.nl'de firma ismi gösterilmez — form bunu vaat etmez.
//
// Sürüm: içerik değişince `version` artır (ensureExtraSeed yeniden kurar;
// cevaplı doküman snapshot olarak KALIR).

const S = 'star';
const N = 'normaal';

const SECTIONS = [
  {
    title: '1. Bedrijf & contact',
    guidance: 'Künye — verwerkersovereenkomst ve fatura için. Partner kendi doldurur.',
    rows: [
      ['P01', S, 'Officiële bedrijfsnaam, handelsnaam, KvK-nummer, btw-nummer?', 'Resmi şirket adı, ticari ad, KvK, btw?', 'tekst'],
      ['P02', S, 'Rechtsvorm (eenmanszaak / VOF / BV) — wie is tekenbevoegd?', 'Şirket türü — imza yetkilisi kim?', 'keuze', ['eenmanszaak', 'VOF', 'BV', 'anders']],
      ['P03', S, 'Adres(sen) van de winkel(s) waar leads naartoe mogen komen (beide vestigingen)?', 'Lead yönlendirilecek mağaza adres(ler)i (iki şube)?', 'tekst'],
      ['P04', S, 'Contactpersoon voor leads: naam, functie, mobiel nummer?', 'Lead muhatabı: isim, görev, cep?', 'tekst'],
      ['P05', S, 'E-mailadres waarop de leads binnenkomen (eventueel apart leads-adres)?', "Lead'lerin geleceği e-posta (ayrı adres olabilir)?", 'tekst'],
      ['P06', N, 'Website en Google Business Profile (link) van de winkel?', 'Mağaza web sitesi ve Google Business Profile linki?', 'url'],
      ['P07', N, 'Openingstijden showroom; ook avond/weekend of op afspraak?', 'Showroom saatleri; akşam/hafta sonu/randevu?', 'tekst'],
      ['P08', N, 'Hoeveel verkopers per winkel, en wie plant afspraken in?', 'Mağaza başına kaç satıcı, randevuyu kim planlar?', 'tekst'],
    ],
  },
  {
    title: '2. Werkgebied',
    guidance: 'Lead filtresi bu cevapla kurulur. Posta kodu listesi CONCEPT — partner onaylar/düzeltir.',
    rows: [
      ['P09', S, 'Plaatsen waar u leads wilt ontvangen?', 'Lead istediği şehirler?', 'tekst'],
      ['P10', S, 'Postcodegebieden (4 cijfers) — klopt onderstaande conceptlijst? Vul aan of streep door.', 'Posta kodu alanları — concept liste doğru mu? Ekle/çıkar.', 'tekst'],
      ['P11', N, 'Plaatsen of gebieden waar u juist géén leads wilt?', 'Özellikle istemediği bölgeler?', 'tekst'],
      ['P12', N, 'Maximale reisafstand vanaf de winkel voor inmeten/montage (km)?', 'Ölçü/montaj için mağazadan max mesafe (km)?', 'getal'],
      ['P13', N, 'Montage buiten het werkgebied mogelijk tegen meerprijs?', 'Bölge dışı montaj ek ücretle olur mu?', 'ja_nee'],
    ],
  },
  {
    title: '3. Type aanvragen',
    guidance: 'Hangi aanvraag doğru lead — hangisi hiç gönderilmez.',
    rows: [
      ['P14', S, 'Welke aanvragen wilt u ontvangen?', 'Hangi talepleri ister?', 'multi', ['complete keuken', 'aanrechtblad vervangen', 'renovatie bestaande keuken', 'losse apparatuur', 'alleen montage']],
      ['P15', S, 'Welke aanvragen beslist niet?', 'Kesinlikle istemediği talepler?', 'tekst'],
      ['P16', S, 'Budget van de consument: minimum en maximum waarbij u de aanvraag wilt?', 'Tüketici bütçesi: min/max?', 'tekst'],
      ['P17', N, 'Alleen eigenaren, of ook huurders? Nieuwbouw én bestaande bouw?', 'Sadece ev sahibi mi, kiracı da mı? Yeni/mevcut yapı?', 'tekst'],
      ['P18', N, 'Aanvragen die pas over 6+ maanden willen plaatsen — ook ontvangen?', '6+ ay sonrası talepler de gelsin mi?', 'ja_nee'],
      ['P19', N, 'Welke merken/stijlen/prijssegment voert u — zodat we aanvragen passend houden?', 'Hangi marka/stil/segment — eşleştirme için?', 'tekst'],
      ['P20', N, 'Thuisbezoek voor inmeten: gratis? Binnen welke straal?', 'Evde ölçü: ücretsiz mi? Yarıçap?', 'tekst'],
    ],
  },
  {
    title: '4. Capaciteit & opvolging',
    guidance: 'Hız = dönüşüm. Hedef: elke lead binnen 1 werkdag contact.',
    rows: [
      ['P21', S, 'Hoeveel leads per week of per maand kunt u goed opvolgen (maximum)?', 'Haftada/ayda max kaç lead?', 'tekst'],
      ['P22', S, 'Wie belt/mailt de consument, en binnen hoeveel uur na ontvangst?', 'Tüketiciyi kim arar, kaç saat içinde?', 'tekst'],
      ['P23', S, 'Via welk kanaal wilt u leads ontvangen?', "Lead'leri hangi kanaldan?", 'multi', ['e-mail', 'WhatsApp', 'telefoon', 'CRM / koppeling']],
      ['P24', N, 'Gebruikt u een CRM of planningssysteem? Welk?', 'CRM/planlama sistemi var mı? Hangisi?', 'tekst'],
      ['P25', S, 'Terugkoppeling per lead (afspraak / offerte / verkocht / geen contact) zodat we de kwaliteit kunnen bijsturen — akkoord?', 'Lead başına geri bildirim (randevu/teklif/satış/ulaşılamadı) — kabul mü?', 'ja_nee'],
      ['P26', N, 'Vakantie of sluiting: hoe wilt u leads tijdelijk pauzeren (mail/WhatsApp naar ons)?', "Tatil/kapanışta lead'i nasıl duraklatır?", 'tekst'],
    ],
  },
  {
    title: '5. Samenwerking & tarieven',
    guidance: "Tarifeler görüşmede netleşir (Nalan). Burada yalnız tercih ve akkoord. Firma ismi KIB'de gösterilmez — vaat etme.",
    rows: [
      ['P27', S, 'Exclusieve leads (aanvraag gaat alleen naar u) — gewenst?', 'Exclusive lead ister mi?', 'ja_nee'],
      ['P28', S, 'Voorkeur afrekenmodel?', 'Ödeme modeli tercihi?', 'keuze', ['per lead', 'vast maandbedrag', 'combinatie', 'bespreken in gesprek']],
      ['P29', N, 'Proefperiode gewenst? Hoeveel leads of weken?', 'Deneme süresi? Kaç lead/hafta?', 'tekst'],
      ['P30', S, 'Ongeldige lead (onbereikbaar, buiten gebied, geen keukenplan) binnen 48 uur melden met reden — dan niet gefactureerd. Akkoord?', 'Geçersiz lead 48 saatte gerekçeyle bildirilir, faturalanmaz — kabul mü?', 'ja_nee'],
      ['P31', N, 'Mogen wij uw vanaf-prijzen (zonder bedrijfsnaam) gebruiken in de keukenprijs-indicatie?', 'Vanaf-fiyatlar (isimsiz) fiyat indeksinde kullanılabilir mi?', 'ja_nee'],
    ],
  },
  {
    title: '6. AVG & facturatie',
    guidance: 'Verwerkersovereenkomst art. 28 AVG — ilk lead öncesi imza. Fatura künyesi.',
    rows: [
      ['P32', S, 'Verwerkersovereenkomst (art. 28 AVG) tekenen vóór de eerste lead — akkoord?', 'Verwerkersovereenkomst imzalar mı?', 'ja_nee'],
      ['P33', S, 'Wie tekent de overeenkomst: naam, functie, e-mailadres voor ondertekening?', 'Sözleşmeyi kim imzalar: isim, görev, e-posta?', 'tekst'],
      ['P34', S, 'Factuurgegevens: factuuradres, e-mail voor facturen, betaaltermijn?', 'Fatura bilgileri?', 'tekst'],
      ['P35', N, 'Wie binnen uw bedrijf krijgt de consumentgegevens te zien, en hoe lang bewaart u ze?', 'Tüketici verisini kim görür, ne kadar saklanır?', 'tekst'],
      ['P36', N, 'Heeft uw eigen website een privacyverklaring?', 'Kendi sitenizde privacy metni var mı?', 'ja_nee'],
    ],
  },
  {
    title: '7. Start & overig',
    guidance: 'Başlangıç tarihi + açık kalanlar.',
    rows: [
      ['P37', S, 'Gewenste startdatum voor de eerste leads?', 'İlk lead için istenen başlangıç tarihi?', 'tekst'],
      ['P38', N, 'Sanistunter (badkamers): interesse in badkamer-leads in de toekomst? (Nu geen aanbod — alleen peilen.)', 'Sanistunter: ileride banyo-lead ilgisi? (Şimdi teklif yok.)', 'ja_nee'],
      ['P39', N, 'Zijn er nog andere vestigingen of merken die mee moeten?', 'Başka şube/marka dahil mi?', 'tekst'],
      ['P40', N, 'Vragen of wensen die u nog kwijt wilt?', 'Eklemek istediği soru/istek?', 'tekst'],
    ],
  },
];

function fieldQuestion(row) {
  const [qid, prio, nl, tr, answerType, choices] = row;
  return {
    type: 'field',
    label: nl,
    sub_items: [],
    guidance: '',
    config: { qid, prio, answer_type: answerType, choices: choices || [], label_tr: tr, observable: false },
  };
}

// Sabit intern bloklar — field değil, partner sayfasında GÖRÜNMEZ.
const FIXED_SECTIONS = [
  {
    title: '8. Gemaakte afspraken (intern)',
    guidance: 'Nalan-görüşmesi sonrası birlikte tikle — verwerkersovereenkomst ve routing-config temeli.',
    questions: [
      {
        type: 'checklist', label: 'Afspraken',
        sub_items: [
          'Model: exclusief ja/nee',
          'Tarief per lead / maandbedrag afgesproken',
          'Cap per week/maand afgesproken',
          'Afkeurtermijn 48 u akkoord',
          'Verwerkersovereenkomst verstuurd',
          'Verwerkersovereenkomst getekend',
          'Werkgebied + filters in systeem gezet (owner-besluit)',
        ],
        guidance: '', config: { export: true },
      },
      { type: 'textarea', label: 'Afspraken — details', sub_items: [], guidance: 'Model, cap, bedragen, wie doet wat.', config: { export: true } },
    ],
  },
  {
    title: '9. Tarieven afgesproken (intern)',
    guidance: 'Yalnız görüşmede SÖYLENENİ yaz — tahmin değil.',
    questions: [
      {
        type: 'table', label: 'Tarieven', sub_items: [], guidance: '',
        config: {
          export: true,
          columns: [
            { key: 'part', label: 'Onderdeel', type: 'text' },
            { key: 'amount', label: 'Bedrag excl. btw', type: 'text' },
            { key: 'remark', label: 'Opmerking', type: 'text' },
          ],
          initial_rows: [
            ['Prijs per exclusieve lead', '', ''],
            ['Vast maandbedrag (indien van toepassing)', '', ''],
            ['Proefperiode', '', 'aantal leads / weken'],
            ['Cap', '', 'per week / maand'],
          ],
        },
      },
    ],
  },
  {
    title: '10. Volgende stap',
    guidance: 'Standaard: partner vult formulier → Nalan-gesprek → verwerkersovereenkomst → eerste lead.',
    questions: [
      { type: 'text', label: 'Wat stuurt M, uiterlijk wanneer (datum/tijd)', sub_items: [], guidance: '', config: { export: true } },
      { type: 'text', label: 'Deadline partner voor formulier', sub_items: [], guidance: 'Wordt automatisch in de aanleverlijst-mail gezet.', config: { export: true, role: 'deadline' } },
      { type: 'text', label: 'Geplande startdatum eerste lead', sub_items: [], guidance: '', config: { export: true } },
    ],
  },
  {
    title: "11. Risico's / aandachtspunten (intern)",
    guidance: 'TR, intern — ör. cap belirsiz, opvolging yavaş, VO imzasız lead gönderme YASAK.',
    questions: [
      { type: 'textarea', label: "Risico's (TR, intern)", sub_items: [], guidance: '' },
    ],
  },
];

export const LEADPARTNER_TEMPLATE = {
  name: 'Leadpartner — keukeninbeeld.nl intake',
  description: 'Keukenzaak die exclusieve leads afneemt via keukeninbeeld.nl. Partner vult zelf in (/portal/vragenlijst/): werkgebied, type aanvragen, capaciteit & opvolging, model, AVG, facturatie. 40 vragen (P01–P40, ★ = verplicht), interne afsprakenblokken, Markdown-export.',
  sections: [
    ...SECTIONS.map((sec) => ({
      title: sec.title,
      guidance: sec.guidance,
      questions: sec.rows.map(fieldQuestion),
    })),
    ...FIXED_SECTIONS,
  ],
};

// Mailwisseling 5–6 okt 2026'dan bilinen İŞ-cevapları (kişisel veri YOK):
// partner formda görür, onaylar ya da düzeltir. bron 'mail' → admin'de kaynak
// görünür (mergeKlantValue mevcut bron'u korur).
const MAIL_NOTE = 'Uit mail Erik 5 okt 2026 — partner bevestigt/corrigeert in formulier.';
const POSTCODE_CONCEPT = [
  'Amsterdam 1011–1109',
  'Badhoevedorp 1171',
  'Zaandam 1500–1509',
  'Haarlem 2011–2037',
  'Hoofddorp 2130–2135',
  'Almere 1311–1363',
].join(' · ') + ' (concept — graag controleren en aanvullen)';

export const LEADPARTNER_PREFILL = {
  P08: { v: '5 medewerkers in 2 winkels', t: '', bron: 'mail', note: MAIL_NOTE },
  P09: { v: 'Amsterdam, Haarlem, Zaandam, Hoofddorp, Badhoevedorp, Almere', t: '', bron: 'mail', note: MAIL_NOTE },
  P10: { v: POSTCODE_CONCEPT, t: '', bron: 'mail', note: 'Bereiken deels uit het hoofd (Zaandam/Hoofddorp/Badhoevedorp) — partner controleert; M checkt vóór routing-config.' },
  P14: { v: ['complete keuken', 'aanrechtblad vervangen'], t: 'meeste aanvragen: complete keukens en aanrechtbladen vervangen', bron: 'mail', note: MAIL_NOTE },
  P15: { v: 'Losse keukenmontage (echte winkel, geen montagebedrijf)', t: '', bron: 'mail', note: MAIL_NOTE },
  P16: { v: 'ca. € 2.000 tot € 40.000', t: '', bron: 'mail', note: MAIL_NOTE },
  P27: { v: 'ja', t: 'aanmelding was voor exclusieve leads Amsterdam e.o.', bron: 'mail', note: MAIL_NOTE },
};

export const LEADPARTNER_SEED = {
  key: 'seed_leadpartner_keukenstunter',
  version: 1,
  template: LEADPARTNER_TEMPLATE,
  doc_title: 'Leadpartner - Keukenstunter Amsterdam Westpoort',
  prefill: LEADPARTNER_PREFILL,
  client: {
    name: 'Erik (Keukenstunter Amsterdam Westpoort)',
    contact: 'aanmelding via keukeninbeeld.nl, 5 okt 2026 — eigenaar Keukenstunter + Sanistunter Westpoort',
    notes: 'Mail 5–6 okt 2026 + telefonisch. Wacht op ons formulier. Nalan plant kennismaking (model + tarieven). Verwerkersovereenkomst vóór eerste lead.',
  },
};

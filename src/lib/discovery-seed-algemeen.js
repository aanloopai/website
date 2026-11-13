// Discovery Hub — algemeen şablon (website & leads), sektörden bağımsız.
// Keuken-şablonunun (R01…R91) yapısını izler ama showroom/montage/keuken/
// ontwerptool maddeleri YOK — ihtiyacı henüz bilinmeyen "snel contactverzoek"
// başvuruları için (ilk: Franko 500 AB, 10 nov 2026). Klant doldurur
// (/portal/vragenlijst/), M doğrular.
//
// Soru kimlikleri (G01…G48) KALICI — asla yeniden numaralama; yeni soru = G49+.
// Satır biçimi: [qid, prio, vraag_nl, vraag_tr, antwoord_type, keuzes?]
//   prio: 'star' (★ zorunlu) · 'normaal' · 'later'
//
// GİZLİLİK: repo PUBLIC. Telefon, e-posta, adres, KvK, şifre bu dosyaya ASLA
// girmez (guard: test/discovery-algemeen.test.js). Klant kendisi yazar.
//
// Sürüm: içerik değişince `version` artır (ensureExtraSeed yeniden kurar;
// cevaplı doküman snapshot olarak KALIR).

const S = 'star';
const N = 'normaal';
const L = 'later';

const SECTIONS = [
  {
    title: '1. Bedrijf & contact',
    guidance: 'Künye. Klant kendi doldurur; ülke/dil önemli (yurtdışı olabilir).',
    rows: [
      ['G01', S, 'Officiële bedrijfsnaam, handelsnaam en registratienummer (KvK of buitenlands equivalent)?', 'Resmi şirket adı, ticari ad, sicil no (KvK veya yabancı karşılığı)?', 'tekst'],
      ['G02', S, 'In welk land/welke landen is het bedrijf gevestigd en actief?', 'Şirket hangi ülke(ler)de kayıtlı ve aktif?', 'tekst'],
      ['G03', S, 'Contactpersoon voor dit project: naam en functie?', 'Bu proje muhatabı: isim ve görev?', 'tekst'],
      ['G04', S, 'In welke taal/talen wilt u communiceren, en in welke taal moet de website?', 'Hangi dilde iletişim; site hangi dil(ler)de olmalı?', 'multi', ['Nederlands', 'Engels', 'Zweeds', 'Duits', 'Turks', 'anders']],
      ['G05', N, 'Sinds wanneer bestaat het bedrijf en hoeveel mensen werken er?', 'Şirket ne zamandan beri var, kaç kişi çalışıyor?', 'tekst'],
    ],
  },
  {
    title: '2. Aanbod & positionering',
    guidance: 'Ne satıyor, kime, neden onu seçiyorlar — site metninin temeli.',
    rows: [
      ['G06', S, 'Wat doet uw bedrijf precies — welke producten of diensten verkoopt u?', 'Şirket tam olarak ne yapıyor — hangi ürün/hizmet?', 'tekst'],
      ['G07', S, 'Wie is uw ideale klant (particulier / zakelijk, type, regio)?', 'İdeal müşteri kim (bireysel/kurumsal, tip, bölge)?', 'tekst'],
      ['G08', S, 'Waarom kiezen klanten voor u en niet voor een concurrent?', 'Müşteri neden sizi seçiyor, rakibi değil?', 'tekst'],
      ['G09', N, 'Wat is een gemiddelde orderwaarde of projectwaarde?', 'Ortalama sipariş/proje değeri?', 'tekst'],
      ['G10', N, 'Welke 2–3 concurrenten ziet u als belangrijkste (namen of websites)?', 'En önemli 2-3 rakip (isim/site)?', 'tekst'],
      ['G11', N, 'Welke producten/diensten wilt u het meest verkopen (hoogste marge of groei)?', 'En çok satmak istediği ürün/hizmet (marj/büyüme)?', 'tekst'],
    ],
  },
  {
    title: '3. Werkgebied & markt',
    guidance: 'Yerel SEO mu, ulusal/uluslararası mı — mimariyi belirler.',
    rows: [
      ['G12', S, 'In welke steden, regio’s of landen wilt u klanten?', 'Hangi şehir/bölge/ülkelerde müşteri istiyor?', 'tekst'],
      ['G13', S, 'Lokaal, landelijk of internationaal — wat is de focus?', 'Odak yerel mi, ulusal mı, uluslararası mı?', 'keuze', ['lokaal', 'landelijk', 'internationaal', 'combinatie']],
      ['G14', N, 'Heeft u een fysieke locatie waar klanten langskomen?', 'Müşterinin geldiği fiziksel mekân var mı?', 'ja_nee'],
    ],
  },
  {
    title: '4. Huidige klantstroom & cijfers',
    guidance: 'Baseline — ölçmeden vaat yok. Bilmiyorsa "weet ik niet" yazabilir.',
    rows: [
      ['G15', S, 'Hoe komen nieuwe klanten nu bij u binnen?', 'Yeni müşteri şu an nereden geliyor?', 'multi', ['mond-tot-mond', 'Google', 'social media', 'marktplaats/platform', 'netwerk/partners', 'advertenties', 'anders']],
      ['G16', S, 'Hoeveel aanvragen of nieuwe klanten krijgt u ongeveer per maand?', 'Ayda yaklaşık kaç talep/yeni müşteri?', 'getal'],
      ['G17', N, 'Hoeveel nieuwe klanten per maand wilt u erbij hebben over 12 maanden?', '12 ayda ayda kaç yeni müşteri hedefi?', 'getal'],
      ['G18', N, 'Hoeveel van de aanvragen worden een klant (schatting)?', 'Taleplerin kaçı müşteriye dönüşüyor (tahmin)?', 'tekst'],
    ],
  },
  {
    title: '5. Eerdere partijen & ervaringen',
    guidance: 'Kötü deneyim = itiraz noktası; ne denendiyse tekrarlama.',
    rows: [
      ['G19', N, 'Heeft u eerder met een webbouwer, marketing- of SEO-bureau gewerkt? Wat ging goed/fout?', 'Daha önce ajansla çalıştı mı? Ne iyi/kötü gitti?', 'tekst'],
      ['G20', N, 'Heeft u eerder betaald voor leads of advertenties? Met welk resultaat?', 'Daha önce lead/reklam için ödedi mi? Sonuç?', 'tekst'],
    ],
  },
  {
    title: '6. Domein, hosting & toegang',
    guidance: 'Teknik başlangıç — erişimler yoksa iş başlamaz.',
    rows: [
      ['G21', S, 'Heeft u al een website? Zo ja: adres (URL)?', 'Mevcut site var mı? Varsa adresi?', 'tekst'],
      ['G22', S, 'Heeft u al een domeinnaam, en bij wie is die geregistreerd?', 'Alan adı var mı, nerede kayıtlı?', 'tekst'],
      ['G23', N, 'Wie heeft nu toegang tot domein, hosting en e-mail (u zelf of een ander bedrijf)?', 'Alan adı/hosting/e-posta erişimi kimde?', 'tekst'],
      ['G24', N, 'Heeft u een Google Business Profile en/of Google Analytics / Search Console?', 'Google Business Profile / Analytics / Search Console var mı?', 'multi', ['Google Business Profile', 'Google Analytics', 'Search Console', 'geen', 'weet ik niet']],
      ['G25', L, 'Welke andere systemen gebruikt u (CRM, boekhouding, webshop, agenda)?', 'Başka hangi sistemler (CRM, muhasebe, webshop, ajanda)?', 'tekst'],
    ],
  },
  {
    title: '7. Website — doel & inhoud',
    guidance: 'Ne istiyor: yeni site, yenileme, webshop, yalnız lead? Kapsam buradan çıkar.',
    rows: [
      ['G26', S, 'Wat is het belangrijkste doel van de (nieuwe) website?', 'Yeni sitenin ana hedefi?', 'multi', ['meer aanvragen/leads', 'online verkopen (webshop)', 'vertrouwen/uitstraling', 'beter gevonden worden in Google en AI', 'informatie geven', 'anders']],
      ['G27', S, 'Wat zoekt u van ons: nieuwe website, vernieuwing, alleen meer leads, of advies?', 'Bizden ne istiyor: yeni site, yenileme, sadece lead, danışmanlık?', 'keuze', ['nieuwe website', 'bestaande website vernieuwen', 'alleen meer leads/vindbaarheid', 'eerst advies', 'weet ik nog niet']],
      ['G28', S, 'Welke actie moet een bezoeker op de website doen?', 'Ziyaretçi sitede ne yapmalı?', 'multi', ['formulier/offerte aanvragen', 'bellen', 'WhatsApp', 'online kopen', 'afspraak plannen', 'anders']],
      ['G29', N, 'Welke pagina’s of onderdelen moeten er zeker in?', 'Mutlaka olması gereken sayfa/bölümler?', 'tekst'],
      ['G30', N, 'Websites die u mooi of goed vindt (links) — en waarom?', 'Beğendiği siteler (link) ve neden?', 'tekst'],
      ['G31', N, 'Heeft u logo, huisstijl, foto’s en teksten — of moeten wij die maken?', 'Logo, kurumsal kimlik, foto, metin var mı yoksa biz mi yapalım?', 'multi', ['logo', 'huisstijl/kleuren', 'eigen foto’s', 'teksten', 'niets — graag maken']],
      ['G32', L, 'Upload logo, huisstijl of voorbeeldmateriaal (optioneel).', 'Logo/kimlik/örnek materyal yükle (opsiyonel).', 'bestand'],
    ],
  },
  {
    title: '8. Aanvragen & opvolging',
    guidance: 'Lead gelince ne oluyor — hız = dönüşüm.',
    rows: [
      ['G33', S, 'Wie beantwoordt nieuwe aanvragen, en hoe snel (binnen uur / dag)?', 'Yeni talebe kim, ne kadar hızlı dönüyor?', 'tekst'],
      ['G34', N, 'Welke informatie wilt u minimaal van een aanvrager weten?', 'Talep edenden minimum hangi bilgi?', 'tekst'],
      ['G35', N, 'Welke aanvragen wilt u NIET (te klein, verkeerde regio, verkeerd type)?', 'İstemediği talepler (küçük, yanlış bölge/tip)?', 'tekst'],
      ['G36', N, 'Hoeveel extra aanvragen per week kunt u aan?', 'Haftada kaç ek talebi kaldırabilir?', 'getal'],
    ],
  },
  {
    title: '9. Marketing & maandelijks',
    guidance: 'Site sonrası büyüme: içerik, SEO/GEO, sosyal. Ücretli reklam bizim önerimiz değil.',
    rows: [
      ['G37', N, 'Op welke sociale kanalen bent u actief (links)?', 'Hangi sosyal kanallarda aktif (linkler)?', 'tekst'],
      ['G38', N, 'Heeft u reviews (Google, Trustpilot, anders)? Hoeveel ongeveer?', 'Yorumları var mı (Google, Trustpilot…)? Yaklaşık kaç?', 'tekst'],
      ['G39', N, 'Wilt u na de livegang maandelijkse ondersteuning (vindbaarheid, content, onderhoud)?', 'Yayın sonrası aylık destek ister mi?', 'keuze', ['ja', 'nee', 'misschien — eerst kennismaken']],
      ['G40', L, 'Wie kan intern tijd vrijmaken voor content (foto’s, projecten, nieuws)?', 'İçerik için içeride kim zaman ayırabilir?', 'tekst'],
    ],
  },
  {
    title: '10. Budget, planning & samenwerking',
    guidance: 'Bütçe aralığı + karar verici + zamanlama. Fiyat burada SORULUR, söylenmez.',
    rows: [
      ['G41', S, 'Welk budget heeft u in gedachten voor de website (eenmalig)?', 'Site için düşündüğü bütçe (tek seferlik)?', 'keuze', ['< € 2.500', '€ 2.500 – 5.000', '€ 5.000 – 10.000', '> € 10.000', 'weet ik nog niet']],
      ['G42', N, 'Welk maandbudget is realistisch voor groei (vindbaarheid, onderhoud)?', 'Büyüme için gerçekçi aylık bütçe?', 'tekst'],
      ['G43', S, 'Wanneer wilt u live zijn? Is er een harde deadline?', 'Ne zaman yayında olmalı? Kesin deadline var mı?', 'tekst'],
      ['G44', S, 'Wie beslist over de opdracht (u alleen of samen met anderen)?', 'Kararı kim veriyor (tek mi, birlikte mi)?', 'tekst'],
      ['G45', N, 'Vraagt u ook offertes bij andere partijen op?', 'Başka firmalardan da teklif alıyor mu?', 'ja_nee'],
      ['G46', N, 'Voorkeur voor kennismaking: videogesprek, telefoon of op locatie?', 'Tanışma tercihi: video, telefon, yerinde?', 'keuze', ['videogesprek', 'telefoon', 'op locatie', 'maakt niet uit']],
      ['G47', N, 'Wanneer bent u meestal het beste bereikbaar (dagen/tijden)?', 'En iyi ulaşılabildiği gün/saatler?', 'tekst'],
      ['G48', N, 'Vragen of wensen die u nog kwijt wilt?', 'Eklemek istediği soru/istek?', 'tekst'],
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

// Sabit intern bloklar — field değil, klant sayfasında GÖRÜNMEZ.
const FIXED_SECTIONS = [
  {
    title: '11. Gemaakte afspraken (intern)',
    guidance: 'Kennismaking sonrası birlikte tikle.',
    questions: [
      {
        type: 'checklist', label: 'Afspraken',
        sub_items: [
          'Behoefte helder (website / leads / advies)',
          'Taal en markt(en) vastgesteld',
          'Toegang domein/hosting geregeld',
          'Materiaal (logo, foto’s, teksten) aangeleverd',
          'Offerte verstuurd',
          'Offerte akkoord',
        ],
        guidance: '', config: { export: true },
      },
      { type: 'textarea', label: 'Afspraken — details', sub_items: [], guidance: 'Scope, wie doet wat, bedragen.', config: { export: true } },
    ],
  },
  {
    title: '12. Prijsindicatie (intern)',
    guidance: 'Yalnız görüşmede SÖYLENENİ yaz — tahmin değil. Publieke referentie: bundel €4.500 + €1.000.',
    questions: [
      {
        type: 'table', label: 'Prijsindicatie', sub_items: [], guidance: '',
        config: {
          export: true,
          columns: [
            { key: 'part', label: 'Onderdeel', type: 'text' },
            { key: 'amount', label: 'Bedrag excl. btw', type: 'text' },
            { key: 'remark', label: 'Opmerking', type: 'text' },
          ],
          initial_rows: [
            ['Website eenmalig', '', ''],
            ['Maandelijks (vindbaarheid / onderhoud)', '', ''],
            ['Betaling in fases', '', '30 / 40 / 30'],
          ],
        },
      },
    ],
  },
  {
    title: '13. Volgende stap',
    guidance: 'Standaard: klant vult formulier → kennismaking → offerte.',
    questions: [
      { type: 'text', label: 'Wat stuurt M, uiterlijk wanneer (datum/tijd)', sub_items: [], guidance: '', config: { export: true } },
      { type: 'text', label: 'Deadline klant voor formulier', sub_items: [], guidance: 'Wordt automatisch in de aanleverlijst-mail gezet.', config: { export: true, role: 'deadline' } },
      { type: 'text', label: 'Geplande kennismaking', sub_items: [], guidance: '', config: { export: true } },
    ],
  },
  {
    title: "14. Risico's / aandachtspunten (intern)",
    guidance: 'TR, intern — ör. ihtiyaç belirsiz, yurtdışı pazar/dil, karar verici belli değil.',
    questions: [
      { type: 'textarea', label: "Risico's (TR, intern)", sub_items: [], guidance: '' },
    ],
  },
];

export const ALGEMEEN_TEMPLATE = {
  name: 'Website & leads discovery (algemeen)',
  description: 'Sectoronafhankelijke intake voor een nieuwe klant waarvan de behoefte nog niet bekend is. Klant vult zelf in (/portal/vragenlijst/): bedrijf, aanbod, markt, klantstroom, toegang, website-doel, opvolging, budget & planning. 48 vragen (G01–G48, ★ = verplicht), interne blokken, Markdown-export.',
  sections: [
    ...SECTIONS.map((sec) => ({
      title: sec.title,
      guidance: sec.guidance,
      questions: sec.rows.map(fieldQuestion),
    })),
    ...FIXED_SECTIONS,
  ],
};

// Eerste klant: Franko 500 AB — "Nieuw snel contactverzoek" via aanloopai.nl,
// 10 nov 2026. Bericht zonder inhoud → behoefte onbekend, dus GEEN prefill.
export const ALGEMEEN_SEED_FRANKO = {
  key: 'seed_algemeen_franko',
  version: 1,
  template: ALGEMEEN_TEMPLATE,
  doc_title: 'Website & leads - Franko 500 AB',
  client: {
    name: 'Franko (Franko 500 AB)',
    contact: 'snel contactverzoek via aanloopai.nl, 10 nov 2026',
    notes: 'Contactverzoek zonder bericht — behoefte onbekend. Vermoedelijk Zweeds bedrijf (AB). Formulier → kennismaking → offerte.',
  },
};

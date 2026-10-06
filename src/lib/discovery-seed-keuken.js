// Discovery Hub — keukenzaak-şablonu (ilk müşteri: Ron, via Ömer / Kitchen To You).
// Kaynak spec: discovery-ron-keukenzaak_1.md (2026-10-06). İlk görüşme 6 okt 2026,
// showroom; hedef: tek görüşme + tek takip maili, ikinci görüşme olmadan başla.
//
// Soru kimlikleri (R01…R91) KALICI — asla yeniden numaralama; yeni soru = R92+.
// Satır biçimi: [qid, prio, vraag_nl, vraag_tr, antwoord_type, keuzes?]
//   prio: 'star' (★ görüşmede zorunlu) · 'normaal' · 'later' (✉ mail/dosya ile)
// Bölüm 1–2 sorularında "Observatie" düğmesi var (showroom'da görüleni işaretle).
//
// Sürüm: içerik değişince `version` artır. ensureExtraSeed şablonu günceller;
// cevap girilmiş doküman snapshot olarak KALIR, boş doküman yeniden kurulur.

const S = 'star';
const N = 'normaal';
const L = 'later';

const SECTIONS = [
  {
    title: '1. Bedrijf & identiteit',
    guidance: 'Temel kimlik — sözleşme ve site künyesi için. Showroom\'da gördüğünü "Observatie" ile işaretle.',
    observable: true,
    rows: [
      ['R01', S, 'Officiële bedrijfsnaam, handelsnaam, KvK-nummer, btw-nummer?', 'Resmi şirket adı, ticari ad, KvK numarası, btw numarası?', 'tekst'],
      ['R02', S, 'Rechtsvorm (eenmanszaak / VOF / BV) — wie tekent?', 'Şirket türü (eenmanszaak/VOF/BV) — imzayı kim atar?', 'keuze', ['eenmanszaak', 'VOF', 'BV', 'anders']],
      ['R03', S, 'Showroomadres, openingstijden, telefoon, e-mail, WhatsApp-nummer dat op de site mag?', 'Showroom adresi, açılış saatleri, telefon, e-posta, siteye konulabilecek WhatsApp numarası?', 'tekst'],
      ['R04', N, 'Hoe lang bestaat het bedrijf, hoe groot is het team (verkoop, tekenaar, montage)?', 'Şirket kaç yıldır var, ekip kaç kişi (satış, çizimci, montaj)?', 'tekst'],
      ['R05', N, 'Eigen monteurs of onderaannemers?', 'Kendi montajcıları mı, taşeron mu?', 'keuze', ['eigen', 'onderaannemers', 'beide']],
      ['R06', L, 'Logo (vector), huisstijlkleuren, lettertype, eventuele huisstijlhandleiding', 'Logo (vektör), kurumsal renkler, yazı tipi, varsa kurumsal kimlik kılavuzu', 'bestand'],
      ['R07', L, "Foto's: showroom, geplaatste keukens (toestemming klant?), team, monteurs aan het werk", 'Fotoğraflar: showroom, monte edilmiş mutfaklar (müşteri izni?), ekip, montaj anları', 'bestand'],
      ['R08', L, 'Kort "over ons"-verhaal: waarom begonnen, wat onderscheidt jullie?', 'Kısa "hakkımızda" hikâyesi: neden başladı, sizi farklı kılan ne?', 'tekst'],
    ],
  },
  {
    title: '2. Aanbod & positionering',
    guidance: 'Ne satıyor, hangi segmentte, neden onu seçmeliler — site mesajının çekirdeği.',
    observable: true,
    rows: [
      ['R09', S, 'Eigen productie, dealer (welke merken?), of beide?', 'Kendi üretimi mi, bayi mi (hangi markalar?), ikisi de mi?', 'tekst'],
      ['R10', S, 'Prijssegment en gemiddelde orderwaarde; goedkoopste en duurste keuken die je verkoopt?', 'Fiyat segmenti ve ortalama sipariş tutarı; en ucuz ve en pahalı mutfak?', 'tekst'],
      ['R11', S, 'Wat is je unieke voordeel — prijs, snelheid, maatwerk, Duitse kwaliteit, meertalig team, eigen montage?', 'Benzersiz avantajı ne — fiyat, hız, özel üretim, Alman kalitesi, çok dilli ekip, kendi montajı?', 'tekst'],
      ['R12', N, 'Welke apparatuurmerken? Welke werkbladen (composiet, keramiek, hout)?', 'Hangi beyaz eşya markaları? Tezgâh türleri (kompozit, seramik, ahşap)?', 'tekst'],
      ['R13', N, 'Doe je ook badkamers, inbouwkasten, complete renovatie (sloop, leidingen, tegels)?', 'Ek işler: banyo, gömme dolap, komple renovasyon (söküm, tesisat, fayans)?', 'multi', ['badkamers', 'inbouwkasten', 'renovatie', 'nee']],
      ['R14', N, 'Gemiddelde levertijd van bestelling tot montage?', 'Siparişten montaja ortalama teslim süresi?', 'tekst'],
      ['R15', N, 'Garantie: hoeveel jaar, op wat?', 'Garanti: kaç yıl, neye?', 'tekst'],
      ['R16', N, 'Financiering / betaling in termijnen mogelijk?', 'Finansman / taksit imkânı var mı?', 'ja_nee'],
      ['R17', N, 'Showroombezoek op afspraak of vrije inloop? Avond/weekend?', 'Showroom randevuyla mı, serbest giriş mi? Akşam/hafta sonu?', 'tekst'],
      ['R18', N, 'Thuisbezoek voor inmeten — gratis? Binnen welke straal?', 'Evde ölçü alma — ücretsiz mi? Kaç km yarıçapında?', 'tekst'],
    ],
  },
  {
    title: '3. Werkgebied',
    guidance: 'Lead filtresi ve yerel SEO sayfaları bu cevaba göre kurulur.',
    rows: [
      ['R19', S, 'Welke regio\'s / plaatsen / postcodes — en waar juist níet?', 'Hangi bölgeler/şehirler/posta kodları — nereye özellikle gitmiyor?', 'tekst'],
      ['R20', N, 'Waar heb je nu al veel klanten (sterke regio) en waar wil je groeien?', 'Şu an güçlü olduğu bölgeler ve büyümek istediği bölgeler?', 'tekst'],
      ['R21', N, 'Montage buiten de regio tegen meerprijs?', 'Bölge dışına ek ücretle montaj yapar mı?', 'ja_nee'],
    ],
  },
  {
    title: '4. Huidige klantstroom & cijfers',
    guidance: 'Başlangıç ölçümü: rakam veremezse tahmini de not et — sonraki raporların kıyas noktası.',
    rows: [
      ['R22', S, 'Hoe komen klanten nu binnen (verdeling): mond-tot-mond / inloop / Google / Marktplaats / social / advertenties / gemeenschap?', 'Müşteriler nereden geliyor (dağılım): tavsiye / showroom / Google / Marktplaats / sosyal / reklam / Türk toplumu?', 'tekst'],
      ['R23', S, 'Hoeveel aanvragen per maand nu, en hoeveel worden klant (conversie)?', 'Ayda kaç talep, kaçı müşteriye dönüşüyor?', 'tekst'],
      ['R24', S, 'Hoeveel keukens per maand/jaar verkoop je nu, en wat is je doel over 12 maanden?', 'Ayda/yılda kaç mutfak satıyor, 12 ay sonraki hedef?', 'tekst'],
      ['R25', N, 'Seizoenseffect — wanneer druk, wanneer rustig?', 'Sezon etkisi — ne zaman yoğun, ne zaman sakin?', 'tekst'],
      ['R26', N, 'Grootste reden dat een klant níet bij jou koopt (prijs, levertijd, vertrouwen)?', 'Müşterinin satın almamasının en büyük nedeni?', 'tekst'],
    ],
  },
  {
    title: '5. Eerdere partijen (laten vertellen)',
    guidance: 'Dinle, yargılama. Önceki firmaları kötüleme — "bu sefer neyi farklı yapmalıyım" sorusu güveni kurar.',
    rows: [
      ['R27', S, 'Wat hebben de vorige partijen precies beloofd en geleverd?', 'Önceki firmalar ne vaat etti, ne teslim etti?', 'tekst'],
      ['R28', S, 'Wat ging er mis — geen oplevering, geen leads, geen communicatie, verkeerde doelgroep?', 'Ne ters gitti — teslim yok, lead yok, iletişim yok, yanlış hedef kitle?', 'tekst'],
      ['R29', N, 'Hoeveel ongeveer betaald, en loopt er nog iets (contract, abonnement, domein bij hen)?', 'Yaklaşık ne ödedi, devam eden bir şey var mı (sözleşme, abonelik, domain onlarda)?', 'tekst'],
      ['R30', S, "Is er iets opgeleverd dat we kunnen hergebruiken (site, teksten, foto's, tool-code, designs)?", 'Tekrar kullanılabilecek bir şey var mı (site, metin, fotoğraf, araç kodu, tasarım)?', 'tekst'],
      ['R31', S, 'Wat moet ik anders doen zodat je zegt: dit keer klopt het?', '"Bu sefer doğru oldu" demesi için neyi farklı yapmalıyım?', 'tekst'],
      ['R32', N, 'Open conflicten/facturen met die partijen die mijn werk kunnen blokkeren (domein)?', 'Açık anlaşmazlık/fatura var mı, işi engeller mi (domain rehin)?', 'tekst'],
    ],
  },
  {
    title: '6. Domein, hosting & toegang',
    guidance: 'Şifre alma/kaydetme YOK — erişim davet/yetki ile. Detayları çoğunlukla mail ile iste.',
    rows: [
      ['R33', S, 'Huidige domeinnaam(en)? Eigenaar, registrar, wachtwoord beschikbaar?', 'Mevcut domain(ler)? Sahibi, registrar, şifre var mı?', 'tekst'],
      ['R34', L, 'Hosting / huidige site: waar, wie beheert, mag die offline?', 'Hosting / mevcut site: nerede, kim yönetiyor, kapatılabilir mi?', 'tekst'],
      ['R35', L, 'Zakelijke e-mail: bij wie? Wie beheert DNS?', "Kurumsal e-posta nerede? DNS'i kim yönetiyor?", 'tekst'],
      ['R36', L, 'Google Business Profile: bestaat, eigenaar, geverifieerd?', 'Google Business Profile: var mı, sahibi, doğrulanmış mı?', 'tekst'],
      ['R37', L, 'Google Analytics / Search Console / Tag Manager / Meta Business / Pixel — bestaan, toegang?', 'GA / GSC / GTM / Meta Business / Pixel — var mı, erişim?', 'tekst'],
      ['R38', L, 'Social accounts: bestaan, login, volgers?', 'Sosyal hesaplar: var mı, giriş, takipçi?', 'tekst'],
      ['R39', L, 'Eerdere advertentie-accounts (Google Ads, Meta Ads): bestaan, saldo/schulden?', 'Eski reklam hesapları: var mı, bakiye/borç?', 'tekst'],
      ['R40', N, 'Reviews (Google, Trustpilot, Klantenvertellen): aantal en score?', 'Yorumlar: sayı ve puan?', 'tekst'],
    ],
  },
  {
    title: '7. Website: doel & inhoud',
    guidance: 'Sitenin tek işi: hangi aksiyon? Sayfa listesi ve canlı tarih burada netleşir.',
    rows: [
      ['R41', S, 'Hoofddoel: showroom-afspraken, offerte-aanvragen, bellen, online verkoop?', 'Ana amaç: showroom randevusu, teklif, arama, online satış?', 'keuze', ['afspraken', 'offertes', 'bellen', 'online verkoop']],
      ['R42', S, 'Welke ene actie moet een bezoeker doen (primaire CTA)?', 'Ziyaretçi hangi tek aksiyonu almalı (birincil CTA)?', 'tekst'],
      ['R43', N, 'Welke pagina\'s minimaal: home, keukens, projecten, over ons, contact, offerte, FAQ, reviews, blog?', 'Minimum hangi sayfalar?', 'multi', ['home', 'keukens/stijlen', 'projecten', 'over ons', 'contact', 'offerte', 'FAQ', 'reviews', 'blog']],
      ['R44', N, 'Vanaf-prijzen op de site tonen, of bewust niet?', 'Sitede fiyat gösterilsin mi?', 'ja_nee'],
      ['R45', L, 'Wie levert teksten — jij, ik, combinatie? Taal: NL, ook TR/EN?', 'Metinleri kim yazacak? Dil?', 'tekst'],
      ['R46', N, 'Toon: formeel of persoonlijk? 2–3 voorbeeldsites die je mooi vindt?', 'Ton? Beğendiği örnek siteler?', 'tekst'],
      ['R47', S, 'Drie directe concurrenten in de regio (naam + site)?', 'Bölgedeki üç doğrudan rakip (isim + site)?', 'tekst'],
      ['R48', N, 'Zoekwoorden waarop je gevonden wilt worden?', 'Hangi aramalarda bulunmak istiyor?', 'tekst'],
      ['R49', N, 'Online afsprakenmodule — gewenst, welke agenda (Google/Outlook)?', 'Online randevu modülü — ister mi, hangi takvim?', 'tekst'],
      ['R50', N, 'Chat/WhatsApp-knop op de site? Wie beantwoordt?', 'Chat/WhatsApp butonu? Kim cevaplıyor?', 'tekst'],
      ['R51', N, "Portfolio: hoeveel projecten met foto's én toestemming?", 'Portföy: fotoğraflı ve izinli kaç proje?', 'getal'],
      ['R52', N, 'Bestaat er al een privacyverklaring / cookiebeleid?', 'Mevcut privacy metni var mı?', 'ja_nee'],
      ['R53', S, 'Gewenste livedatum en reden (seizoen, beurs, verhuizing)?', 'İstenen yayın tarihi ve nedeni?', 'tekst'],
    ],
  },
  {
    title: '8. Leads: definitie, levering, prijs',
    guidance: 'keukeninbeeld.nl lead teslimi. Partner/routing işlemi owner kararı olmadan YAPILMAZ — burada yalnız tercihleri not et.',
    rows: [
      ['R54', S, 'Definitie goede lead: min. budget, max. afstand, verbouwing binnen X maanden, eigenaar/huurder, nieuwbouw/renovatie?', 'İyi lead tanımı: min bütçe, max mesafe, X ay içinde tadilat, ev sahibi/kiracı, yeni/renovasyon?', 'tekst'],
      ['R55', S, 'Wat mag een lead kosten? En een afspraak-lead?', "Lead ne kadar edebilir? Randevu-lead'i?", 'tekst'],
      ['R56', S, 'Exclusief of gedeeld? Regio-exclusiviteit?', 'Exclusive mi, paylaşımlı mı? Bölge exclusivity?', 'keuze', ['exclusief', 'gedeeld', 'regio-exclusief']],
      ['R57', S, 'Max. aantal leads per dag / maand (cap)?', 'Günlük/aylık maksimum lead (cap)?', 'tekst'],
      ['R58', S, 'Wie volgt leads op, hoe snel, via welk kanaal?', "Lead'leri kim takip ediyor, ne kadar hızlı, hangi kanal?", 'tekst'],
      ['R59', N, 'Leads ontvangen via: mail, WhatsApp, Telegram, admin-paneel, CRM? Welk CRM nu?', "Lead'leri nasıl almak istiyor? Hangi CRM?", 'multi', ['e-mail', 'WhatsApp', 'Telegram', 'admin-paneel', 'CRM']],
      ['R60', N, 'Afkeuren slechte leads: termijn (48 u) en redenen — akkoord?', 'Kötü lead reddi: süre ve nedenler — kabul mü?', 'ja_nee'],
      ['R61', N, 'Tegenofferte-leads gewenst, apart geprijsd?', "Karşı-teklif lead'leri ister mi, ayrı fiyat?", 'ja_nee'],
      ['R62', N, 'Ook leads via keukeninbeeld.nl, start direct?', "keukeninbeeld.nl'den de lead, hemen başlasın mı?", 'ja_nee'],
      ['R63', N, 'Mag ik je vanaf-prijzen gebruiken in de keukenprijs-index?', "Fiyatlarını keukenprijs-index'te kullanabilir miyim?", 'ja_nee'],
      ['R64', S, 'Verwerkersovereenkomst (AVG) tekenen voor lead-levering — akkoord?', 'Verwerkersovereenkomst (AVG) imzalar mı?', 'ja_nee'],
    ],
  },
  {
    title: '9. Marketing & maandelijks',
    guidance: 'Aylık yönetim kapsamı. Reklam (Ads) önerme — yalnız mevcut durumu/isteği not et.',
    rows: [
      ['R65', S, 'Maandbudget voor beheer + marketing (apart van de site)?', 'Yönetim + pazarlama için aylık bütçe?', 'getal'],
      ['R66', N, 'Advertenties gewenst (Google/Meta)? Wie betaalt het advertentiebudget?', 'Reklam ister mi? Reklam bütçesini kim öder?', 'tekst'],
      ['R67', N, 'Social media: ik post of jij? Frequentie? Wie levert foto/video?', 'Sosyal medya: ben mi, o mu? Sıklık? İçerik kimden?', 'tekst'],
      ['R68', N, 'Google Business Profile beheer door mij?', 'GBP yönetimi ben mi?', 'ja_nee'],
      ['R69', N, 'Automatische review-mail/WhatsApp na montage — akkoord?', 'Montaj sonrası otomatik yorum talebi — kabul mü?', 'ja_nee'],
      ['R70', N, 'Klantenlijst met toestemming voor nieuwsbrief?', 'İzinli müşteri listesi var mı?', 'ja_nee'],
      ['R71', N, 'Maandrapportage: wat zien (leads, kosten/lead, bezoekers, afspraken)? Mail of dashboard?', 'Aylık rapor: ne görmek ister? Mail mi, dashboard mu?', 'tekst'],
    ],
  },
  {
    title: '10. Ontwerptool (fase 2: alleen begrijpen, niets beloven)',
    guidance: 'Yalnız anla, söz verme. Faz 2 — site anlaşmasından sonra ayrı discovery.',
    rows: [
      ['R72', S, 'Wat bedoel je exact: klant ontwerpt thuis / verkoper tekent in showroom / klant ziet eigen keuken in nieuwe stijl (AI)?', 'Tam olarak ne: müşteri evde tasarlar / satıcı çizer / müşteri kendi mutfağını yeni stilde görür (AI)?', 'keuze', ['klant-zelf', 'verkoper-tool', 'AI-render', 'anders']],
      ['R73', S, 'Wat moet eruit komen: plattegrond, 3D, prijsindicatie, render, offerte-PDF?', 'Çıktı: plan, 3D, fiyat tahmini, render, teklif PDF?', 'multi', ['plattegrond', '3D', 'prijsindicatie', 'render', 'offerte-PDF']],
      ['R74', S, 'Doel: meer leads of sneller verkopen in de showroom?', "Amaç: daha çok lead mi, showroom'da hızlı satış mı?", 'keuze', ['leads', 'verkoop', 'beide']],
      ['R75', N, 'Huidig tekenprogramma (Winner, Compusoft, 2020, Carat)? Koppeling/export nodig?', 'Mevcut çizim programı? Entegrasyon/export gerekli mi?', 'tekst'],
      ['R76', N, 'Hoe ver kwam de vorige partij — demo, screenshots, code?', 'Önceki firma nereye kadar geldi — demo, görüntü, kod?', 'tekst'],
      ['R77', N, 'Keuze uit echt assortiment, of stijlen/voorbeelden voldoende?', 'Gerçek ürün gamı mı, stil/örnek yeterli mi?', 'keuze', ['echt assortiment', 'stijlen']],
      ['R78', N, 'Welke stijlen aanbieden?', 'Hangi stiller?', 'tekst'],
      ['R79', N, 'Prijsindicatie gekoppeld aan echte prijslijst? Digitaal beschikbaar (Excel)?', 'Fiyat tahmini gerçek listeye bağlı mı? Dijital var mı?', 'bestand'],
      ['R80', N, 'Budget/verwachting voor de tool apart van de site? Fase 2 na site akkoord?', 'Araç için ayrı bütçe? Faz 2 kabul mü?', 'tekst'],
    ],
  },
  {
    title: '11. Commercieel & samenwerking',
    guidance: 'Bütçe, ödeme planı, karar verici, iletişim ritmi. Referans: Ömer modeli €4.500, 30/40/30.',
    rows: [
      ['R81', S, 'Totaalbudget in gedachten voor de site (eenmalig)?', 'Site için tek seferlik bütçe?', 'getal'],
      ['R82', S, 'Werken in fases met betaling per fase (30/40/30) — akkoord?', 'Faz başı ödeme (30/40/30) — kabul mü?', 'ja_nee'],
      ['R83', S, 'Wie beslist — alleen jij of ook partner/boekhouder?', 'Karar verici kim?', 'tekst'],
      ['R84', N, 'Factuurgegevens: factuuradres, e-mail voor facturen, betaaltermijn', 'Fatura bilgileri', 'tekst'],
      ['R85', N, 'Maandabonnement maandelijks opzegbaar — voldoende zekerheid?', 'Aylık iptal — yeterli güvence mi?', 'ja_nee'],
      ['R86', N, 'Eigendom site/code na volledige betaling bij jou — akkoord?', 'Tam ödeme sonrası mülkiyet onda — kabul mü?', 'ja_nee'],
      ['R87', N, 'Communicatiekanaal en ritme: WhatsApp + wekelijkse update, vaste dag?', 'İletişim kanalı ve ritmi?', 'tekst'],
      ['R88', N, 'Dagelijks contactpersoon, en wie geeft definitieve akkoorden?', 'Günlük muhatap, nihai onay kim?', 'tekst'],
      ['R89', N, 'Beschikbaarheid voor content/feedback? (M: eigen buitenlandperiode hier melden)', 'Müsaitlik? (M: yurt dışı dönemini söyle)', 'tekst'],
      ['R90', N, 'Ömer als referentie noemen; zelf referentie worden als het werkt?', 'Ömer referans; kendisi referans olur mu?', 'ja_nee'],
      ['R91', N, 'Andere zaken die ik nu moet weten (filiaal, tweede merk, webshop)?', 'Şimdi bilmem gereken başka şey?', 'tekst'],
    ],
  },
];

function fieldQuestion(row, observable) {
  const [qid, prio, nl, tr, answerType, choices] = row;
  return {
    type: 'field',
    label: nl,
    sub_items: [],
    guidance: '',
    config: {
      qid,
      prio,
      answer_type: answerType,
      choices: choices || [],
      label_tr: tr,
      observable: !!observable,
    },
  };
}

// Sabit bloklar (spec §3) — mevcut soru tipleriyle. config.export = Markdown
// özetine girer; TR/intern bloklar (gözlem, riskler) girmez.
const FIXED_SECTIONS = [
  {
    title: '12. Observaties showroom',
    guidance: 'Serbest, TR. Sorulmadan görülen — markalar, düzen, fiyat etiketleri, ortam.',
    questions: [
      {
        type: 'textarea', label: 'Showroom-waarnemingen (TR, intern)',
        sub_items: ['Merken in showroom', 'Aantal opstellingen', 'Prijsetiketten', 'Personeel aanwezig', 'Sfeer', "Foto's gemaakt (ja/nee)"],
        guidance: '',
      },
    ],
  },
  {
    title: '13. Gemaakte afspraken',
    guidance: 'Görüşmenin sonunda birlikte tikle — takip mailinin ve teklifin temeli.',
    questions: [
      {
        type: 'checklist', label: 'Afspraken',
        sub_items: [
          'Website: akkoord op aanpak',
          'Leads via keukeninbeeld.nl: start ja/nee, model (exclusief/gedeeld), cap, prijs per lead',
          'Maandelijks beheer/marketing: ja/nee, bedrag',
          'Ontwerptool: fase 2, aparte discovery',
          'Verwerkersovereenkomst: sturen ja/nee',
          'Referentie Ömer besproken',
        ],
        guidance: '', config: { export: true },
      },
      { type: 'textarea', label: 'Afspraken — details', sub_items: [], guidance: 'Model, cap, bedragen, wie doet wat.', config: { export: true } },
    ],
  },
  {
    title: '14. Prijsindicatie gegeven',
    guidance: 'Yalnız görüşmede SÖYLENENİ yaz — tahmin değil.',
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
            ['Website eenmalig', '', 'referentie Ömer-model €4.500'],
            ['Betaling in fases', '', '30 / 40 / 30'],
            ['Maandelijks beheer + marketing', '', ''],
            ['Lead-prijs (per lead / afspraak-lead)', '', ''],
            ['Ontwerptool', 'n.v.t. vandaag', 'fase 2'],
          ],
        },
      },
    ],
  },
  {
    title: '15. Volgende stap',
    guidance: 'Standaard: voorstel 1 A4 + aanleverlijst binnen 48 u.',
    questions: [
      { type: 'text', label: 'Wat stuurt M, uiterlijk wanneer (datum/tijd)', sub_items: [], guidance: 'Voorstel 1 A4 + aanleverlijst binnen 48 u.', config: { export: true } },
      { type: 'text', label: 'Deadline Ron voor aanleverlijst', sub_items: [], guidance: 'Wordt automatisch in de aanleverlijst-mail gezet.', config: { export: true, role: 'deadline' } },
      { type: 'text', label: 'Geplande livedatum', sub_items: [], guidance: '', config: { export: true } },
    ],
  },
  {
    title: "16. Risico's / aandachtspunten (intern)",
    guidance: 'TR, intern — ör. domain önceki firmada, fotoğraf yok, karar verici yok, M yurt dışı dönemi.',
    questions: [
      { type: 'textarea', label: "Risico's (TR, intern)", sub_items: [], guidance: '' },
    ],
  },
];

export const KEUKEN_TEMPLATE = {
  name: 'Keukenzaak — website & leads discovery',
  description: 'Keukenzaak-prospect: één gesprek in de showroom + één opvolgmail, daarna starten. 91 vragen (R01–R91, ★ = verplicht in gesprek, ✉ = via mail), vaste afsprakenblokken, aanleverlijst-mail en Markdown-export.',
  sections: [
    ...SECTIONS.map((sec) => ({
      title: sec.title,
      guidance: sec.guidance,
      questions: sec.rows.map((row) => fieldQuestion(row, sec.observable)),
    })),
    ...FIXED_SECTIONS,
  ],
};

export const KEUKEN_SEED = {
  key: 'seed_keuken_ron',
  version: 1,
  template: KEUKEN_TEMPLATE,
  // Dokümanın adı (Ron'un firması). Ron bu dokümanı kendi girişiyle doldurur
  // (discovery-klant.js) — görüşme ve müşteri cevapları TEK potada.
  doc_title: 'Keukenzaak - Foralle',
  client: {
    name: 'Ron (keukenzaak)',
    contact: 'via Ömer / Kitchen To You',
    notes: 'Eerste gesprek 6 okt 2026 in de showroom. Doel: één gesprek + één opvolgmail, daarna direct starten.',
  },
};

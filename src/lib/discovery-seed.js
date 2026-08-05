// Discovery Hub seed verisi. İlk API çağrısında (boş DB'de) idempotent yüklenir.
// Şablon soruları jenerik yazıldı ("webshop", "IT firması") — aynı şablon
// gelecekteki müşteriler için de kullanılır; müşteriye özel detaylar görüşme
// sırasında cevaplara girilir.

export const SEED_TEMPLATE = {
  name: 'Teknik Devir & Keşif Görüşmesi',
  description: 'Yeni müşteri onboarding: mevcut IT sağlayıcısından teknik devir + müşteriden operasyonel bilgi ve erişim envanteri.',
  sections: [
    {
      title: 'A1. Webshop Kurulumu & Altyapı',
      guidance: 'Rapor bölümü: Technische audit. Amaç: kurulumun tam envanteri — sürüm, hosting, tema, modüller, yedekleme.',
      questions: [
        { type: 'textarea', label: '1. Hangi platform/sürüm kurulu ve ne zaman kuruldu?', sub_items: ['Sürüm güncel mi? Güvenlik güncellemeleri yapıldı mı?', 'Güncellemelerden bundan sonra kim sorumlu?'], guidance: 'Eski sürüm = güvenlik riski + modül uyumsuzluğu. Sürüm numarasını birebir not et.' },
        { type: 'textarea', label: '2. Hosting nerede ve kimin adına kayıtlı?', sub_items: ['Firma ve paket türü (shared/VPS/dedicated)?', 'cPanel/Plesk, FTP/SSH, veritabanı erişimleri kimde?', 'Sözleşme ve ödeme müşteri üzerinde mi, IT firması üzerinde mi?'], guidance: 'Hosting IT firması adına ise bağımlılık oluşur — devrini gündeme al.' },
        { type: 'textarea', label: '3. Alan adı kimin üzerine kayıtlı, DNS yönetimi kimde?', sub_items: ['Registrar hangisi, panel erişimi kimde?', 'E-posta (MX) kayıtları aynı yerden mi?'], guidance: 'SEO ve e-posta altyapısı için DNS erişimi gerekecek.' },
        { type: 'textarea', label: '4. Hangi tema kullanılıyor?', sub_items: ['Hazır mı, özel mi? Lisans kimin adına?', 'Child theme var mı, değişiklikler doğrudan temaya mı yapıldı?'], guidance: 'Child theme yoksa tema güncellemesi özelleştirmeleri silebilir — risk bulgusudur.' },
        { type: 'textarea', label: '5. Kurulu modüllerin listesi', sub_items: ['Hangileri ücretli/lisanslı, lisanslar kimin adına?', 'Özel yazılmış modül var mı? Kaynak kodu + dokümantasyon?'], guidance: 'Modül listesi ekran görüntüsü iste. Lisanssız modül varsa tespit et.' },
        { type: 'textarea', label: '6. Yedekleme düzeni', sub_items: ['Otomatik mi, manuel mi? Sıklık? Nerede saklanıyor?', 'Restore hiç test edildi mi?'], guidance: "Yedek yoksa raporda 'acil' öncelikli bulgu." },
        { type: 'textarea', label: '7. SSL, güvenlik, performans', sub_items: ['SSL türü ve yenileme?', 'Cache/CDN var mı?', 'Admin panel için 2FA / özel URL / IP kısıtı?'], guidance: 'Site hızı nulmeting ölçümlerine girecek.' },
        { type: 'textarea', label: '8. Admin kullanıcıları ve yetkiler', sub_items: ['Kaç hesap, kimlere ait, hangi profillerle?', 'Bana hangi seviyede erişim, kim ve ne zaman açacak?'], guidance: 'Audit için tam görünürlük (SuperAdmin) iste; tarih netleşsin.' },
        { type: 'textarea', label: '9. Test/staging ortamı var mı?', sub_items: ['Yoksa değişiklikler canlıda mı test ediliyor?'], guidance: 'Staging yoksa import ve SEO değişikliklerinde risk planı gerekir.' },
      ],
    },
    {
      title: 'A2. Kasa Sistemi & Webshop Entegrasyonu',
      guidance: "Görüşmenin en kritik bölümü. Fiili durumu tarih + ekran görüntüsüyle belgele. 'Kurulu' ile 'çalışıyor' farkını net tespit et.",
      questions: [
        { type: 'textarea', label: '10. Kasa sistemi hangi yazılım?', sub_items: ['Özel geliştirme mi, hazır ürün mü (marka/sürüm)?', 'Donanım? Bulut mu lokal mi?', 'Lisans/abonelik modeli, kime fatura ediliyor?'], guidance: 'Hazır ürünse dokümantasyona ben de ulaşırım; özelse her şey geliştiriciye bağlı.' },
        { type: 'textarea', label: '11. Kasa–webshop bağlantısı teknik olarak nasıl çalışıyor?', sub_items: ['API mi, DB mi, dosya (CSV/XML) mi, manuel mi?', 'Yön: kasa→web, web→kasa, çift yönlü?', 'Sıklık: anlık / saatlik / günlük / elle?'], guidance: 'Şemayla not et; çalışırken ekran görüntüsü veya log iste.' },
        { type: 'textarea', label: '12. Entegrasyon şu an fiilen çalışıyor mu?', sub_items: ['Son senkronizasyon ne zaman? Kanıt gösterilebilir mi?', 'Mevcut ürünler kasadan mı geldi, elle mi girildi?', 'Mağaza satışı webshop stoğundan düşüyor mu (ve tersi)?'], guidance: "EN ÖNEMLİ SORU. 'Kurulu ama aktif değil' cevabı da bir bulgudur — aynen belgele." },
        { type: 'textarea', label: '13. Ürün verisinin ana kaynağı (master) hangi sistem?', sub_items: ['Yeni ürün önce nereye girilir?', 'Fiyat nereden yönetilir? BTW oranları tutarlı mı?', 'Eşleştirme: barkod/EAN, SKU, referans?'], guidance: 'Master belirsizse çift veri girişi ve stok tutarsızlığı kaçınılmaz.' },
        { type: 'textarea', label: '14. Webshop siparişleri kasa/muhasebeye akıyor mu?', sub_items: ['Online sipariş kasada görünüyor mu? Fatura nereden kesiliyor?', 'Ödeme sağlayıcısı (iDEAL vb.) hangisi, hesap kimin adına?'], guidance: 'Ödeme sağlayıcısı hesabı müşteri adına olmalı — kontrol et.' },
        { type: 'textarea', label: '15. Entegrasyonun teknik dokümantasyonu var mı?', sub_items: ['API anahtarları, endpoint listesi, ayar ekranları paylaşılabilir mi?'], guidance: 'Yoksa görüşme notların ilk dokümantasyon olur — ekran görüntülerini o gün topla.' },
      ],
    },
    {
      title: 'A3. Ürün Verisi, Toplu Import & Sorumluluk Sınırları',
      guidance: "1000+ ürün importu ayrı teklif edilecek — kasa tarafının hazırlığını şimdiden öğren.",
      questions: [
        { type: 'textarea', label: '16. Ürünler şimdiye kadar nasıl eklendi?', sub_items: ['Elle mi? CSV/Excel import denendi mi, sonuç?', 'Kategori yapısını kim, neye göre kurdu?'], guidance: 'Mevcut ürünlerin veri kalitesine (başlık, açıklama, görsel) ayrıca bakılacak.' },
        { type: 'textarea', label: '17. Toplu import için hazır altyapı var mı?', sub_items: ['Import modülü kurulu mu? Webservice/API anahtarı açık mı?', "Tedarikçi feed'i bağlanırsa teknik engel var mı?"], guidance: '1000+ ürün geleceğini söyle — sunucu limitleri (PHP memory, timeout) hazır mı?' },
        { type: 'textarea', label: '18. Feed ile eklenen ürünün kasada karşılığı gerekiyor mu?', sub_items: ["Webshop'a eklenen ürün kasada otomatik oluşuyor mu?", 'Gerekiyorsa kasada toplu ürün açma imkânı var mı?'], guidance: 'Bu cevap import projesinin kapsamını ve fiyatını doğrudan etkiler.' },
        { type: 'textarea', label: '19. IT firmasının sorumluluğu nerede bitiyor?', sub_items: ['Bakım/destek anlaşması var mı, çağrı başına mı?', 'Garanti kapsamı? Açık/yarım iş kaldı mı?', 'Teknik konularda hangi kanaldan ulaşırım?'], guidance: 'Sınırları şimdi netleştir; işbirliği tonunu koru.' },
        { type: 'textarea', label: '20. Bilmem gereken başka bir şey var mı?', sub_items: ['Yarım işler, bilinen hatalar, teknik borç, hassas noktalar?'], guidance: 'Açık uçlu kapanış — en değerli bilgi çoğu zaman buradan çıkar.' },
      ],
    },
    {
      title: 'B1. Mevcut İşleyiş & Satış Süreci',
      guidance: 'Sistemi müşterinin gerçek çalışma şekline göre kuracağım.',
      questions: [
        { type: 'textarea', label: '21. Sosyal medyayı fiilen kim yönetiyor?', sub_items: ['Hangi hesaplar aktif, kim, hangi sıklıkla, hangi telefondan?', 'İçerik kararlarını kim veriyor, plan var mı?'], guidance: 'AI içerik sistemini kuracağım kişiyi/akışı tanımam gerekiyor.' },
        { type: 'textarea', label: '22. Sosyal medyada işe yarayan neydi?', sub_items: ['En çok etkileşim alan içerikler? Ne türdü?', 'Oradan gelen müşteri nasıl ilerliyor: DM mi, mağaza mı?'], guidance: "Mevcut başarı nulmeting'in kıyas noktası — rakamları not et." },
        { type: 'textarea', label: '23. En çok satan / sorulan ürünler?', sub_items: ['Hangi kategori öne çıkıyor?', 'Mağaza satışı ile online ilgi arasında fark var mı?'], guidance: 'İçerik ve SEO önceliklendirmesi bu cevaba göre.' },
        { type: 'textarea', label: '24. Müşteriler hangi kanallardan ulaşıyor, siparişler nasıl kaydediliyor?', sub_items: ['DM/WhatsApp/telefon/mağaza dağılımı?', "WhatsApp'tan satış var mı, kayıt tutuluyor mu?"], guidance: "Kayıtsız satış kanalları raporda 'kaçan veri' olarak geçer." },
        { type: 'textarea', label: '25. Eldeki görsel materyal envanteri', sub_items: ['Ürün fotoğraflarını kim çekiyor? Profesyonel çekim var mı?', 'Tedarikçilerden hazır görsel/katalog alınabiliyor mu?'], guidance: 'AI influencer ve içerik üretimi için ham materyal gerekiyor.' },
        { type: 'textarea', label: '26. Kampanya ve fiyat düzeni', sub_items: ['İndirimler sezonluk mu, anlık mı? Kim karar veriyor?', 'Mağaza ve web fiyatları aynı mı olacak?'], guidance: 'Otomasyon kuralları buna göre tasarlanacak.' },
      ],
    },
    {
      title: 'B2. Hesaplar & Erişim Envanteri',
      guidance: 'Şifre alma/kaydetme YOK. Meta Business Suite ve TikTok Business üzerinden partner/yönetici daveti iste.',
      questions: [
        { type: 'textarea', label: '27. Sosyal medya hesaplarının durumu', sub_items: ['Instagram: kullanıcı adı? Business mi? FB sayfasına bağlı mı?', 'TikTok: kullanıcı adı? Business mi? Kime kayıtlı?', 'Facebook sayfası / Meta Business Suite yöneticisi kim?'], guidance: "Kişisel hesapsa business'a geçiş ilk iş olacak." },
        { type: 'textarea', label: '28. Google tarafında neler mevcut?', sub_items: ['Google Business Profile var mı, yöneticisi kim?', 'Analytics / Search Console hiç bağlandı mı?'], guidance: 'Yoksa nulmeting sırasında kurulacak — sıfır ölçüm için bile gerekli.' },
        { type: 'textarea', label: '29. E-posta ve iletişim altyapısı', sub_items: ['Kurumsal e-posta adresi var mı, kim okuyor?', 'WhatsApp Business kullanılıyor mu, hangi numarayla?'], guidance: 'Müşteri iletişim otomasyonu için başlangıç noktası.' },
        {
          type: 'table', label: '30. Erişim Takip Tablosu', sub_items: [],
          guidance: 'Her satır için: kim açacak + hangi tarihe kadar. Şifre kaydetmeyin.',
          config: {
            access_table: true,
            columns: [
              { key: 'system', label: 'Sistem / Hesap', type: 'text' },
              { key: 'handle', label: 'Kullanıcı adı / URL', type: 'text' },
              { key: 'access_type', label: 'Erişim türü', type: 'text' },
              { key: 'granter', label: 'Kim açacak', type: 'text' },
              { key: 'due', label: 'Tarih', type: 'text' },
              { key: 'done', label: '✓', type: 'check' },
            ],
            initial_rows: [
              ['Webshop admin', '', '', '', '', false],
              ['Hosting / cPanel', '', '', '', '', false],
              ['Alan adı / DNS', '', '', '', '', false],
              ['Instagram', '', '', '', '', false],
              ['TikTok', '', '', '', '', false],
              ['Facebook / Meta BS', '', '', '', '', false],
              ['Google Business', '', '', '', '', false],
              ['Analytics / SC', '', '', '', '', false],
              ['WhatsApp Business', '', '', '', '', false],
              ['Kasa sistemi', '', '', '', '', false],
            ],
          },
        },
      ],
    },
    {
      title: 'Görüşme Sonrası Kontrol Listesi',
      guidance: 'Görüşme bittikten sonra doldur.',
      questions: [
        { type: 'checklist', label: 'Kontrol listesi', sub_items: ['Kasa–webshop entegrasyonunun fiili durumu net tespit edildi (çalışıyor / kısmen / aktif değil)', 'Ekran görüntüleri toplandı (modüller, senkronizasyon, kullanıcılar)', 'Platform sürümü, hosting ve alan adı sahipliği not edildi', 'IT firmasının sorumluluk sınırı ve iletişim kanalı netleşti', 'Erişim davetleri için kişi + tarih belirlendi', 'Sosyal medya mevcut rakamları kaydedildi'], guidance: '' },
      ],
    },
  ],
};

// SoleHome ilk gerçek müşteri: şablondan bir doküman anında oluşturulur.
// Diğerleri şimdilik yalnızca isim olarak durur (ileride doküman eklenecek).
export const SEED_CLIENTS = [
  { name: 'SoleHome', with_doc: true },
  { name: 'Pasfoto Rotterdam Zuid' },
  { name: 'FleetTrackHolland' },
  { name: 'Alfa Reclame' },
  { name: 'Klaas & Daams' },
  { name: 'keukeninbeeld.nl' },
  { name: 'TripAndTick' },
];

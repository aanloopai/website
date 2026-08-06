// Discovery Hub seed verisi. İlk API çağrısında (boş DB'de) idempotent yüklenir;
// SEED_VERSION artınca mevcut şablon güncellenir (discovery.js upgradeSeed).
// Şablon soruları jenerik yazıldı ("webshop", "IT firması") — aynı şablon
// gelecekteki müşteriler için de kullanılır; müşteriye özel detaylar görüşme
// sırasında cevaplara girilir.
//
// v2 (2026-08-06): "eski site devri" varsayımı kaldırıldı — site YENİ kurulmuş
// senaryosuna göre yeniden yazıldı. Yeni omurga: anlaşma kapsamı + teslimat
// durumu (ne sözleşildi / ne teslim edildi / ne eksik / anlaşma dışı ne
// yapıldı / garanti-bakım sınırı).

export const SEED_VERSION = 2;

export const SEED_TEMPLATE = {
  name: 'Teknik Devir & Keşif Görüşmesi',
  description: 'Yeni müşteri onboarding: yeni kurulmuş webshop devri — anlaşma/teslimat envanteri, IT sağlayıcısından teknik devir, operasyonel bilgi ve erişim envanteri.',
  sections: [
    {
      title: 'A0. Anlaşma & Teslimat Durumu',
      guidance: 'Devir görüşmesinin bel kemiği. Ton suçlayıcı değil, envanter: ne sözleşildi, ne teslim edildi, ne eksik. Her beyanı canlı sistemde doğrulat.',
      questions: [
        { type: 'textarea', label: '1. IT firmasıyla anlaşmanın kapsamı kalem kalem ne?', sub_items: ['Yazılı sözleşme/teklif/fatura var mı — belgeyi görebilir miyim?', 'Kurulum, tema/tasarım, ürün girişi, kasa entegrasyonu, eğitim, bakım — hangileri dahil?'], guidance: 'Kapsam belgesi yoksa iki taraftan kalem listesi çıkart. Devir raporunun temeli bu liste.' },
        { type: 'textarea', label: '2. Toplam bedel ve ödeme durumu ne?', sub_items: ['Ödenen / kalan tutar?', 'Kalan ödemeye bağlı bekletilen teslimat var mı (dosya, erişim, lisans)?'], guidance: 'Ödeme bitmeden devir yarım kalabilir — bekletilen kalem varsa riske yaz.' },
        { type: 'textarea', label: '3. Anlaşmadaki kalemlerden hangileri tamamen teslim edildi?', sub_items: ['Kalem kalem: bitti / kısmen / başlanmadı', "'Bitti' denilenler canlıda gösterilebilir mi?"], guidance: "'Kurulu' ile 'çalışıyor' aynı şey değil — beyanı ekranda doğrulat, ekran görüntüsü al." },
        { type: 'textarea', label: '4. Yarım kalan veya hiç başlanmayan işler neler?', sub_items: ['Her biri için: kim, ne zamana kadar bitirecek?', 'Bitirmesi ek ücrete mi tabi?'], guidance: 'Tarihsiz açık kalem = süresiz açık kalem. Tarih vermeden geçme.' },
        { type: 'textarea', label: '5. Anlaşma dışında kendi inisiyatifiyle extra bir şey yaptı mı?', sub_items: ['Ek modül, ayar, özelleştirme, içerik?', 'Bunlar belgelendi mi? İleride bakımı kime ait?'], guidance: 'Devirde en çok sürpriz dokümansız extra işlerden çıkar — özellikle sor, listeyi yazdır.' },
        { type: 'textarea', label: '6. Teslim sonrası garanti ve bakım ne durumda?', sub_items: ['Garanti süresi ve kapsamı?', 'Bakım anlaşması var mı — aylık ücret, kapsam?', 'Hata çıkarsa kim, hangi sürede müdahale eder?'], guidance: 'Garanti kapsamı belirsizse ilk arızada tartışma çıkar — şimdi netleştir.' },
        { type: 'textarea', label: '7. Devirden sonra IT firmasının rolü ne olacak?', sub_items: ['Tamamen çekiliyor mu, hosting/domain onda mı kalıyor?', 'Hangi konular için, hangi kanaldan ulaşacağım?'], guidance: 'Sorumluluk sınırını yazılı netleştir; işbirliği tonunu koru — teknik geçmiş onda.' },
      ],
    },
    {
      title: 'A1. Kurulum Envanteri & Sahiplik',
      guidance: 'Yeni kurulmuş site — amaç: eksiksiz teknik envanter + her bileşenin KİMİN ADINA olduğu haritası.',
      questions: [
        { type: 'textarea', label: '8. Hangi platform/sürüm kuruldu, hangi konfigürasyonla?', sub_items: ['Sürüm numarası birebir?', 'Güncellemelerden bundan sonra kim sorumlu?'], guidance: 'Sürümü not et — modül uyumluluğu ve güvenlik takibi buna bağlı.' },
        { type: 'textarea', label: '9. Hosting nerede, kimin adına, hangi koşullarla?', sub_items: ['Firma ve paket türü (shared/VPS/dedicated)?', 'cPanel/Plesk, FTP/SSH, veritabanı erişimleri kimde?', 'Sözleşme ve ödeme müşteri üzerinde mi, IT firması üzerinde mi?'], guidance: 'Hosting IT firması adına ise bağımlılık oluşur — devrini gündeme al.' },
        { type: 'textarea', label: '10. Alan adı kimin üzerine kayıtlı, DNS yönetimi kimde?', sub_items: ['Registrar hangisi, panel erişimi kimde?', 'E-posta (MX) kayıtları aynı yerden mi?'], guidance: 'SEO ve e-posta altyapısı için DNS erişimi gerekecek.' },
        { type: 'textarea', label: '11. Tema: hazır mı, özel mi? Lisans kimin adına?', sub_items: ['Child theme var mı, özelleştirmeler nereye yapıldı?', 'Yapılan özelleştirmelerin listesi alınabilir mi?'], guidance: 'Child theme yoksa tema güncellemesi özelleştirmeleri silebilir — risk bulgusudur.' },
        { type: 'textarea', label: '12. Kurulu modüllerin listesi + lisans durumu', sub_items: ['Ücretli modüllerin lisansları kimin adına?', 'Özel yazılmış modül/kod var mı? Kaynak + dokümantasyon teslim edildi mi?'], guidance: 'Modül listesinin ekran görüntüsünü iste. Lisans başkasının adına ise yenileme riskli.' },
        { type: 'textarea', label: '13. Admin hesapları kimde, bana erişim nasıl açılacak?', sub_items: ['Kaç hesap var, kimlere ait, hangi yetkilerle?', 'SuperAdmin erişimini kim, ne zaman açacak?'], guidance: 'Audit için tam görünürlük iste; tarihi erişim tablosuna yaz.' },
        { type: 'textarea', label: '14. Yedekleme ve güvenlik kurulumu yapıldı mı?', sub_items: ['Otomatik yedek kuruldu mu? Nereye, hangi sıklıkla?', 'SSL, admin 2FA, özel admin URL?'], guidance: 'Yeni kurulumda yedek çoğu zaman unutulur — yoksa raporda acil bulgu.' },
        { type: 'textarea', label: '15. Test/staging ortamı var mı?', sub_items: ['Yoksa değişiklikler canlıda mı test edilecek?'], guidance: 'Staging yoksa import ve SEO değişikliklerinde risk planı gerekir.' },
      ],
    },
    {
      title: 'A2. Kasa Sistemi & Webshop Entegrasyonu',
      guidance: "Görüşmenin en kritik teknik bölümü. Fiili durumu tarih + ekran görüntüsüyle belgele. 'Kurulu' ile 'çalışıyor' farkını net tespit et.",
      questions: [
        { type: 'textarea', label: '16. Kasa sistemi hangi yazılım?', sub_items: ['Özel geliştirme mi, hazır ürün mü (marka/sürüm)?', 'Donanım? Bulut mu lokal mi?', 'Lisans/abonelik modeli, kime fatura ediliyor?'], guidance: 'Hazır ürünse dokümantasyona ben de ulaşırım; özelse her şey geliştiriciye bağlı.' },
        { type: 'textarea', label: '17. Kasa–webshop bağlantısı teknik olarak nasıl kuruldu?', sub_items: ['API mi, DB mi, dosya (CSV/XML) mi, manuel mi?', 'Yön: kasa→web, web→kasa, çift yönlü?', 'Sıklık: anlık / saatlik / günlük / elle?'], guidance: 'Şemayla not et; çalışırken ekran görüntüsü veya log iste.' },
        { type: 'textarea', label: '18. Entegrasyon şu an fiilen çalışıyor mu?', sub_items: ['Son senkronizasyon ne zaman? Kanıt gösterilebilir mi?', 'Mevcut ürünler kasadan mı geldi, elle mi girildi?', 'Mağaza satışı webshop stoğundan düşüyor mu (ve tersi)?'], guidance: "EN ÖNEMLİ SORU. 'Kurulu ama aktif değil' cevabı da bir bulgudur — aynen belgele." },
        { type: 'textarea', label: '19. Ürün verisinin ana kaynağı (master) hangi sistem?', sub_items: ['Yeni ürün önce nereye girilir?', 'Fiyat nereden yönetilir? BTW oranları tutarlı mı?', 'Eşleştirme: barkod/EAN, SKU, referans?'], guidance: 'Master belirsizse çift veri girişi ve stok tutarsızlığı kaçınılmaz.' },
        { type: 'textarea', label: '20. Webshop siparişleri kasa/muhasebeye akıyor mu?', sub_items: ['Online sipariş kasada görünüyor mu? Fatura nereden kesiliyor?', 'Ödeme sağlayıcısı (iDEAL vb.) hangisi, hesap kimin adına?'], guidance: 'Ödeme sağlayıcısı hesabı müşteri adına olmalı — kontrol et.' },
        { type: 'textarea', label: '21. Entegrasyonun dokümantasyonu ve API anahtarları teslim edildi mi?', sub_items: ['API anahtarları, endpoint listesi, ayar ekranları paylaşılabilir mi?'], guidance: 'Yoksa görüşme notların ilk dokümantasyon olur — ekran görüntülerini o gün topla.' },
      ],
    },
    {
      title: 'A3. Ürün Verisi & Toplu Import',
      guidance: '1000+ ürün importu ayrı teklif edilecek — kasa tarafının ve sunucunun hazırlığını şimdiden öğren.',
      questions: [
        { type: 'textarea', label: '22. Şu an kaç ürün yüklü, nasıl girildi?', sub_items: ['Elle mi, CSV/Excel ile mi? Kim girdi?', 'Kategori yapısını kim, neye göre kurdu?', 'Veri kalitesi ne durumda (başlık, açıklama, görsel)?'], guidance: 'Mevcut ürünlerin veri kalitesi import stratejisini belirler — birkaç ürünü birlikte aç, bak.' },
        { type: 'textarea', label: '23. Toplu import için altyapı hazır mı?', sub_items: ['Import modülü kurulu mu? Webservice/API anahtarı açık mı?', "Tedarikçi feed'i bağlanırsa teknik engel var mı?", 'Sunucu limitleri (PHP memory, timeout) 1000+ ürüne hazır mı?'], guidance: '1000+ ürün geleceğini şimdiden söyle — limitler sonradan patlar.' },
        { type: 'textarea', label: '24. Feed ile eklenen ürünün kasada karşılığı gerekiyor mu?', sub_items: ["Webshop'a eklenen ürün kasada otomatik oluşuyor mu?", 'Gerekiyorsa kasada toplu ürün açma imkânı var mı?'], guidance: 'Bu cevap import projesinin kapsamını ve fiyatını doğrudan etkiler.' },
        { type: 'textarea', label: '25. Bilmem gereken başka teknik detay var mı?', sub_items: ['Bilinen hatalar, teknik borç, hassas noktalar?'], guidance: 'Açık uçlu kapanış — en değerli bilgi çoğu zaman buradan çıkar.' },
      ],
    },
    {
      title: 'B1. İşleyiş & Hedefler',
      guidance: 'Sistemi müşterinin gerçek çalışma şekline ve hedeflerine göre kuracağım — geçmiş performans değil, mevcut düzen + hedef.',
      questions: [
        { type: 'textarea', label: '26. Mağaza bugün nasıl çalışıyor, satışlar hangi kanallardan geliyor?', sub_items: ['Mağaza / DM / WhatsApp / telefon dağılımı?', 'Webshop dışı satışlar kaydediliyor mu, nereye?'], guidance: "Kayıtsız satış kanalları raporda 'kaçan veri' olarak geçer." },
        { type: 'textarea', label: '27. Sosyal medyayı bundan sonra fiilen kim yönetecek?', sub_items: ['Hangi hesaplar aktif, şu an kim paylaşıyor?', 'İçerik kararlarını kim verecek, onay akışı nasıl olacak?'], guidance: 'AI içerik sistemini kuracağım kişiyi/akışı tanımam gerekiyor.' },
        { type: 'textarea', label: '28. Öncelikli ürünler/kategoriler hangileri?', sub_items: ['En çok satan / en çok sorulan ürünler?', "Online'da öne çıkarmak istedikleri kategori?"], guidance: 'İçerik ve SEO önceliklendirmesi bu cevaba göre.' },
        { type: 'textarea', label: '29. Görsel materyal ve kampanya düzeni ne durumda?', sub_items: ['Ürün fotoğraflarını kim çekiyor? Tedarikçiden hazır görsel/katalog var mı?', 'İndirim/kampanya kararını kim veriyor?', 'Mağaza ve web fiyatları aynı mı olacak?'], guidance: 'İçerik üretimi için ham materyal, otomasyon kuralları için fiyat/kampanya düzeni gerekiyor.' },
      ],
    },
    {
      title: 'B2. Hesaplar & Erişim Envanteri',
      guidance: 'Şifre alma/kaydetme YOK. Meta Business Suite ve TikTok Business üzerinden partner/yönetici daveti iste.',
      questions: [
        { type: 'textarea', label: '30. Sosyal medya hesaplarının durumu', sub_items: ['Instagram: kullanıcı adı? Business mi? FB sayfasına bağlı mı?', 'TikTok: kullanıcı adı? Business mi? Kime kayıtlı?', 'Facebook sayfası / Meta Business Suite yöneticisi kim?'], guidance: "Kişisel hesapsa business'a geçiş ilk iş olacak." },
        { type: 'textarea', label: '31. Google tarafında neler mevcut?', sub_items: ['Google Business Profile var mı, yöneticisi kim?', 'Analytics / Search Console hiç bağlandı mı?'], guidance: 'Yoksa nulmeting sırasında kurulacak — sıfır ölçüm için bile gerekli.' },
        { type: 'textarea', label: '32. E-posta ve iletişim altyapısı', sub_items: ['Kurumsal e-posta adresi var mı, kim okuyor?', 'WhatsApp Business kullanılıyor mu, hangi numarayla?'], guidance: 'Müşteri iletişim otomasyonu için başlangıç noktası.' },
        {
          type: 'table', label: '33. Erişim Takip Tablosu', sub_items: [],
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
        { type: 'checklist', label: 'Kontrol listesi', sub_items: ['Anlaşma kapsamı kalem kalem çıkarıldı: teslim edilen / yarım / başlanmayan', 'Anlaşma dışı (extra) işlerin listesi ve dokümantasyon durumu netleşti', 'Garanti/bakım kapsamı ve IT firmasının devir sonrası rolü netleşti', 'Kasa–webshop entegrasyonunun fiili durumu tespit edildi (çalışıyor / kısmen / aktif değil)', 'Ekran görüntüleri toplandı (modüller, senkronizasyon, kullanıcılar)', 'Hosting, alan adı ve lisansların sahiplik haritası çıkarıldı', 'Erişim davetleri için kişi + tarih belirlendi', 'Yarım işler için sorumlu + tarih listesi yazıldı'], guidance: '' },
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

// Discovery Hub seed verisi. İlk API çağrısında (boş DB'de) idempotent yüklenir;
// SEED_VERSION artınca mevcut şablon güncellenir (discovery.js upgradeSeed).
// Şablon soruları jenerik yazıldı ("webshop", "IT firması") — aynı şablon
// gelecekteki müşteriler için de kullanılır; müşteriye özel detaylar görüşme
// sırasında cevaplara girilir.
//
// v2 (2026-08-06): "eski site devri" varsayımı kaldırıldı — site YENİ kurulmuş
// senaryosuna göre yeniden yazıldı.
// v3 (2026-08-06): profesyonel ton geçişi. Bedel/ödeme sorusu çıkarıldı
// (başka firmanın ticari anlaşması bizi ilgilendirmez); IT-firması soruları
// denetçi değil devralan-partner tonunda; müşteri soruları (B1) hedef ve
// işleyiş odaklı sohbet sorularına dönüştürüldü.
// v4 (2026-08-06): teklif kapsamına hizalandı (Nulmeting AAI-26915 + 12 aylık
// Growth Partner). Sosyal medya yönetimini AanloopAI devralıyor → "kim
// yönetecek" yerine hesap devri + onay akışı + AI influencer/marka dili
// tercihleri; mevcut TikTok/IG performans sorusu geri geldi (kanaal-analizi
// kapsamda); tedarikçi (feed/katalog) kontak sorusu eklendi.

// v5 (2026-08-06): soru içeriği v4 ile aynı; sürüm artışı tek seferlik
// doküman temizliği için — müşteri başına seed-şablonu dokümanı teke düşer
// (çoğaltma hatası düzeltmesi, discovery.js upgradeSeed).

export const SEED_VERSION = 5;

export const SEED_TEMPLATE = {
  name: 'Teknik Devir & Keşif Görüşmesi',
  description: 'Yeni müşteri onboarding: yeni kurulmuş webshop devri — anlaşma/teslimat envanteri, IT sağlayıcısından teknik devir, operasyonel bilgi ve erişim envanteri.',
  sections: [
    {
      title: 'A0. Teslimat & Devir Kapsamı',
      guidance: 'IT firmasıyla, devralan partner tonunda: amaç mevcut kurulumun sınırlarını ve açık kalemleri netleştirmek. Ticari detaylar (bedel, ödeme) bizi ilgilendirmez — sorulmaz.',
      questions: [
        { type: 'textarea', label: '1. Teslimat kapsamına neler dahil?', sub_items: ['Kurulum, tema/tasarım, ürün girişi, kasa entegrasyonu, eğitim, bakım — hangileri kapsamda?'], guidance: 'Kapsamı bilmek çift iş yapmayı ve boşluk kalmasını önler — devir planının temeli.' },
        { type: 'textarea', label: '2. Bugün itibarıyla neler tamamen hazır, neler devam ediyor?', sub_items: ['Hazır olanlar canlıda birlikte bakabilir miyiz?', 'Devam edenler için öngörülen tarih ne?'], guidance: "'Kurulu' ile 'çalışıyor' aynı şey değil — birlikte ekrandan bakmak en sağlıklısı." },
        { type: 'textarea', label: '3. Kapsam dışında yapılmış özelleştirme veya ekleme var mı?', sub_items: ['Ek modül, özel ayar, özel kod?', 'Bunlar dokümante edildi mi, ileride bakımı kimde olacak?'], guidance: 'Devirde sürprizler çoğu zaman dokümansız özelleştirmelerden çıkar — nazikçe listeyi iste.' },
        { type: 'textarea', label: '4. Bir hata veya arıza çıkarsa süreç nasıl işliyor?', sub_items: ['Teslim sonrası destek/garanti süresi ve kapsamı?', 'Hangi kanaldan, ne kadar sürede dönüş yapılıyor?'], guidance: 'Destek sınırı şimdi netleşirse ilk arızada kimse zor durumda kalmaz.' },
        { type: 'textarea', label: '5. Devir sonrası rolünüz ne olacak?', sub_items: ['Hosting/alan adı sizde mi kalıyor, devri düşünülüyor mu?', 'Hangi konularda size ulaşmaya devam edelim?'], guidance: 'İşbirliği tonunu koru — teknik geçmiş onlarda, iyi ilişki herkesin yararına.' },
        { type: 'textarea', label: '6. İleride hangi konularda birlikte çalışabiliriz?', sub_items: ['Roller nasıl tamamlanır: teknik bakım/geliştirme sizde, pazarlama/AI bizde?', 'Başka müşterilerde de birlikte çalışma potansiyeli var mı?'], guidance: 'AK IT ile ileride pek çok ortak iş olasılığı var — bu görüşme aynı zamanda ilişki kurma görüşmesi. Kapıyı açık bırak, somut bir sonraki adım öner.' },
      ],
    },
    {
      title: 'A1. Teknik Envanter & Sahiplik',
      guidance: 'Amaç: eksiksiz teknik envanter + her bileşenin kimin adına olduğu haritası. Çalışmaya başlamak için neye erişmemiz gerektiğini bu bölüm belirler.',
      questions: [
        { type: 'textarea', label: '7. Hangi platform ve sürüm kurulu?', sub_items: ['Sürüm numarası birebir?', 'Güncellemeler bundan sonra kimin sorumluluğunda olacak?'], guidance: 'Sürüm; modül uyumluluğu ve güvenlik takibinin başlangıç noktası.' },
        { type: 'textarea', label: '8. Hosting nerede ve kimin adına?', sub_items: ['Paket türü (shared/VPS/dedicated)?', 'Panel (cPanel/Plesk), FTP/SSH, veritabanı erişimleri kimde?', 'Hosting sözleşmesi müşteri adına mı, IT firması adına mı?'], guidance: 'Hosting IT firması adına ise bağımlılık oluşur — devri nazikçe gündeme al.' },
        { type: 'textarea', label: '9. Alan adı kimin üzerine kayıtlı, DNS yönetimi kimde?', sub_items: ['Registrar hangisi, panel erişimi kimde?', 'E-posta (MX) kayıtları aynı yerden mi yönetiliyor?'], guidance: 'SEO ve e-posta altyapısı için DNS erişimi gerekecek.' },
        { type: 'textarea', label: '10. Tema ve lisans durumu ne?', sub_items: ['Hazır tema mı, özel tasarım mı? Lisans kimin adına?', 'Child theme var mı; özelleştirmeler nereye yapıldı?'], guidance: 'Child theme yoksa tema güncellemesi özelleştirmeleri silebilir — not et.' },
        { type: 'textarea', label: '11. Kurulu modüller ve lisansları', sub_items: ['Modül listesi (ekran görüntüsü ideal)?', 'Ücretli modüllerin lisansları kimin adına?', 'Özel yazılmış kod varsa kaynak + dokümantasyon devredilebilir mi?'], guidance: 'Lisans başka firma adına ise yenileme döneminde sorun çıkar — şimdi haritala.' },
        { type: 'textarea', label: '12. Admin hesapları ve bizim erişimimiz', sub_items: ['Kaç admin hesabı var, kimlerde?', 'Bize hangi seviyede erişim, kim, ne zaman açacak?'], guidance: 'Çalışmaya başlamak için tam görünürlük gerekiyor; kişi + tarihi erişim tablosuna yaz.' },
        { type: 'textarea', label: '13. Yedekleme ve güvenlik kurulumu yapıldı mı?', sub_items: ['Otomatik yedek var mı — nereye, hangi sıklıkla?', 'SSL, admin girişinde ek güvenlik (2FA vb.)?'], guidance: 'Yeni kurulumda yedek çoğu zaman unutulur — yoksa öncelikli bulgu.' },
        { type: 'textarea', label: '14. Test/staging ortamı var mı?', sub_items: ['Yoksa değişiklikleri canlıda mı test edeceğiz?'], guidance: 'Staging yoksa import ve SEO değişikliklerinde risk planı gerekir.' },
      ],
    },
    {
      title: 'A2. Kasa Sistemi & Webshop Entegrasyonu',
      guidance: "Görüşmenin en kritik teknik bölümü. Fiili durumu birlikte ekrana bakarak tespit et; 'kurulu' ile 'çalışıyor' farkını nazikçe netleştir.",
      questions: [
        { type: 'textarea', label: '15. Kasa sistemi hangi yazılım?', sub_items: ['Hazır ürün mü (marka/sürüm), özel geliştirme mi?', 'Bulut mu, lokal mi? Hangi donanımla?', 'Lisans/abonelik kimin adına?'], guidance: 'Hazır ürünse dokümantasyona biz de ulaşabiliriz; özel geliştirmeyse geliştiriciyle ilişki daha da değerli.' },
        { type: 'textarea', label: '16. Kasa–webshop bağlantısı teknik olarak nasıl kuruldu?', sub_items: ['API mi, veritabanı mı, dosya (CSV/XML) mi, manuel mi?', 'Yön: kasa→web, web→kasa, çift yönlü?', 'Sıklık: anlık / saatlik / günlük?'], guidance: 'Küçük bir şema çiz; mümkünse ayar ekranının görüntüsünü al.' },
        { type: 'textarea', label: '17. Entegrasyon şu an fiilen çalışıyor mu?', sub_items: ['Son senkronizasyon ne zaman oldu — birlikte bakabilir miyiz?', 'Mevcut ürünler kasadan mı geldi, elle mi girildi?', 'Mağaza satışı webshop stoğundan düşüyor mu (ve tersi)?'], guidance: "En önemli soru. 'Kurulu ama henüz aktif değil' de tamamen normal bir cevap — durumu olduğu gibi not et." },
        { type: 'textarea', label: '18. Ürün verisinin ana kaynağı (master) hangi sistem?', sub_items: ['Yeni ürün önce nereye girilir?', 'Fiyat nereden yönetilir? BTW oranları tutarlı mı?', 'Eşleştirme: barkod/EAN, SKU?'], guidance: 'Master belirsizse çift veri girişi ve stok tutarsızlığı kaçınılmaz — import projesinden önce netleşmeli.' },
        { type: 'textarea', label: '19. Online siparişler kasaya/faturalamaya nasıl akıyor?', sub_items: ['Online sipariş kasada görünüyor mu? Fatura nereden kesiliyor?', 'Ödeme sağlayıcısı (iDEAL vb.) hangisi, hesap müşteri adına mı?'], guidance: 'Ödeme sağlayıcısı hesabının müşteri adına olması gerekir — değilse nazikçe not et.' },
        { type: 'textarea', label: '20. Entegrasyonun dokümantasyonu ve API bilgileri devredilebilir mi?', sub_items: ['API anahtarları, endpoint listesi, ayar ekranları?'], guidance: 'Dokümantasyon yoksa bu görüşmenin notları ilk dokümantasyon olur — ekran görüntülerini aynı gün topla.' },
      ],
    },
    {
      title: 'A3. Ürün Verisi & Toplu Import',
      guidance: '1000+ ürün importu ayrı teklif edilecek — kasa tarafının ve sunucunun hazırlığını şimdiden öğren.',
      questions: [
        { type: 'textarea', label: '21. Şu an kaç ürün yüklü ve nasıl girildi?', sub_items: ['Elle mi, CSV/Excel ile mi? Kim girdi?', 'Kategori yapısını kim, neye göre kurdu?', 'Veri kalitesi ne durumda (başlık, açıklama, görsel)?'], guidance: 'Mevcut ürünlerin veri kalitesi import stratejisini belirler — birkaç ürünü birlikte açıp bakın.' },
        { type: 'textarea', label: '22. Toplu import için altyapı hazır mı?', sub_items: ['Import modülü kurulu mu? Webservice/API anahtarı açık mı?', "Tedarikçi feed'i bağlanırsa teknik engel var mı?", 'Sunucu limitleri (PHP memory, timeout) 1000+ ürüne hazır mı?'], guidance: '1000+ ürün planını şimdiden paylaş — limitler sonradan sürpriz yapmasın.' },
        { type: 'textarea', label: '23. Feed ile eklenen ürünün kasada karşılığı gerekiyor mu?', sub_items: ["Webshop'a eklenen ürün kasada otomatik oluşuyor mu?", 'Gerekiyorsa kasada toplu ürün açma imkânı var mı?'], guidance: 'Bu cevap import projesinin kapsamını ve fiyatını doğrudan etkiler.' },
        { type: 'textarea', label: '24. Bilmemiz gereken başka teknik konu var mı?', sub_items: ['Bilinen hatalar, geçici çözümler, hassas noktalar?'], guidance: 'Açık uçlu kapanış — en değerli bilgi çoğu zaman buradan çıkar.' },
      ],
    },
    {
      title: 'B1. İş Hedefleri & Günlük İşleyiş',
      guidance: 'Müşteriyle sohbet tonunda: sistemi onların gerçek çalışma düzenine ve hedeflerine göre kuracağız. Dinle, not al, vaat etme — tasarım sonra.',
      questions: [
        { type: 'textarea', label: '25. Webshoptan beklentiniz ne — 6-12 ay sonra neresi "başarı" olur?', sub_items: ['Öncelik hangisi: online satış, bilinirlik, mağazaya müşteri çekmek?', 'Aklınızda somut bir hedef var mı (aylık sipariş, ciro)?'], guidance: 'Hedef, tüm önceliklendirmenin pusulası — rakam veremezlerse yön tarifi de yeterli.' },
        { type: 'textarea', label: '26. Müşterileriniz kimler, size en çok nereden ulaşıyorlar?', sub_items: ['Mağaza / Instagram DM / WhatsApp / telefon — dağılım nasıl?', 'Webshop dışındaki satışlar bir yere kaydediliyor mu?'], guidance: 'Kayıt dışı kanallar raporda "görünmeyen ciro" olarak yer alır — yargılamadan not et.' },
        { type: 'textarea', label: '27. Hangi ürünler ve kategoriler sizin için öncelikli?', sub_items: ['En çok satan ve en çok sorulan ürünler?', "Online'da özellikle öne çıkarmak istedikleriniz?", 'Hangi markaların bayisisiniz — tedarikçiden ürün verisi (feed/katalog) isteyebileceğimiz bir kontak var mı?'], guidance: 'İçerik ve SEO önceliklendirmesi bu cevaba göre. Tedarikçi kontağı, ürün-verisi araştırması (nulmeting kapsamı) için gerekli.' },
        { type: 'textarea', label: '28. Sosyal medyada bugüne kadar ne işe yaradı?', sub_items: ['En çok izlenen/etkileşim alan içerikler hangileriydi (özellikle TikTok)?', 'Oradan gelen ilgi satışa dönüyor mu — DM, mağaza ziyareti?'], guidance: 'TikTok zaten potansiyel göstermiş; kanal analizinin kıyas noktası için mevcut rakamları ve tutan içerik türünü not et.' },
        { type: 'textarea', label: '29. Sosyal medya yönetimini devralıyoruz — devri ve onay akışını nasıl kuralım?', sub_items: ['Hesap erişimlerini ne zaman devralabiliriz (kişi + tarih)?', 'İçerikler yayına girmeden onayınızdan geçsin mi, yoksa plan onayı yeterli mi?', 'Onayı kim verir, ne kadar hızlı dönebilirsiniz?'], guidance: 'Yönetim bizde olacak — dar boğaz genelde onay hızıdır; akışı en baştan hafif kur.' },
        { type: 'textarea', label: '30. AI influencer ve marka dili için tercihleriniz neler?', sub_items: ['Markanızı temsil edecek dijital karakter nasıl olmalı — tarz, yaş, dil (NL/TR)?', 'İçeriklerde kaçınmamız gerekenler var mı (fiyat paylaşımı, belirli ürünler, rakipler)?'], guidance: 'AI influencer paket kapsamında — tercihleri şimdi almak konsept turunu kısaltır. Vaat verme, seçenekleri sonra sun.' },
        { type: 'textarea', label: '31. Elinizde hangi görsel malzemeler var?', sub_items: ['Ürün fotoğraflarını kim çekiyor? Profesyonel çekim var mı?', 'Tedarikçilerden hazır görsel/katalog alınabiliyor mu?', 'Mağazada çekim yapmamıza açık mısınız?'], guidance: 'İçerik üretiminin ham maddesi — ne varsa listele, eksiği çekim planıyla kapatırız.' },
        { type: 'textarea', label: '32. Kampanya ve fiyat düzeniniz nasıl işliyor?', sub_items: ['İndirim/kampanya kararını kim veriyor, ne sıklıkla?', 'Mağaza ve web fiyatları aynı mı olacak?'], guidance: 'Otomasyon kuralları buna göre tasarlanacak.' },
      ],
    },
    {
      title: 'B2. Hesaplar & Erişim Envanteri',
      guidance: 'Şifre alma/kaydetme YOK. Meta Business Suite ve TikTok Business üzerinden partner/yönetici daveti iste.',
      questions: [
        { type: 'textarea', label: '33. Sosyal medya hesaplarının durumu', sub_items: ['Instagram: kullanıcı adı? Business hesap mı? FB sayfasına bağlı mı?', 'TikTok: kullanıcı adı? Business mi? Kime kayıtlı?', 'Facebook sayfası / Meta Business Suite yöneticisi kim?', 'Devir şekli: tam yönetici mi, partner erişimi mi?'], guidance: "Kişisel hesapsa business'a geçiş ilk adım — yönetimi devralacağımız için yönetici seviyesi erişim gerekli." },
        { type: 'textarea', label: '34. Google tarafında neler mevcut?', sub_items: ['Google Business Profile var mı, yöneticisi kim?', 'Analytics / Search Console hiç bağlandı mı?'], guidance: 'Yoksa başlangıç ölçümü (nulmeting) sırasında kurulacak.' },
        { type: 'textarea', label: '35. E-posta ve iletişim altyapısı', sub_items: ['Kurumsal e-posta adresi var mı, kim okuyor?', 'WhatsApp Business kullanılıyor mu, hangi numarayla?'], guidance: 'Müşteri iletişim otomasyonunun başlangıç noktası.' },
        {
          type: 'table', label: '36. Erişim Takip Tablosu', sub_items: [],
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
        { type: 'checklist', label: 'Kontrol listesi', sub_items: ['Teslimat kapsamı ve açık kalemler (sorumlu + tarih) netleşti', 'Kapsam dışı özelleştirmelerin listesi ve dokümantasyon durumu alındı', 'Destek/garanti süreci ve IT firmasının devir sonrası rolü netleşti', 'AK IT ile gelecek işbirliği için somut bir sonraki adım konuşuldu', 'Kasa–webshop entegrasyonunun fiili durumu tespit edildi (çalışıyor / kısmen / aktif değil)', 'Ekran görüntüleri toplandı (modüller, senkronizasyon, kullanıcılar)', 'Hosting, alan adı ve lisansların sahiplik haritası çıkarıldı', 'Erişim davetleri için kişi + tarih belirlendi (sosyal medya devri dahil)', 'İçerik onay akışı ve marka dili tercihleri not edildi', 'Tedarikçi (feed/katalog) kontak bilgileri alındı', 'Müşterinin hedefi ve öncelikli ürünleri not edildi', 'Nulmeting raporu sunumu için tarih planlandı'], guidance: '' },
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

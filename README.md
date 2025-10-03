# TakoTakip

## Tanıtım

TakoTakip, profesyonel sürücülerin çalışma faaliyetlerini takip etmelerine ve takograf yönetmeliklerine (EC 561/2006 ve AETR) uymalarına yardımcı olmak için tasarlanmış web tabanlı bir uygulamadır. Sürüş, mola, dinlenme ve diğer işler gibi faaliyetlerin manuel olarak kaydedilmesine olanak tanır ve kalan süreler ile potansiyel ihlaller hakkında gerçek zamanlı geri bildirim sağlar.

**Önemli Not:** Tüm verileriniz tarayıcınızın yerel depolama alanında (`localStorage`) saklanır. Bu, bilgilerinizin gizli olduğu ve yalnızca cihazınızda kaldığı anlamına gelir. İnternet bağlantısı olmadan da çalışır.

## Ana Özellikler

- **Faaliyet Kaydı:** `Sürüş`, `Mola`, `Dinlenme`, `Diğer İş` gibi çalışma faaliyetlerini manuel olarak ekleyin, düzenleyin ve silin.
- **Gerçek Zamanlı Durum Özeti:** Kalan sürüş/çalışma sürelerini (kesintisiz, günlük, haftalık, iki haftalık) gösteren kapsamlı bir pano.
- **İhlal Bildirimleri:** Sürüş süresi, mola ve dinlenme süresi kurallarının ihlali durumunda anında bildirimler.
- **Hak Takibi:** Uzatılmış günlük sürüş, uzatılmış çalışma süreleri ve azaltılmış günlük dinlenmeler gibi özel hakların kullanımını otomatik olarak takip eder.
- **Dinlenme Telafisi:** Azaltılmış haftalık dinlenmeler için gereken telafiyi ve son tarihleri hesaplar ve takip eder.
- **Raporlama:** Belirli tarih aralıkları için faaliyet dağılımını analiz etmek ve o dönemde meydana gelen ihlalleri gözden geçirmek için raporlar oluşturun.
- **Kalıcı Veri Saklama:** Tüm verileriniz yerel olarak kaydedilir, böylece tarayıcıyı kapatıp kaldığınız yerden devam edebilirsiniz.
- **Karanlık Mod:** Rahat bir görüntüleme deneyimi için sisteminizin tercih ettiği renk şemasına otomatik olarak uyum sağlar.

## Nasıl Kullanılır?

Uygulamayı etkili bir şekilde kullanmak için aşağıdaki adımları izleyin.

### 1. Vardiyaya Başlama

- Uygulamayı ilk açtığınızda veya bir önceki vardiyanız bittiğinde, sağ üst köşedeki **"Yeni Faaliyet"** düğmesine tıklayın.
- Açılan formda, faaliyet türü olarak **"İşe Başlama"** seçeneğini seçin.
- Başlangıç zamanını doğru bir şekilde ayarlayın ve **"Kaydet"** düğmesine tıklayın. Bu, yeni çalışma periyodunuzu başlatır.

### 2. Faaliyetleri Kaydetme

- Vardiyanız boyunca yaptığınız her aktiviteyi kaydedin:
  - **Sürüş:** Araç kullanmaya başladığınızda.
  - **Mola:** Kısa ara verdiğinizde (örneğin 15 veya 45 dakika).
  - **Dinlenme:** Günlük veya haftalık dinlenmeye başladığınızda.
  - **Diğer İş:** Yükleme, bekleme gibi sürüş dışı işler yaptığınızda.
- **Devam Eden Faaliyet:** Bir faaliyeti eklerken **"Bitiş Zamanı"** alanını boş bırakırsanız, uygulama o faaliyeti devam ediyor olarak kabul eder ve süreyi gerçek zamanlı olarak hesaplar.
- **Faaliyet Zincirleme:** Bir faaliyetin bitiş zamanını girdiğinizde, formun altında **"Sonraki Faaliyeti Zincirle"** seçeneği belirir. Bu kutucuğu işaretleyerek, mevcut faaliyet biter bitmez başlayacak olan yeni bir faaliyeti tek seferde ekleyebilirsiniz. Bu, örneğin 4.5 saatlik sürüşün ardından hemen 45 dakikalık mola eklemek için çok kullanışlıdır.

### 3. Panoyu İzleme

- Ana ekrandaki **"Mevcut Durum Özeti"** paneli en önemli yardımcınızdır:
  - **Kalan Süreler:** Kalan kesintisiz sürüş, günlük sürüş ve günlük çalışma sürelerinizi buradan takip edebilirsiniz.
  - **Haftalık Limitler:** Haftalık ve iki haftalık sürüş limitlerinize ne kadar kaldığını gösteren dairesel grafiklere göz atın.
  - **Kullanılabilir Haklar:** Bu hafta kaç kez uzatılmış sürüş (10 saat) veya uzatılmış mesai (15 saat) hakkınız kaldığını ve bir sonraki haftalık dinlenmenize kadar kaç kez kısaltılmış günlük dinlenme (9 saat) yapabileceğinizi buradan görün.
  - **Sonraki Eylem Önerisi:** Panonun en altındaki kutucuk, mevcut durumunuza göre yapmanız gereken bir sonraki eylem hakkında (örneğin "Bir sonraki molanıza X dakika kaldı" veya "ACİLEN mola vermelisiniz!") size tavsiyelerde bulunur.

### 4. Bildirimleri Kontrol Etme

- **"Bildirimler"** paneli, yaptığınız veya yapmak üzere olduğunuz kural ihlallerini gösterir.
- **Kırmızı (İhlal):** Yönetmeliklere aykırı bir durum olduğunu belirtir.
- **Sarı (Uyarı):** Bir limite yaklaştığınızı veya bir hakkı kullandığınızı belirtir.
- **Camgöbeği (Bilgi):** Genel bilgilendirme mesajlarıdır.

### 5. Vardiyayı Bitirme

- Günlük çalışmanız sona erdiğinde, **"Yeni Faaliyet"** ekleyerek türünü **"İş Bitimi"** olarak seçin.
- Bitiş zamanını girerek kaydedin. Bu, çalışma periyodunuzu sonlandırır ve bir sonraki "İşe Başlama" faaliyetine kadar sayacı durdurur.

### 6. Düzenleme ve Silme

- Bir faaliyeti yanlış girdiyseniz, **"Faaliyet Listesi"** panelinde ilgili faaliyetin yanındaki **kalem simgesine** tıklayarak düzenleyebilirsiniz.
- Faaliyeti tamamen kaldırmak için **çöp kutusu simgesine** tıklayın.

### 7. Ayarlar ve Raporlar

- **Ayarlar (Dişli Simgesi):** Yeni faaliyet eklerken otomatik olarak uygulanacak varsayılan süreleri (örn. mola için 45 dakika) buradan ayarlayabilirsiniz.
- **Raporlar (Grafik Simgesi):** Belirli bir tarih aralığı seçerek o dönemdeki toplam sürüş, çalışma, mola ve dinlenme sürelerinizi görüntüleyebilir, faaliyet dağılımını pasta grafiği üzerinde görebilir ve o dönemde yapılan ihlallerin bir listesini alabilirsiniz.

## Teknik Detaylar

- **Teknoloji:** React, TypeScript, Tailwind CSS
- **Veri Depolama:** Tarayıcı `localStorage` API'si. Verileriniz dışarıya gönderilmez.
- **Çevrimdışı Çalışma:** Uygulama bir kez yüklendikten sonra internet bağlantısı olmadan da çalışmaya devam eder.

## Yasal Uyarı

Bu uygulama bir **yardımcı araçtır** ve **resmi takograf cihazının yerini tutmaz**. Hesaplamalar EC 561/2006 ve AETR yönetmeliklerine dayanmaktadır, ancak kullanıcılar verilerini doğru girmekten ve geçerli tüm yasalara uymaktan tek başlarına sorumludur.

Geliştirici, bu uygulamanın kullanımından veya yanlış kullanımından kaynaklanabilecek herhangi bir ceza veya yasal sorundan sorumlu değildir. Her zaman resmi yönetmeliklere ve şirket politikalarınıza başvurun.

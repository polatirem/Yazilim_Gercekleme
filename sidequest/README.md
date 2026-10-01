# Sidequest

**Gerçek dünyada geçen bir zihin macerası.**
Dünya oyun tahtası. Eylemlerin oyunun kendisi. Keşfettiğin şey zihnin.

Sidequest sana çoğu ekranın *dışında* geçen kısa görevler verir:
**Düşün** (burada bir dakikalık hazırlık) → **Yap** (dışarıda, cihaz kenarda) → **Keşfet** (geri dön, hatırla, neler olduğunu gör).
Tamamlanan görevler soyut bir haritayı, **Şehir**'i açar; **Yolculuk**'u doldurur ve olguları **Kodeks**'e yazar.

Beyin eğitimi uygulaması, test ya da tıbbi araç değildir. Ayrıntılar: [docs/PRODUCT.md](docs/PRODUCT.md).

## İçerik

- **4 kampanya, 28 görev** (Sezon 01 — Uyan): Otopilotu Kır (Haritacı), Gözlemci (Gözcü), Zaman Bükücü (Saatçi), Sahadaki Hafıza (Arşivci)
- **16 Kodeks keşfi**, her biri en az bir görevden ulaşılabilir
- **8 renkli mekân**; her mekân, kampanya ve keşif kendi rengine sahip
- **Oyun Alanı**: 6 mikro oyun, 3 zorluk seviyesi, cihazda tutulan kişisel rekorlar
- **Günün Görevi**: her gün Şehir'de yeni bir davet
- **Gizemli Görev**: yalnızca gereksinimleri görerek kabul edilen, mühürlü görevler

## Çalıştırma

Node 20.9+ gerekir (Node 24 ile geliştirildi). Komutları **`sidequest` klasörünün içinde** çalıştır:

```bash
cd sidequest
npm install
npm run dev          # http://localhost:3000
```

Üretim sürümü:

```bash
npm run build
npm start
```

Denetimler:

```bash
npm run typecheck    # rota tipleri + tsc
npm run lint         # eslint, sıfır uyarı
npm test             # vitest: oyun sistemleri ve 28 görevin tamamı
npm run check        # hepsi + üretim derlemesi
```

Uçtan uca (gerçek tarayıcı; varsayılan olarak kurulu Edge, Chrome için `BROWSER_CHANNEL=chrome`):

```bash
npm run build && npm start                   # bir terminalde
BASE_URL=http://localhost:3000 npm run e2e   # zorunlu tam döngü
SIDEQUEST_DEMO=1 npm start                   # sonra: node e2e/tour.mjs → her ekranın ekran görüntüsü
```

## Demo araçları

`/dev` (geliştirme sürümünde ya da üretimde `SIDEQUEST_DEMO=1` ile): ilerlemeyi sıfırla, tanıtımı atla, görev tamamla, her yeri aç, N dakika sonra dönüşü simüle et, keşif tetikle, aktif görevi ve Bağlam Motoru puanlarını incele. Simüle edilen görevler Yolculuk'ta "Simüle" olarak etiketlenir. Normal üretim sürümünde `/dev` 404 döner.

## Belgeler

`docs/` klasöründeki mimari ve tasarım belgeleri (İngilizce) hâlâ geçerlidir; aşağıdaki güncellemeler eklenmiştir:

| Belge | İçerik |
| --- | --- |
| [PRODUCT.md](docs/PRODUCT.md) | Vizyon, döngü, konumlandırma, bilgi mimarisi |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Katmanlar, durum ayrımı, klasörler |
| [QUEST_SYSTEM.md](docs/QUEST_SYSTEM.md) | Görev şeması, durum makinesi, motorlar, keşifler, bağlam motoru |
| [DATA_MODEL.md](docs/DATA_MODEL.md) | Varlıklar, hedef PostgreSQL şeması, olaylar ve metrikler |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Token'lar, tipografi, hareket, erişilebilirlik |
| [CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md) | Görev yazım kuralları |
| [SAFETY.md](docs/SAFETY.md) | Güvenlik kuralları ve gizlilik |
| [MVP.md](docs/MVP.md) | Yapılanlar, ertelenenler, sonraki aşama |

**Renk sistemi (yeni):** `src/styles/tokens.css` içinde 8 şehir tonu (`--hue-vermilion`, `--hue-teal`, `--hue-indigo`, `--hue-amber`, `--hue-saffron`, `--hue-magenta`, `--hue-green`, `--hue-violet`), her birinin `-deep` (koyu, yazı/zemin) ve `-wash` (açık zemin) hâli. Bir öğeye `data-hue="teal"` verildiğinde altındaki her bileşen `--hue`, `--hue-deep`, `--hue-wash` değişkenleriyle o renge bürünür.

**Dil:** Arayüz ve tüm içerik Türkçedir. Güvenlik motoru yasaklı ifadeleri Türkçe metin üzerinde (Türkçe küçük harf dönüşümüyle) tarar.

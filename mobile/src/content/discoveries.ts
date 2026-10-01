/**
 * Kodeks'e girebilecek bilişsel olgular.
 * Dil kuralı: olgular görevler tarafından *gösterilir*; oyuncuya asla bir özellik
 * ya da tanı olarak yüklenmez. Her kaydın bir çekincesi vardır.
 */
import type { Discovery } from "@/domain/content-types";

export const DISCOVERIES: Discovery[] = [
  {
    id: "habituation",
    number: 1,
    title: "Alışma",
    summary: "Hep aynı kalan şey fark edilmez olur.",
    explanation:
      "Bir şey değişmediğinde beyin ona giderek daha az tepki verir. Bu, dikkati yeni olana ayırır — tanıdık bir odanın, yolun ya da uğultunun neredeyse görünmez olması bu yüzdendir.",
    caveat: "Alışma sıradan ve yararlıdır. Onu fark etmek, bir şeylerin yanlış olduğu anlamına gelmez.",
    figure: "habituation",
    hue: "amber",
    hint: "Fazla iyi bildiğin yollarda bekler.",
  },
  {
    id: "capture-error",
    number: 2,
    title: "Yakalama Hatası",
    summary: "Güçlü bir alışkanlık zayıf bir planın önüne geçer.",
    explanation:
      "Gündelik sürçmeleri inceleyen araştırmacılar, sık yapılan bir rutinin bir eylemi 'yakaladığı' anları anlatır: her zamanki düğmeye uzanmak, her zamanki yöne sapmak. Dikkat başka yerdeyken daha sık olur.",
    caveat: "Herkes bu sürçmeleri yaşar. Genellikle bir rutinin ne kadar iyi öğrenildiğini gösterirler.",
    figure: "capture-error",
    hue: "vermilion",
    hint: "Rutinlerin söküldüğü yerde bulunur.",
  },
  {
    id: "task-switching-cost",
    number: 3,
    title: "Görev Değiştirme Maliyeti",
    summary: "Kural değiştirmek bir ana mal olur.",
    explanation:
      "İşler ya da kurallar arasında geçiş yapmak, değişimden sonraki ilk tepkiyi genellikle yavaşlatır ve hata ekleyebilir. Tek tek maliyetler küçüktür; geçiş sürekli olduğunda birikir.",
    caveat: "Maliyetin büyüklüğü göreve, alıştırmaya ve yorgunluğa çok bağlıdır.",
    figure: "task-switching-cost",
    hue: "amber",
    hint: "Kurallar yarı yolda değiştiğinde ortaya çıkar.",
  },
  {
    id: "confirmation-bias",
    number: 4,
    title: "Doğrulama Yanlılığı",
    summary: "Zaten beklediğimiz şeyi ararız.",
    explanation:
      "İnsanlar var olan bir beklentiye uyan bilgiyi, uymayana göre daha kolay arar, fark eder ve hatırlar.",
    caveat: "Çoğu insanın paylaştığı bir eğilimdir, tek bir kişinin kusuru değil. Tek bir görev bir anı gösterir, bir zihin alışkanlığını değil.",
    figure: "confirmation-bias",
    hue: "vermilion",
    hint: "Bir tahmini sınayan herkesi bekler.",
  },
  {
    id: "choice-overload",
    number: 5,
    title: "Seçenek Bolluğu",
    summary: "Daha çok seçenek seçmeyi zorlaştırabilir.",
    explanation:
      "Daha geniş seçenek kümeleri kararları yavaşlatabilir ve bazen daha az tatmin edici kılabilir. Bu konudaki araştırmalar gerçekten karışık: etki bazı durumlarda görülür, bazılarında görülmez.",
    caveat: "Kanıtlar karışık. Kural olarak değil, fark edilecek bir şey olarak ele al.",
    figure: "choice-overload",
    hue: "magenta",
    hint: "Fazla tezgâhın arasında bir yerde.",
  },
  {
    id: "primacy-effect",
    number: 6,
    title: "İlklik Etkisi",
    summary: "Başlangıçlar akılda kalır.",
    explanation:
      "Bir dizide ilk öğeler genellikle ortadakilerden daha iyi hatırlanır — muhtemelen geri kalanı gelmeden önce en çok tekrar edilen onlar olduğu için.",
    caveat: "Liste çalışmalarının çoğunda görülür; tek bir dizi bunun yalnızca bir anlık görüntüsüdür.",
    figure: "primacy-effect",
    hue: "indigo",
    hint: "Bir dizinin başında saklanır.",
  },
  {
    id: "recency-effect",
    number: 7,
    title: "Sonluk Etkisi",
    summary: "Sonlar akılda kalır — bir süreliğine.",
    explanation:
      "Bir dizinin son öğeleri hemen ardından genellikle iyi hatırlanır. Bu avantaj zaman geçtikçe ya da yeni bilgi geldikçe söner.",
    caveat: "Doğası gereği kısa ömürlü. Yarın sorulsa kaybolmuş olabilir.",
    figure: "recency-effect",
    hue: "indigo",
    hint: "Bir dizinin sonunda saklanır.",
  },
  {
    id: "inattentional-blindness",
    number: 8,
    title: "Dikkatsizlik Körlüğü",
    summary: "Aramadığımız şey görünmeden kalabilir.",
    explanation:
      "Dikkat bir şeyle meşgulken açıkça görünen şeyler tamamen gözden kaçabilir — her gün yanından geçtiğin şeyler de dahil.",
    caveat: "Bu, gözün kusuru değil; dikkatin işleyişidir.",
    figure: "inattentional-blindness",
    hue: "teal",
    hint: "Göz önünde bir yerde.",
  },
  {
    id: "change-blindness",
    number: 9,
    title: "Değişim Körlüğü",
    summary: "Değişiklikler iki bakış arasında kaçar.",
    explanation:
      "İnsanlar bir sahnedeki değişikliği, değişiklik bir kesinti sırasında olduğunda — bir göz kırpma, bir sahne geçişi, gidip geri gelmek — sıklıkla kaçırır.",
    caveat: "Deneylerde iyi belgelenmiştir. Gündelik koşullar daha çok değişkenlik gösterir.",
    figure: "change-blindness",
    hue: "teal",
    hint: "Bak, uzaklaş, yeniden bak.",
  },
  {
    id: "selective-attention",
    number: 10,
    title: "Seçici Dikkat",
    summary: "Dikkat seçer; geri kalanı geri çekilir.",
    explanation: "Tek bir bilgi türüne odaklanmak onu işlemeyi kolaylaştırır — çevresindekilerin çoğu pahasına.",
    caveat: "Seçmek dikkatin işidir. Burada hiçbir eksiklik yok.",
    figure: "selective-attention",
    hue: "green",
    hint: "Bir şey seç ve onu izle.",
  },
  {
    id: "prospective-timing",
    number: 11,
    title: "İleriye ve Geriye Dönük Zaman",
    summary: "Bir anı ölçmek ile uzunluğunu hatırlamak farklı işlerdir.",
    explanation:
      "Araştırmacılar, sorulacağını bilerek bir süreyi değerlendirmeyi (ileriye dönük) sonradan değerlendirmekten (geriye dönük) ayırır. İkisi farklı ipuçlarına dayanır ve çoğu zaman birbirini tutmaz.",
    caveat: "Bireysel tahminler bir denemeden diğerine çok değişir.",
    figure: "prospective-timing",
    hue: "saffron",
    hint: "İstasyon saklar. Tuhaf ama Bahçe de.",
  },
  {
    id: "planning-fallacy",
    number: 12,
    title: "Planlama Yanılgısı",
    summary: "Planlar uzar.",
    explanation:
      "İnsanlar kendi işlerinin ne kadar süreceğini hafife alma eğilimindedir — benzer işlerin daha önce daha uzun sürdüğünü bilseler bile. Başkalarının işleri için tahminler çoğu zaman daha isabetlidir.",
    caveat: "Yaygın bir eğilim, garanti değil. Bazı insanlar ve işler tersini gösterir.",
    figure: "planning-fallacy",
    hue: "saffron",
    hint: "Kalkış tabelalarının altında durur.",
  },
  {
    id: "anchoring",
    number: 13,
    title: "Çapalama",
    summary: "İlk sayı ötekileri kendine çeker.",
    explanation:
      "İlk duyulan bir sayı — ilgisiz olsa bile — sonraki tahminleri kendine doğru çekme eğilimindedir. Çalışmalar bunu, farklı ilk sayılar verilen grupları karşılaştırarak gösterir.",
    caveat: "Tek bir tahmin çapalamayı tek başına gösteremez; bu, birçok tahmin arasında bir karşılaştırmadır.",
    figure: "anchoring",
    hue: "saffron",
    hint: "Sorudan önce bir sayı gelir.",
  },
  {
    id: "generation-effect",
    number: 14,
    title: "Üretme Etkisi",
    summary: "Kendin ürettiğini daha iyi hatırlarsın.",
    explanation:
      "Bir bilgiyi yalnızca okumak yerine onu kendin ürettiğinde — tamamlayarak, uydurarak, seçerek — genellikle daha iyi hatırlanır. Ürettiğin şey zihninde daha çok bağ kurar.",
    caveat: "Etki pek çok çalışmada görülür ama boyutu malzemeye ve göreve göre değişir.",
    figure: "generation-effect",
    hue: "indigo",
    hint: "Kendi yazdığın satırların arasında.",
  },
  {
    id: "context-dependent-memory",
    number: 15,
    title: "Bağlama Bağlı Bellek",
    summary: "Öğrendiğin yer, hatırlamana yardım eder.",
    explanation:
      "Bir şeyi öğrendiğin ortama — odaya, seslere, hatta ruh hâline — geri döndüğünde hatırlamak çoğu zaman kolaylaşır. Ortamın kendisi bir ipucu gibi çalışır.",
    caveat: "Gündelik hayatta etki genellikle küçüktür; tek bir görev onu kanıtlayamaz, yalnızca yaşatır.",
    figure: "context-dependent-memory",
    hue: "violet",
    hint: "Bir odadan çıkıp geri döndüğünde.",
  },
  {
    id: "zeigarnik-effect",
    number: 16,
    title: "Yarım Kalan İşler",
    summary: "Bitmemiş olan akla daha sık gelir.",
    explanation:
      "Yarıda kalan işlerin tamamlananlardan daha sık akla geldiği gözlemi, onu ilk kaydeden araştırmacının adıyla Zeigarnik etkisi olarak bilinir. Bitmemiş bir iş, zihinde açık bir sekme gibi durabilir.",
    caveat: "Kanıtlar karışık: özgün bulgu her çalışmada tekrarlanmadı. Gözlemlenecek bir şey olarak düşün, yasa olarak değil.",
    figure: "zeigarnik-effect",
    hue: "violet",
    hint: "Bir işi bilerek yarım bıraktığında.",
  },
];

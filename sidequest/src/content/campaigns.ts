import type { Campaign, Npc, Season } from "@/domain/content-types";

export const NPCS: Npc[] = [
  {
    id: "cartographer",
    name: "Haritacı",
    epithet: "Artık görmediğin yolların haritasını tutar",
    sigil: "compass",
    greeting: "Tekrarladığın her yol, çizmeye artık ihtiyaç duymadığım bir çizgiye dönüşüyor.",
  },
  {
    id: "watcher",
    name: "Gözcü",
    epithet: "Işığın değiştiği her yerde durur",
    sigil: "aperture",
    greeting: "Önündekilerin çoğunu görmemeye çoktan razı oldun.",
  },
  {
    id: "clockmaker",
    name: "Saatçi",
    epithet: "Plan ile saat arasındaki boşluğu onarır",
    sigil: "escapement",
    greeting: "Yaptığım her saat, ona bakan kişiyle aynı yöne doğru yanılır.",
  },
  {
    id: "archivist",
    name: "Arşivci",
    epithet: "Hatırladıklarını değil, nasıl hatırladığını saklar",
    sigil: "folio",
    greeting: "Bellek bir fotoğraf değil, her seferinde yeniden kurulan bir binadır.",
  },
];

export const SEASONS: Season[] = [
  { id: "s01", number: 1, title: "Uyan", campaignIds: ["autopilot", "observer", "time-bender", "memory"] },
];

export const CAMPAIGNS: Campaign[] = [
  {
    id: "autopilot",
    seasonId: "s01",
    title: "Otopilotu Kır",
    theme: "Alışkanlıkları böl. Tanıdık olanı yeniden gör.",
    intro: "Günlerin çoğu, yıllar önce görmeyi bıraktığın yollar üzerinde akıyor. Haritacı onları yeniden çizmek istiyor.",
    npcId: "cartographer",
    homeLocationId: "crossroads",
    tone: "vermilion",
    questIds: ["q001", "q002", "q003", "q004", "q005", "q006", "q007"],
    completion: {
      fragment:
        "Haritacı eski haritayı rulo yapıyor. “Güncelliğini yitirdi,” diyor, hiç de üzgün değil. “Sen yaptın bunu.” Batı mahallelerine iki yeni sokak ekleniyor.",
      effects: [
        { kind: "open-path", path: "p-archive-workshop" },
        { kind: "open-path", path: "p-workshop-garden" },
      ],
    },
  },
  {
    id: "observer",
    seasonId: "s01",
    title: "Gözlemci",
    theme: "Dikkat, ayrıntılar, örüntüler.",
    intro: "Gözcü uzun zamandır aynı pencerenin önünde duruyor ve herkesin yanından geçip gittiği şeyleri sayıyor.",
    npcId: "watcher",
    homeLocationId: "observatory",
    tone: "teal",
    questIds: ["q008", "q009", "q010", "q011", "q012", "q013", "q014"],
    completion: {
      fragment: "Gözcü Gözlemevi'nin üst kepenklerini açıyor. Buradan hem Arşiv hem İstasyon görünüyor ve aralarındaki yollar berrak.",
      effects: [
        { kind: "open-path", path: "p-archive-observatory" },
        { kind: "open-path", path: "p-observatory-station" },
      ],
    },
  },
  {
    id: "time-bender",
    seasonId: "s01",
    title: "Zaman Bükücü",
    theme: "Tahmin, planlama, öngörü.",
    intro: "Saatçi'nin saatlerinin hiçbiri aynı fikirde değil. Saatçi, seninkinin neden öyle olduğunu merak ediyor.",
    npcId: "clockmaker",
    homeLocationId: "station",
    tone: "saffron",
    questIds: ["q015", "q016", "q017", "q018", "q019", "q020", "q021"],
    completion: {
      fragment: "İstasyon'daki kalkış tabelaları susuyor, sonra tek bir satır beliriyor: ZAMANINDA, AŞAĞI YUKARI. Yeni hatlar güneye, Çarşı'ya ve Bahçe'ye uzanıyor.",
      effects: [
        { kind: "open-path", path: "p-station-market" },
        { kind: "open-path", path: "p-garden-market" },
      ],
    },
  },
  {
    id: "memory",
    seasonId: "s01",
    title: "Sahadaki Hafıza",
    theme: "Hatırlamak, unutmak, yeniden kurmak.",
    intro: "Arşivci raflardaki her şeyin eksik olduğunu biliyor. Eksiklerin nerede olduğunu senin bulmanı istiyor.",
    npcId: "archivist",
    homeLocationId: "archive",
    tone: "indigo",
    questIds: ["q022", "q023", "q024", "q025", "q026", "q027", "q028"],
    completion: {
      fragment: "Arşivci son rafı kapatıyor ve anahtarı sana uzatıyor. Arşiv'in arka kapısından nehrin ötesine, bir de Atölye'den Çarşı'ya yeni yollar açılıyor.",
      effects: [
        { kind: "open-path", path: "p-archive-unknown" },
        { kind: "open-path", path: "p-workshop-market" },
      ],
    },
  },
];

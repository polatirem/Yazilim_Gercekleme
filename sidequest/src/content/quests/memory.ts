/** Kampanya 4 — SAHADAKİ HAFIZA. Hatırlamak, unutmak, yeniden kurmak. */
import type { Glyph, QuestInput, SequenceItem } from "@/domain/content-types";
import { SAFE } from "./safety-notes";

const base = {
  version: 1,
  campaignId: "memory",
  npcId: "archivist",
  requiresPurchase: false as const,
};

const safetyBase = {
  requiresPurchase: false as const,
  contactsStrangers: false as const,
  photographsPeople: false as const,
  sharesLocation: false as const,
};

const g = (shape: Glyph["shape"], fill: Glyph["fill"] = "open", gap = false): Glyph => ({ shape, fill, gap });
const words = (list: string[]): SequenceItem[] => list.map((label, i) => ({ id: `w${i}`, label }));

const OBJECTS = words(["Şemsiye", "Anahtar", "Limon", "Pusula", "Mektup", "Fener", "Zar", "Kurdele", "Saksı", "Düdük"]);
const DIGITS: SequenceItem[] = Array.from({ length: 10 }, (_, i) => ({ id: `d${i}`, label: String(i) }));

const ORDER_REVEAL = (ref: string) => ({
  kind: "text" as const,
  variants: [
    { when: { ref: `${ref}.accuracy`, op: "eq" as const, value: 1 }, text: "Dizinin tamamı, sırasıyla. Hiçbir parça yerinden oynamadı." },
    {
      when: { all: [{ ref: `${ref}.firstCorrect`, op: "eq" as const, value: true }, { ref: `${ref}.middleAccuracy`, op: "lt" as const, value: 1 }] },
      text: "Baştakiler sağlam kaldı; ortadakiler kaydı. İlk gelenler en çok tekrarı alır.",
    },
    {
      when: { all: [{ ref: `${ref}.lastCorrect`, op: "eq" as const, value: true }, { ref: `${ref}.middleAccuracy`, op: "lt" as const, value: 1 }] },
      text: "Sondakiler tuttu; ortası bulanıklaştı.",
    },
    { text: "Dizi aradaki zamanda dağıldı. Bellek bir kayıt değil, her seferinde yeniden kurulan bir şey." },
  ],
});

const ORDER_DISCOVERIES = (ref: string) => [
  {
    discovery: "primacy-effect",
    when: { all: [{ ref: `${ref}.firstCorrect`, op: "eq" as const, value: true }, { ref: `${ref}.middleAccuracy`, op: "lt" as const, value: 1 }] },
    encounter: [{ text: "Dizinin başı yerinde kaldı; ortadaki parçaların bazıları kaydı." }],
  },
  {
    discovery: "recency-effect",
    when: { all: [{ ref: `${ref}.lastCorrect`, op: "eq" as const, value: true }, { ref: `${ref}.middleAccuracy`, op: "lt" as const, value: 1 }] },
    encounter: [{ text: "Dizinin sonu, ortasından daha iyi dayandı." }],
  },
];

export const MEMORY_QUESTS: QuestInput[] = [
  {
    ...base,
    id: "q022",
    number: 22,
    slug: "hafiza-sarayi",
    title: "Hafıza Sarayı",
    subtitle: "Her nesneyi bir yere bırak.",
    description: "Altı nesne, bildiğin bir mekânda altı durak. Yürürken her birini bir yere yerleştir; sonra geri al.",
    locationId: "archive",
    npcLine: "Eski hatipler konuşmalarını evlerinin odalarına yerleştirirdi. Bir de sen dene.",
    family: "remember",
    dimensions: ["recall"],
    difficulty: 1,
    estimatedMinutes: { min: 5, max: 12 },
    contexts: ["home", "work"],
    energy: "low",
    people: "solo",
    requiresOutside: false,
    safety: { ...safetyBase, level: "minimal", movement: "light", notes: ["Bildiğin, rahatça dolaşabileceğin bir mekân yeterli.", SAFE.stopAnytime] },
    prime: [
      { id: "intro", kind: "narrative", speaker: "archivist", lines: ["Sana altı nesne göstereceğim, birer birer.", "Onları ezberlemeye çalışma. Sadece iyi bak."] },
      { id: "objects", kind: "sequence-encode", mode: "order", instruction: "Nesneleri sırasıyla izle.", pool: OBJECTS, length: 6, displayMs: 1600 },
    ],
    act: {
      instruction: "Bulunduğun yerde kısa bir tur at ve her nesneyi sırayla bir yere zihninde bırak.",
      details: ["Birincisini kapıya, ikincisini bir sandalyeye… Onu orada canlı bir şekilde hayal et.", "Sonra birkaç dakika başka bir şey yap."],
      reminder: "Altı nesne, altı yer. Sonra başka bir şey.",
    },
    recall: [
      { id: "objects-recall", kind: "sequence-recall", source: "objects", mode: "order", prompt: "Turunu zihninde yeniden yürü. Nesneler hangi sırayla duruyordu?" },
      {
        id: "helped",
        kind: "choice",
        role: "reflection",
        prompt: "Nesneleri yerlere bağlamak işe yaradı mı?",
        options: [
          { id: "yes", label: "Evet, yerleri görüp nesneleri buldum" },
          { id: "some", label: "Bazıları için" },
          { id: "no", label: "Pek değil" },
        ],
      },
    ],
    reveal: [
      { kind: "sequence", ref: "objects-recall" },
      ORDER_REVEAL("objects-recall"),
      {
        kind: "text",
        variants: [
          { when: { ref: "helped.optionId", op: "eq", value: "yes" }, text: "Yerler ipucu gibi çalıştı: mekânı yeniden yürüdüğünde nesneler kendiliğinden geri geldi." },
          { text: "Yerleri kullanmak alışkanlık ister. Birkaç denemeden sonra çoğu insan için belirgin biçimde kolaylaşır." },
        ],
      },
    ],
    discoveries: [
      {
        discovery: "context-dependent-memory",
        when: { ref: "objects-recall.accuracy", op: "gte", value: 0.5 },
        encounter: [{ text: "Nesneleri bir mekâna bağladın ve geri çağırırken o mekânı yeniden yürüdün: 6 nesneden {objects-recall.correct|count} tanesi yerli yerindeydi." }],
      },
      ...ORDER_DISCOVERIES("objects-recall"),
    ],
    behaviorSignals: ["sequence-accuracy"],
    fragment: "Arşiv'in bir odasında her rafa küçük bir nesne bırakılmış. Hiçbiri tesadüf değil.",
    nextQuestRules: { suggests: ["q023"] },
    journey: [{ text: "Hafıza sarayı: 6 nesneden {objects-recall.correct|count} tanesi doğru sırada." }],
  },
  {
    ...base,
    id: "q023",
    number: 23,
    slug: "ayni-oda",
    title: "Aynı Oda",
    subtitle: "Öğrendiğin yere geri dön.",
    description: "Bir dizi öğren, oradan ayrıl, sonra aynı odaya dönüp hatırla. Oda sana yardım edecek mi?",
    locationId: "archive",
    npcLine: "Bazı anılar bir odaya aittir. Onları almak için geri dönmen gerekir.",
    family: "remember",
    dimensions: ["recall", "attention"],
    difficulty: 1,
    estimatedMinutes: { min: 10, max: 15 },
    contexts: ["home", "work"],
    energy: "low",
    people: "solo",
    requiresOutside: false,
    mysteryEligible: true,
    safety: { ...safetyBase, level: "minimal", movement: "light", notes: ["İki odası olan herhangi bir yer olur.", SAFE.stopAnytime] },
    prime: [
      { id: "intro", kind: "narrative", speaker: "archivist", lines: ["Şu an bulunduğun odaya bir bak: ışığa, seslere, kokuya.", "Şimdi dizi geliyor."] },
      { id: "list", kind: "sequence-encode", mode: "order", instruction: "Nesneleri sırasıyla izle.", pool: OBJECTS, length: 6, displayMs: 1500 },
    ],
    act: {
      instruction: "Başka bir odaya geç ve on dakika orada başka bir şey yap. Sonra bu odaya geri dön ve burada “Döndüm”e bas.",
      details: ["Diziyi tekrar etmeye çalışma.", "Dönünce aynı yerde, aynı yöne bakarak dur."],
      reminder: "Başka oda, on dakika. Sonra buraya dön.",
    },
    recall: [
      {
        id: "where",
        kind: "choice",
        role: "recall",
        prompt: "Şu an diziyi öğrendiğin odada mısın?",
        options: [
          { id: "same", label: "Evet, aynı odadayım" },
          { id: "other", label: "Hayır, başka bir yerdeyim" },
        ],
      },
      { id: "list-recall", kind: "sequence-recall", source: "list", mode: "order", prompt: "Dizi neydi? Sırasıyla kur." },
    ],
    reflection: [{ id: "cue", kind: "scale", prompt: "Odanın kendisi hatırlamana yardım etti mi?", lowLabel: "Hiç", highLabel: "Çok" }],
    reveal: [
      { kind: "sequence", ref: "list-recall" },
      {
        kind: "text",
        variants: [
          { when: { ref: "where.optionId", op: "eq", value: "same" }, text: "Öğrendiğin odada hatırladın: 6 nesneden {list-recall.correct|count} tanesi yerindeydi. Oda sessizce bir ipucu verdi." },
          { text: "Başka bir yerde hatırladın: 6 nesneden {list-recall.correct|count} tanesi yerindeydi. Bir dahaki sefere öğrendiğin odaya dönüp karşılaştırabilirsin." },
        ],
      },
      ORDER_REVEAL("list-recall"),
    ],
    discoveries: [
      {
        discovery: "context-dependent-memory",
        encounter: [
          { when: { ref: "where.optionId", op: "eq", value: "same" }, text: "Diziyi öğrendiğin odaya dönüp hatırladın ve {list-recall.correct|count}/6 tuttun. Mekân, belleğin sessiz bir ipucudur." },
          { text: "Diziyi başka bir yerde hatırladın ve {list-recall.correct|count}/6 tuttun. Öğrenme ortamına dönmenin yardım edip etmediği ancak iki koşul karşılaştırılarak görülür." },
        ],
      },
    ],
    behaviorSignals: ["sequence-accuracy", "experiment"],
    fragment: "Arşiv'de bir kapının üstüne tebeşirle yazılmış: GERİ DÖN, BURADA.",
    nextQuestRules: { suggests: ["q024"] },
    journey: [{ text: "Aynı oda: 6 nesneden {list-recall.correct|count} tanesi doğru sırada." }],
  },
  {
    ...base,
    id: "q024",
    number: 24,
    slug: "kendi-listen",
    title: "Kendi Listen",
    subtitle: "Verilen dört, yazdığın dört.",
    description: "Dört kelimeyi sana ben vereceğim, dördünü sen yazacaksın. Sonra hangisinin kaldığına bakacağız.",
    locationId: "workshop",
    npcLine: "Kendi ellerinle yaptığın şeyi daha iyi hatırlarsın. Belki.",
    family: "create",
    dimensions: ["recall"],
    difficulty: 1,
    estimatedMinutes: { min: 10, max: 15 },
    contexts: ["home", "work", "outside"],
    energy: "low",
    people: "solo",
    requiresOutside: false,
    safety: { ...safetyBase, level: "minimal", movement: "none", notes: ["Yazdıkların yalnızca bu cihazda kalır.", SAFE.stopAnytime] },
    prime: [
      { id: "given", kind: "sequence-encode", mode: "order", instruction: "Dört kelime. Sadece bak.", pool: OBJECTS, length: 4, displayMs: 1600 },
      { id: "own", kind: "list", role: "prime", prompt: "Şimdi bir yolculuğa yanına alacağın dört şeyi kendin yaz.", slots: 4, required: 4, placeholder: "ör. termos" },
    ],
    act: {
      instruction: "On dakika boyunca tamamen başka bir şeyle uğraş.",
      details: ["İki listeyi de düşünmemeye çalış."],
      reminder: "On dakika başka bir şey.",
    },
    recall: [
      { id: "given-count", kind: "count", prompt: "Sana verilen dört kelimeden kaçını hâlâ hatırlıyorsun?", hint: "Bakmadan, içinden say.", max: 4 },
      { id: "own-count", kind: "count", prompt: "Kendi yazdığın dört şeyden kaçını hatırlıyorsun?", hint: "Bakmadan, içinden say.", max: 4 },
    ],
    reveal: [
      {
        kind: "figures",
        items: [
          { label: "Verilenlerden", ref: "given-count.value", format: "count" },
          { label: "Yazdıklarından", ref: "own-count.value", format: "count" },
        ],
        delta: { label: "Fark", a: "own-count.value", b: "given-count.value", format: "signed-count" },
      },
      { kind: "list", ref: "own", label: "Senin listen" },
      {
        kind: "text",
        variants: [
          { when: { compare: { a: "own-count.value", op: "gt", b: "given-count.value" } }, text: "Kendi ürettiğin kelimeler daha iyi dayandı. Onları seçmek için verdiğin küçük karar, onlara bir tutunma noktası verdi." },
          { when: { compare: { a: "own-count.value", op: "lt", b: "given-count.value" } }, text: "Bu kez verilen kelimeler daha iyi kaldı. Belki onlar daha tuhaftı — tuhaf olan da akılda kalır." },
          { text: "İki liste de aynı ölçüde kaldı." },
        ],
      },
    ],
    discoveries: [
      {
        discovery: "generation-effect",
        encounter: [
          { when: { compare: { a: "own-count.value", op: "gt", b: "given-count.value" } }, text: "Kendi yazdığın dört şeyden {own-count.value|count} tanesini, sana verilen dört kelimeden ise {given-count.value|count} tanesini hatırladın." },
          { text: "Kendi yazdıklarından {own-count.value|count}, verilenlerden {given-count.value|count} tane kaldı — üretmenin olağan avantajı bu kez görünmedi." },
        ],
      },
    ],
    behaviorSignals: ["details-recalled"],
    fragment: "Atölye'de el yazısıyla doldurulmuş bir defter, basılı olanların yanına kondu.",
    nextQuestRules: { suggests: ["q025"] },
    journey: [{ text: "Kendi listen: yazdıklarından {own-count.value|count}, verilenlerden {given-count.value|count} kaldı." }],
  },
  {
    ...base,
    id: "q025",
    number: 25,
    slug: "yarim-kalan",
    title: "Yarım Kalan",
    subtitle: "Birini bitir. Birini yarıda bırak.",
    description: "İki küçük iş. Birini sonuna kadar yap, ötekini bilerek yarıda bırak. Sonra hangisinin peşinden geldiğine bak.",
    locationId: "garden",
    npcLine: "Kapanmamış kapılar esinti yapar. Bazıları bütün gün.",
    family: "break",
    dimensions: ["attention", "recall"],
    difficulty: 2,
    estimatedMinutes: { min: 20, max: 30 },
    contexts: ["home", "work"],
    energy: "normal",
    people: "solo",
    requiresOutside: false,
    availability: { requiresCampaignProgress: 1 },
    safety: { ...safetyBase, level: "minimal", movement: "light", notes: ["Yarıda bırakmanın sorun olmayacağı küçük işler seç — ocakta yemek ya da açık musluk gibi şeyler değil.", SAFE.stopAnytime] },
    prime: [
      { id: "tasks", kind: "list", role: "prime", prompt: "Şimdi başlayabileceğin iki küçük iş yaz.", hint: "Bir çekmece, bir karalama, kısa bir not…", slots: 2, required: 2, placeholder: "İş" },
      { id: "intro", kind: "narrative", speaker: "archivist", lines: ["Birincisini bitir.", "İkincisine başla ve yarısında bırak. Sonra yirmi dakika başka bir şey yap."] },
    ],
    act: {
      instruction: "Birinci işi bitir. İkincisine başla ve yarıda bırak. Sonra yirmi dakika başka bir şeyle uğraş.",
      details: ["Yarım işe dönme — şimdilik.", "Aklına hangi işin geldiğini sadece fark et."],
      reminder: "Bir bitti, bir yarım. Yirmi dakika başka bir şey.",
    },
    recall: [
      {
        id: "haunt",
        kind: "choice",
        role: "recall",
        prompt: "Yirmi dakika boyunca hangisi aklına daha sık geldi?",
        options: [
          { id: "open", label: "Yarım bıraktığım" },
          { id: "done", label: "Bitirdiğim" },
          { id: "both", label: "İkisi de aynı" },
          { id: "none", label: "Hiçbiri" },
        ],
      },
      { id: "times", kind: "count", prompt: "Yarım iş aklına aşağı yukarı kaç kez geldi?", max: 40 },
    ],
    reflection: [{ id: "itch", kind: "scale", prompt: "Yarım bırakmak ne kadar rahatsız etti?", lowLabel: "Hiç", highLabel: "Çok" }],
    reveal: [
      { kind: "list", ref: "tasks", label: "İki iş" },
      { kind: "figures", items: [{ label: "Yarım iş aklına geldi", ref: "times.value", format: "count" }] },
      {
        kind: "text",
        variants: [
          { when: { ref: "haunt.optionId", op: "eq", value: "open" }, text: "Yarım iş peşinden geldi. Bitmemiş olan, zihinde açık bir sekme gibi durur." },
          { when: { ref: "haunt.optionId", op: "eq", value: "done" }, text: "Bitirdiğin iş daha çok aklına geldi — belki onu bitirmenin küçük keyfi yüzünden." },
          { text: "İkisi arasında belirgin bir fark yoktu." },
        ],
      },
      { kind: "text", variants: [{ text: "Yarım bıraktığın işi şimdi bitirebilirsin. Kapıyı kapatmak da görevin bir parçası." }] },
    ],
    discoveries: [
      {
        discovery: "zeigarnik-effect",
        when: { ref: "haunt.optionId", op: "eq", value: "open" },
        encounter: [{ text: "Bilerek yarım bıraktığın iş, sonraki yirmi dakikada aşağı yukarı {times.value|count} kez aklına geldi — bitirdiğin işten daha sık." }],
      },
    ],
    behaviorSignals: ["routines-interrupted"],
    completionRules: { interruptsRoutine: true },
    fragment: "Bahçe'de yarısı kazılmış bir tarh var. Yanından geçen herkes bir an duruyor.",
    nextQuestRules: { suggests: ["q026"] },
    journey: [{ text: "Yarım kalan iş {times.value|count} kez aklına geldi." }],
  },
  {
    ...base,
    id: "q026",
    number: 26,
    slug: "numara",
    title: "Numara",
    subtitle: "Yedi rakam, beş dakika.",
    description: "Yedi rakamlık bir dizi. Onu yanında taşı — ama tekrar etmeden. Bakalım dünya ondan ne kadarını bırakacak.",
    locationId: "crossroads",
    npcLine: "Telefon numaralarının yedi haneli olması tesadüf değil derler. Kendin bak.",
    family: "remember",
    dimensions: ["recall", "attention"],
    difficulty: 2,
    estimatedMinutes: { min: 5, max: 10 },
    contexts: ["home", "work", "outside", "commuting"],
    energy: "normal",
    people: "solo",
    requiresOutside: false,
    mysteryEligible: true,
    availability: { requiresCampaignProgress: 2 },
    safety: { ...safetyBase, level: "low", movement: "light", notes: [SAFE.eyesUp, SAFE.notDriving, SAFE.stopAnytime] },
    prime: [{ id: "digits", kind: "sequence-encode", mode: "order", instruction: "Rakamları sırasıyla izle.", pool: DIGITS, length: 7, displayMs: 1100 }],
    act: {
      instruction: "Beş dakika kısa bir yürüyüş ya da iş yap. Rakamları tekrar etme.",
      details: ["Aklından geçirmemeye çalış — sadece nerede kaldıklarını merak et."],
      reminder: "Beş dakika. Tekrar yok.",
    },
    recall: [
      { id: "digits-recall", kind: "sequence-recall", source: "digits", mode: "order", prompt: "Yedi rakamı sırasıyla gir." },
      {
        id: "strategy",
        kind: "choice",
        role: "reflection",
        prompt: "Dürüstçe: aklında tutmak için ne yaptın?",
        options: [
          { id: "repeat", label: "İçimden tekrarladım" },
          { id: "chunk", label: "Gruplara böldüm" },
          { id: "nothing", label: "Hiçbir şey" },
        ],
      },
    ],
    reveal: [
      { kind: "sequence", ref: "digits-recall" },
      ORDER_REVEAL("digits-recall"),
      {
        kind: "text",
        variants: [
          { when: { ref: "strategy.optionId", op: "eq", value: "chunk" }, text: "Rakamları gruplara böldün. Yedi ayrı parça yerine üç tane taşımak, belleğin en eski numaralarından biridir." },
          { when: { ref: "strategy.optionId", op: "eq", value: "repeat" }, text: "İçinden tekrarladın — kurallara pek uymadı ama çoğu insanın kendiliğinden yaptığı şey bu." },
          { text: "Hiçbir strateji kullanmadın. Dizi, olduğu gibi dünyanın gürültüsüne bırakıldı." },
        ],
      },
    ],
    discoveries: ORDER_DISCOVERIES("digits-recall"),
    behaviorSignals: ["sequence-accuracy"],
    fragment: "Kavşak'taki bir direğe yedi rakam kazınmış. Kimse ne anlama geldiğini hatırlamıyor.",
    nextQuestRules: { suggests: ["q027"] },
    journey: [{ text: "Yedi rakamdan {digits-recall.correct|count} tanesi doğru yerde." }],
  },
  {
    ...base,
    id: "q027",
    number: 27,
    slug: "zihin-haritasi",
    title: "Zihin Haritası",
    subtitle: "Yolu önce kafanda yürü.",
    description: "Sık yürüdüğün kısa bir yolu hafızandan sırala. Sonra gerçekten yürü ve kopyanı kontrol et.",
    locationId: "observatory",
    npcLine: "Kafandaki harita da bir arşivdir. Tozunu alma zamanı.",
    family: "remember",
    dimensions: ["recall", "attention"],
    difficulty: 2,
    estimatedMinutes: { min: 10, max: 20 },
    contexts: ["outside", "home"],
    energy: "normal",
    people: "solo",
    requiresOutside: true,
    requiresLocation: "Sık yürüdüğün kısa bir yol — bir köşeye, durağa ya da parka",
    availability: { requiresCampaignProgress: 3 },
    safety: { ...safetyBase, level: "low", movement: "walking", notes: [SAFE.publicKnown, SAFE.eyesUp, SAFE.stopAnytime] },
    prime: [
      { id: "route", kind: "list", role: "prime", prompt: "Kısa, bildiğin bir yolda yanından geçtiğin beş şeyi sırasıyla yaz.", slots: 5, required: 3, placeholder: "ör. köşedeki eczane" },
    ],
    act: {
      instruction: "O yolu yürü ve listeni kontrol et: her şey yazdığın sırada mı?",
      details: ["Listede olmayan ama yolda duran şeyleri de say."],
      reminder: "Aynı yol. Kopyanı kontrol et.",
    },
    recall: [
      {
        id: "check",
        kind: "item-check",
        prompt: "Listen ne kadar tuttu?",
        source: "route",
        options: [
          { id: "there", label: "Doğru sırada" },
          { id: "moved", label: "Var ama başka yerde" },
          { id: "missing", label: "Yok" },
        ],
      },
      { id: "unlisted", kind: "count", prompt: "Listende olmayan kaç şey gördün?", max: 60 },
    ],
    reveal: [
      { kind: "list", ref: "route", label: "Kafandaki yol" },
      {
        kind: "figures",
        items: [
          { label: "Doğru sırada", ref: "check.counts.there", format: "count" },
          { label: "Başka yerde", ref: "check.counts.moved", format: "count" },
          { label: "Yok", ref: "check.counts.missing", format: "count" },
          { label: "Hiç yazılmamış", ref: "unlisted.value", format: "count" },
        ],
      },
      {
        kind: "text",
        variants: [
          { when: { ref: "check.counts.moved", op: "gte", value: 1 }, text: "Bazı şeyler yoldaydı ama zihnindeki haritada yerleri kaymıştı. Kopyalar sessizce yeniden düzenlenir." },
          { text: "Kafandaki sıra, gerçek yolla örtüştü. İyi korunmuş bir kopya." },
        ],
      },
    ],
    discoveries: [
      {
        discovery: "habituation",
        when: { ref: "unlisted.value", op: "gte", value: 1 },
        encounter: [{ text: "Sık yürüdüğün yolda, zihnindeki haritaya hiç girmemiş {unlisted.value|count} şey vardı." }],
      },
    ],
    behaviorSignals: ["details-recalled"],
    fragment: "Gözlemevi'nin duvarına elle çizilmiş bir sokak haritası asıldı. İki köşesi yanlış.",
    nextQuestRules: { suggests: ["q028"] },
    journey: [{ text: "Zihin haritası: {route.count|count} duraktan {check.counts.there|count} tanesi doğru sırada." }],
  },
  {
    ...base,
    id: "q028",
    number: 28,
    slug: "arsiv-gecesi",
    title: "Arşiv Gecesi",
    subtitle: "Bir düzen, bir yürüyüş, üç an.",
    description: "Bir düzeni zihnine kaydet, uzun bir yürüyüşe çık, sonra ikisini de geri getir. Arşivci son rafı açıyor.",
    locationId: "archive",
    npcLine: "Bütün raflar eksik. Hangisinin ne kadar eksik olduğunu bulan sen olacaksın.",
    family: "remember",
    dimensions: ["recall", "attention"],
    difficulty: 3,
    estimatedMinutes: { min: 20, max: 40 },
    contexts: ["outside"],
    energy: "normal",
    people: "solo",
    requiresOutside: true,
    requiresLocation: "Bildiğin, yürünebilir bir mahalle",
    availability: { requiresCampaignProgress: 5 },
    safety: { ...safetyBase, level: "moderate", movement: "walking", notes: [SAFE.publicKnown, SAFE.eyesUp, "Yürüyüşü istediğin an kısa kes — görev yine de sayılır.", SAFE.stopAnytime] },
    prime: [
      { id: "intro", kind: "narrative", speaker: "archivist", lines: ["Son raf. Önce bu düzeni kaydet.", "Sonra dışarı çık ve yolda üç anı biriktir."] },
      {
        id: "plate",
        kind: "sequence-encode",
        mode: "scene",
        instruction: "Düzeni incele.",
        pool: [
          { id: "a", label: "Boş halka", glyph: g("circle") },
          { id: "b", label: "Dolu halka", glyph: g("circle", "solid") },
          { id: "c", label: "Boş kare", glyph: g("square") },
          { id: "d", label: "Dolu kare", glyph: g("square", "solid") },
          { id: "e", label: "Boş üçgen", glyph: g("triangle") },
          { id: "f", label: "Dolu üçgen", glyph: g("triangle", "solid") },
          { id: "h", label: "Boş kemer", glyph: g("arch") },
          { id: "i", label: "Dolu kemer", glyph: g("arch", "solid") },
          { id: "j", label: "Boş eşkenar dörtgen", glyph: g("diamond") },
          { id: "k", label: "Dolu eşkenar dörtgen", glyph: g("diamond", "solid") },
        ],
        length: 7,
        displayMs: 10000,
        grid: { cols: 4, rows: 3 },
      },
    ],
    act: {
      instruction: "Bildiğin kamuya açık yerlerde yirmi, otuz dakika yürü ve yolda üç anı biriktir.",
      details: ["Bir ses, bir yüz ifadesi değil — bir şey, bir ışık, bir koku.", "Döndüğünde önce düzen, sonra anılar."],
      reminder: "Yürü. Üç an biriktir.",
    },
    recall: [
      { id: "plate-change", kind: "sequence-recall", source: "plate", mode: "scene-change", changes: 2, prompt: "Yürüyüşten önceki düzen. İki işaret değişti. Hangileri?" },
      { id: "moments", kind: "list", role: "recall", prompt: "Yürüyüşten üç anı, yaşadığın sırayla.", slots: 3, required: 1 },
      {
        id: "vivid",
        kind: "choice",
        role: "recall",
        prompt: "Hangisi en canlı?",
        options: [
          { id: "first", label: "İlki" },
          { id: "middle", label: "Ortadaki" },
          { id: "last", label: "Sonuncusu" },
        ],
      },
    ],
    reveal: [
      { kind: "scene", ref: "plate-change" },
      {
        kind: "text",
        variants: [
          { when: { ref: "plate-change.detected", op: "eq", value: true }, text: "Uzun bir yürüyüşten sonra iki değişikliğin ikisini de yakaladın." },
          { when: { ref: "plate-change.hits", op: "eq", value: 1 }, text: "İki değişiklikten birini yakaladın; öbürü yürüyüşün içinde kayboldu." },
          { text: "İki değişiklik de gözünden kaçtı. Arada bir şehir vardı." },
        ],
      },
      { kind: "list", ref: "moments", label: "Yürüyüşün üç anı" },
      {
        kind: "text",
        variants: [
          { when: { ref: "vivid.optionId", op: "eq", value: "last" }, text: "En canlısı sonuncusu. Yakın olan parlak kalır — bir süre." },
          { when: { ref: "vivid.optionId", op: "eq", value: "first" }, text: "En canlısı ilki. Başlangıçlar zihinde en uzun kalan yerlerdir." },
          { text: "En canlısı ortadaki — muhtemelen yürüyüşün asıl önemli anı oydu." },
        ],
      },
    ],
    discoveries: [
      {
        discovery: "change-blindness",
        encounter: [
          { when: { ref: "plate-change.detected", op: "eq", value: true }, text: "Yirmi dakikalık bir yürüyüşten sonra düzendeki iki değişikliği de buldun." },
          { text: "Yürüyüş boyunca düzendeki değişikliklerden {plate-change.misses|count} tanesi gözünden kaçtı — bir kesintinin gizlediği değişiklikler." },
        ],
      },
      { discovery: "recency-effect", when: { ref: "vivid.optionId", op: "eq", value: "last" }, encounter: [{ text: "Yürüyüşten hemen sonra en canlı anı, sonuncusuydu." }] },
      { discovery: "primacy-effect", when: { ref: "vivid.optionId", op: "eq", value: "first" }, encounter: [{ text: "Yürüyüşün ilk anı, sonrakilerden daha canlı kaldı." }] },
    ],
    behaviorSignals: ["change-detection", "details-recalled"],
    fragment: "Arşivci son rafın kapağını kapatıyor. Etiketinde senin adın değil, bu gecenin tarihi yazıyor.",
    journey: [{ text: "Arşiv gecesi: değişikliklerden {plate-change.hits|count}/2 yakalandı, {moments.count|count} an geri getirildi." }],
  },
];

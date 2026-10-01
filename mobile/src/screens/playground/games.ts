/**
 * Oyun Alanı: mikro oyunların görevden bağımsız, serbest hâli.
 * Aynı motorlar ve aynı bileşenler kullanılır; sonuçlar yalnızca bu cihazdaki
 * kişisel rekorlara yazılır, Yolculuk'a ya da davranış kayıtlarına girmez.
 */
import { Quest, type Glyph, type Hue, type SequenceItem, type Step } from "@/domain/content-types";
import type { BoardResult, OrderRecallResult, QuestAttempt, RuleShiftResult, SceneChangeResult, SignalFilterResult } from "@/domain/player-types";
import { describeGlyph } from "@/domain/glyph-names";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Level = 1 | 2 | 3;
export const LEVEL_LABEL: Record<Level, string> = { 1: "Kolay", 2: "Orta", 3: "Zor" };

export interface Summary {
  headline: string;
  detail: string;
  /** Rekor için karşılaştırılan sayı. */
  score: number;
  better: "higher" | "lower";
  unit: string;
}

export interface GameDef {
  id: string;
  title: string;
  tagline: string;
  hue: Hue;
  icon: "eye" | "spark" | "clock" | "play" | "return" | "journey";
  kind: "steps" | "timing";
  build?: (level: Level) => Step[];
  summarize?: (answers: Record<string, Record<string, unknown>>) => Summary;
}

const g = (shape: Glyph["shape"], fill: Glyph["fill"] = "open", gap = false): Glyph => ({ shape, fill, gap });
const glyphItems = (glyphs: Glyph[]): SequenceItem[] => glyphs.map((glyph, i) => ({ id: `g${i}`, label: describeGlyph(glyph), glyph }));

const POOL = glyphItems([
  g("circle"),
  g("circle", "solid"),
  g("square"),
  g("square", "solid"),
  g("triangle"),
  g("triangle", "solid"),
  g("arch"),
  g("arch", "solid"),
  g("diamond"),
  g("diamond", "solid"),
  g("bar", "solid"),
  g("circle", "open", true),
]);

export const GAMES: GameDef[] = [
  {
    id: "dizi",
    title: "Dizi Hafızası",
    tagline: "İşaretler birer birer geçer. Sırayı yeniden kur.",
    hue: "indigo",
    icon: "journey",
    kind: "steps",
    build: (level) => [
      { id: "enc", kind: "sequence-encode", mode: "order", instruction: "İşaretleri sırasıyla izle.", pool: POOL, length: [4, 6, 8][level - 1], displayMs: [1300, 1000, 800][level - 1] },
      { id: "rec", kind: "sequence-recall", source: "enc", mode: "order", prompt: "Hangi sırayla geldiler?", changes: 1 },
    ],
    summarize: (a) => {
      const r = a.rec as unknown as OrderRecallResult;
      return {
        headline: `${r.total} işaretten ${r.correct} tanesi doğru yerde.`,
        detail: r.firstCorrect && !r.lastCorrect ? "Baş kısım sağlam; son tarafı kaydı." : r.lastCorrect && !r.firstCorrect ? "Sonu tuttun, başı kaçtı." : "Dizinin tamamına dağılmış bir sonuç.",
        score: r.correct,
        better: "higher",
        unit: "doğru",
      };
    },
  },
  {
    id: "sahne",
    title: "Sahne Farkı",
    tagline: "Bir düzene bak. Sonra neyin değiştiğini bul.",
    hue: "teal",
    icon: "eye",
    kind: "steps",
    build: (level) => [
      { id: "enc", kind: "sequence-encode", mode: "scene", instruction: "Düzeni incele.", pool: POOL, length: [5, 7, 9][level - 1], displayMs: [8000, 6000, 4500][level - 1], grid: { cols: 4, rows: 3 } },
      { id: "rec", kind: "sequence-recall", source: "enc", mode: "scene-change", prompt: level === 3 ? "İki işaret değişti. Hangileri?" : "Bir işaret değişti. Hangisi?", changes: level === 3 ? 2 : 1 },
    ],
    summarize: (a) => {
      const r = a.rec as unknown as SceneChangeResult;
      return {
        headline: r.detected ? "Değişikliği yakaladın." : `${r.changed.length} değişiklikten ${r.hits} tanesini yakaladın.`,
        detail: r.falseAlarms ? `${r.falseAlarms} işaret aslında değişmemişti.` : "Yanlış alarm yok.",
        score: r.hits - r.falseAlarms,
        better: "higher",
        unit: "net isabet",
      };
    },
  },
  {
    id: "sinyal",
    title: "Sinyal Avı",
    tagline: "Neredeyse aynı işaretlerin arasında hedefleri bul.",
    hue: "vermilion",
    icon: "spark",
    kind: "steps",
    build: (level) => [
      {
        id: "hunt",
        kind: "signal-filter",
        instruction: "Aralıklı olan her halkaya dokun.",
        targetLabel: "Aralıklı halka",
        target: { shape: "circle", fill: "open", gap: true },
        lures: [g("circle"), g("circle", "solid"), ...(level === 3 ? [g("arch")] : [])],
        others: [g("square"), g("diamond"), g("triangle", "solid")],
        rounds: 2,
        cols: [5, 6, 7][level - 1],
        rows: [4, 4, 5][level - 1],
        targetsPerRound: [3, 5],
        secondsPerRound: [12, 9, 7][level - 1],
      },
    ],
    summarize: (a) => {
      const r = a.hunt as unknown as SignalFilterResult;
      return {
        headline: `${r.targets} hedeften ${r.hits} tanesini buldun.`,
        detail: r.falseAlarms ? `${r.falseAlarms} tanesi yanlış alarmdı.` : "Hiç yanlış alarm yok.",
        score: r.hits - r.falseAlarms,
        better: "higher",
        unit: "net isabet",
      };
    },
  },
  {
    id: "kural",
    title: "Kural Değişimi",
    tagline: "Kural haber vermeden değişir. Ayak uydur.",
    hue: "amber",
    icon: "return",
    kind: "steps",
    build: (level) => [
      {
        id: "shift",
        kind: "rule-shift",
        instruction: "Gösterilen kurala göre cevap ver. Kural değişecek.",
        rules: level === 3 ? ["shape", "fill", "side-opposite"] : level === 2 ? ["shape", "side-opposite"] : ["shape", "fill"],
        trials: [16, 24, 32][level - 1],
        runLength: level === 3 ? [2, 4] : [3, 6],
      },
    ],
    summarize: (a) => {
      const r = a.shift as unknown as RuleShiftResult;
      return {
        headline: `%${Math.round(r.accuracy * 100)} doğruluk.`,
        detail: r.switchCostMs > 60 ? `Kural değişimlerinden sonra ilk tepkin ortalama ${r.switchCostMs} ms yavaşladı.` : "Kural değişimleri seni neredeyse hiç yavaşlatmadı.",
        score: Math.round(r.accuracy * 100),
        better: "higher",
        unit: "% doğruluk",
      };
    },
  },
  {
    id: "plan",
    title: "Plan Tahtası",
    tagline: "Kurallara ve bütçeye uyan bir plan kur.",
    hue: "magenta",
    icon: "play",
    kind: "steps",
    build: (level) => [PLAN_PUZZLES[level - 1]],
    summarize: (a) => {
      const r = a.board as unknown as BoardResult;
      const sec = Math.round(r.latencyMs / 1000);
      return {
        headline: r.violations === 0 ? `Kusursuz plan, ${sec} saniyede.` : `${r.violations} kural karşılanmadı.`,
        detail: `${r.moves} hamle · ${r.totalMinutes} dakikalık plan.`,
        score: r.violations === 0 ? sec : 9999,
        better: "lower",
        unit: "sn (kusursuz)",
      };
    },
  },
  {
    id: "zaman",
    title: "İç Saat",
    tagline: "Ekranda saat yok. Hedef süreyi hisset ve dur.",
    hue: "saffron",
    icon: "clock",
    kind: "timing",
  },
];

const PLAN_PUZZLES: Step[] = [
  {
    id: "board",
    kind: "priority-board",
    prompt: "Pazar sabahı: 30 dakikan var. Kahvaltı önce, çıkış en son.",
    droppable: true,
    budgetMinutes: 30,
    constraints: [
      { kind: "first", item: "breakfast" },
      { kind: "last", item: "leave" },
    ],
    items: [
      { id: "leave", label: "Evden çık", minutes: 2 },
      { id: "plants", label: "Bitkileri sula", minutes: 5 },
      { id: "breakfast", label: "Kahvaltı hazırla", minutes: 12 },
      { id: "call", label: "Annemi ara", minutes: 10 },
    ],
    addItems: [],
  },
  {
    id: "board",
    kind: "priority-board",
    prompt: "Taşınma günü: 45 dakika. Kolileri kapatmadan önce etiketle; anahtarlar en son.",
    droppable: true,
    budgetMinutes: 45,
    constraints: [
      { kind: "before", a: "label", b: "seal" },
      { kind: "last", item: "keys" },
      { kind: "keep", item: "seal" },
    ],
    items: [
      { id: "seal", label: "Kolileri kapat", minutes: 10 },
      { id: "keys", label: "Anahtarları teslim et", minutes: 5 },
      { id: "photos", label: "Sayaç fotoğrafı", minutes: 3 },
      { id: "label", label: "Kolileri etiketle", minutes: 8 },
      { id: "clean", label: "Son temizlik", minutes: 20 },
      { id: "plants", label: "Bitkileri paketle", minutes: 6 },
    ],
    addItems: [],
  },
  {
    id: "board",
    kind: "priority-board",
    prompt: "Sergi kurulumu: 60 dakika. Işık, duvardan sonra; etiketler, eserlerden sonra; kapı açılışı en son.",
    droppable: true,
    budgetMinutes: 60,
    constraints: [
      { kind: "before", a: "wall", b: "light" },
      { kind: "before", a: "art", b: "tags" },
      { kind: "last", item: "doors" },
      { kind: "keep", item: "art" },
      { kind: "first", item: "wall" },
    ],
    items: [
      { id: "tags", label: "Etiketleri as", minutes: 8 },
      { id: "doors", label: "Kapıları aç", minutes: 2 },
      { id: "light", label: "Işıkları ayarla", minutes: 12 },
      { id: "art", label: "Eserleri yerleştir", minutes: 20 },
      { id: "wall", label: "Duvarları boya rötuşu", minutes: 15 },
      { id: "chairs", label: "Sandalyeleri diz", minutes: 7 },
      { id: "sound", label: "Müzik sistemini kur", minutes: 9 },
    ],
    addItems: [],
  },
];

/** A minimal, valid quest wrapper so the real step components can run outside a quest. */
export function practiceQuest(steps: Step[]): Quest {
  return Quest.parse({
    id: "practice",
    version: 1,
    number: 999,
    slug: "practice",
    title: "Oyun Alanı",
    subtitle: "",
    description: "",
    campaignId: "practice",
    locationId: "crossroads",
    npcId: "watcher",
    npcLine: "",
    family: "notice",
    dimensions: ["attention"],
    difficulty: 1,
    estimatedMinutes: { min: 1, max: 2 },
    contexts: ["home"],
    energy: "low",
    people: "solo",
    requiresOutside: false,
    requiresPurchase: false,
    safety: { level: "minimal", movement: "none", requiresPurchase: false, contactsStrangers: false, photographsPeople: false, sharesLocation: false, notes: ["İstediğin zaman bırakabilirsin."] },
    prime: steps,
    act: { instruction: "-", reminder: "-" },
    reveal: [{ kind: "text", variants: [{ text: "-" }] }],
    fragment: "-",
    journey: [{ text: "-" }],
  });
}

export function practiceAttempt(seed: number, answers: Record<string, Record<string, unknown>>): QuestAttempt {
  return {
    id: "practice",
    questId: "practice",
    questVersion: 1,
    state: "PRIMING",
    stepIndex: 0,
    answers,
    seed,
    mystery: false,
    context: null,
    createdAt: new Date(0).toISOString(),
    actStartedAt: null,
    segmentMarks: [],
    sealedOpenedAt: null,
    returnedAt: null,
    completedAt: null,
    endedAt: null,
    history: [],
    outcome: null,
    simulated: true,
  };
}

/* ---- Personal bests: this device only ---------------------------------- */

const KEY = "sidequest.oyun-alani.v1";
export type Records = Record<string, { best: number | null; plays: number; last: number | null }>;

export async function loadRecords(): Promise<Records> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? "{}") as Records;
  } catch {
    return {};
  }
}

export function applyResult(records: Records, gameId: string, level: Level, summary: Summary): { records: Records; isBest: boolean } {
  const key = `${gameId}:${level}`;
  const prev = records[key] ?? { best: null, plays: 0, last: null };
  const valid = summary.score !== 9999;
  const isBest = valid && (prev.best === null || (summary.better === "higher" ? summary.score > prev.best : summary.score < prev.best));
  const next = { ...records, [key]: { best: isBest ? summary.score : prev.best, plays: prev.plays + 1, last: summary.score } };
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {
    /* depolama kapalıysa rekor yalnızca bu oturumda görünür */
  });
  return { records: next, isBest };
}

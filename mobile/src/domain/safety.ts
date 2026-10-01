/**
 * Safety engine. Quests involve real-world behaviour, so every quest is
 * validated against explicit rules. A quest with issues is never recommended
 * (the Context Engine filters it) and fails the content test suite.
 */
import type { Quest, Step } from "./content-types";
import { trLower } from "./text";

export interface SafetyIssue {
  questId: string;
  rule: string;
  detail: string;
}

/** Phrases that are safe even though they contain a watched word. Matched on Turkish-lowercased text. */
const ALLOWED_PHRASES = [/satın alman(a)? gerek(miyor| yok)/g, /hiçbir şey satın al(mana gerek yok|man gerekmiyor)/g, /ücretsiz/g];

/** Watched wording. Patterns run on text lowercased with the Turkish locale (I→ı, İ→i). */
const FORBIDDEN: { rule: string; pattern: RegExp }[] = [
  { rule: "no-purchase", pattern: /satın al|para harca|para öde|ücret öde|alışveriş yap/u },
  { rule: "no-trespassing", pattern: /izinsiz gir|özel mülk|çitin üzerinden|duvara tırman/u },
  { rule: "no-strangers", pattern: /yabancı(ya|yla|larla|lara)|tanımadığın (biri|kişi|insan)|yoldan geçen(e|lere) sor/u },
  { rule: "no-photos-of-people", pattern: /fotoğraf(ını|larını)? çek|kamera|video çek|(onları|insanları|birini) kaydet/u },
  { rule: "no-location-sharing", pattern: /(konum|adres)[a-zçğıöşüâîû]*[^.!?]{0,40}paylaş|paylaş[a-zçğıöşüâîû]*[^.!?]{0,40}(konum|adres)|gps|koordinat/u },
  { rule: "no-dangerous-activity", pattern: /koşarak geç|depar|zıpla|dengede dur|olabildiğince hızlı|karanlıkta/u },
  { rule: "no-driving-interaction", pattern: /(araba|araç) (sürerken|kullanırken)|direksiyon/u },
  { rule: "no-sensitive-info", pattern: /şifre|parola|banka|tıbbi|teşhis|sağlık kaydı/u },
];

const lower = trLower;

function stepTexts(step: Step): string[] {
  switch (step.kind) {
    case "narrative":
      return step.lines;
    case "twist":
      return [step.title, step.body];
    case "choice":
      return [step.prompt, ...step.options.flatMap((o) => [o.label, o.hint ?? ""])];
    case "priority-board":
      return [step.prompt, ...step.items.map((i) => i.label), ...step.addItems.map((i) => i.label)];
    case "sequence-encode":
    case "signal-filter":
    case "rule-shift":
      return [step.instruction];
    default:
      return "prompt" in step ? [step.prompt, "hint" in step ? (step.hint ?? "") : ""] : [];
  }
}

/** Everything the player is asked to read or do. Safety notes are excluded: they may name what's forbidden. */
export function actionTexts(quest: Quest): string[] {
  const act = quest.act;
  return [
    quest.title,
    quest.subtitle,
    quest.description,
    act.instruction,
    act.reminder,
    ...act.details,
    ...act.segments.map((s) => s.instruction),
    act.sealed?.body ?? "",
    act.sealed?.trigger ?? "",
    ...[...quest.prime, ...quest.recall, ...quest.reflection].flatMap(stepTexts),
  ].filter(Boolean);
}

export function validateQuestSafety(quest: Quest): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  const add = (rule: string, detail: string) => issues.push({ questId: quest.id, rule, detail });
  const s = quest.safety;
  const notes = lower(s.notes.join(" "));

  if (quest.requiresPurchase || s.requiresPurchase) add("no-purchase", "Görevler asla satın alma gerektiremez.");
  if (s.contactsStrangers) add("no-strangers", "Yabancılarla iletişim şart olamaz.");
  if (s.photographsPeople) add("no-photos-of-people", "Görevler insanların fotoğrafını çekmeyi gerektiremez.");
  if (s.sharesLocation) add("no-location-sharing", "Görevler konum paylaşmayı gerektiremez.");

  if (!/istediğin zaman bırak|kısa kes/u.test(notes)) {
    add("always-skippable", "Güvenlik notları oyuncuya istediği zaman bırakabileceğini söylemeli.");
  }
  if (quest.contexts.includes("commuting") && !/asla araç kullanırken/u.test(notes)) {
    add("no-driving-interaction", "Yolculuk görevleri sürücüler ve bisikletliler için olmadığını açıkça söylemeli.");
  }
  if ((quest.requiresOutside || s.movement === "walking") && !/kamuya açık/u.test(notes)) {
    add("public-places", "Dışarıdaki ve yürüyüşlü görevler oyuncuyu kamuya açık yerlerde tutmalı.");
  }
  if (quest.people === "required" && !/zaten tanıdığın/u.test(notes)) {
    add("known-people-only", "Sosyal görevler yalnızca oyuncunun zaten tanıdığı kişileri içerebilir.");
  }
  if (s.movement === "walking" && s.level === "minimal") {
    add("level-consistency", "Yürüyüşlü görevler 'minimal' olarak derecelendirilemez.");
  }
  if (quest.estimatedMinutes.min > quest.estimatedMinutes.max) {
    add("duration", "En kısa süre en uzun süreden büyük.");
  }

  for (const raw of actionTexts(quest)) {
    const text = ALLOWED_PHRASES.reduce((t, p) => t.replace(p, ""), lower(raw));
    for (const { rule, pattern } of FORBIDDEN) {
      if (pattern.test(text)) add(rule, `Yasaklı ifade: “${raw}”`);
    }
  }
  return issues;
}

export function isQuestSafe(quest: Quest): boolean {
  return validateQuestSafety(quest).length === 0;
}

/**
 * Weekly review: a narrative summary of the last seven days, plus one
 * question to explore next. The focus family gently boosts recommendations.
 */
import type { Content } from "@/content";
import type { QuestFamily } from "../content-types";
import type { PlayerState } from "../player-types";
import { resolvedAttempts } from "../world";

export const FAMILY_QUESTIONS: Record<QuestFamily, string> = {
  explore: "Hiç kullanmadığın yollarda neler var?",
  notice: "Neyi görmeyi bıraktın?",
  remember: "Tanıdık yerlerin zihnindeki kopyaları ne kadar doğru?",
  decide: "Bir karara ne kadar çabuk bağlanıyorsun?",
  break: "Hangi alışkanlıkların sensiz işliyor?",
  predict: "Zaman duygun ne kadar isabetli?",
  connect: "Bir sohbette gerçekte neyi duyuyorsun?",
  create: "İşler arasında geçiş yapmak sana neye mal oluyor?",
};

const FOCUS_ORDER: QuestFamily[] = ["predict", "notice", "decide", "break", "explore", "remember", "connect", "create"];

export interface WeeklyReview {
  from: string;
  to: string;
  lines: { value: number; label: string }[];
  focus: { family: QuestFamily; question: string };
}

export function weeklyReview(content: Content, state: PlayerState, now: Date): WeeklyReview | null {
  const to = now.getTime();
  const from = to - 7 * 24 * 3600 * 1000;
  const inWeek = (iso: string) => {
    const t = Date.parse(iso);
    return t >= from && t <= to;
  };
  const events = state.events.filter((e) => inWeek(e.at));
  const attempts = resolvedAttempts(state).filter((a) => inWeek(a.completedAt!));
  if (attempts.length === 0) return null;

  const count = (type: string) => events.filter((e) => e.type === type).length;
  const revisedSteps = new Set(events.filter((e) => e.type === "decision_changed").map((e) => `${e.attemptId}:${e.stepId}`));
  const lines = [
    { value: attempts.length, label: "görev tamamlandı" },
    { value: count("decision_made"), label: "karar verildi" },
    { value: revisedSteps.size, label: "karar son anda değişti" },
    { value: count("plan_changed"), label: "plan sürprizden sonra yenilendi" },
    { value: count("prediction_submitted"), label: "tahmin yapıldı" },
    { value: attempts.filter((a) => content.questById.get(a.questId)?.completionRules.interruptsRoutine).length, label: "alışkanlık bozuldu" },
  ].filter((l) => l.value > 0);

  const familyCounts = new Map<QuestFamily, number>();
  for (const a of attempts) {
    const f = content.questById.get(a.questId)?.family;
    if (f) familyCounts.set(f, (familyCounts.get(f) ?? 0) + 1);
  }
  const available = new Set(content.quests.map((q) => q.family));
  const family = FOCUS_ORDER.filter((f) => available.has(f)).sort((a, b) => (familyCounts.get(a) ?? 0) - (familyCounts.get(b) ?? 0))[0];

  return {
    from: new Date(from).toISOString(),
    to: now.toISOString(),
    lines,
    focus: { family, question: FAMILY_QUESTIONS[family] },
  };
}

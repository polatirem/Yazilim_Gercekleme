/**
 * Context Engine. Filters quests that can't work right now, then ranks the
 * rest with a transparent, deterministic score. No learned model: each
 * component is a plain function, and the breakdown is kept for inspection
 * (demo mode shows it). A future recommender only has to implement
 * `Recommender`.
 */
import type { Content } from "@/content";
import type { Quest, QuestFamily } from "./content-types";
import type { ContextInput, PlayerState } from "./player-types";
import { isQuestSafe } from "./safety";
import { isInProgress } from "./quest-machine";
import { deriveWorld, isQuestUnlocked, resolvedAttempts } from "./world";
import { weeklyReview } from "./behavior/weekly";

export type ExclusionReason = "unsafe" | "locked" | "place" | "time" | "energy" | "people" | "in-progress" | "not-mystery";

export interface ScoreBreakdown {
  contextCompatibility: number;
  durationCompatibility: number;
  questNovelty: number;
  campaignProgress: number;
  difficultyFit: number;
  behaviorBalance: number;
  energyFit: number;
  weeklyFocus: number;
  recentQuestPenalty: number;
}

export interface Candidate {
  quest: Quest;
  score: number;
  breakdown: ScoreBreakdown;
}

export interface Recommendation {
  ranked: Candidate[];
  excluded: { quest: Quest; reason: ExclusionReason }[];
}

export interface RecommendOptions {
  mystery?: boolean;
  now: Date;
}

export type Recommender = (content: Content, state: PlayerState, context: ContextInput, options: RecommendOptions) => Recommendation;

export const WEIGHTS: Record<keyof ScoreBreakdown, number> = {
  contextCompatibility: 1,
  durationCompatibility: 1.2,
  questNovelty: 1.5,
  campaignProgress: 1,
  difficultyFit: 0.8,
  behaviorBalance: 0.6,
  energyFit: 0.4,
  weeklyFocus: 1,
  recentQuestPenalty: 1,
};

const DAY = 24 * 3600 * 1000;

/** "30" in the time picker means "30 minutes or more". */
export function budgetMinutes(minutes: ContextInput["minutes"]): number {
  return minutes === 30 ? Number.POSITIVE_INFINITY : minutes;
}

export function exclusionReason(quest: Quest, state: PlayerState, context: ContextInput, unlocked: boolean, mystery: boolean): ExclusionReason | null {
  if (!isQuestSafe(quest)) return "unsafe";
  if (!unlocked) return "locked";
  if (mystery && !quest.mysteryEligible) return "not-mystery";
  if (!quest.contexts.includes(context.place)) return "place";
  if (quest.estimatedMinutes.min > budgetMinutes(context.minutes)) return "time";
  if (context.energy === "low" && quest.energy === "high") return "energy";
  if (quest.people === "required" && state.preferences.peopleComfort === "no") return "people";
  const active = state.activeAttemptId ? state.attempts[state.activeAttemptId] : null;
  if (active && active.questId === quest.id && isInProgress(active.state)) return "in-progress";
  return null;
}

function clamp(v: number, lo = 0, hi = 1) {
  return Math.min(hi, Math.max(lo, v));
}

export const recommend: Recommender = (content, state, context, options) => {
  const world = deriveWorld(content, state);
  const resolved = resolvedAttempts(state);
  const completedCount = resolved.length;
  const now = options.now.getTime();

  const familyCounts = new Map<QuestFamily, number>();
  for (const a of resolved) {
    const f = content.questById.get(a.questId)?.family;
    if (f) familyCounts.set(f, (familyCounts.get(f) ?? 0) + 1);
  }
  const lastResolved = resolved.at(-1);
  const suggested = new Set(lastResolved ? (content.questById.get(lastResolved.questId)?.nextQuestRules.suggests ?? []) : []);
  const focus = weeklyReview(content, state, options.now)?.focus.family;
  const targetDifficulty = completedCount < 3 ? 1 : completedCount < 10 ? 2 : 3;

  const ranked: Candidate[] = [];
  const excluded: Recommendation["excluded"] = [];

  for (const quest of content.quests) {
    const unlocked = isQuestUnlocked(quest, world.completedQuestIds, world.campaignProgress);
    const reason = exclusionReason(quest, state, context, unlocked, options.mystery ?? false);
    if (reason) {
      excluded.push({ quest, reason });
      continue;
    }

    const budget = budgetMinutes(context.minutes);
    const { min, max } = quest.estimatedMinutes;
    const durationCompatibility = !Number.isFinite(budget)
      ? clamp(0.5 + max / 60)
      : max <= budget
        ? clamp(1 - (budget - max) / (budget * 2), 0.4, 1)
        : min <= budget
          ? 0.7
          : 0;

    const contextCompatibility = quest.contexts[0] === context.place ? 1 : 0.75;

    const completedTimes = resolved.filter((a) => a.questId === quest.id).length;
    const questNovelty = completedTimes === 0 ? 1 : 0.2 / completedTimes;

    const p = world.campaignProgress[quest.campaignId];
    const fraction = p ? p.completed / p.total : 0;
    const campaignProgress = clamp((p?.done ? 0.1 : fraction > 0 ? 0.5 + fraction / 2 : 0.4) + (suggested.has(quest.id) ? 0.5 : 0), 0, 1.5);

    const difficultyFit = clamp(1 - Math.abs(quest.difficulty - targetDifficulty) * 0.4);

    const behaviorBalance = completedCount === 0 ? 0.5 : clamp(1 - (familyCounts.get(quest.family) ?? 0) / completedCount);

    const energy = context.energy ?? "normal";
    const energyFit = energy === quest.energy ? 1 : energy === "normal" || quest.energy === "normal" ? 0.6 : 0.2;

    const weeklyFocus = focus && focus === quest.family ? 0.3 : 0;

    let recentQuestPenalty = 0;
    for (const e of state.events) {
      if (e.questId !== quest.id) continue;
      const age = now - Date.parse(e.at);
      if (e.type === "quest_skipped" && age < 3 * DAY) recentQuestPenalty -= 0.6;
      if (e.type === "quest_abandoned" && age < 2 * DAY) recentQuestPenalty -= 0.3;
      if (e.type === "quest_completed" && age < DAY) recentQuestPenalty -= 0.5;
    }
    recentQuestPenalty = Math.max(recentQuestPenalty, -1.5);

    const breakdown: ScoreBreakdown = {
      contextCompatibility,
      durationCompatibility,
      questNovelty,
      campaignProgress,
      difficultyFit,
      behaviorBalance,
      energyFit,
      weeklyFocus,
      recentQuestPenalty,
    };
    const score = (Object.keys(breakdown) as (keyof ScoreBreakdown)[]).reduce((sum, k) => sum + breakdown[k] * WEIGHTS[k], 0);
    ranked.push({ quest, score: Math.round(score * 1000) / 1000, breakdown });
  }

  ranked.sort((a, b) => b.score - a.score || a.quest.number - b.quest.number);
  return { ranked, excluded };
};

export const EXCLUSION_COPY: Record<ExclusionReason, string> = {
  unsafe: "güvenlik denetimine takıldı",
  locked: "henüz açılmadı",
  place: "bulunduğun yere uymuyor",
  time: "daha fazla zaman istiyor",
  energy: "daha fazla enerji istiyor",
  people: "başka insanlar içeriyor",
  "in-progress": "zaten devam ediyor",
  "not-mystery": "gizemli değil",
};

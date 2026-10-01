/**
 * Gameplay behaviour metrics, derived purely from stored events.
 * These describe how quests went. They are not measurements of cognition.
 */
import type { Content } from "@/content";
import type { BehaviorEvent, PlayerState } from "../player-types";
import { resolvedAttempts } from "../world";

export interface PredictionPair {
  questId: string;
  attemptId: string;
  at: string;
  unit: "min" | "sec" | "count";
  predicted: number;
  actual: number;
  /** actual − predicted */
  error: number;
  /** (actual − predicted) / predicted */
  errorPct: number;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export function predictionPairs(events: BehaviorEvent[]): PredictionPair[] {
  const pairs: PredictionPair[] = [];
  for (const e of events) {
    if (e.type !== "actual_result_submitted" || !e.questId || !e.attemptId) continue;
    const v = rec(e.value);
    const predicted = num(v.predicted);
    const actual = num(v.value);
    const unit = v.unit;
    if (predicted === null || actual === null || predicted <= 0) continue;
    if (unit !== "min" && unit !== "sec" && unit !== "count") continue;
    pairs.push({ questId: e.questId, attemptId: e.attemptId, at: e.at, unit, predicted, actual, error: actual - predicted, errorPct: (actual - predicted) / predicted });
  }
  return pairs;
}

export const timePairs = (events: BehaviorEvent[]) => predictionPairs(events).filter((p) => p.unit !== "count");

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export interface BehaviorMetrics {
  questsCompleted: number;
  questsAbandoned: number;
  questsSkipped: number;
  routinesInterrupted: number;
  predictionsMade: number;
  detailsRecalled: number;
  twistsReceived: number;
  timeEstimates: { count: number; underestimated: number; overestimated: number; meanAbsErrorPct: number | null };
  decisionLatencyMs: number | null;
  decisionsMade: number;
  decisionChanges: number;
  planChanges: number;
  meanSwitchCostMs: number | null;
  signalFilter: { targets: number; hits: number; misses: number; falseAlarms: number };
  sequenceAccuracy: number | null;
  realWorldMinutes: number;
}

export function computeMetrics(content: Content, state: PlayerState): BehaviorMetrics {
  const events = state.events;
  const resolved = resolvedAttempts(state);
  const byType = (t: BehaviorEvent["type"]) => events.filter((e) => e.type === t);
  const time = timePairs(events);
  const TOLERANCE = 0.1;

  const switchCosts = byType("prime_action")
    .filter((e) => e.interaction === "rule-shift")
    .map((e) => num(rec(e.value).switchCostMs))
    .filter((v): v is number => v !== null);

  const filter = { targets: 0, hits: 0, misses: 0, falseAlarms: 0 };
  for (const e of byType("prime_action").filter((e) => e.interaction === "signal-filter")) {
    const v = rec(e.value);
    filter.targets += num(v.targets) ?? 0;
    filter.hits += num(v.hits) ?? 0;
    filter.misses += num(v.misses) ?? 0;
    filter.falseAlarms += num(v.falseAlarms) ?? 0;
  }

  const sequence = byType("recall_answered")
    .filter((e) => e.interaction === "sequence-recall")
    .map((e) => num(rec(e.value).accuracy))
    .filter((v): v is number => v !== null);

  const details = byType("recall_answered")
    .filter((e) => e.interaction === "list")
    .reduce((sum, e) => sum + (num(rec(e.value).count) ?? 0), 0);

  const actSeconds = byType("player_returned").reduce((sum, e) => sum + (num(rec(e.value).durationSec) ?? 0), 0);

  return {
    questsCompleted: resolved.length,
    questsAbandoned: byType("quest_abandoned").length,
    questsSkipped: byType("quest_skipped").length,
    routinesInterrupted: resolved.filter((a) => content.questById.get(a.questId)?.completionRules.interruptsRoutine).length,
    predictionsMade: byType("prediction_submitted").length,
    detailsRecalled: details,
    twistsReceived: byType("twist_received").length,
    timeEstimates: {
      count: time.length,
      underestimated: time.filter((p) => p.errorPct > TOLERANCE).length,
      overestimated: time.filter((p) => p.errorPct < -TOLERANCE).length,
      meanAbsErrorPct: mean(time.map((p) => Math.abs(p.errorPct))),
    },
    decisionLatencyMs: median(byType("decision_made").map((e) => e.responseTimeMs).filter((v): v is number => v !== null)),
    decisionsMade: byType("decision_made").length,
    decisionChanges: byType("decision_changed").length,
    planChanges: byType("plan_changed").filter((e) => (num(rec(e.value).positionsChanged) ?? 0) > 0).length,
    meanSwitchCostMs: mean(switchCosts),
    signalFilter: filter,
    sequenceAccuracy: mean(sequence),
    realWorldMinutes: Math.round(actSeconds / 60),
  };
}

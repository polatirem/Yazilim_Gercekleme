/**
 * Patterns: observations about gameplay that only appear once there is enough
 * evidence. Each pattern states its sample size, threshold, confidence and the
 * events that support it. Nothing here describes personality or cognition —
 * only what happened across quests.
 */
import type { BehaviorEvent } from "../player-types";
import { mean, median, timePairs } from "./metrics";

export type Confidence = "emerging" | "consistent";

export interface Pattern {
  id: string;
  statement: string;
  sampleSize: number;
  threshold: number;
  confidence: Confidence;
  supportingEventIds: string[];
}

export interface PendingPattern {
  id: string;
  label: string;
  have: number;
  need: number;
}

export interface PatternReport {
  patterns: Pattern[];
  pending: PendingPattern[];
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

const ids = (events: BehaviorEvent[]) => events.map((e) => e.id);

export function detectPatterns(events: BehaviorEvent[]): PatternReport {
  const patterns: Pattern[] = [];
  const pending: PendingPattern[] = [];

  /* Time estimates: direction ---------------------------------------- */
  const time = timePairs(events);
  const timeEvents = events.filter((e) => e.type === "actual_result_submitted" && ["min", "sec"].includes(String(rec(e.value).unit)));
  const TIME_MIN = 3;
  if (time.length < TIME_MIN) {
    pending.push({ id: "time-direction", label: "gerçekte olanla karşılaştırılan zaman tahmini", have: time.length, need: TIME_MIN });
  } else {
    const short = time.filter((p) => p.errorPct > 0.1).length;
    const long = time.filter((p) => p.errorPct < -0.1).length;
    const n = time.length;
    const confidence: Confidence = n >= 6 && Math.max(short, long) / n >= 0.8 ? "consistent" : "emerging";
    if (short / n >= 2 / 3) {
      patterns.push({
        id: "time-runs-long",
        statement: `İşler tahmin ettiğinden uzun sürme eğiliminde: ${n} seferin ${short} tanesinde.`,
        sampleSize: n,
        threshold: TIME_MIN,
        confidence,
        supportingEventIds: ids(timeEvents),
      });
    } else if (long / n >= 2 / 3) {
      patterns.push({
        id: "time-runs-short",
        statement: `İşler tahmin ettiğinden kısa sürme eğiliminde: ${n} seferin ${long} tanesinde.`,
        sampleSize: n,
        threshold: TIME_MIN,
        confidence,
        supportingEventIds: ids(timeEvents),
      });
    }
  }

  /* Time estimates: convergence -------------------------------------- */
  const CONVERGE_MIN = 6;
  if (time.length >= CONVERGE_MIN) {
    const early = mean(time.slice(0, 3).map((p) => Math.abs(p.errorPct)))!;
    const recent = mean(time.slice(-3).map((p) => Math.abs(p.errorPct)))!;
    if (recent < early * 0.75) {
      patterns.push({
        id: "time-converging",
        statement: `Son tahminlerin ilklerine göre gerçeğe daha yakın düşüyor (ortalama sapma %${Math.round(early * 100)} iken %${Math.round(recent * 100)} oldu).`,
        sampleSize: time.length,
        threshold: CONVERGE_MIN,
        confidence: time.length >= 9 ? "consistent" : "emerging",
        supportingEventIds: ids(timeEvents),
      });
    }
  }

  /* Re-planning after twists ----------------------------------------- */
  const plans = events.filter((e) => e.type === "plan_changed");
  const PLAN_MIN = 2;
  if (plans.length < PLAN_MIN) {
    pending.push({ id: "replanning", label: "sürprizden sonra yenilenen plan", have: plans.length, need: PLAN_MIN });
  } else {
    const big = plans.filter((e) => Number(rec(e.value).positionsChanged ?? 0) >= 3).length;
    const n = plans.length;
    const confidence: Confidence = n >= 4 ? "consistent" : "emerging";
    if (big / n >= 2 / 3) {
      patterns.push({ id: "replan-rebuild", statement: `Plan ayağının altında değiştiğinde onu yamamak yerine yeniden kurma eğilimindesin (${n} seferin ${big} tanesinde).`, sampleSize: n, threshold: PLAN_MIN, confidence, supportingEventIds: ids(plans) });
    } else if (big / n <= 1 / 3) {
      patterns.push({ id: "replan-patch", statement: `Plan ayağının altında değiştiğinde olabildiğince az şey değiştirme eğilimindesin (${n} seferin ${n - big} tanesinde).`, sampleSize: n, threshold: PLAN_MIN, confidence, supportingEventIds: ids(plans) });
    }
  }

  /* Rule switching ---------------------------------------------------- */
  const switches = events.filter((e) => e.type === "prime_action" && e.interaction === "rule-shift");
  const SWITCH_MIN = 2;
  if (switches.length < SWITCH_MIN) {
    pending.push({ id: "switching", label: "kural değişimli ısınma", have: switches.length, need: SWITCH_MIN });
  } else {
    const costs = switches.map((e) => Number(rec(e.value).switchCostMs ?? 0));
    if (costs.every((c) => c > 60)) {
      patterns.push({
        id: "switch-cost",
        statement: `Kurallar her değiştiğinde ilk tepkin yavaşladı — ortalama yaklaşık ${Math.round(mean(costs)!)} ms.`,
        sampleSize: costs.length,
        threshold: SWITCH_MIN,
        confidence: costs.length >= 3 ? "consistent" : "emerging",
        supportingEventIds: ids(switches),
      });
    }
  }

  /* Decision pace ----------------------------------------------------- */
  const decisions = events.filter((e) => e.type === "decision_made" && e.responseTimeMs !== null);
  const DECISION_MIN = 5;
  if (decisions.length < DECISION_MIN) {
    pending.push({ id: "decision-pace", label: "süresi ölçülen karar", have: decisions.length, need: DECISION_MIN });
  } else {
    const m = median(decisions.map((e) => e.responseTimeMs!))!;
    const confidence: Confidence = decisions.length >= 10 ? "consistent" : "emerging";
    if (m < 4000) {
      patterns.push({ id: "decide-quickly", statement: `Seçimlerine hızlı bağlanma eğilimindesin — ortanca ${(m / 1000).toFixed(1).replace(".", ",")} saniye.`, sampleSize: decisions.length, threshold: DECISION_MIN, confidence, supportingEventIds: ids(decisions) });
    } else if (m > 12000) {
      patterns.push({ id: "decide-slowly", statement: `Seçimlerde acele etmeme eğilimindesin — ortanca ${Math.round(m / 1000)} saniye.`, sampleSize: decisions.length, threshold: DECISION_MIN, confidence, supportingEventIds: ids(decisions) });
    }
  }

  return { patterns, pending };
}

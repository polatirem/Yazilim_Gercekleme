/**
 * Demo-mode simulation. Plays a quest through the real command pipeline with
 * plausible answers, so developers can exercise progression without walking
 * around. Attempts created here are flagged `simulated` and labelled as such.
 */
import type { Content } from "@/content";
import type { Step } from "./content-types";
import type { PlayerState, SequenceEncodeResult } from "./player-types";
import type { Ctx } from "./behavior/events";
import { generateEncoding, generateSceneChange, scoreOrder, scoreScene } from "./engines/sequence";
import { boardItems, countViolations, initialPlan, positionsChanged, totalMinutes } from "./engines/priority-board";
import { stepSeed } from "./random";
import { acceptQuest, acknowledgeReveal, beginQuest, measuredValue, proceedAfterReturn, returnFromAct, startAct, submitStep, markSegment } from "./game";
import { stepsFor } from "./quest-machine";

function sampleResult(step: Step, state: PlayerState, content: Content): Record<string, unknown> {
  const attempt = state.attempts[state.activeAttemptId!];
  const quest = content.questById.get(attempt.questId)!;
  switch (step.kind) {
    case "narrative":
    case "twist":
      return {};
    case "estimate":
      return { value: step.initial, anchor: step.anchor ? step.anchor.values[0] : null, anchorAnswer: step.anchor ? "more" : null, latencyMs: 4200 };
    case "actual": {
      const measured = measuredValue(step, attempt.answers);
      const fallback = Math.max(step.min, Math.round(((attempt.answers[step.pairsWith]?.value as number | undefined) ?? 5) * 1.3));
      return { value: measured ?? fallback, measured, corrected: false };
    }
    case "choice":
      return { optionId: step.options[0].id, label: step.options[0].label, latencyMs: step.options.length > 6 ? 14000 : 3500, changes: 0 };
    case "count":
      return { value: Math.min(step.max, 3) };
    case "scale":
      return { value: 3 };
    case "list":
      return { items: Array.from({ length: Math.max(step.required, 2) }, (_, i) => `Simulated detail ${i + 1}`) };
    case "item-check": {
      const items = ((attempt.answers[step.source]?.items as string[]) ?? []).map((_, i, arr) => (i === arr.length - 1 ? step.options[1].id : step.options[0].id));
      const counts: Record<string, number> = Object.fromEntries(step.options.map((o) => [o.id, items.filter((m) => m === o.id).length]));
      return { marks: items, counts };
    }
    case "text":
      return { text: "" };
    case "sequence-encode":
      return generateEncoding(step, stepSeed(attempt.seed, step.id)) as unknown as Record<string, unknown>;
    case "sequence-recall": {
      const encoding = attempt.answers[step.source] as unknown as SequenceEncodeResult;
      const encodeStep = quest.prime.find((s) => s.id === step.source);
      if (step.mode === "order") {
        const response = encoding.items.map((id, i) => (i === 2 ? encoding.items[(i + 1) % encoding.items.length] : id));
        return scoreOrder(encoding.items, response) as unknown as Record<string, unknown>;
      }
      const pool = encodeStep && encodeStep.kind === "sequence-encode" ? encodeStep.pool : [];
      const change = generateSceneChange(encoding, pool, step.changes, stepSeed(attempt.seed, step.id));
      return scoreScene(change.changed, change.changed, change.after) as unknown as Record<string, unknown>;
    }
    case "signal-filter":
      return { targets: 12, hits: 10, misses: 2, falseAlarms: 1, accuracy: 10 / 12, meanRoundMs: 8400 };
    case "rule-shift":
      return { trials: step.trials, correct: step.trials - 2, accuracy: (step.trials - 2) / step.trials, repeatMeanMs: 610, switchMeanMs: 790, switchCostMs: 180 };
    case "priority-board": {
      const items = boardItems(quest, step);
      const start = initialPlan(quest, step, attempt.answers);
      let order = start.order.filter((id) => !start.dropped.includes(id));
      for (const c of step.constraints) {
        if (c.kind === "first" || c.kind === "keep") order = [c.item, ...order.filter((id) => id !== c.item)];
      }
      const dropped = [...start.dropped.filter((id) => !order.includes(id))];
      while (step.budgetMinutes !== undefined && totalMinutes(order, items) > step.budgetMinutes && order.length > 1) {
        dropped.push(order.pop()!);
      }
      const previous = step.revises ? (attempt.answers[step.revises]?.order as string[] | undefined) : undefined;
      return {
        order,
        dropped,
        totalMinutes: totalMinutes(order, items),
        violations: countViolations(order, items, step),
        moves: 3,
        latencyMs: 21000,
        revised: Boolean(step.revises),
        positionsChanged: previous ? positionsChanged(previous, order) : 0,
      };
    }
  }
}

/** Completes a quest end-to-end. `actMinutes` controls the simulated time away. */
export function simulateQuest(state: PlayerState, content: Content, questId: string, ctx: Ctx, actMinutes = 12, mystery = false): PlayerState {
  const quest = content.questById.get(questId)!;
  let now = ctx.now.getTime();
  const tick = (ms: number): Ctx => {
    now += ms;
    return { now: new Date(now), id: ctx.id };
  };
  let s = acceptQuest(state, content, questId, { context: null, mystery, simulated: true }, tick(0));
  s = beginQuest(s, content, tick(1000));
  const runPhase = () => {
    const attempt = s.attempts[s.activeAttemptId!];
    for (const step of stepsFor(quest, attempt.state)) {
      s = submitStep(s, content, step.id, sampleResult(step, s, content), tick(5000));
    }
  };
  runPhase();
  s = startAct(s, content, tick(1000));
  const segments = quest.act.segments.length;
  for (let i = 0; i < segments - 1; i++) s = markSegment(s, content, tick(((actMinutes * 60000) / segments) * (i === 0 ? 0.9 : 1)));
  s = returnFromAct(s, content, tick(segments ? (actMinutes * 60000) / segments * 1.1 : actMinutes * 60000));
  s = proceedAfterReturn(s, content, tick(1500));
  while (["RECALL", "REFLECTION"].includes(s.attempts[s.activeAttemptId!].state)) runPhase();
  return acknowledgeReveal(s, content, tick(3000));
}

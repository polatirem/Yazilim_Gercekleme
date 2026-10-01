/** RULE SHIFT engine: sort marks by a rule that changes without much warning. */
import type { RuleKind, Shape, StepOf } from "../content-types";
import type { RuleShiftResult } from "../player-types";
import { intBetween, mulberry32 } from "../random";

export type Side = "left" | "right";

export interface Stimulus {
  shape: Shape;
  fill: "solid" | "open";
  side: Side;
}

export interface Trial {
  rule: RuleKind;
  stimulus: Stimulus;
  correct: Side;
  isSwitch: boolean;
}

export const RULES: Record<RuleKind, { name: string; instruction: string; left: string; right: string }> = {
  shape: { name: "Biçim", instruction: "Yuvarlak mı, köşeli mi?", left: "Yuvarlak", right: "Köşeli" },
  fill: { name: "Dolgu", instruction: "Dolu mu, boş mu?", left: "Dolu", right: "Boş" },
  "side-same": { name: "Taraf", instruction: "İşaret hangi taraftaysa o tarafa bas.", left: "Sol", right: "Sağ" },
  "side-opposite": { name: "Ters", instruction: "İşaretin OLMADIĞI tarafa bas.", left: "Sol", right: "Sağ" },
};

const ROUND: Shape[] = ["circle", "arch"];
const ANGULAR: Shape[] = ["square", "triangle", "diamond"];

export function correctResponse(rule: RuleKind, s: Stimulus): Side {
  switch (rule) {
    case "shape":
      return ROUND.includes(s.shape) ? "left" : "right";
    case "fill":
      return s.fill === "solid" ? "left" : "right";
    case "side-same":
      return s.side;
    case "side-opposite":
      return s.side === "left" ? "right" : "left";
  }
}

export function generateTrials(step: StepOf<"rule-shift">, seed: number): Trial[] {
  const rand = mulberry32(seed);
  const shapes = [...ROUND, ...ANGULAR];
  const trials: Trial[] = [];
  let ruleIndex = 0;
  let remaining = intBetween(rand, step.runLength[0], step.runLength[1]);
  for (let i = 0; i < step.trials; i++) {
    let isSwitch = false;
    if (remaining === 0) {
      ruleIndex = (ruleIndex + 1 + Math.floor(rand() * (step.rules.length - 1))) % step.rules.length;
      remaining = intBetween(rand, step.runLength[0], step.runLength[1]);
      isSwitch = true;
    }
    remaining--;
    const stimulus: Stimulus = {
      shape: shapes[Math.floor(rand() * shapes.length)],
      fill: rand() < 0.5 ? "solid" : "open",
      side: rand() < 0.5 ? "left" : "right",
    };
    const rule = step.rules[ruleIndex];
    trials.push({ rule, stimulus, correct: correctResponse(rule, stimulus), isSwitch });
  }
  return trials;
}

export interface TrialResponse {
  answer: Side;
  rtMs: number;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/**
 * Switch cost = mean response time on the first trial after a rule change minus
 * mean response time on repeat trials. Only correct responses count, and the
 * very first trial (no preceding rule) is excluded.
 */
export function scoreRuleShift(trials: Trial[], responses: TrialResponse[]): RuleShiftResult {
  const repeat: number[] = [];
  const switched: number[] = [];
  let correct = 0;
  trials.forEach((t, i) => {
    const r = responses[i];
    if (!r) return;
    const ok = r.answer === t.correct;
    if (ok) correct++;
    if (i === 0 || !ok) return;
    (t.isSwitch ? switched : repeat).push(r.rtMs);
  });
  const repeatMeanMs = Math.round(mean(repeat));
  const switchMeanMs = Math.round(mean(switched));
  return {
    trials: responses.length,
    correct,
    accuracy: responses.length ? correct / responses.length : 0,
    repeatMeanMs,
    switchMeanMs,
    switchCostMs: switched.length && repeat.length ? switchMeanMs - repeatMeanMs : 0,
  };
}

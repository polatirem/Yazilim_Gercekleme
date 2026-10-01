import { describe, expect, it } from "vitest";
import { CONTENT } from "@/content";
import type { StepOf } from "../content-types";
import { generateEncoding, generateSceneChange, scoreOrder, scoreScene } from "../engines/sequence";
import { generateRound, matchesRule, scoreFilter } from "../engines/signal-filter";
import { correctResponse, generateTrials, scoreRuleShift } from "../engines/rule-shift";
import { boardItems, countViolations, initialPlan, move, positionsChanged } from "../engines/priority-board";

const q007 = CONTENT.questById.get("q007")!;
const q009 = CONTENT.questById.get("q009")!;
const q018 = CONTENT.questById.get("q018")!;
const step = <K extends StepOf<never>["kind"] | string>(q: typeof q007, id: string) => [...q.prime, ...q.recall].find((s) => s.id === id) as unknown as StepOf<Extract<K, StepOf<never>["kind"]>>;

describe("sequence recall", () => {
  const turns = step(q007, "turns") as StepOf<"sequence-encode">;
  it("is deterministic per seed", () => {
    expect(generateEncoding(turns, 42)).toEqual(generateEncoding(turns, 42));
    expect(generateEncoding(turns, 42).items).toHaveLength(5);
  });
  it("scores positions, primacy and recency", () => {
    const r = scoreOrder(["L", "R", "S", "L", "R"], ["L", "S", "R", "L", "R"]);
    expect(r).toMatchObject({ correct: 3, total: 5, firstCorrect: true, lastCorrect: true, middleAccuracy: 1 / 3 });
  });
  it("changes exactly the requested number of scene cells", () => {
    const plate = step(q009, "plate") as StepOf<"sequence-encode">;
    const enc = generateEncoding(plate, 7);
    expect(enc.cells.filter(Boolean)).toHaveLength(7);
    const change = generateSceneChange(enc, plate.pool, 1, 9);
    expect(change.changed).toHaveLength(1);
    expect(change.after[change.changed[0]]).not.toBe(enc.cells[change.changed[0]]);
    expect(scoreScene(change.changed, change.changed, change.after).detected).toBe(true);
    expect(scoreScene(change.changed, [], change.after)).toMatchObject({ detected: false, misses: 1 });
  });
});

describe("signal filter", () => {
  const scan = step(CONTENT.questById.get("q008")!, "scan") as StepOf<"signal-filter">;
  it("places the configured number of targets and never uses a lure that matches", () => {
    const cells = generateRound(scan, 3, 0);
    expect(cells).toHaveLength(scan.cols * scan.rows);
    const targets = cells.filter((c) => c.isTarget).length;
    expect(targets).toBeGreaterThanOrEqual(scan.targetsPerRound[0]);
    expect(targets).toBeLessThanOrEqual(scan.targetsPerRound[1]);
    for (const c of cells) expect(matchesRule(c.glyph, scan.target)).toBe(c.isTarget);
  });
  it("scores hits, misses and false alarms", () => {
    expect(scoreFilter([{ targets: [1, 2, 3], selected: [1, 2, 9], ms: 5000 }])).toEqual({ targets: 3, hits: 2, misses: 1, falseAlarms: 1, accuracy: 2 / 3, meanRoundMs: 5000 });
  });
});

describe("rule shift", () => {
  const sw = step(CONTENT.questById.get("q002")!, "switch") as StepOf<"rule-shift">;
  it("generates runs with rule switches and correct answers", () => {
    const trials = generateTrials(sw, 11);
    expect(trials).toHaveLength(24);
    expect(trials[0].isSwitch).toBe(false);
    expect(trials.some((t) => t.isSwitch)).toBe(true);
    for (const t of trials) expect(t.correct).toBe(correctResponse(t.rule, t.stimulus));
  });
  it("computes switch cost from correct responses only", () => {
    const trials = generateTrials(sw, 11);
    const responses = trials.map((t) => ({ answer: t.correct, rtMs: t.isSwitch ? 900 : 600 }));
    responses[0] = { answer: trials[0].correct, rtMs: 5000 }; // first trial excluded
    expect(scoreRuleShift(trials, responses)).toMatchObject({ switchCostMs: 300, accuracy: 1 });
  });
});

describe("priority board", () => {
  const plan = step(q018, "plan") as StepOf<"priority-board">;
  const replan = step(q018, "replan") as StepOf<"priority-board">;
  it("inherits items through a revision and starts from the previous plan", () => {
    expect(boardItems(q018, replan).map((i) => i.id)).toEqual(plan.items.map((i) => i.id));
    const start = initialPlan(q018, replan, { plan: { order: ["desk", "water", "list"], dropped: ["sort", "reply"] } });
    expect(start).toEqual({ order: ["desk", "water", "list"], dropped: ["sort", "reply"] });
  });
  it("counts constraint and budget violations", () => {
    const items = boardItems(q018, replan);
    expect(countViolations(["reply", "water", "list"], items, replan)).toBe(0);
    expect(countViolations(["water", "reply", "list"], items, replan)).toBe(1);
    expect(countViolations(["reply", "water", "desk", "list"], items, replan)).toBe(1); // 18 > 15
    expect(countViolations(["water", "list"], items, replan)).toBe(2); // reply is neither kept nor first
  });
  it("moves items and counts changed positions", () => {
    expect(move(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(move(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(positionsChanged(["a", "b", "c"], ["c", "a", "b"])).toBe(3);
  });
});

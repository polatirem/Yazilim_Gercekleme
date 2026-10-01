import { describe, expect, it } from "vitest";
import { CONTENT } from "@/content";
import { Quest } from "../content-types";
import { validateQuestSafety } from "../safety";
import { deriveWorld, isQuestUnlocked } from "../world";
import { evaluateDiscoveries } from "../reveal";
import { computeMetrics, predictionPairs } from "../behavior/metrics";
import { detectPatterns } from "../behavior/patterns";
import { weeklyReview } from "../behavior/weekly";
import { npcCallback } from "../npc";
import { simulateQuest } from "../simulate";
import { acknowledgeWorld } from "../game";
import { evaluate, formatValue, renderTemplate } from "../refs";
import { freshPlayer, testCtx } from "./helpers";
import type { BehaviorEvent } from "../player-types";

describe("safety engine", () => {
  const base = CONTENT.questById.get("q001")!;

  it("flags forbidden actions in quest text", () => {
    const cases: [string, string][] = [
      ["Yolda bir kahve satın al.", "no-purchase"],
      ["Çitin üzerinden bahçeye geç.", "no-trespassing"],
      ["Tanımadığın birine saati sor.", "no-strangers"],
      ["Yanından geçenlerin fotoğrafını çek.", "no-photos-of-people"],
      ["Konumunu bir arkadaşınla paylaş.", "no-location-sharing"],
      ["Sonraki köşeye kadar depar at.", "no-dangerous-activity"],
      ["Araba kullanırken tabelaları say.", "no-driving-interaction"],
    ];
    for (const [instruction, rule] of cases) {
      const quest = { ...base, act: { ...base.act, instruction } };
      expect(validateQuestSafety(quest).map((i) => i.rule), instruction).toContain(rule);
    }
  });

  it("allows explicitly negated purchase wording", () => {
    const quest = { ...base, act: { ...base.act, instruction: "Dükkânın kapısına kadar yürü. Hiçbir şey satın almana gerek yok." } };
    expect(validateQuestSafety(quest)).toEqual([]);
  });

  it("requires the always-skippable note, public places for walks, and known people for social quests", () => {
    const noStop = { ...base, safety: { ...base.safety, notes: ["Kamuya açık yerlerde kal."] } };
    expect(validateQuestSafety(noStop).map((i) => i.rule)).toContain("always-skippable");
    const noPublic = { ...base, safety: { ...base.safety, notes: ["İstediğin zaman bırakabilirsin.", "Asla araç kullanırken değil."] } };
    expect(validateQuestSafety(noPublic).map((i) => i.rule)).toContain("public-places");
    const social = CONTENT.questById.get("q011")!;
    const strangers = { ...social, safety: { ...social.safety, notes: ["İstediğin zaman bırakabilirsin."] } };
    expect(validateQuestSafety(strangers).map((i) => i.rule)).toContain("known-people-only");
  });

  it("makes purchases impossible at the schema level", () => {
    const raw = { ...base, requiresPurchase: true };
    expect(Quest.safeParse(raw).success).toBe(false);
  });
});

describe("world unlock logic", () => {
  it("starts with only the Crossroads revealed", () => {
    const w = deriveWorld(CONTENT, freshPlayer());
    expect([...w.revealedLocations]).toEqual(["crossroads"]);
    expect(w.openPaths.size).toBe(0);
    expect(w.activeCampaignId).not.toBeNull();
  });

  it("reveals a quest's location and arrival path when completed, and marks it", () => {
    const c = testCtx();
    const s = simulateQuest(freshPlayer(c), CONTENT, "q008", c.ctx());
    const w = deriveWorld(CONTENT, s);
    expect(w.revealedLocations.has("observatory")).toBe(true);
    expect(w.openPaths.has("p-observatory")).toBe(true);
    expect(w.marks.observatory).toBe(1);
    expect(w.activeCampaignId).toBe("observer");
    expect(w.newLocations).toEqual(["observatory"]);
    const seen = deriveWorld(CONTENT, acknowledgeWorld(s, w.newLocations, w.newPaths));
    expect(seen.newLocations).toEqual([]);
    expect(seen.newPaths).toEqual([]);
  });

  it("opens paths into unmapped ground through quest effects", () => {
    const c = testCtx();
    const s = simulateQuest(freshPlayer(c), CONTENT, "q001", c.ctx());
    const w = deriveWorld(CONTENT, s);
    expect(w.openPaths.has("p-workshop")).toBe(true);
    expect(w.revealedLocations.has("workshop")).toBe(false);
  });

  it("unlocks later quests only with campaign progress", () => {
    const q004 = CONTENT.questById.get("q004")!;
    const c = testCtx();
    let s = freshPlayer(c);
    let w = deriveWorld(CONTENT, s);
    expect(isQuestUnlocked(q004, w.completedQuestIds, w.campaignProgress)).toBe(false);
    s = simulateQuest(s, CONTENT, "q003", c.advance(1000));
    w = deriveWorld(CONTENT, s);
    expect(isQuestUnlocked(q004, w.completedQuestIds, w.campaignProgress)).toBe(true);
  });

  it("applies campaign completion effects only when a campaign is finished", () => {
    const c = testCtx();
    let s = freshPlayer(c);
    const ids = CONTENT.campaignById.get("time-bender")!.questIds;
    for (const id of ids.slice(0, 6)) s = simulateQuest(s, CONTENT, id, c.advance(60_000));
    expect(deriveWorld(CONTENT, s).openPaths.has("p-station-market")).toBe(false);
    s = simulateQuest(s, CONTENT, ids[6], c.advance(60_000));
    const done = Object.values(s.attempts).find((a) => a.questId === ids[6])!;
    expect(done.outcome?.campaignCompleted).toBe("time-bender");
    expect(deriveWorld(CONTENT, s).openPaths.has("p-station-market")).toBe(true);
  });

  it("reveals the Unknown only through a mystery quest", () => {
    const c = testCtx();
    let s = simulateQuest(freshPlayer(c), CONTENT, "q015", c.ctx());
    expect(deriveWorld(CONTENT, s).revealedLocations.has("unknown")).toBe(false);
    const attempt = Object.values(s.attempts)[0];
    s = { ...s, attempts: { [attempt.id]: { ...attempt, mystery: true } } };
    expect(deriveWorld(CONTENT, s).revealedLocations.has("unknown")).toBe(true);
  });
});

describe("discovery unlock logic", () => {
  const q016 = CONTENT.questById.get("q016")!;
  const q002 = CONTENT.questById.get("q002")!;

  it("chooses the encounter variant that matches what happened", () => {
    const over = evaluateDiscoveries(q016, { estimate: { value: 10 }, actual: { value: 18 } }, freshPlayer());
    expect(over).toEqual([{ id: "planning-fallacy", isNew: true, text: "Sık yaptığın bir iş için 10 dk tahmin ettin. 18 dk sürdü." }]);
    const close = evaluateDiscoveries(q016, { estimate: { value: 10 }, actual: { value: 10.5 } }, freshPlayer());
    expect(close[0].text).toMatch(/bu kez görünmedi/);
  });

  it("only unlocks conditional discoveries when their condition holds", () => {
    const none = evaluateDiscoveries(q002, { switch: { switchCostMs: 20 }, caught: { value: 0 } }, freshPlayer());
    expect(none).toEqual([]);
    const both = evaluateDiscoveries(q002, { switch: { switchCostMs: 200 }, caught: { value: 4 } }, freshPlayer());
    expect(both.map((d) => d.id)).toEqual(["capture-error", "task-switching-cost"]);
  });

  it("marks repeat encounters as not new and appends them to the Codex entry", () => {
    const c = testCtx();
    let s = simulateQuest(freshPlayer(c), CONTENT, "q003", c.advance(1000));
    expect(s.discoveries.habituation.encounters).toHaveLength(1);
    s = simulateQuest(s, CONTENT, "q001", c.advance(60_000));
    const second = Object.values(s.attempts).find((a) => a.questId === "q001")!;
    expect(second.outcome?.discoveries.find((d) => d.id === "habituation")?.isNew).toBe(false);
    expect(s.discoveries.habituation.encounters).toHaveLength(2);
  });
});

describe("refs and templates", () => {
  const answers = { estimate: { value: 12 }, actual: { value: 18 }, pick: { label: "Only red things", optionId: "red" } };
  it("formats values", () => {
    expect(formatValue(12, "min")).toBe("12 dk");
    expect(formatValue(2.5, "min")).toBe("2,5 dk");
    expect(formatValue(0.5, "min")).toBe("30 sn");
    expect(formatValue(134, "duration")).toBe("2 dk 14 sn");
    expect(formatValue(-46, "signed-duration")).toBe("−46 sn");
    expect(formatValue(6, "signed-min")).toBe("+6 dk");
    expect(formatValue(undefined, "count")).toBe("–");
    expect(formatValue("İstasyon önü", "phrase")).toBe("istasyon önü");
    expect(formatValue("GPS route", "phrase")).toBe("GPS route");
  });
  it("renders templates and evaluates conditions", () => {
    expect(renderTemplate("Estimate {estimate.value|min}, actual {actual.value|min}.", answers)).toBe("Estimate 12 dk, actual 18 dk.");
    expect(evaluate({ compare: { a: "actual.value", op: "gt", b: "estimate.value", ratio: 1.15 } }, answers)).toBe(true);
    expect(evaluate({ all: [{ ref: "pick.optionId", op: "eq", value: "red" }, { not: { ref: "missing.value", op: "exists" } }] }, answers)).toBe(true);
    expect(evaluate({ ref: "estimate.value", op: "gt", value: "x" }, answers)).toBe(false);
  });
});

function ev(partial: Partial<BehaviorEvent> & Pick<BehaviorEvent, "type">, i: number): BehaviorEvent {
  return { id: `e${i}`, at: new Date(Date.UTC(2026, 8, 1, 0, i)).toISOString(), questId: "q016", attemptId: `a${i}`, phase: "RECALL", stepId: null, interaction: null, responseTimeMs: null, ...partial };
}

describe("behavior metrics", () => {
  it("pairs predictions with actual results and computes error", () => {
    const pairs = predictionPairs([ev({ type: "actual_result_submitted", value: { value: 18, predicted: 12, unit: "min" } }, 1)]);
    expect(pairs).toEqual([expect.objectContaining({ predicted: 12, actual: 18, error: 6, errorPct: 0.5 })]);
  });

  it("derives Journey counts from real events only", () => {
    const c = testCtx();
    let s = freshPlayer(c);
    const empty = computeMetrics(CONTENT, s);
    expect(empty).toMatchObject({ questsCompleted: 0, predictionsMade: 0, detailsRecalled: 0, meanSwitchCostMs: null, decisionLatencyMs: null });
    s = simulateQuest(s, CONTENT, "q002", c.advance(1000));
    s = simulateQuest(s, CONTENT, "q016", c.advance(60_000));
    const m = computeMetrics(CONTENT, s);
    expect(m.questsCompleted).toBe(2);
    expect(m.routinesInterrupted).toBe(1);
    expect(m.predictionsMade).toBe(1);
    expect(m.timeEstimates.count).toBe(1);
    expect(m.meanSwitchCostMs).toBe(180);
    expect(m.realWorldMinutes).toBeGreaterThan(0);
  });
});

describe("patterns", () => {
  const pair = (i: number, predicted: number, actual: number) => ev({ type: "actual_result_submitted", value: { value: actual, predicted, unit: "min" } }, i);

  it("never generates a pattern below its evidence threshold", () => {
    const report = detectPatterns([pair(1, 10, 15), pair(2, 10, 16)]);
    expect(report.patterns).toEqual([]);
    expect(report.pending.find((p) => p.id === "time-direction")).toEqual({ id: "time-direction", label: expect.any(String), have: 2, need: 3 });
  });

  it("reports a pattern with sample size, confidence and supporting events", () => {
    const report = detectPatterns([pair(1, 10, 15), pair(2, 10, 16), pair(3, 10, 14)]);
    const p = report.patterns.find((x) => x.id === "time-runs-long")!;
    expect(p.sampleSize).toBe(3);
    expect(p.confidence).toBe("emerging");
    expect(p.supportingEventIds).toEqual(["e1", "e2", "e3"]);
  });

  it("stays silent when the evidence is mixed", () => {
    const report = detectPatterns([pair(1, 10, 15), pair(2, 10, 6), pair(3, 10, 10)]);
    expect(report.patterns.filter((p) => p.id.startsWith("time-runs"))).toEqual([]);
  });

  it("detects convergence only with six or more pairs", () => {
    const events = [pair(1, 10, 20), pair(2, 10, 19), pair(3, 10, 18), pair(4, 10, 11), pair(5, 10, 10), pair(6, 10, 11)];
    expect(detectPatterns(events).patterns.map((p) => p.id)).toContain("time-converging");
    expect(detectPatterns(events.slice(0, 5)).patterns.map((p) => p.id)).not.toContain("time-converging");
  });
});

describe("weekly review and NPC callbacks", () => {
  it("returns nothing for an empty week and a review once quests exist", () => {
    const c = testCtx("2026-09-18T09:00:00Z");
    let s = freshPlayer(c);
    expect(weeklyReview(CONTENT, s, new Date("2026-09-20T09:00:00Z"))).toBeNull();
    s = simulateQuest(s, CONTENT, "q016", c.advance(1000));
    const review = weeklyReview(CONTENT, s, new Date("2026-09-20T09:00:00Z"))!;
    expect(review.lines[0]).toEqual({ value: 1, label: "görev tamamlandı" });
    expect(review.focus.family).not.toBe("predict");
  });

  it("only speaks about the past when events exist", () => {
    const c = testCtx();
    let s = freshPlayer(c);
    expect(npcCallback(CONTENT, "clockmaker", s)).toBeNull();
    expect(npcCallback(CONTENT, "cartographer", s)).toBeNull();
    s = simulateQuest(s, CONTENT, "q016", c.advance(1000));
    expect(npcCallback(CONTENT, "clockmaker", s)).toMatch(/^Geçen sefer tahminin .* kısa kaldı\.$/);
  });
});

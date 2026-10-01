import { describe, expect, it } from "vitest";
import { CONTENT } from "@/content";
import {
  GameError,
  abandonQuest,
  acceptQuest,
  acknowledgeReveal,
  beginQuest,
  openSealed,
  proceedAfterReturn,
  returnFromAct,
  skipQuest,
  startAct,
  submitStep,
} from "../game";
import { simulateQuest } from "../simulate";
import { deriveWorld } from "../world";
import { freshPlayer, testCtx } from "./helpers";

describe("the complete loop", () => {
  it("plays Three Minutes by hand: prime → act → return → reflection → reveal", () => {
    const c = testCtx();
    let s = freshPlayer(c);
    s = acceptQuest(s, CONTENT, "q015", { context: { place: "home", minutes: 5 }, mystery: false }, c.advance(1000));
    const id = s.activeAttemptId!;
    expect(s.attempts[id].state).toBe("ACCEPTED");
    s = beginQuest(s, CONTENT, c.advance(1000));
    expect(s.attempts[id].state).toBe("PRIMING");
    s = submitStep(s, CONTENT, "intro", {}, c.advance(4000));
    expect(s.attempts[id].state).toBe("READY_TO_ACT");
    s = startAct(s, CONTENT, c.advance(1000));
    expect(s.attempts[id].state).toBe("ACTING");
    s = returnFromAct(s, CONTENT, c.advance(154_000));
    expect(s.attempts[id].state).toBe("RETURNED");
    expect(s.attempts[id].answers.act).toMatchObject({ durationSec: 154, targetSec: 180, errorSec: -26 });
    s = proceedAfterReturn(s, CONTENT, c.advance(1000));
    expect(s.attempts[id].state).toBe("REFLECTION");
    s = submitStep(s, CONTENT, "doing", { optionId: "waited", label: "Mostly waited", latencyMs: 2000, changes: 0 }, c.advance(3000));

    const attempt = s.attempts[id];
    expect(attempt.state).toBe("REVEAL");
    expect(attempt.outcome?.blocks[0]).toEqual({
      kind: "figures",
      items: [
        { label: "Hedef", display: "3 dk" },
        { label: "Döndüğün an", display: "2 dk 34 sn" },
      ],
      delta: { label: "Fark", display: "−26 sn", sign: -1 },
    });
    expect(attempt.outcome?.discoveries).toEqual([{ id: "prospective-timing", isNew: true, text: expect.stringContaining("−26 sn kısa geldi") }]);
    expect(s.discoveries["prospective-timing"].encounters).toHaveLength(1);
    expect(attempt.outcome?.worldChanges.map((w) => w.id)).toEqual(expect.arrayContaining(["station", "p-station"]));

    s = acknowledgeReveal(s, CONTENT, c.advance(2000));
    expect(s.attempts[id].state).toBe("COMPLETED");
    expect(s.activeAttemptId).toBeNull();

    const types = s.events.map((e) => e.type);
    expect(types).toEqual(
      expect.arrayContaining(["quest_accepted", "prime_started", "prime_completed", "act_started", "prediction_submitted", "player_returned", "actual_result_submitted", "reflection_submitted", "quest_completed", "discovery_unlocked", "world_changed"]),
    );
  });

  it("refuses to submit a step out of order", () => {
    const c = testCtx();
    let s = acceptQuest(freshPlayer(c), CONTENT, "q016", { context: null, mystery: false }, c.ctx());
    s = beginQuest(s, CONTENT, c.advance(10));
    expect(() => submitStep(s, CONTENT, "estimate", { value: 3 }, c.advance(10))).toThrow(GameError);
  });

  it("refuses a second quest while one is active, and releases it on abandon", () => {
    const c = testCtx();
    let s = acceptQuest(freshPlayer(c), CONTENT, "q015", { context: null, mystery: false }, c.ctx());
    expect(() => acceptQuest(s, CONTENT, "q016", { context: null, mystery: false }, c.advance(10))).toThrow(/başka bir görev var/);
    s = abandonQuest(s, CONTENT, c.advance(10));
    expect(s.activeAttemptId).toBeNull();
    expect(s.events.at(-1)).toMatchObject({ type: "quest_abandoned", value: { phase: "ACCEPTED" } });
    expect(() => acceptQuest(s, CONTENT, "q016", { context: null, mystery: false }, c.advance(10))).not.toThrow();
  });

  it("does not unlock locked quests", () => {
    const c = testCtx();
    expect(() => acceptQuest(freshPlayer(c), CONTENT, "q007", { context: null, mystery: false }, c.ctx())).toThrow(/henüz açılmadı/);
  });

  it("records a skip without touching progress", () => {
    const c = testCtx();
    const s = skipQuest(freshPlayer(c), "q001", c.ctx());
    expect(s.events).toHaveLength(1);
    expect(Object.keys(s.attempts)).toHaveLength(0);
  });

  it("tracks the sealed act twist once", () => {
    const c = testCtx();
    let s = freshPlayer(c);
    for (const id of ["q015", "q016", "q017", "q018", "q019"]) s = simulateQuest(s, CONTENT, id, c.advance(60_000));
    s = acceptQuest(s, CONTENT, "q021", { context: null, mystery: false }, c.advance(1000));
    s = beginQuest(s, CONTENT, c.advance(10));
    s = submitStep(s, CONTENT, "route", { order: ["green", "high", "bench"], dropped: ["board"], totalMinutes: 35, violations: 0, moves: 2, latencyMs: 9000, revised: false, positionsChanged: 0 }, c.advance(10));
    s = submitStep(s, CONTENT, "estimate", { value: 30, anchor: null, anchorAnswer: null, latencyMs: 3000 }, c.advance(10));
    s = startAct(s, CONTENT, c.advance(10));
    s = openSealed(s, CONTENT, c.advance(600_000));
    s = openSealed(s, CONTENT, c.advance(10));
    expect(s.events.filter((e) => e.type === "twist_received" && e.interaction === "sealed")).toHaveLength(1);
    s = returnFromAct(s, CONTENT, c.advance(1_800_000));
    expect(s.attempts[s.activeAttemptId!].answers.act).toMatchObject({ sealedOpened: true });
  });
});

describe("every authored quest", () => {
  it.each(CONTENT.quests.map((q) => [q.id, q.title] as const))("%s (%s) completes through the real pipeline", (questId) => {
    const c = testCtx();
    let s = freshPlayer(c);
    // Unlock by completing the campaign's earlier quests first.
    const campaign = CONTENT.campaignById.get(CONTENT.questById.get(questId)!.campaignId)!;
    for (const earlier of campaign.questIds.slice(0, campaign.questIds.indexOf(questId))) s = simulateQuest(s, CONTENT, earlier, c.advance(60_000));
    s = simulateQuest(s, CONTENT, questId, c.advance(60_000));

    const attempt = Object.values(s.attempts).find((a) => a.questId === questId)!;
    expect(attempt.state).toBe("COMPLETED");
    const outcome = attempt.outcome!;
    expect(outcome.blocks.length).toBeGreaterThan(0);
    expect(outcome.journeyLine).not.toMatch(/[{}]/);
    for (const block of outcome.blocks) {
      if (block.kind === "text") expect(block.text).not.toMatch(/[{}]|–/);
      if (block.kind === "figures") for (const f of block.items) expect(f.display, f.label).not.toBe("–");
    }
    for (const d of outcome.discoveries) expect(d.text).not.toMatch(/[{}]|–/);
    expect(outcome.fragment.length).toBeGreaterThan(10);
  });

  it("completing all 21 reveals every location except the Unknown and opens every non-mystery path", () => {
    const c = testCtx();
    let s = freshPlayer(c);
    for (const campaign of CONTENT.campaigns) for (const id of campaign.questIds) s = simulateQuest(s, CONTENT, id, c.advance(60_000));
    const world = deriveWorld(CONTENT, s);
    expect([...world.revealedLocations].sort()).toEqual(CONTENT.locations.filter((l) => l.id !== "unknown").map((l) => l.id).sort());
    expect(world.openPaths.size).toBe(CONTENT.paths.length);
    for (const c2 of CONTENT.campaigns) expect(world.campaignProgress[c2.id].done).toBe(true);
  });
});

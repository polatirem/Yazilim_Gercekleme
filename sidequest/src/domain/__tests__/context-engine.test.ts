import { describe, expect, it } from "vitest";
import { CONTENT, buildContent } from "@/content";
import { CAMPAIGNS, NPCS, SEASONS } from "@/content/campaigns";
import { DISCOVERIES } from "@/content/discoveries";
import { AUTOPILOT_QUESTS } from "@/content/quests/autopilot";
import { OBSERVER_QUESTS } from "@/content/quests/observer";
import { TIME_BENDER_QUESTS } from "@/content/quests/time-bender";
import { LOCATIONS, PATHS } from "@/content/world";
import { recommend } from "../context-engine";
import { acceptQuest, setPreferences, skipQuest } from "../game";
import { simulateQuest } from "../simulate";
import { freshPlayer, testCtx } from "./helpers";

const now = new Date("2026-09-20T12:00:00Z");

describe("context engine — filtering", () => {
  it("only offers quests that fit the place, time and unlock state", () => {
    const { ranked, excluded } = recommend(CONTENT, freshPlayer(), { place: "home", minutes: 5 }, { now });
    expect(ranked.length).toBeGreaterThan(0);
    for (const { quest } of ranked) {
      expect(quest.contexts).toContain("home");
      expect(quest.estimatedMinutes.min).toBeLessThanOrEqual(5);
      expect(quest.availability.requiresCampaignProgress).toBe(0);
    }
    expect(excluded.find((e) => e.quest.id === "q001")?.reason).toBe("place");
    expect(excluded.find((e) => e.quest.id === "q007")?.reason).toBe("locked");
    expect(excluded.find((e) => e.quest.id === "q009")?.reason).toBe("time");
  });

  it("treats 30 minutes as 30 or more", () => {
    const c = testCtx();
    let s = freshPlayer(c);
    for (const id of ["q015", "q016", "q017", "q018", "q019"]) s = simulateQuest(s, CONTENT, id, c.advance(60_000));
    const ids = recommend(CONTENT, s, { place: "outside", minutes: 30 }, { now }).ranked.map((r) => r.quest.id);
    expect(ids).toContain("q021");
  });

  it("excludes high-energy quests when energy is low", () => {
    const c = testCtx();
    let s = freshPlayer(c);
    for (const id of ["q015", "q016", "q017", "q018", "q019"]) s = simulateQuest(s, CONTENT, id, c.advance(60_000));
    const r = recommend(CONTENT, s, { place: "outside", minutes: 30, energy: "low" }, { now });
    expect(r.excluded.find((e) => e.quest.id === "q021")?.reason).toBe("energy");
  });

  it("respects the player's comfort with social quests", () => {
    const c = testCtx();
    let s = freshPlayer(c);
    s = simulateQuest(s, CONTENT, "q008", c.advance(1000));
    const withPeople = recommend(CONTENT, s, { place: "with-people", minutes: 30 }, { now });
    expect(withPeople.ranked.map((r) => r.quest.id)).toContain("q011");
    const declined = recommend(CONTENT, setPreferences(s, { peopleComfort: "no" }), { place: "with-people", minutes: 30 }, { now });
    expect(declined.excluded.find((e) => e.quest.id === "q011")?.reason).toBe("people");
  });

  it("offers only mystery-eligible quests in mystery mode", () => {
    const { ranked } = recommend(CONTENT, freshPlayer(), { place: "home", minutes: 15 }, { now, mystery: true });
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((r) => r.quest.mysteryEligible)).toBe(true);
  });

  it("never offers the quest already in progress", () => {
    const c = testCtx();
    const s = acceptQuest(freshPlayer(c), CONTENT, "q015", { context: null, mystery: false }, c.ctx());
    const r = recommend(CONTENT, s, { place: "home", minutes: 5 }, { now });
    expect(r.excluded.find((e) => e.quest.id === "q015")?.reason).toBe("in-progress");
  });

  it("filters out quests that fail safety validation", () => {
    const unsafe = { ...AUTOPILOT_QUESTS[1], act: { ...AUTOPILOT_QUESTS[1].act, instruction: "Bir yabancıya yol sor." } };
    const content = buildContent({
      quests: [unsafe, ...AUTOPILOT_QUESTS.slice(2), ...OBSERVER_QUESTS, ...TIME_BENDER_QUESTS, AUTOPILOT_QUESTS[0]],
      campaigns: CAMPAIGNS,
      seasons: SEASONS,
      npcs: NPCS,
      discoveries: DISCOVERIES,
      locations: LOCATIONS,
      paths: PATHS,
    });
    const r = recommend(content, freshPlayer(), { place: "home", minutes: 15 }, { now });
    expect(r.excluded.find((e) => e.quest.id === "q002")?.reason).toBe("unsafe");
  });
});

describe("context engine — ranking", () => {
  it("is deterministic", () => {
    const a = recommend(CONTENT, freshPlayer(), { place: "home", minutes: 15 }, { now }).ranked.map((r) => [r.quest.id, r.score]);
    const b = recommend(CONTENT, freshPlayer(), { place: "home", minutes: 15 }, { now }).ranked.map((r) => [r.quest.id, r.score]);
    expect(a).toEqual(b);
  });

  it("scores are the weighted sum of a visible breakdown, sorted descending", () => {
    const { ranked } = recommend(CONTENT, freshPlayer(), { place: "home", minutes: 15 }, { now });
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    for (const r of ranked) expect(Object.keys(r.breakdown)).toHaveLength(9);
  });

  it("penalises a quest that was just skipped", () => {
    const c = testCtx("2026-09-20T11:00:00Z");
    const before = recommend(CONTENT, freshPlayer(c), { place: "home", minutes: 5 }, { now });
    const top = before.ranked[0].quest.id;
    const after = recommend(CONTENT, skipQuest(freshPlayer(c), top, c.ctx()), { place: "home", minutes: 5 }, { now });
    expect(after.ranked[0].quest.id).not.toBe(top);
    expect(after.ranked.find((r) => r.quest.id === top)!.breakdown.recentQuestPenalty).toBeLessThan(0);
  });

  it("prefers new quests over ones already completed", () => {
    const c = testCtx("2026-09-10T09:00:00Z");
    const s = simulateQuest(freshPlayer(c), CONTENT, "q015", c.ctx());
    const r = recommend(CONTENT, s, { place: "home", minutes: 5 }, { now });
    const done = r.ranked.find((x) => x.quest.id === "q015")!;
    expect(done.breakdown.questNovelty).toBeLessThan(1);
    expect(r.ranked[0].quest.id).not.toBe("q015");
  });

  it("boosts the quest the last reveal suggested", () => {
    const c = testCtx("2026-09-10T09:00:00Z");
    const s = simulateQuest(freshPlayer(c), CONTENT, "q015", c.ctx());
    const r = recommend(CONTENT, s, { place: "home", minutes: 30 }, { now });
    const suggested = r.ranked.find((x) => x.quest.id === "q016")!;
    const other = r.ranked.find((x) => x.quest.id === "q003")!;
    expect(suggested.breakdown.campaignProgress).toBeGreaterThan(other.breakdown.campaignProgress);
  });
});

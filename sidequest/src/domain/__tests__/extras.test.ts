import { describe, expect, it } from "vitest";
import { CONTENT } from "@/content";
import { dailyQuest, dayKey } from "../daily";
import { simulateQuest } from "../simulate";
import { deriveWorld, isQuestUnlocked } from "../world";
import { GAMES, practiceQuest, type Level } from "@/components/playground/games";
import { freshPlayer, testCtx } from "./helpers";

describe("Günün Görevi", () => {
  it("is the same all day and changes with the date", () => {
    const s = freshPlayer();
    const a = dailyQuest(CONTENT, s, new Date("2026-09-30T08:00:00"));
    const b = dailyQuest(CONTENT, s, new Date("2026-09-30T22:00:00"));
    expect(a?.id).toBe(b?.id);
    const week = new Set(Array.from({ length: 14 }, (_, i) => dailyQuest(CONTENT, s, new Date(2026, 8, i + 1))?.id));
    expect(week.size).toBeGreaterThan(1);
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("only offers unlocked quests and prefers ones not yet done", () => {
    const c = testCtx();
    let s = freshPlayer(c);
    s = simulateQuest(s, CONTENT, "q015", c.advance(1000));
    for (let d = 1; d <= 20; d++) {
      const q = dailyQuest(CONTENT, s, new Date(2026, 9, d))!;
      const w = deriveWorld(CONTENT, s);
      expect(isQuestUnlocked(q, w.completedQuestIds, w.campaignProgress)).toBe(true);
      expect(q.id).not.toBe("q015");
    }
  });
});

describe("Oyun Alanı", () => {
  it("builds a valid practice quest for every step game at every level", () => {
    for (const game of GAMES.filter((g) => g.kind === "steps")) {
      for (const level of [1, 2, 3] as Level[]) {
        expect(() => practiceQuest(game.build!(level)), `${game.id} ${level}`).not.toThrow();
      }
    }
  });

  it("each plan puzzle has at least one solution with no violations", async () => {
    const { countViolations, boardItems, constraintSatisfied } = await import("../engines/priority-board");
    for (const level of [1, 2, 3] as Level[]) {
      const quest = practiceQuest(GAMES.find((g) => g.id === "plan")!.build!(level));
      const board = quest.prime[0];
      if (board.kind !== "priority-board") throw new Error("not a board");
      const items = boardItems(quest, board);
      // Brute force over subsets and orders (≤ 7 items).
      const ids = items.map((i) => i.id);
      let solved = false;
      const permute = (rest: string[], chosen: string[]) => {
        if (solved) return;
        if (chosen.length && countViolations(chosen, items, board) === 0 && board.constraints.every((c) => constraintSatisfied(c, chosen))) solved = true;
        for (const id of rest) permute(rest.filter((x) => x !== id), [...chosen, id]);
      };
      permute(ids, []);
      expect(solved, `level ${level}`).toBe(true);
    }
  });
});

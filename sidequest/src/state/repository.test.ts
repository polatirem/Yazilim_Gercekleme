import { describe, expect, it } from "vitest";
import { CONTENT } from "@/content";
import { acceptQuest, beginQuest, startAct, submitStep } from "@/domain/game";
import { freshPlayer, testCtx } from "@/domain/__tests__/helpers";
import { LocalStorageRepository, MemoryStorage, STORAGE_KEY } from "./repository";

describe("quest persistence", () => {
  it("round-trips an in-progress quest so it survives a refresh", () => {
    const c = testCtx();
    let s = acceptQuest(freshPlayer(c), CONTENT, "q016", { context: { place: "home", minutes: 15 }, mystery: false }, c.ctx());
    s = beginQuest(s, CONTENT, c.advance(10));
    s = submitStep(s, CONTENT, "task", { optionId: "tidy", label: "Tidy a room or desk", latencyMs: 2000, changes: 1 }, c.advance(10));
    s = submitStep(s, CONTENT, "estimate", { value: 12, anchor: null, anchorAnswer: null, latencyMs: 3000 }, c.advance(10));
    s = startAct(s, CONTENT, c.advance(10));

    const storage = new MemoryStorage();
    new LocalStorageRepository(storage).save(s);
    const loaded = new LocalStorageRepository(storage).load();

    expect(loaded.status).toBe("ok");
    if (loaded.status !== "ok") return;
    expect(loaded.state).toEqual(s);
    const attempt = loaded.state.attempts[loaded.state.activeAttemptId!];
    expect(attempt.state).toBe("ACTING");
    expect(attempt.answers.estimate).toMatchObject({ value: 12 });
  });

  it("reports an empty store", () => {
    expect(new LocalStorageRepository(new MemoryStorage()).load()).toEqual({ status: "empty" });
  });

  it("reports corrupt or invalid saves instead of silently discarding them", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    expect(new LocalStorageRepository(storage).load()).toMatchObject({ status: "corrupt", raw: "{not json" });

    const bad = { ...freshPlayer(), attempts: { a: { state: "FLYING" } } };
    storage.setItem(STORAGE_KEY, JSON.stringify(bad));
    const result = new LocalStorageRepository(storage).load();
    expect(result.status).toBe("corrupt");
  });

  it("clears saved progress", () => {
    const storage = new MemoryStorage();
    const repo = new LocalStorageRepository(storage);
    repo.save(freshPlayer());
    repo.clear();
    expect(repo.load()).toEqual({ status: "empty" });
  });
});

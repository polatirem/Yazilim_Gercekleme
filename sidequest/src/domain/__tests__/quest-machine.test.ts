import { describe, expect, it } from "vitest";
import { CONTENT } from "@/content";
import { InvalidTransitionError, canTransition, nextState, transition } from "../quest-machine";
import type { QuestAttempt } from "../player-types";
import { QUEST_STATES } from "../player-types";

const withPrime = CONTENT.questById.get("q002")!; // prime + recall + reflection
const noPrimeNoRecall = CONTENT.questById.get("q015")!; // no recall, has prime + reflection
const q019 = CONTENT.questById.get("q019")!; // prime + reflection, no recall

function attempt(state: QuestAttempt["state"]): QuestAttempt {
  return {
    id: "a1",
    questId: withPrime.id,
    questVersion: 1,
    state,
    stepIndex: 3,
    answers: {},
    seed: 1,
    mystery: false,
    context: null,
    createdAt: "2026-01-01T00:00:00Z",
    actStartedAt: null,
    segmentMarks: [],
    sealedOpenedAt: null,
    returnedAt: null,
    completedAt: null,
    endedAt: null,
    history: [],
    outcome: null,
    simulated: false,
  };
}

describe("quest state machine", () => {
  it("walks the full loop for a quest with every phase", () => {
    const path: [QuestAttempt["state"], Parameters<typeof nextState>[1], QuestAttempt["state"]][] = [
      ["AVAILABLE", "accept", "ACCEPTED"],
      ["ACCEPTED", "begin", "PRIMING"],
      ["PRIMING", "prime-done", "READY_TO_ACT"],
      ["READY_TO_ACT", "start-act", "ACTING"],
      ["ACTING", "leave", "WAITING_FOR_RETURN"],
      ["WAITING_FOR_RETURN", "return", "RETURNED"],
      ["RETURNED", "proceed", "RECALL"],
      ["RECALL", "recall-done", "REFLECTION"],
      ["REFLECTION", "reflection-done", "REVEAL"],
      ["REVEAL", "complete", "COMPLETED"],
    ];
    for (const [from, action, to] of path) expect(nextState(from, action, withPrime)).toBe(to);
  });

  it("skips phases a quest doesn't author", () => {
    expect(nextState("RETURNED", "proceed", noPrimeNoRecall)).toBe("REFLECTION");
    expect(nextState("RETURNED", "proceed", q019)).toBe("REFLECTION");
    const bare = { ...withPrime, prime: [], recall: [], reflection: [] };
    expect(nextState("ACCEPTED", "begin", bare)).toBe("READY_TO_ACT");
    expect(nextState("RETURNED", "proceed", bare)).toBe("REVEAL");
    expect(nextState("RECALL", "recall-done", { ...withPrime, reflection: [] })).toBe("REVEAL");
  });

  it("allows abandoning any state before the reveal", () => {
    for (const s of ["ACCEPTED", "PRIMING", "READY_TO_ACT", "ACTING", "WAITING_FOR_RETURN", "RETURNED", "RECALL", "REFLECTION"] as const) {
      expect(nextState(s, "abandon", withPrime)).toBe("ABANDONED");
    }
    expect(canTransition("REVEAL", "abandon")).toBe(false);
  });

  it("rejects invalid transitions", () => {
    expect(() => nextState("AVAILABLE", "start-act", withPrime)).toThrow(InvalidTransitionError);
    expect(() => nextState("PRIMING", "return", withPrime)).toThrow(InvalidTransitionError);
    expect(() => nextState("ACTING", "complete", withPrime)).toThrow(InvalidTransitionError);
    expect(() => nextState("READY_TO_ACT", "return", withPrime)).toThrow(/"return" yapılamaz/);
  });

  it("treats COMPLETED and ABANDONED as terminal", () => {
    for (const terminal of ["COMPLETED", "ABANDONED"] as const) {
      for (const action of ["accept", "begin", "abandon", "return", "complete"] as const) expect(canTransition(terminal, action)).toBe(false);
    }
  });

  it("records history, resets the step index, and stamps the end", () => {
    const a = transition(attempt("REVEAL"), "complete", withPrime, "2026-01-02T00:00:00Z");
    expect(a.state).toBe("COMPLETED");
    expect(a.stepIndex).toBe(0);
    expect(a.endedAt).toBe("2026-01-02T00:00:00Z");
    expect(a.history).toEqual([{ from: "REVEAL", to: "COMPLETED", at: "2026-01-02T00:00:00Z" }]);
  });

  it("defines every state in the table", () => {
    for (const s of QUEST_STATES) expect(() => canTransition(s, "abandon")).not.toThrow();
  });
});

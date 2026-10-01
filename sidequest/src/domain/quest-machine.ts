/**
 * Quest state machine.
 *
 * AVAILABLE → ACCEPTED → PRIMING → READY_TO_ACT → ACTING ⇄ WAITING_FOR_RETURN
 *   → RETURNED → RECALL → REFLECTION → REVEAL → COMPLETED
 *
 * Phases a quest does not author are skipped (a quest without prime goes
 * straight from ACCEPTED to READY_TO_ACT). Any state before REVEAL can move
 * to ABANDONED. Anything not listed in TABLE is an invalid transition.
 */
import type { Quest, Step } from "./content-types";
import type { QuestAttempt, QuestState } from "./player-types";

export type QuestAction =
  | "accept"
  | "begin"
  | "prime-done"
  | "start-act"
  | "leave"
  | "return"
  | "proceed"
  | "recall-done"
  | "reflection-done"
  | "complete"
  | "abandon";

type Resolver = (quest: Quest) => QuestState;

const abandon: Resolver = () => "ABANDONED";
const afterReturn: Resolver = (q) => (q.recall.length ? "RECALL" : q.reflection.length ? "REFLECTION" : "REVEAL");

const TABLE: Record<QuestState, Partial<Record<QuestAction, Resolver>>> = {
  AVAILABLE: { accept: () => "ACCEPTED" },
  ACCEPTED: { begin: (q) => (q.prime.length ? "PRIMING" : "READY_TO_ACT"), abandon },
  PRIMING: { "prime-done": () => "READY_TO_ACT", abandon },
  READY_TO_ACT: { "start-act": () => "ACTING", abandon },
  ACTING: { leave: () => "WAITING_FOR_RETURN", return: () => "RETURNED", abandon },
  WAITING_FOR_RETURN: { return: () => "RETURNED", abandon },
  RETURNED: { proceed: afterReturn, abandon },
  RECALL: { "recall-done": (q) => (q.reflection.length ? "REFLECTION" : "REVEAL"), abandon },
  REFLECTION: { "reflection-done": () => "REVEAL", abandon },
  REVEAL: { complete: () => "COMPLETED" },
  COMPLETED: {},
  ABANDONED: {},
};

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: QuestState,
    readonly action: QuestAction,
  ) {
    super(`Görev ${from} durumundayken "${action}" yapılamaz.`);
    this.name = "InvalidTransitionError";
  }
}

export function canTransition(state: QuestState, action: QuestAction): boolean {
  return TABLE[state][action] !== undefined;
}

export function nextState(state: QuestState, action: QuestAction, quest: Quest): QuestState {
  const resolve = TABLE[state][action];
  if (!resolve) throw new InvalidTransitionError(state, action);
  return resolve(quest);
}

export function transition(attempt: QuestAttempt, action: QuestAction, quest: Quest, at: string): QuestAttempt {
  const to = nextState(attempt.state, action, quest);
  return {
    ...attempt,
    state: to,
    stepIndex: 0,
    history: [...attempt.history, { from: attempt.state, to, at }],
    endedAt: to === "COMPLETED" || to === "ABANDONED" ? at : attempt.endedAt,
  };
}

export const TERMINAL_STATES: readonly QuestState[] = ["COMPLETED", "ABANDONED"];
/** States in which the quest's results have been committed to the player's history. */
export const RESOLVED_STATES: readonly QuestState[] = ["REVEAL", "COMPLETED"];

export function isResolved(state: QuestState): boolean {
  return RESOLVED_STATES.includes(state);
}

export function isInProgress(state: QuestState): boolean {
  return !TERMINAL_STATES.includes(state) && state !== "AVAILABLE";
}

/** The steps a player works through in a step-based phase. */
export function stepsFor(quest: Quest, state: QuestState): Step[] {
  switch (state) {
    case "PRIMING":
      return quest.prime;
    case "RECALL":
      return quest.recall;
    case "REFLECTION":
      return quest.reflection;
    default:
      return [];
  }
}

export const PHASE_DONE_ACTION: Partial<Record<QuestState, QuestAction>> = {
  PRIMING: "prime-done",
  RECALL: "recall-done",
  REFLECTION: "reflection-done",
};

/** Where a state sits in THINK → ACT → DISCOVER, for the phase indicator. */
export function movementOf(state: QuestState): "think" | "act" | "discover" | null {
  switch (state) {
    case "ACCEPTED":
    case "PRIMING":
    case "READY_TO_ACT":
      return "think";
    case "ACTING":
    case "WAITING_FOR_RETURN":
      return "act";
    case "RETURNED":
    case "RECALL":
    case "REFLECTION":
    case "REVEAL":
      return "discover";
    default:
      return null;
  }
}

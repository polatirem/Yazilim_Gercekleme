import type { Quest, StepKind, StepOf } from "@/domain/content-types";
import type { EventType, QuestAttempt } from "@/domain/player-types";

export interface Interaction {
  type: EventType;
  interaction?: string;
  stepId?: string;
  value?: unknown;
  responseTimeMs?: number;
  meta?: Record<string, unknown>;
}

/**
 * Every step component receives the same contract. Components report results
 * and intermediate interactions; the game layer turns them into events.
 */
export interface StepProps<K extends StepKind> {
  step: StepOf<K>;
  quest: Quest;
  attempt: QuestAttempt;
  submit: (result: Record<string, unknown>, responseTimeMs?: number) => void;
  track: (interaction: Interaction) => void;
}

/** Monotonic milliseconds for response times. */
export function nowMs(): number {
  const p = (globalThis as { performance?: { now?: () => number } }).performance;
  return typeof p?.now === "function" ? p.now() : Date.now();
}

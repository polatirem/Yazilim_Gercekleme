/**
 * Centralised behavior-event layer. Every event in the product is created here,
 * so the shape is consistent and UI components never assemble analytics
 * payloads themselves. Events are stored locally with the player's state.
 */
import type { BehaviorEvent, EventType, PlayerState, QuestState } from "../player-types";

export interface Ctx {
  now: Date;
  id: () => string;
}

export interface QuestEventInput {
  type: EventType;
  questId?: string | null;
  attemptId?: string | null;
  phase?: QuestState | null;
  stepId?: string | null;
  interaction?: string | null;
  responseTimeMs?: number | null;
  value?: unknown;
  meta?: Record<string, unknown>;
}

/** Local storage is finite; the oldest events beyond this are dropped. */
export const MAX_EVENTS = 8000;

export function createEvent(input: QuestEventInput, ctx: Ctx): BehaviorEvent {
  return {
    id: ctx.id(),
    type: input.type,
    at: ctx.now.toISOString(),
    questId: input.questId ?? null,
    attemptId: input.attemptId ?? null,
    phase: input.phase ?? null,
    stepId: input.stepId ?? null,
    interaction: input.interaction ?? null,
    responseTimeMs: input.responseTimeMs ?? null,
    ...(input.value !== undefined ? { value: input.value } : {}),
    ...(input.meta ? { meta: input.meta } : {}),
  };
}

export function trackQuestEvent(state: PlayerState, input: QuestEventInput, ctx: Ctx): PlayerState {
  const events = [...state.events, createEvent(input, ctx)];
  return { ...state, events: events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events };
}

export function trackMany(state: PlayerState, inputs: QuestEventInput[], ctx: Ctx): PlayerState {
  return inputs.reduce((s, input) => trackQuestEvent(s, input, ctx), state);
}

/**
 * Persisted player model. Validated on load so a corrupted or outdated save
 * surfaces as an explicit error instead of undefined behaviour.
 *
 * Maps onto the relational model in docs/DATA_MODEL.md:
 *   PlayerState.preferences  -> UserPreferences
 *   PlayerState.attempts     -> QuestProgress
 *   PlayerState.events       -> QuestEvent
 *   PlayerState.discoveries  -> UserDiscovery
 *   PlayerState.world        -> WorldState (acknowledged reveals)
 */
import { z } from "zod";
import { Energy, Glyph, Place, TimeBudget } from "./content-types";

export const QUEST_STATES = [
  "AVAILABLE",
  "ACCEPTED",
  "PRIMING",
  "READY_TO_ACT",
  "ACTING",
  "WAITING_FOR_RETURN",
  "RETURNED",
  "RECALL",
  "REFLECTION",
  "REVEAL",
  "COMPLETED",
  "ABANDONED",
] as const;
export const QuestState = z.enum(QUEST_STATES);
export type QuestState = z.infer<typeof QuestState>;

export const ContextInput = z.object({
  place: Place,
  minutes: TimeBudget,
  energy: Energy.optional(),
});
export type ContextInput = z.infer<typeof ContextInput>;

export const Preferences = z.object({
  onboarded: z.boolean(),
  primaryPlace: z.enum(["home", "work", "outside"]).nullable(),
  typicalMinutes: z.union([z.literal(5), z.literal(15), z.literal(30)]).nullable(),
  peopleComfort: z.enum(["yes", "sometimes", "no"]).nullable(),
  motion: z.enum(["system", "reduce"]),
});
export type Preferences = z.infer<typeof Preferences>;

/* ------------------------------------------------------------------ */
/* Rendered reveal (stored with the attempt so history stays stable)   */
/* ------------------------------------------------------------------ */

export const RenderedBlock = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("figures"),
    items: z.array(z.object({ label: z.string(), display: z.string() })),
    delta: z.object({ label: z.string(), display: z.string(), sign: z.number() }).optional(),
  }),
  z.object({ kind: z.literal("text"), text: z.string() }),
  z.object({
    kind: z.literal("sequence"),
    expected: z.array(z.object({ label: z.string(), glyph: Glyph.optional() })),
    response: z.array(z.object({ label: z.string(), glyph: Glyph.optional() })),
    hits: z.array(z.boolean()),
  }),
  z.object({
    kind: z.literal("scene"),
    cols: z.number(),
    rows: z.number(),
    cells: z.array(Glyph.nullable()),
    changed: z.array(z.number()),
    selected: z.array(z.number()),
  }),
  z.object({ kind: z.literal("filter"), hits: z.number(), misses: z.number(), falseAlarms: z.number(), targets: z.number() }),
  z.object({
    kind: z.literal("switch"),
    repeatMeanMs: z.number(),
    switchMeanMs: z.number(),
    switchCostMs: z.number(),
    accuracy: z.number(),
  }),
  z.object({ kind: z.literal("list"), label: z.string(), items: z.array(z.string()) }),
  z.object({ kind: z.literal("plan"), before: z.array(z.string()), after: z.array(z.string()), dropped: z.array(z.string()) }),
]);
export type RenderedBlock = z.infer<typeof RenderedBlock>;

export const WorldChange = z.object({
  kind: z.enum(["location", "path"]),
  id: z.string(),
  label: z.string(),
});
export type WorldChange = z.infer<typeof WorldChange>;

export const Outcome = z.object({
  blocks: z.array(RenderedBlock),
  discoveries: z.array(z.object({ id: z.string(), text: z.string(), isNew: z.boolean() })),
  worldChanges: z.array(WorldChange),
  fragment: z.string(),
  campaignCompleted: z.string().nullable(),
  npcLine: z.string().nullable(),
  suggestion: z.string().nullable(),
  journeyLine: z.string(),
});
export type Outcome = z.infer<typeof Outcome>;

/* ------------------------------------------------------------------ */
/* Attempts                                                            */
/* ------------------------------------------------------------------ */

export const Transition = z.object({ from: QuestState, to: QuestState, at: z.string() });

export const QuestAttempt = z.object({
  id: z.string(),
  questId: z.string(),
  questVersion: z.number(),
  state: QuestState,
  /** Index of the current step within the current phase. */
  stepIndex: z.number().int().min(0),
  answers: z.record(z.string(), z.record(z.string(), z.unknown())),
  seed: z.number().int(),
  mystery: z.boolean(),
  context: ContextInput.nullable(),
  createdAt: z.string(),
  actStartedAt: z.string().nullable(),
  segmentMarks: z.array(z.string()),
  sealedOpenedAt: z.string().nullable(),
  returnedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  history: z.array(Transition),
  outcome: Outcome.nullable(),
  /** Created through demo tools; shown as such in the Journey. */
  simulated: z.boolean(),
});
export type QuestAttempt = z.infer<typeof QuestAttempt>;

/* ------------------------------------------------------------------ */
/* Behavior events                                                     */
/* ------------------------------------------------------------------ */

export const EVENT_TYPES = [
  "quest_viewed",
  "quest_accepted",
  "quest_skipped",
  "prime_started",
  "prime_action",
  "prime_completed",
  "act_started",
  "act_left",
  "act_segment_completed",
  "player_returned",
  "recall_answered",
  "decision_made",
  "decision_changed",
  "prediction_submitted",
  "actual_result_submitted",
  "twist_received",
  "plan_changed",
  "reflection_submitted",
  "quest_completed",
  "quest_abandoned",
  "discovery_unlocked",
  "world_changed",
  "npc_callback_shown",
] as const;
export const EventType = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof EventType>;

export const BehaviorEvent = z.object({
  id: z.string(),
  type: EventType,
  at: z.string(),
  questId: z.string().nullable(),
  attemptId: z.string().nullable(),
  phase: QuestState.nullable(),
  stepId: z.string().nullable(),
  interaction: z.string().nullable(),
  responseTimeMs: z.number().nullable(),
  value: z.unknown().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type BehaviorEvent = z.infer<typeof BehaviorEvent>;

export const DiscoveryRecord = z.object({
  firstAt: z.string(),
  encounters: z.array(z.object({ attemptId: z.string(), questId: z.string(), at: z.string(), text: z.string() })),
});
export type DiscoveryRecord = z.infer<typeof DiscoveryRecord>;

export const PLAYER_SCHEMA_VERSION = 1;

export const PlayerState = z.object({
  schemaVersion: z.literal(PLAYER_SCHEMA_VERSION),
  playerId: z.string(),
  createdAt: z.string(),
  preferences: Preferences,
  attempts: z.record(z.string(), QuestAttempt),
  activeAttemptId: z.string().nullable(),
  events: z.array(BehaviorEvent),
  discoveries: z.record(z.string(), DiscoveryRecord),
  /** Reveals the player has already watched happen on the map. */
  world: z.object({ seenLocations: z.array(z.string()), seenPaths: z.array(z.string()) }),
  lastContext: ContextInput.nullable(),
});
export type PlayerState = z.infer<typeof PlayerState>;

/* ------------------------------------------------------------------ */
/* Step results (stored in attempt.answers[stepId])                    */
/* ------------------------------------------------------------------ */

export interface EstimateResult { value: number; anchor: number | null; anchorAnswer: "more" | "less" | null; latencyMs: number }
export interface ActualResult { value: number; measured: number | null; corrected: boolean; predicted: number | null; error: number | null; absError: number | null; errorPct: number | null }
export interface ChoiceResult { optionId: string; label: string; latencyMs: number; latencySec: number; changes: number }
export interface CountResult { value: number }
export interface ScaleResult { value: number }
export interface ListResult { items: string[]; count: number }
export interface ItemCheckResult { marks: string[]; counts: Record<string, number> }
export interface TextResult { text: string }
export interface SequenceEncodeResult { items: string[]; cells: (string | null)[] }
export interface OrderRecallResult { response: string[]; hits: boolean[]; correct: number; total: number; accuracy: number; firstCorrect: boolean; lastCorrect: boolean; middleAccuracy: number }
export interface SceneChangeResult { changed: number[]; selected: number[]; after: (string | null)[]; hits: number; misses: number; falseAlarms: number; detected: boolean }
export interface SignalFilterResult { targets: number; hits: number; misses: number; falseAlarms: number; accuracy: number; meanRoundMs: number }
export interface RuleShiftResult { trials: number; correct: number; accuracy: number; repeatMeanMs: number; switchMeanMs: number; switchCostMs: number }
export interface BoardResult { order: string[]; dropped: string[]; totalMinutes: number; violations: number; moves: number; latencyMs: number; revised: boolean; positionsChanged: number }
export interface ActResult { durationSec: number; durationMin: number; segments: Record<string, number>; segmentsMin: Record<string, number>; sealedOpened: boolean; away: boolean; targetSec: number | null; errorSec: number | null; absErrorSec: number | null }

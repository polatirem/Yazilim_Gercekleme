/**
 * Game commands. Pure functions: (state, input, ctx) → new state.
 * This is the only place quest progress changes and the only place gameplay
 * events are emitted, so UI components stay free of game and analytics logic.
 */
import type { Content } from "@/content";
import type { Quest, Step, StepOf } from "./content-types";
import type {
  ActResult,
  ActualResult,
  BoardResult,
  ChoiceResult,
  ContextInput,
  EstimateResult,
  ListResult,
  PlayerState,
  Preferences,
  QuestAttempt,
} from "./player-types";
import { PLAYER_SCHEMA_VERSION } from "./player-types";
import { trackMany, trackQuestEvent, type Ctx, type QuestEventInput } from "./behavior/events";
import { PHASE_DONE_ACTION, isInProgress, stepsFor, transition, type QuestAction } from "./quest-machine";
import { hashString } from "./random";
import { buildOutcome } from "./reveal";
import { isQuestSafe } from "./safety";
import { deriveWorld, isQuestUnlocked } from "./world";
import { npcCallback } from "./npc";

export class GameError extends Error {
  constructor(
    readonly code: "NO_ACTIVE" | "ANOTHER_ACTIVE" | "UNKNOWN_QUEST" | "LOCKED" | "UNSAFE" | "WRONG_STEP" | "WRONG_STATE",
    message: string,
  ) {
    super(message);
    this.name = "GameError";
  }
}

/* ------------------------------------------------------------------ */
/* Player                                                              */
/* ------------------------------------------------------------------ */

export function createPlayer(ctx: Ctx): PlayerState {
  return {
    schemaVersion: PLAYER_SCHEMA_VERSION,
    playerId: ctx.id(),
    createdAt: ctx.now.toISOString(),
    preferences: { onboarded: false, primaryPlace: null, typicalMinutes: null, peopleComfort: null, motion: "system" },
    attempts: {},
    activeAttemptId: null,
    events: [],
    discoveries: {},
    world: { seenLocations: [], seenPaths: [] },
    lastContext: null,
  };
}

export function setPreferences(state: PlayerState, patch: Partial<Preferences>): PlayerState {
  return { ...state, preferences: { ...state.preferences, ...patch } };
}

export function setLastContext(state: PlayerState, context: ContextInput): PlayerState {
  return { ...state, lastContext: context };
}

export function acknowledgeWorld(state: PlayerState, locations: string[], paths: string[]): PlayerState {
  const seenLocations = [...new Set([...state.world.seenLocations, ...locations])];
  const seenPaths = [...new Set([...state.world.seenPaths, ...paths])];
  return { ...state, world: { seenLocations, seenPaths } };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function activeAttempt(state: PlayerState): QuestAttempt | null {
  const a = state.activeAttemptId ? state.attempts[state.activeAttemptId] : null;
  return a && isInProgress(a.state) ? a : null;
}

function requireActive(state: PlayerState, content: Content): { attempt: QuestAttempt; quest: Quest } {
  const attempt = state.activeAttemptId ? state.attempts[state.activeAttemptId] : null;
  if (!attempt) throw new GameError("NO_ACTIVE", "Devam eden bir görev yok.");
  const quest = content.questById.get(attempt.questId);
  if (!quest) throw new GameError("UNKNOWN_QUEST", `Bilinmeyen görev: ${attempt.questId}.`);
  return { attempt, quest };
}

function put(state: PlayerState, attempt: QuestAttempt): PlayerState {
  return { ...state, attempts: { ...state.attempts, [attempt.id]: attempt } };
}

function eventFor(attempt: QuestAttempt, input: Omit<QuestEventInput, "questId" | "attemptId" | "phase"> & { phase?: QuestAttempt["state"] }): QuestEventInput {
  return { questId: attempt.questId, attemptId: attempt.id, phase: attempt.state, ...input };
}

function move(state: PlayerState, content: Content, attempt: QuestAttempt, quest: Quest, action: QuestAction, ctx: Ctx): PlayerState {
  const next = transition(attempt, action, quest, ctx.now.toISOString());
  let s = put(state, next);
  if (next.state === "PRIMING") s = trackQuestEvent(s, eventFor(next, { type: "prime_started" }), ctx);
  if (attempt.state === "PRIMING" && next.state !== "PRIMING" && next.state !== "ABANDONED") {
    s = trackQuestEvent(s, eventFor(attempt, { type: "prime_completed" }), ctx);
  }
  if (next.state === "REVEAL") s = finalize(s, content, next, quest, ctx);
  return s;
}

/** Value measured by the app for an `actual` step, used to pre-fill it. */
export function measuredValue(step: StepOf<"actual">, answers: QuestAttempt["answers"]): number | null {
  const act = answers.act as unknown as ActResult | undefined;
  if (!act) return null;
  if (step.source === "act") return step.unit === "sec" ? act.durationSec : act.durationMin;
  if (step.source.startsWith("segment:")) {
    const id = step.source.slice("segment:".length);
    const sec = act.segments[id];
    if (sec === undefined) return null;
    return step.unit === "sec" ? sec : Math.round((sec / 60) * 10) / 10;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Discovery screen                                                    */
/* ------------------------------------------------------------------ */

export function viewQuest(state: PlayerState, questId: string, ctx: Ctx, meta: { mystery?: boolean; source: string }): PlayerState {
  return trackQuestEvent(state, { type: "quest_viewed", questId, meta }, ctx);
}

export function skipQuest(state: PlayerState, questId: string, ctx: Ctx): PlayerState {
  return trackQuestEvent(state, { type: "quest_skipped", questId }, ctx);
}

export function acceptQuest(
  state: PlayerState,
  content: Content,
  questId: string,
  options: { context: ContextInput | null; mystery: boolean; simulated?: boolean },
  ctx: Ctx,
): PlayerState {
  if (activeAttempt(state)) throw new GameError("ANOTHER_ACTIVE", "Zaten devam eden başka bir görev var.");
  const quest = content.questById.get(questId);
  if (!quest) throw new GameError("UNKNOWN_QUEST", `Bilinmeyen görev: ${questId}.`);
  if (!isQuestSafe(quest)) throw new GameError("UNSAFE", `${quest.title} bir güvenlik denetiminden geçemedi.`);
  const world = deriveWorld(content, state);
  if (!isQuestUnlocked(quest, world.completedQuestIds, world.campaignProgress)) throw new GameError("LOCKED", `${quest.title} henüz açılmadı.`);

  const id = ctx.id();
  const at = ctx.now.toISOString();
  const base: QuestAttempt = {
    id,
    questId,
    questVersion: quest.version,
    state: "AVAILABLE",
    stepIndex: 0,
    answers: {},
    seed: hashString(id),
    mystery: options.mystery,
    context: options.context,
    createdAt: at,
    actStartedAt: null,
    segmentMarks: [],
    sealedOpenedAt: null,
    returnedAt: null,
    completedAt: null,
    endedAt: null,
    history: [],
    outcome: null,
    simulated: options.simulated ?? false,
  };
  const attempt = transition(base, "accept", quest, at);
  let s: PlayerState = { ...put(state, attempt), activeAttemptId: id };
  s = trackQuestEvent(s, eventFor(attempt, { type: "quest_accepted", meta: { mystery: options.mystery, context: options.context } }), ctx);
  const callback = npcCallback(content, quest.npcId, state);
  if (callback) s = trackQuestEvent(s, eventFor(attempt, { type: "npc_callback_shown", interaction: quest.npcId, value: callback }), ctx);
  return s;
}

/* ------------------------------------------------------------------ */
/* Phases                                                              */
/* ------------------------------------------------------------------ */

export function beginQuest(state: PlayerState, content: Content, ctx: Ctx): PlayerState {
  const { attempt, quest } = requireActive(state, content);
  return move(state, content, attempt, quest, "begin", ctx);
}

function enrich(step: Step, result: Record<string, unknown>, attempt: QuestAttempt): Record<string, unknown> {
  if (step.kind === "choice") {
    const r = result as unknown as ChoiceResult;
    return { ...r, latencySec: Math.round(r.latencyMs / 100) / 10 };
  }
  if (step.kind === "actual") {
    const value = Number(result.value);
    const predicted = (attempt.answers[step.pairsWith] as unknown as EstimateResult | undefined)?.value ?? null;
    const error = predicted === null ? null : value - predicted;
    const enriched: ActualResult = {
      value,
      measured: (result.measured as number | null) ?? null,
      corrected: Boolean(result.corrected),
      predicted,
      error,
      absError: error === null ? null : Math.abs(error),
      errorPct: predicted ? (value - predicted) / predicted : null,
    };
    return enriched as unknown as Record<string, unknown>;
  }
  if (step.kind === "list") {
    const items = ((result.items as string[]) ?? []).map((i) => i.trim()).filter(Boolean);
    return { items, count: items.length } satisfies ListResult as unknown as Record<string, unknown>;
  }
  return result;
}

function stepEvents(step: Step, result: Record<string, unknown>, attempt: QuestAttempt, responseTimeMs: number | null): QuestEventInput[] {
  const e = (input: Omit<QuestEventInput, "questId" | "attemptId" | "phase">) => eventFor(attempt, { stepId: step.id, interaction: step.kind, responseTimeMs, ...input });
  switch (step.kind) {
    case "narrative":
      return [];
    case "twist":
      return [e({ type: "twist_received", value: { title: step.title } })];
    case "estimate": {
      const r = result as unknown as EstimateResult;
      const events = [e({ type: "prediction_submitted", value: { value: r.value, unit: step.unit, anchor: r.anchor }, responseTimeMs: r.latencyMs })];
      if (r.anchor !== null) events.unshift(e({ type: "decision_made", interaction: "anchor", value: { anchor: r.anchor, answer: r.anchorAnswer } }));
      return events;
    }
    case "actual": {
      const r = result as unknown as ActualResult;
      return [e({ type: "actual_result_submitted", value: { value: r.value, predicted: r.predicted, error: r.error, unit: step.unit, pairsWith: step.pairsWith, corrected: r.corrected } })];
    }
    case "choice": {
      const r = result as unknown as ChoiceResult;
      const type = step.role === "decision" ? "decision_made" : step.role === "recall" ? "recall_answered" : "reflection_submitted";
      return [e({ type, value: { optionId: r.optionId }, responseTimeMs: r.latencyMs, meta: { changes: r.changes } })];
    }
    case "count":
    case "item-check":
    case "sequence-recall":
      return [e({ type: "recall_answered", value: result })];
    case "scale":
      return [e({ type: "reflection_submitted", value: { value: result.value } })];
    case "text":
      // Free text stays in the attempt only; events record that something was written, not what.
      return [e({ type: "reflection_submitted", value: { length: String(result.text ?? "").length } })];
    case "list": {
      const count = Number(result.count ?? 0);
      const type = step.role === "prime" ? "prime_action" : step.role === "recall" ? "recall_answered" : "reflection_submitted";
      return [e({ type, value: { count } })];
    }
    case "sequence-encode":
      return [e({ type: "prime_action", value: { items: result.items } })];
    case "signal-filter":
    case "rule-shift":
      return [e({ type: "prime_action", value: result })];
    case "priority-board": {
      const r = result as unknown as BoardResult;
      const events = [e({ type: "decision_made", value: { order: r.order, dropped: r.dropped, violations: r.violations }, responseTimeMs: r.latencyMs, meta: { moves: r.moves } })];
      if (r.revised) events.push(e({ type: "plan_changed", value: { positionsChanged: r.positionsChanged, revises: step.revises } }));
      return events;
    }
  }
}

export function submitStep(
  state: PlayerState,
  content: Content,
  stepId: string,
  result: Record<string, unknown>,
  ctx: Ctx,
  responseTimeMs: number | null = null,
): PlayerState {
  const { attempt, quest } = requireActive(state, content);
  const steps = stepsFor(quest, attempt.state);
  const step = steps[attempt.stepIndex];
  if (!step) throw new GameError("WRONG_STATE", `${attempt.state} durumundayken gönderilecek adım yok.`);
  if (step.id !== stepId) throw new GameError("WRONG_STEP", `Beklenen adım ${step.id}, gelen ${stepId}.`);

  const value = enrich(step, result, attempt);
  const updated: QuestAttempt = { ...attempt, answers: { ...attempt.answers, [step.id]: value }, stepIndex: attempt.stepIndex + 1 };
  let s = trackMany(put(state, updated), stepEvents(step, value, updated, responseTimeMs), ctx);

  if (updated.stepIndex >= steps.length) {
    const action = PHASE_DONE_ACTION[attempt.state];
    if (action) s = move(s, content, updated, quest, action, ctx);
  }
  return s;
}

/** Records an intermediate interaction (e.g. a changed choice) without advancing. */
export function trackInteraction(state: PlayerState, content: Content, input: Omit<QuestEventInput, "questId" | "attemptId" | "phase">, ctx: Ctx): PlayerState {
  const { attempt } = requireActive(state, content);
  return trackQuestEvent(state, eventFor(attempt, input), ctx);
}

export function startAct(state: PlayerState, content: Content, ctx: Ctx): PlayerState {
  const { attempt, quest } = requireActive(state, content);
  let s = move(state, content, attempt, quest, "start-act", ctx);
  const started = { ...s.attempts[attempt.id], actStartedAt: ctx.now.toISOString(), segmentMarks: [] };
  s = put(s, started);
  s = trackQuestEvent(s, eventFor(started, { type: "act_started" }), ctx);
  if (quest.act.targetSeconds) {
    s = trackQuestEvent(s, eventFor(started, { type: "prediction_submitted", stepId: "act", interaction: "target", value: { value: quest.act.targetSeconds, unit: "sec" } }), ctx);
  }
  return s;
}

export function leaveAct(state: PlayerState, content: Content, ctx: Ctx): PlayerState {
  const { attempt, quest } = requireActive(state, content);
  if (attempt.state !== "ACTING") return state;
  const s = move(state, content, attempt, quest, "leave", ctx);
  return trackQuestEvent(s, eventFor(attempt, { type: "act_left" }), ctx);
}

export function markSegment(state: PlayerState, content: Content, ctx: Ctx): PlayerState {
  const { attempt, quest } = requireActive(state, content);
  if (attempt.state !== "ACTING" && attempt.state !== "WAITING_FOR_RETURN") throw new GameError("WRONG_STATE", "Bölümler yalnızca görev sırasında ilerler.");
  if (attempt.segmentMarks.length >= quest.act.segments.length - 1) return state;
  const segment = quest.act.segments[attempt.segmentMarks.length];
  const updated = { ...attempt, segmentMarks: [...attempt.segmentMarks, ctx.now.toISOString()] };
  return trackQuestEvent(put(state, updated), eventFor(updated, { type: "act_segment_completed", stepId: segment.id }), ctx);
}

export function openSealed(state: PlayerState, content: Content, ctx: Ctx): PlayerState {
  const { attempt, quest } = requireActive(state, content);
  if (!quest.act.sealed || attempt.sealedOpenedAt) return state;
  const updated = { ...attempt, sealedOpenedAt: ctx.now.toISOString() };
  return trackQuestEvent(put(state, updated), eventFor(updated, { type: "twist_received", interaction: "sealed" }), ctx);
}

export function computeActResult(quest: Quest, attempt: QuestAttempt, now: Date): ActResult {
  const start = Date.parse(attempt.actStartedAt ?? attempt.createdAt);
  const end = now.getTime();
  const durationSec = Math.max(0, Math.round((end - start) / 1000));
  const segments: Record<string, number> = {};
  const segmentsMin: Record<string, number> = {};
  const bounds = [start, ...attempt.segmentMarks.map((m) => Date.parse(m)), end];
  quest.act.segments.forEach((seg, i) => {
    if (i + 1 >= bounds.length) return;
    const sec = Math.max(0, Math.round((bounds[i + 1] - bounds[i]) / 1000));
    segments[seg.id] = sec;
    segmentsMin[seg.id] = Math.round((sec / 60) * 10) / 10;
  });
  const target = quest.act.targetSeconds ?? null;
  const errorSec = target === null ? null : durationSec - target;
  return {
    durationSec,
    durationMin: Math.round((durationSec / 60) * 10) / 10,
    segments,
    segmentsMin,
    sealedOpened: attempt.sealedOpenedAt !== null,
    away: attempt.state === "WAITING_FOR_RETURN",
    targetSec: target,
    errorSec,
    absErrorSec: errorSec === null ? null : Math.abs(errorSec),
  };
}

export function returnFromAct(state: PlayerState, content: Content, ctx: Ctx): PlayerState {
  const { attempt, quest } = requireActive(state, content);
  const act = computeActResult(quest, attempt, ctx.now);
  const withAct: QuestAttempt = { ...attempt, answers: { ...attempt.answers, act: act as unknown as Record<string, unknown> }, returnedAt: ctx.now.toISOString() };
  let s = move(put(state, withAct), content, withAct, quest, "return", ctx);
  const returned = s.attempts[attempt.id];
  s = trackQuestEvent(s, eventFor(returned, { type: "player_returned", value: { durationSec: act.durationSec, away: act.away } }), ctx);
  if (act.targetSec !== null) {
    s = trackQuestEvent(
      s,
      eventFor(returned, { type: "actual_result_submitted", stepId: "act", interaction: "target", value: { value: act.durationSec, predicted: act.targetSec, error: act.errorSec, unit: "sec", pairsWith: "act" } }),
      ctx,
    );
  }
  return s;
}

export function proceedAfterReturn(state: PlayerState, content: Content, ctx: Ctx): PlayerState {
  const { attempt, quest } = requireActive(state, content);
  return move(state, content, attempt, quest, "proceed", ctx);
}

function finalize(state: PlayerState, content: Content, attempt: QuestAttempt, quest: Quest, ctx: Ctx): PlayerState {
  const at = ctx.now.toISOString();
  const outcome = buildOutcome(content, quest, attempt, state, at);
  const done: QuestAttempt = { ...attempt, completedAt: at, outcome };
  let s = put(state, done);

  const discoveries = { ...s.discoveries };
  for (const d of outcome.discoveries) {
    const existing = discoveries[d.id];
    const encounter = { attemptId: attempt.id, questId: quest.id, at, text: d.text };
    discoveries[d.id] = existing ? { ...existing, encounters: [...existing.encounters, encounter] } : { firstAt: at, encounters: [encounter] };
  }
  s = { ...s, discoveries };

  s = trackMany(
    s,
    [
      eventFor(done, { type: "quest_completed", value: { journeyLine: outcome.journeyLine }, meta: done.simulated ? { simulated: true } : undefined }),
      ...outcome.discoveries.map((d) => eventFor(done, { type: "discovery_unlocked", interaction: d.id, value: { isNew: d.isNew } })),
      ...outcome.worldChanges.map((w) => eventFor(done, { type: "world_changed", interaction: w.kind, value: { id: w.id } })),
    ],
    ctx,
  );
  return s;
}

export function acknowledgeReveal(state: PlayerState, content: Content, ctx: Ctx): PlayerState {
  const { attempt, quest } = requireActive(state, content);
  const s = move(state, content, attempt, quest, "complete", ctx);
  return { ...s, activeAttemptId: null };
}

export function abandonQuest(state: PlayerState, content: Content, ctx: Ctx): PlayerState {
  const { attempt, quest } = requireActive(state, content);
  const s = move(state, content, attempt, quest, "abandon", ctx);
  return { ...trackQuestEvent(s, eventFor(attempt, { type: "quest_abandoned", value: { phase: attempt.state } }), ctx), activeAttemptId: null };
}

/**
 * Builds the REVEAL: what happened, what was interesting, which phenomenon
 * appeared, and how the City changed. The result is stored on the attempt so
 * history stays stable even if content is later revised.
 */
import type { Content } from "@/content";
import type { Quest, RevealBlock, SequenceItem, StepKind, StepOf } from "./content-types";
import type {
  BoardResult,
  OrderRecallResult,
  Outcome,
  PlayerState,
  QuestAttempt,
  RenderedBlock,
  RuleShiftResult,
  SceneChangeResult,
  SequenceEncodeResult,
  SignalFilterResult,
} from "./player-types";
import { MISSING, evaluate, formatValue, pickVariant, renderTemplate, resolveRef, type Answers } from "./refs";
import { boardItems } from "./engines/priority-board";
import { deriveWorld, resolvedAttempts, worldDiff } from "./world";
import { npcCallback } from "./npc";

function allSteps(quest: Quest) {
  return [...quest.prime, ...quest.recall, ...quest.reflection];
}

function findStep<K extends StepKind>(quest: Quest, id: string, kind: K): StepOf<K> | null {
  const step = allSteps(quest).find((s) => s.id === id);
  return step && step.kind === kind ? (step as StepOf<K>) : null;
}

function itemView(pool: SequenceItem[], id: string | null) {
  const item = pool.find((p) => p.id === id);
  return item ? { label: item.label, glyph: item.glyph } : { label: MISSING };
}

export function renderBlock(block: RevealBlock, quest: Quest, answers: Answers): RenderedBlock | null {
  switch (block.kind) {
    case "figures": {
      if (block.when && !evaluate(block.when, answers)) return null;
      const items = block.items.map((i) => ({ label: i.label, display: formatValue(resolveRef(answers, i.ref), i.format) }));
      if (items.every((i) => i.display === MISSING)) return null;
      let delta: { label: string; display: string; sign: number } | undefined;
      if (block.delta) {
        const a = resolveRef(answers, block.delta.a);
        const b = resolveRef(answers, block.delta.b);
        if (typeof a === "number" && typeof b === "number") {
          const d = a - b;
          delta = { label: block.delta.label, display: formatValue(d, block.delta.format), sign: Math.sign(d) };
        }
      }
      return { kind: "figures", items, ...(delta ? { delta } : {}) };
    }
    case "text": {
      const v = pickVariant(block.variants, answers);
      return v ? { kind: "text", text: renderTemplate(v.text, answers) } : null;
    }
    case "list": {
      const items = (answers[block.ref]?.items as string[] | undefined)?.filter(Boolean) ?? [];
      return items.length ? { kind: "list", label: block.label, items } : null;
    }
    case "sequence": {
      const recallStep = findStep(quest, block.ref, "sequence-recall");
      const encodeStep = recallStep ? findStep(quest, recallStep.source, "sequence-encode") : null;
      const result = answers[block.ref] as unknown as OrderRecallResult | undefined;
      const encoding = recallStep ? (answers[recallStep.source] as unknown as SequenceEncodeResult | undefined) : undefined;
      if (!encodeStep || !result || !encoding) return null;
      return {
        kind: "sequence",
        expected: encoding.items.map((id) => itemView(encodeStep.pool, id)),
        response: result.response.map((id) => itemView(encodeStep.pool, id)),
        hits: result.hits,
      };
    }
    case "scene": {
      const recallStep = findStep(quest, block.ref, "sequence-recall");
      const encodeStep = recallStep ? findStep(quest, recallStep.source, "sequence-encode") : null;
      const result = answers[block.ref] as unknown as SceneChangeResult | undefined;
      if (!encodeStep || !result) return null;
      const grid = encodeStep.grid ?? { cols: 4, rows: 3 };
      return {
        kind: "scene",
        cols: grid.cols,
        rows: grid.rows,
        cells: result.after.map((id) => encodeStep.pool.find((p) => p.id === id)?.glyph ?? null),
        changed: result.changed,
        selected: result.selected,
      };
    }
    case "filter": {
      const r = answers[block.ref] as unknown as SignalFilterResult | undefined;
      return r ? { kind: "filter", hits: r.hits, misses: r.misses, falseAlarms: r.falseAlarms, targets: r.targets } : null;
    }
    case "switch": {
      const r = answers[block.ref] as unknown as RuleShiftResult | undefined;
      return r ? { kind: "switch", repeatMeanMs: r.repeatMeanMs, switchMeanMs: r.switchMeanMs, switchCostMs: r.switchCostMs, accuracy: r.accuracy } : null;
    }
    case "plan": {
      const before = answers[block.before] as unknown as BoardResult | undefined;
      const after = answers[block.after] as unknown as BoardResult | undefined;
      const board = findStep(quest, block.after, "priority-board");
      if (!before || !after || !board) return null;
      const items = boardItems(quest, board);
      const label = (id: string) => items.find((i) => i.id === id)?.label ?? id;
      return { kind: "plan", before: before.order.map(label), after: after.order.map(label), dropped: after.dropped.map(label) };
    }
  }
}

export function evaluateDiscoveries(quest: Quest, answers: Answers, state: PlayerState): Outcome["discoveries"] {
  const seen = new Set<string>();
  const out: Outcome["discoveries"] = [];
  for (const trigger of quest.discoveries) {
    if (seen.has(trigger.discovery)) continue;
    if (trigger.when && !evaluate(trigger.when, answers)) continue;
    const variant = pickVariant(trigger.encounter, answers);
    if (!variant) continue;
    seen.add(trigger.discovery);
    out.push({ id: trigger.discovery, text: renderTemplate(variant.text, answers), isNew: !state.discoveries[trigger.discovery] });
  }
  return out;
}

export function buildOutcome(content: Content, quest: Quest, attempt: QuestAttempt, state: PlayerState, completedAt: string): Outcome {
  const answers = attempt.answers as Answers;
  const blocks = quest.reveal.map((b) => renderBlock(b, quest, answers)).filter((b): b is RenderedBlock => b !== null);

  const before = deriveWorld(content, state);
  const resolvedNow = [...resolvedAttempts(state), { ...attempt, completedAt }];
  const after = deriveWorld(content, state, resolvedNow);
  const diff = worldDiff(before, after);
  const worldChanges = [
    ...diff.locations.map((id) => ({ kind: "location" as const, id, label: content.locationById.get(id)?.name ?? id })),
    ...diff.paths.map((id) => {
      const path = content.pathById.get(id);
      const from = content.locationById.get(path?.from ?? "")?.name ?? "";
      const to = content.locationById.get(path?.to ?? "");
      const toName = to && after.revealedLocations.has(to.id) ? to.name : "haritasız topraklar";
      return { kind: "path" as const, id, label: `${from} → ${toName}` };
    }),
  ];

  const campaign = content.campaignById.get(quest.campaignId);
  const campaignCompleted = campaign && after.campaignProgress[campaign.id].done && !before.campaignProgress[campaign.id].done ? campaign.id : null;

  const suggestion =
    quest.nextQuestRules.suggests.find((id) => !after.completedQuestIds.has(id)) ??
    campaign?.questIds.find((id) => !after.completedQuestIds.has(id)) ??
    null;

  const journeyVariant = pickVariant(quest.journey, answers);

  return {
    blocks,
    discoveries: evaluateDiscoveries(quest, answers, state),
    worldChanges,
    fragment: campaignCompleted ? `${quest.fragment} ${campaign!.completion.fragment}` : quest.fragment,
    campaignCompleted,
    // "Last time…" must refer to earlier attempts, not this one.
    npcLine: npcCallback(content, quest.npcId, { ...state, events: state.events.filter((e) => e.attemptId !== attempt.id) }),
    suggestion,
    journeyLine: journeyVariant ? renderTemplate(journeyVariant.text, answers) : quest.subtitle,
  };
}

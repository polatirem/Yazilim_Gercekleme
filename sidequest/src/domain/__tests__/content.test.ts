import { describe, expect, it } from "vitest";
import { CONTENT } from "@/content";
import type { Quest, Step } from "../content-types";
import { conditionRefs, templateRefs } from "../refs";
import { validateQuestSafety } from "../safety";

/** Step ids whose answers a ref may point into. */
function knownRoots(quest: Quest): Set<string> {
  return new Set(["act", ...quest.prime.map((s) => s.id), ...quest.recall.map((s) => s.id), ...quest.reflection.map((s) => s.id)]);
}

function refsIn(quest: Quest): string[] {
  const refs: string[] = [];
  const add = (t: string) => refs.push(...templateRefs(t));
  add(quest.act.instruction);
  add(quest.act.reminder);
  quest.act.details.forEach(add);
  for (const block of quest.reveal) {
    if (block.kind === "figures") {
      refs.push(...block.items.map((i) => i.ref));
      if (block.delta) refs.push(block.delta.a, block.delta.b);
      if (block.when) refs.push(...conditionRefs(block.when));
    }
    if (block.kind === "text") for (const v of block.variants) { add(v.text); if (v.when) refs.push(...conditionRefs(v.when)); }
  }
  for (const d of quest.discoveries) {
    if (d.when) refs.push(...conditionRefs(d.when));
    for (const v of d.encounter) { add(v.text); if (v.when) refs.push(...conditionRefs(v.when)); }
  }
  for (const v of quest.journey) { add(v.text); if (v.when) refs.push(...conditionRefs(v.when)); }
  return refs;
}

describe("authored content", () => {
  it("has four campaigns of seven quests (28 total)", () => {
    expect(CONTENT.campaigns).toHaveLength(4);
    expect(CONTENT.quests).toHaveLength(28);
    for (const c of CONTENT.campaigns) expect(c.questIds).toHaveLength(7);
  });

  it("has unique ids, slugs and numbers", () => {
    const unique = (xs: unknown[]) => new Set(xs).size === xs.length;
    expect(unique(CONTENT.quests.map((q) => q.id))).toBe(true);
    expect(unique(CONTENT.quests.map((q) => q.slug))).toBe(true);
    expect(unique(CONTENT.quests.map((q) => q.number))).toBe(true);
  });

  it.each(CONTENT.quests.map((q) => [q.id, q] as const))("%s references existing entities", (_, quest) => {
    expect(CONTENT.campaignById.get(quest.campaignId)?.questIds).toContain(quest.id);
    expect(CONTENT.locationById.has(quest.locationId)).toBe(true);
    expect(CONTENT.npcById.has(quest.npcId)).toBe(true);
    for (const d of quest.discoveries) expect(CONTENT.discoveryById.has(d.discovery)).toBe(true);
    for (const e of quest.worldEffects) {
      if (e.kind === "open-path") expect(CONTENT.pathById.has(e.path)).toBe(true);
      else expect(CONTENT.locationById.has(e.location)).toBe(true);
    }
    for (const id of [...quest.nextQuestRules.suggests, ...quest.availability.requiresQuests]) expect(CONTENT.questById.has(id)).toBe(true);
  });

  it.each(CONTENT.quests.map((q) => [q.id, q] as const))("%s only refers to answers it can have", (_, quest) => {
    const roots = knownRoots(quest);
    for (const ref of refsIn(quest)) expect(roots, `${quest.id}: ${ref}`).toContain(ref.split(".")[0]);
  });

  it.each(CONTENT.quests.map((q) => [q.id, q] as const))("%s has well-formed steps", (_, quest) => {
    const steps: Step[] = [...quest.prime, ...quest.recall, ...quest.reflection];
    const ids = steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("act");
    for (const step of steps) {
      if (step.kind === "priority-board" && !step.revises) expect(step.items.length).toBeGreaterThanOrEqual(3);
      if (step.kind === "priority-board" && step.revises) expect(ids.indexOf(step.revises)).toBeLessThan(ids.indexOf(step.id));
      if (step.kind === "sequence-recall") expect(quest.prime.find((s) => s.id === step.source)?.kind).toBe("sequence-encode");
      if (step.kind === "item-check") expect(steps.find((s) => s.id === step.source)?.kind).toBe("list");
      if (step.kind === "actual") expect(ids).toContain(step.pairsWith);
      if (step.kind === "list") expect(step.required).toBeLessThanOrEqual(step.slots);
    }
    // Recall/reflection must not run before the act they ask about.
    expect(quest.recall.every((s) => s.kind !== "sequence-encode")).toBe(true);
  });

  it("gives every campaign a meaningfully different set of quests", () => {
    const titles = CONTENT.quests.map((q) => q.title.toLowerCase());
    expect(new Set(titles).size).toBe(CONTENT.quests.length);
    const engines = new Set(CONTENT.quests.flatMap((q) => [...q.prime, ...q.recall].map((s) => s.kind)));
    for (const k of ["sequence-encode", "sequence-recall", "signal-filter", "estimate", "actual", "rule-shift", "priority-board"]) expect(engines).toContain(k);
  });

  it("makes every discovery reachable from at least one quest", () => {
    const reachable = new Set(CONTENT.quests.flatMap((q) => q.discoveries.map((d) => d.discovery)));
    for (const d of CONTENT.discoveries) expect(reachable, d.id).toContain(d.id);
  });

  it("passes the safety engine for every quest", () => {
    const issues = CONTENT.quests.flatMap(validateQuestSafety);
    expect(issues).toEqual([]);
  });
});

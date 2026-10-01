/**
 * Authored content model.
 *
 * Every quest, campaign, location and discovery is structured data validated
 * by these schemas. The UI never contains quest-specific logic: it renders
 * steps by `kind`, and the domain layer interprets conditions, templates and
 * reveal blocks declaratively.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export const PLACES = ["home", "outside", "work", "commuting", "with-people"] as const;
export const Place = z.enum(PLACES);
export type Place = z.infer<typeof Place>;

export const TIME_BUDGETS = [2, 5, 15, 30] as const;
export const TimeBudget = z.union([z.literal(2), z.literal(5), z.literal(15), z.literal(30)]);
export type TimeBudget = z.infer<typeof TimeBudget>;

export const ENERGY_LEVELS = ["low", "normal", "high"] as const;
export const Energy = z.enum(ENERGY_LEVELS);
export type Energy = z.infer<typeof Energy>;

/** Experiential families — the only taxonomy shown to players. */
export const FAMILIES = ["explore", "notice", "remember", "decide", "break", "connect", "create", "predict"] as const;
export const QuestFamily = z.enum(FAMILIES);
export type QuestFamily = z.infer<typeof QuestFamily>;

/** Internal dimensions. Used for balancing and metrics, never as navigation. */
export const DIMENSIONS = [
  "attention",
  "recall",
  "planning",
  "adaptation",
  "estimation",
  "decision-making",
  "inhibition",
  "filtering",
  "task-switching",
] as const;
export const Dimension = z.enum(DIMENSIONS);
export type Dimension = z.infer<typeof Dimension>;

/* ------------------------------------------------------------------ */
/* Conditions & templates                                              */
/* ------------------------------------------------------------------ */

/**
 * A ref points into an attempt's answers: "stepId.field" (e.g. "estimate.value"),
 * "act.durationMin", "act.segments.block".
 */
export const Ref = z.string().regex(/^[a-z0-9-]+(\.[a-zA-Z0-9-]+)+$/, "ref must look like step.field");

export type Condition =
  | { ref: string; op: "eq" | "ne" | "gt" | "gte" | "lt" | "lte"; value: number | string | boolean }
  | { ref: string; op: "exists" }
  | { compare: { a: string; op: "eq" | "ne" | "gt" | "gte" | "lt" | "lte"; b: string; ratio?: number } }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export const Condition: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({
      ref: Ref,
      op: z.enum(["eq", "ne", "gt", "gte", "lt", "lte"]),
      value: z.union([z.number(), z.string(), z.boolean()]),
    }),
    z.object({ ref: Ref, op: z.literal("exists") }),
    z.object({
      compare: z.object({
        a: Ref,
        op: z.enum(["eq", "ne", "gt", "gte", "lt", "lte"]),
        b: Ref,
        ratio: z.number().positive().optional(),
      }),
    }),
    z.object({ all: z.array(Condition).min(1) }),
    z.object({ any: z.array(Condition).min(1) }),
    z.object({ not: Condition }),
  ]),
);

/** Text with `{ref|format}` placeholders, e.g. "Your estimate was {estimate.value|min}." */
export const Template = z.string().min(1);

export const Variant = z.object({ when: Condition.optional(), text: Template });
export type Variant = z.infer<typeof Variant>;

export const FORMATS = ["min", "signed-min", "duration", "signed-duration", "count", "signed-count", "ms", "signed-ms", "percent", "text", "phrase"] as const;
export const Format = z.enum(FORMATS);
export type Format = z.infer<typeof Format>;

/* ------------------------------------------------------------------ */
/* Glyphs (visual vocabulary of the micro-mechanics)                   */
/* ------------------------------------------------------------------ */

export const SHAPES = ["circle", "square", "triangle", "arch", "diamond", "bar", "turn-left", "turn-right", "straight"] as const;
export const Shape = z.enum(SHAPES);
export type Shape = z.infer<typeof Shape>;

export const Glyph = z.object({
  shape: Shape,
  fill: z.enum(["solid", "open"]).default("open"),
  gap: z.boolean().default(false),
});
export type Glyph = z.infer<typeof Glyph>;

export const SequenceItem = z.object({
  id: z.string(),
  label: z.string(),
  glyph: Glyph.optional(),
});
export type SequenceItem = z.infer<typeof SequenceItem>;

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

const StepBase = { id: z.string().regex(/^[a-z0-9-]+$/) };

export const NarrativeStep = z.object({
  ...StepBase,
  kind: z.literal("narrative"),
  speaker: z.string().optional(),
  lines: z.array(z.string()).min(1),
});

export const EstimateStep = z.object({
  ...StepBase,
  kind: z.literal("estimate"),
  prompt: z.string(),
  unit: z.enum(["min", "sec", "count"]),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  initial: z.number(),
  /** Optional anchor question shown first. One of the two values is chosen per attempt. */
  anchor: z
    .object({ prompt: Template, values: z.tuple([z.number(), z.number()]) })
    .optional(),
});

export const ActualStep = z.object({
  ...StepBase,
  kind: z.literal("actual"),
  prompt: z.string(),
  unit: z.enum(["min", "sec", "count"]),
  /** Where the measured value comes from. "manual" means the player reports it. */
  source: z.union([z.literal("act"), z.literal("manual"), z.string().regex(/^segment:[a-z0-9-]+$/)]),
  /** The estimate step this actual pairs with, for prediction-error metrics. */
  pairsWith: z.string(),
  min: z.number().default(0),
  max: z.number(),
  step: z.number().positive().default(1),
});

export const ChoiceStep = z.object({
  ...StepBase,
  kind: z.literal("choice"),
  prompt: z.string(),
  role: z.enum(["decision", "recall", "reflection"]),
  options: z.array(z.object({ id: z.string(), label: z.string(), hint: z.string().optional() })).min(2),
  columns: z.number().int().min(1).max(4).default(1),
});

export const CountStep = z.object({
  ...StepBase,
  kind: z.literal("count"),
  prompt: z.string(),
  hint: z.string().optional(),
  min: z.number().int().default(0),
  max: z.number().int(),
  initial: z.number().int().default(0),
});

export const ScaleStep = z.object({
  ...StepBase,
  kind: z.literal("scale"),
  prompt: z.string(),
  points: z.number().int().min(3).max(7).default(5),
  lowLabel: z.string(),
  highLabel: z.string(),
});

export const ListStep = z.object({
  ...StepBase,
  kind: z.literal("list"),
  prompt: z.string(),
  hint: z.string().optional(),
  slots: z.number().int().min(1).max(8),
  required: z.number().int().min(0),
  placeholder: z.string().default(""),
  role: z.enum(["prime", "recall", "reflection"]),
});

export const ItemCheckStep = z.object({
  ...StepBase,
  kind: z.literal("item-check"),
  prompt: z.string(),
  source: z.string(),
  options: z.array(z.object({ id: z.string(), label: z.string() })).min(2),
});

export const TextStep = z.object({
  ...StepBase,
  kind: z.literal("text"),
  prompt: z.string(),
  hint: z.string().optional(),
  optional: z.boolean().default(true),
});

export const TwistStep = z.object({
  ...StepBase,
  kind: z.literal("twist"),
  title: z.string(),
  body: z.string(),
});

export const SequenceEncodeStep = z.object({
  ...StepBase,
  kind: z.literal("sequence-encode"),
  mode: z.enum(["order", "scene"]),
  instruction: z.string(),
  pool: z.array(SequenceItem).min(3),
  length: z.number().int().min(3).max(9),
  /** order mode: ms per item. scene mode: total study time. */
  displayMs: z.number().int().min(300),
  /** scene mode: grid columns and rows. */
  grid: z.object({ cols: z.number().int(), rows: z.number().int() }).optional(),
});

export const SequenceRecallStep = z.object({
  ...StepBase,
  kind: z.literal("sequence-recall"),
  source: z.string(),
  mode: z.enum(["order", "scene-change"]),
  prompt: z.string(),
  changes: z.number().int().min(1).max(3).default(1),
});

export const GlyphRule = z.object({
  shape: Shape.optional(),
  fill: z.enum(["solid", "open"]).optional(),
  gap: z.boolean().optional(),
});
export type GlyphRule = z.infer<typeof GlyphRule>;

export const SignalFilterStep = z.object({
  ...StepBase,
  kind: z.literal("signal-filter"),
  instruction: z.string(),
  targetLabel: z.string(),
  target: GlyphRule,
  /** Near-miss distractors: share most features with the target. */
  lures: z.array(Glyph).min(1),
  others: z.array(Glyph).min(1),
  rounds: z.number().int().min(1).max(5),
  cols: z.number().int().min(3).max(7),
  rows: z.number().int().min(3).max(6),
  targetsPerRound: z.tuple([z.number().int(), z.number().int()]),
  secondsPerRound: z.number().int().min(4).max(30),
});

export const RULE_KINDS = ["shape", "fill", "side-same", "side-opposite"] as const;
export const RuleKind = z.enum(RULE_KINDS);
export type RuleKind = z.infer<typeof RuleKind>;

export const RuleShiftStep = z.object({
  ...StepBase,
  kind: z.literal("rule-shift"),
  instruction: z.string(),
  rules: z.array(RuleKind).min(2).max(3),
  trials: z.number().int().min(8).max(40),
  runLength: z.tuple([z.number().int().min(2), z.number().int().min(2)]),
});

export const BoardConstraint = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("first"), item: z.string() }),
  z.object({ kind: z.literal("last"), item: z.string() }),
  z.object({ kind: z.literal("before"), a: z.string(), b: z.string() }),
  z.object({ kind: z.literal("keep"), item: z.string() }),
]);
export type BoardConstraint = z.infer<typeof BoardConstraint>;

export const PriorityBoardStep = z.object({
  ...StepBase,
  kind: z.literal("priority-board"),
  prompt: z.string(),
  /** Required (≥3) unless the board revises another; revisions inherit that board's items. */
  items: z.array(z.object({ id: z.string(), label: z.string(), minutes: z.number().positive(), note: z.string().optional() })).default([]),
  budgetMinutes: z.number().positive().optional(),
  /** Whether items may be set aside (dropped from the plan). */
  droppable: z.boolean().default(false),
  constraints: z.array(BoardConstraint).default([]),
  /** Revision of an earlier board: starts from that plan and records plan_changed. */
  revises: z.string().optional(),
  /** Items added by a twist when revising. */
  addItems: z.array(z.object({ id: z.string(), label: z.string(), minutes: z.number().positive(), note: z.string().optional() })).default([]),
});

export const Step = z.discriminatedUnion("kind", [
  NarrativeStep,
  EstimateStep,
  ActualStep,
  ChoiceStep,
  CountStep,
  ScaleStep,
  ListStep,
  ItemCheckStep,
  TextStep,
  TwistStep,
  SequenceEncodeStep,
  SequenceRecallStep,
  SignalFilterStep,
  RuleShiftStep,
  PriorityBoardStep,
]);
export type Step = z.infer<typeof Step>;
export type StepKind = Step["kind"];
export type StepOf<K extends StepKind> = Extract<Step, { kind: K }>;

/* ------------------------------------------------------------------ */
/* Act                                                                 */
/* ------------------------------------------------------------------ */

export const Act = z.object({
  instruction: z.string(),
  details: z.array(z.string()).default([]),
  /** Shown on the minimal active screen. Kept short. */
  reminder: z.string(),
  /** Sequential parts timed separately (for self-experiments). */
  segments: z.array(z.object({ id: z.string(), label: z.string(), instruction: z.string() })).default([]),
  /** A duration the player tries to hit without a clock (e.g. "return at three minutes"). */
  targetSeconds: z.number().int().positive().optional(),
  /** A twist the player opens during the act when a condition is met. */
  sealed: z.object({ trigger: z.string(), body: z.string() }).optional(),
});
export type Act = z.infer<typeof Act>;

/* ------------------------------------------------------------------ */
/* Reveal                                                              */
/* ------------------------------------------------------------------ */

export const RevealBlock = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("figures"),
    items: z.array(z.object({ label: z.string(), ref: Ref, format: Format })).min(1),
    delta: z.object({ label: z.string(), a: Ref, b: Ref, format: Format }).optional(),
    when: Condition.optional(),
  }),
  z.object({ kind: z.literal("text"), variants: z.array(Variant).min(1) }),
  z.object({ kind: z.literal("sequence"), ref: z.string() }),
  z.object({ kind: z.literal("scene"), ref: z.string() }),
  z.object({ kind: z.literal("filter"), ref: z.string() }),
  z.object({ kind: z.literal("switch"), ref: z.string() }),
  z.object({ kind: z.literal("list"), ref: z.string(), label: z.string() }),
  z.object({ kind: z.literal("plan"), before: z.string(), after: z.string() }),
]);
export type RevealBlock = z.infer<typeof RevealBlock>;

/* ------------------------------------------------------------------ */
/* Safety                                                              */
/* ------------------------------------------------------------------ */

export const Safety = z.object({
  level: z.enum(["minimal", "low", "moderate"]),
  movement: z.enum(["none", "light", "walking"]),
  /** Must be false for every quest; asserted by the safety engine. */
  requiresPurchase: z.literal(false),
  contactsStrangers: z.literal(false),
  photographsPeople: z.literal(false),
  sharesLocation: z.literal(false),
  /** Human-readable notes always shown before and during the act. */
  notes: z.array(z.string()).min(1),
});
export type Safety = z.infer<typeof Safety>;

/* ------------------------------------------------------------------ */
/* Quest                                                               */
/* ------------------------------------------------------------------ */

export const WorldEffect = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("open-path"), path: z.string() }),
  z.object({ kind: z.literal("reveal-location"), location: z.string() }),
]);
export type WorldEffect = z.infer<typeof WorldEffect>;

export const DiscoveryTrigger = z.object({
  discovery: z.string(),
  when: Condition.optional(),
  /** How the phenomenon appeared in this quest. First matching variant wins. */
  encounter: z.array(Variant).min(1),
});
export type DiscoveryTrigger = z.infer<typeof DiscoveryTrigger>;

export const Quest = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  number: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  campaignId: z.string(),
  locationId: z.string(),
  npcId: z.string(),
  npcLine: z.string(),
  family: QuestFamily,
  dimensions: z.array(Dimension).min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  estimatedMinutes: z.object({ min: z.number().positive(), max: z.number().positive() }),
  contexts: z.array(Place).min(1),
  energy: Energy,
  people: z.enum(["solo", "optional", "required"]),
  requiresOutside: z.boolean(),
  requiresPurchase: z.literal(false),
  /** Describes the kind of place needed, never a precise location. */
  requiresLocation: z.string().optional(),
  mysteryEligible: z.boolean().default(false),
  safety: Safety,
  availability: z
    .object({
      requiresQuests: z.array(z.string()).default([]),
      requiresCampaignProgress: z.number().int().min(0).default(0),
    })
    .default({ requiresQuests: [], requiresCampaignProgress: 0 }),
  prime: z.array(Step).default([]),
  act: Act,
  recall: z.array(Step).default([]),
  reflection: z.array(Step).default([]),
  reveal: z.array(RevealBlock).min(1),
  discoveries: z.array(DiscoveryTrigger).default([]),
  /** Which behavior metrics this quest contributes evidence to. */
  behaviorSignals: z.array(z.string()).default([]),
  completionRules: z
    .object({
      /** Counts toward "routines interrupted" in the Journey. */
      interruptsRoutine: z.boolean().default(false),
    })
    .default({ interruptsRoutine: false }),
  worldEffects: z.array(WorldEffect).default([]),
  fragment: z.string(),
  nextQuestRules: z.object({ suggests: z.array(z.string()).default([]) }).default({ suggests: [] }),
  /** One-line Journey entry, templated from answers. */
  journey: z.array(Variant).min(1),
});
export type Quest = z.infer<typeof Quest>;
export type QuestInput = z.input<typeof Quest>;

/* ------------------------------------------------------------------ */
/* World                                                               */
/* ------------------------------------------------------------------ */

/** The colour palette of the City. Each maps to a --hue-* token in tokens.css. */
export const HUES = ["vermilion", "teal", "indigo", "amber", "saffron", "magenta", "green", "violet"] as const;
export const Hue = z.enum(HUES);
export type Hue = z.infer<typeof Hue>;

export const LocationFootprint = z.enum(["crossroads", "observatory", "archive", "workshop", "station", "market", "garden", "unknown"]);

export const WorldLocation = z.object({
  id: z.string(),
  name: z.string(),
  footprint: LocationFootprint,
  hue: Hue,
  x: z.number(),
  y: z.number(),
  modes: z.array(z.string()).min(2),
  description: z.string(),
  undiscoveredHint: z.string(),
  /**
   * "start": visible from the beginning. "quest": revealed by completing any quest located here.
   * "mystery": revealed by completing a Mystery Quest.
   */
  reveal: z.enum(["start", "quest", "mystery"]),
  /** Path connecting this location to the network when it is revealed. */
  arrivalPath: z.string().optional(),
});
export type WorldLocation = z.infer<typeof WorldLocation>;

export const WorldPath = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  d: z.string(),
});
export type WorldPath = z.infer<typeof WorldPath>;

export const Campaign = z.object({
  id: z.string(),
  seasonId: z.string(),
  title: z.string(),
  theme: z.string(),
  intro: z.string(),
  npcId: z.string(),
  homeLocationId: z.string(),
  tone: Hue,
  questIds: z.array(z.string()).min(1),
  completion: z.object({ fragment: z.string(), effects: z.array(WorldEffect).default([]) }),
});
export type Campaign = z.infer<typeof Campaign>;

export const Season = z.object({
  id: z.string(),
  number: z.number().int(),
  title: z.string(),
  campaignIds: z.array(z.string()),
});
export type Season = z.infer<typeof Season>;

export const Npc = z.object({
  id: z.string(),
  name: z.string(),
  epithet: z.string(),
  sigil: z.enum(["compass", "aperture", "escapement", "folio"]),
  greeting: z.string(),
});
export type Npc = z.infer<typeof Npc>;

export const Discovery = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  title: z.string(),
  summary: z.string(),
  explanation: z.string(),
  caveat: z.string(),
  figure: z.string(),
  hue: Hue,
  hint: z.string(),
});
export type Discovery = z.infer<typeof Discovery>;

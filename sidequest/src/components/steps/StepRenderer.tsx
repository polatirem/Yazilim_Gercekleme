"use client";
import type { Step } from "@/domain/content-types";
import type { QuestAttempt } from "@/domain/player-types";
import type { Quest } from "@/domain/content-types";
import { PriorityBoard } from "@/components/microgames/PriorityBoard";
import { RuleShift } from "@/components/microgames/RuleShift";
import { SequenceEncode, SequenceRecall } from "@/components/microgames/SequenceGames";
import { SignalFilter } from "@/components/microgames/SignalFilter";
import { ActualStep, ChoiceStep, CountStep, EstimateStep, ItemCheckStep, ListStep, NarrativeStep, ScaleStep, TextStep, TwistStep } from "./PromptSteps";
import type { Interaction } from "./types";

/** Renders any step by kind. Quest content chooses the step; this never branches on quest id. */
export function StepRenderer({
  step,
  quest,
  attempt,
  submit,
  track,
}: {
  step: Step;
  quest: Quest;
  attempt: QuestAttempt;
  submit: (result: Record<string, unknown>, responseTimeMs?: number) => void;
  track: (i: Interaction) => void;
}) {
  const common = { quest, attempt, submit, track };
  switch (step.kind) {
    case "narrative":
      return <NarrativeStep step={step} {...common} />;
    case "estimate":
      return <EstimateStep step={step} {...common} />;
    case "actual":
      return <ActualStep step={step} {...common} />;
    case "choice":
      return <ChoiceStep step={step} {...common} />;
    case "count":
      return <CountStep step={step} {...common} />;
    case "scale":
      return <ScaleStep step={step} {...common} />;
    case "list":
      return <ListStep step={step} {...common} />;
    case "item-check":
      return <ItemCheckStep step={step} {...common} />;
    case "text":
      return <TextStep step={step} {...common} />;
    case "twist":
      return <TwistStep step={step} {...common} />;
    case "sequence-encode":
      return <SequenceEncode step={step} {...common} />;
    case "sequence-recall":
      return <SequenceRecall step={step} {...common} />;
    case "signal-filter":
      return <SignalFilter step={step} {...common} />;
    case "rule-shift":
      return <RuleShift step={step} {...common} />;
    case "priority-board":
      return <PriorityBoard step={step} {...common} />;
  }
}

/**
 * World progression. The City's state is *derived* from resolved quest
 * attempts, never stored separately, so it cannot drift from the player's
 * actual history. Only "which reveals has the player already watched" is
 * persisted (PlayerState.world) to drive reveal animations.
 */
import type { Content } from "@/content";
import type { Quest } from "./content-types";
import type { PlayerState, QuestAttempt } from "./player-types";
import { isResolved } from "./quest-machine";

export interface CampaignProgress {
  completed: number;
  total: number;
  done: boolean;
  completedQuestIds: Set<string>;
}

export interface WorldView {
  revealedLocations: Set<string>;
  openPaths: Set<string>;
  /** Resolved attempts per location — rendered as survey marks. */
  marks: Record<string, number>;
  campaignProgress: Record<string, CampaignProgress>;
  activeCampaignId: string | null;
  completedQuestIds: Set<string>;
  fragments: { questId: string; text: string; at: string }[];
  newLocations: string[];
  newPaths: string[];
}

export function resolvedAttempts(state: PlayerState): QuestAttempt[] {
  return Object.values(state.attempts)
    .filter((a) => isResolved(a.state) && a.completedAt)
    .sort((a, b) => (a.completedAt! < b.completedAt! ? -1 : 1));
}

export function campaignProgress(content: Content, completed: Set<string>): Record<string, CampaignProgress> {
  const out: Record<string, CampaignProgress> = {};
  for (const c of content.campaigns) {
    const done = new Set(c.questIds.filter((id) => completed.has(id)));
    out[c.id] = { completed: done.size, total: c.questIds.length, done: done.size === c.questIds.length, completedQuestIds: done };
  }
  return out;
}

export function isQuestUnlocked(quest: Quest, completed: Set<string>, progress: Record<string, CampaignProgress>): boolean {
  if (!quest.availability.requiresQuests.every((id) => completed.has(id))) return false;
  return (progress[quest.campaignId]?.completed ?? 0) >= quest.availability.requiresCampaignProgress;
}

export function deriveWorld(content: Content, state: PlayerState, attempts: QuestAttempt[] = resolvedAttempts(state)): WorldView {
  const completed = new Set(attempts.map((a) => a.questId));
  const progress = campaignProgress(content, completed);
  const revealed = new Set(content.locations.filter((l) => l.reveal === "start").map((l) => l.id));
  const open = new Set<string>();
  const marks: Record<string, number> = {};
  const fragments: WorldView["fragments"] = [];

  for (const attempt of attempts) {
    const quest = content.questById.get(attempt.questId);
    if (!quest) continue;
    revealed.add(quest.locationId);
    marks[quest.locationId] = (marks[quest.locationId] ?? 0) + 1;
    for (const effect of quest.worldEffects) {
      if (effect.kind === "open-path") open.add(effect.path);
      else revealed.add(effect.location);
    }
    if (attempt.mystery) {
      for (const l of content.locations) if (l.reveal === "mystery") revealed.add(l.id);
    }
    fragments.push({ questId: quest.id, text: quest.fragment, at: attempt.completedAt! });
  }

  for (const campaign of content.campaigns) {
    if (!progress[campaign.id].done) continue;
    for (const effect of campaign.completion.effects) {
      if (effect.kind === "open-path") open.add(effect.path);
      else revealed.add(effect.location);
    }
  }

  for (const id of revealed) {
    const arrival = content.locationById.get(id)?.arrivalPath;
    if (arrival) open.add(arrival);
  }

  const last = attempts[attempts.length - 1];
  const lastCampaign = last ? content.questById.get(last.questId)?.campaignId : undefined;
  const activeCampaignId =
    lastCampaign && !progress[lastCampaign]?.done
      ? lastCampaign
      : ([...content.campaigns].filter((c) => !progress[c.id].done).sort((a, b) => progress[b.id].completed - progress[a.id].completed)[0]?.id ?? null);

  const seenL = new Set(state.world.seenLocations);
  const seenP = new Set(state.world.seenPaths);
  return {
    revealedLocations: revealed,
    openPaths: open,
    marks,
    campaignProgress: progress,
    activeCampaignId,
    completedQuestIds: completed,
    fragments,
    newLocations: [...revealed].filter((id) => !seenL.has(id) && content.locationById.get(id)?.reveal !== "start"),
    newPaths: [...open].filter((id) => !seenP.has(id)),
  };
}

/** What a newly resolved attempt changes about the City. */
export function worldDiff(before: WorldView, after: WorldView): { locations: string[]; paths: string[] } {
  return {
    locations: [...after.revealedLocations].filter((id) => !before.revealedLocations.has(id)),
    paths: [...after.openPaths].filter((id) => !before.openPaths.has(id)),
  };
}

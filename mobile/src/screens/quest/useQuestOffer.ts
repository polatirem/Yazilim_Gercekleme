import { useMemo, useState } from "react";
import { CONTENT } from "@/content";
import { recommend } from "@/domain/context-engine";
import { GameError, acceptQuest, setLastContext, skipQuest, viewQuest } from "@/domain/game";
import type { ContextInput, PlayerState } from "@/domain/player-types";
import { dispatch } from "@/state/store";
import { useNav } from "@/nav/router";

/**
 * The offer loop shared by the Quest screen and onboarding:
 * rank → show the best → accept, skip (recorded, next), or not now.
 */
export function useQuestOffer(player: PlayerState, context: ContextInput | null, mystery: boolean) {
  const nav = useNav();
  const [passed, setPassed] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Rank once per context/mode. Recording a skip must not re-rank the list under the player.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recommendation = useMemo(() => (context ? recommend(CONTENT, player, context, { now: new Date(), mystery }) : null), [context, mystery]);

  const remaining = recommendation ? recommendation.ranked.filter((c) => !passed.includes(c.quest.id)) : [];
  const current = remaining[0] ?? null;
  const total = recommendation?.ranked.length ?? 0;

  const accept = () => {
    if (!current || !context) return;
    try {
      dispatch((s, ctx) => acceptQuest(setLastContext(s, context), CONTENT, current.quest.id, { context, mystery }, ctx));
      nav.reset({ name: "play" });
    } catch (e) {
      setError(e instanceof GameError ? e.message : `O yol açılmadı. ${(e as Error).message}`);
    }
  };

  const skip = () => {
    if (!current) return;
    dispatch((s, ctx) => skipQuest(s, current.quest.id, ctx));
    setPassed((p) => [...p, current.quest.id]);
    setError(null);
  };

  const markViewed = (questId: string) => {
    dispatch((s, ctx) => viewQuest(s, questId, ctx, { mystery, source: "recommendation" }));
  };

  return {
    recommendation,
    current,
    position: current ? `${total - remaining.length + 1} / ${total} uygun görev` : "",
    exhausted: recommendation !== null && remaining.length === 0 && total > 0,
    accept,
    skip,
    markViewed,
    reset: () => setPassed([]),
    error,
  };
}

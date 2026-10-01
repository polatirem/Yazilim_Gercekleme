"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CONTENT } from "@/content";
import { GameError, acceptQuest, viewQuest } from "@/domain/game";
import type { PlayerState } from "@/domain/player-types";
import { dispatch } from "@/state/store";
import { GameGate } from "@/components/shell/GameGate";
import { QuestDossier } from "@/components/quest/QuestDossier";
import styles from "@/components/quest/QuestScreen.module.css";

function Detail({ slug, player }: { slug: string; player: PlayerState }) {
  const router = useRouter();
  const quest = CONTENT.questBySlug.get(slug)!;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch((s, ctx) => viewQuest(s, quest.id, ctx, { source: "direct" }));
  }, [quest.id]);

  return (
    <div className={styles.page}>
      <QuestDossier
        quest={quest}
        player={player}
        error={error}
        onAccept={() => {
          try {
            dispatch((s, ctx) => acceptQuest(s, CONTENT, quest.id, { context: null, mystery: false }, ctx));
            router.push("/play");
          } catch (e) {
            setError(e instanceof GameError ? e.message : `O yol açılmadı. ${(e as Error).message}`);
          }
        }}
        onNotNow={() => router.back()}
      />
    </div>
  );
}

export function QuestBySlug({ slug }: { slug: string }) {
  return <GameGate>{(player) => <Detail slug={slug} player={player} />}</GameGate>;
}

"use client";
import { GameGate } from "@/components/shell/GameGate";
import { CodexScreen } from "@/components/codex/CodexScreen";

export function CodexRoute({ entry }: { entry: string | null }) {
  return <GameGate loadingLabel="Kodeks açılıyor">{(player) => <CodexScreen player={player} initialEntry={entry} />}</GameGate>;
}

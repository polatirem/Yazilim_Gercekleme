"use client";
import { GameGate } from "@/components/shell/GameGate";
import { PlayScreen } from "@/components/play/PlayScreen";

export function PlayRoute() {
  return <GameGate loadingLabel="Yerin bulunuyor">{(player) => <PlayScreen player={player} />}</GameGate>;
}

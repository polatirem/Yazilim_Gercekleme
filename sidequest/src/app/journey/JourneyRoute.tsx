"use client";
import { GameGate } from "@/components/shell/GameGate";
import { JourneyScreen } from "@/components/journey/JourneyScreen";

export function JourneyRoute() {
  return <GameGate loadingLabel="Adımların izleniyor">{(player) => <JourneyScreen player={player} />}</GameGate>;
}

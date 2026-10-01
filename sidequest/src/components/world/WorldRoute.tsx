"use client";
import { GameGate } from "@/components/shell/GameGate";
import { WorldScreen } from "./WorldScreen";

export function WorldRoute() {
  return <GameGate loadingLabel="Şehir haritalanıyor">{(player) => <WorldScreen player={player} />}</GameGate>;
}

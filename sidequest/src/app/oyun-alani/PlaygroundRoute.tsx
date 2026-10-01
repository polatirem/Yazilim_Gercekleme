"use client";
import { GameGate } from "@/components/shell/GameGate";
import { Playground } from "@/components/playground/Playground";

export function PlaygroundRoute() {
  return <GameGate loadingLabel="Oyun Alanı hazırlanıyor">{() => <Playground />}</GameGate>;
}

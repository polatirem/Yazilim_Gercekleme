"use client";
import { GameGate } from "@/components/shell/GameGate";
import { QuestScreen } from "@/components/quest/QuestScreen";

export function QuestRoute({ mystery }: { mystery: boolean }) {
  return <GameGate>{(player) => <QuestScreen player={player} mysteryParam={mystery} />}</GameGate>;
}

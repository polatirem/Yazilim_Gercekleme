"use client";
import { GameGate } from "@/components/shell/GameGate";
import { SettingsScreen } from "@/components/settings/SettingsScreen";

export function SettingsRoute({ showDevLink }: { showDevLink: boolean }) {
  return <GameGate requireOnboarded={false}>{(player) => <SettingsScreen player={player} showDevLink={showDevLink} />}</GameGate>;
}

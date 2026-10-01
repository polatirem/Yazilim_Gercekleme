/**
 * Günün Görevi: her gün herkes için aynı kurala göre seçilen bir görev.
 * Açık ve henüz tamamlanmamış görevler arasından, tarihin karmasıyla seçilir;
 * hepsi tamamlandıysa açık olan herhangi biri gelir. Rastlantı yok, AI yok.
 */
import type { Content } from "@/content";
import type { Quest } from "./content-types";
import type { PlayerState } from "./player-types";
import { hashString } from "./random";
import { isQuestSafe } from "./safety";
import { deriveWorld, isQuestUnlocked } from "./world";

export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dailyQuest(content: Content, state: PlayerState, date: Date): Quest | null {
  const world = deriveWorld(content, state);
  const open = content.quests.filter((q) => isQuestSafe(q) && isQuestUnlocked(q, world.completedQuestIds, world.campaignProgress));
  const fresh = open.filter((q) => !world.completedQuestIds.has(q.id));
  const pool = fresh.length ? fresh : open;
  if (!pool.length) return null;
  return pool[hashString(`${state.playerId}:${dayKey(date)}`) % pool.length];
}

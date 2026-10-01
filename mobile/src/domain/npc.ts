/**
 * NPC callbacks. Every callback is computed from stored events; if the
 * evidence isn't there, the NPC says nothing about the player's past.
 */
import type { Content } from "@/content";
import type { PlayerState } from "./player-types";
import { predictionPairs } from "./behavior/metrics";
import { formatDuration, formatMinutes } from "./refs";
import { resolvedAttempts } from "./world";

export function npcCallback(content: Content, npcId: string, state: PlayerState): string | null {
  switch (npcId) {
    case "clockmaker": {
      const last = predictionPairs(state.events).filter((p) => p.unit !== "count").at(-1);
      if (!last) return null;
      const off = Math.abs(last.error);
      if (last.unit === "sec") {
        if (off < 15) return `Geçen sefer hedefe ${formatDuration(off)} yakın döndün.`;
        return `Geçen sefer saatin ${formatDuration(off)} ${last.error > 0 ? "geç" : "erken"} çaldı.`;
      }
      if (off < 1) return "Geçen sefer tahminin bir dakika içindeydi.";
      return `Geçen sefer tahminin ${formatMinutes(off)} ${last.error > 0 ? "kısa kaldı" : "fazla çıktı"}.`;
    }
    case "watcher": {
      const listRecall = [...state.events]
        .reverse()
        .find((e) => e.type === "recall_answered" && e.interaction === "list" && content.questById.get(e.questId ?? "")?.campaignId === "observer");
      const count = listRecall ? Number((listRecall.value as { count?: number } | undefined)?.count ?? 0) : 0;
      if (!listRecall || count === 0) return null;
      const quest = content.questById.get(listRecall.questId!);
      return `Geçen sefer “${quest?.title ?? "bir görev"}” sırasında, çoğu insanın yanından geçip gittiği ${count} şeyi geri getirdin.`;
    }
    case "cartographer": {
      const bent = resolvedAttempts(state).filter((a) => content.questById.get(a.questId)?.completionRules.interruptsRoutine).length;
      if (bent === 0) return null;
      return bent === 1 ? "Şimdiye kadar bir alışkanlık büküldü. Harita fark etti." : `Şimdiye kadar ${bent} alışkanlık büküldü. Eski haritamı okumak giderek zorlaşıyor.`;
    }
    case "archivist": {
      const recall = [...state.events]
        .reverse()
        .find((e) => e.type === "recall_answered" && e.interaction === "sequence-recall");
      if (!recall) return null;
      const v = recall.value as { correct?: number; total?: number } | undefined;
      if (typeof v?.correct !== "number" || typeof v?.total !== "number") return null;
      return `Geçen sefer ${v.total} parçalık bir dizinin ${v.correct} tanesini yerli yerinde tuttun. Arşiv bunu not etti.`;
    }
    default:
      return null;
  }
}

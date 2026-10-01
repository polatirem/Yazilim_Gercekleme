import { StyleSheet, View } from "react-native";
import type { Place, Quest } from "@/domain/content-types";
import type { QuestState } from "@/domain/player-types";
import { Icon, type IconName } from "@/ui/Icon";
import { T } from "@/ui/T";
import { colors, useHue } from "@/ui/theme";

export const PLACE_LABEL: Record<Place, string> = {
  home: "Ev",
  outside: "Dışarısı",
  work: "İş ya da okul",
  commuting: "Yolculuk",
  "with-people": "İnsanlarla",
};

export const PLACE_ICON: Record<Place, IconName> = {
  home: "home",
  outside: "outside",
  work: "work",
  commuting: "commuting",
  "with-people": "people",
};

export const PHASE_COPY: Partial<Record<QuestState, string>> = {
  ACCEPTED: "Kabul edildi, henüz başlamadı",
  PRIMING: "Hazırlanıyor",
  READY_TO_ACT: "Dışarı çıkmaya hazır",
  ACTING: "Dışarıda, dünyada",
  WAITING_FOR_RETURN: "Dışarıda, dünyada",
  RETURNED: "Geri döndü",
  RECALL: "Döndü — hatırlıyor",
  REFLECTION: "Döndü — düşünüyor",
  REVEAL: "Gösterilecek bir şey var",
};

const DIFFICULTY = { 1: "Hafif", 2: "Orta", 3: "Zorlu" } as const;

export function durationLabel(q: Quest): string {
  const { min, max } = q.estimatedMinutes;
  return min === max ? `${min} dk` : `${min}–${max} dk`;
}

export interface Requirement {
  icon: IconName;
  label: string;
  detail?: string;
}

/** Everything a player needs to know before accepting. Also used, verbatim, for Mystery Quests. */
export function requirementsOf(quest: Quest): Requirement[] {
  const where: Requirement = quest.requiresOutside
    ? { icon: "outside", label: "Dışarıda", detail: quest.requiresLocation }
    : {
        icon: PLACE_ICON[quest.contexts[0]],
        label: quest.contexts.length >= 4 ? "Neredeyse her yerde" : quest.contexts.map((c) => PLACE_LABEL[c]).join(" · "),
        detail: quest.requiresLocation,
      };
  const people: Requirement =
    quest.people === "solo"
      ? { icon: "solo", label: "Tek başına" }
      : quest.people === "optional"
        ? { icon: "people", label: "Tek ya da birlikte" }
        : { icon: "people", label: "Tanıdığın biriyle" };
  const reqs: Requirement[] = [{ icon: "clock", label: durationLabel(quest) }, where, people, { icon: "no-purchase", label: "Satın alma yok" }];
  if (quest.energy === "high") reqs.push({ icon: "energy", label: "Yüksek enerji" });
  return reqs;
}

export function Requirements({ quest, showDifficulty = true }: { quest: Quest; showDifficulty?: boolean }) {
  const hue = useHue();
  const items = requirementsOf(quest);
  return (
    <View style={styles.list}>
      {items.map((r) => (
        <View key={r.label} style={styles.item}>
          <Icon name={r.icon} size={18} color={hue.deep} />
          <View style={{ flex: 1 }}>
            <T v="bodySm">{r.label}</T>
            {r.detail ? <T v="caption">{r.detail}</T> : null}
          </View>
        </View>
      ))}
      {showDifficulty && (
        <View style={styles.item} accessibilityLabel={`Zorluk: ${DIFFICULTY[quest.difficulty]}`}>
          <View style={styles.difficulty}>
            {[1, 2, 3].map((n) => (
              <View key={n} style={[styles.pip, { borderColor: hue.deep }, n <= quest.difficulty && { backgroundColor: hue.base, borderColor: hue.base }]} />
            ))}
          </View>
          <T v="bodySm">{DIFFICULTY[quest.difficulty]}</T>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderColor: colors.borderStrong },
  item: {
    width: "50%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    paddingRight: 8,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  difficulty: { flexDirection: "row", gap: 3, width: 18, paddingTop: 5 },
  pip: { width: 4, height: 10, borderWidth: 1 },
});

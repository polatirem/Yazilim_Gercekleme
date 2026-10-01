import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { CONTENT } from "@/content";
import type { PlayerState } from "@/domain/player-types";
import { useNav } from "@/nav/router";
import { fullDate, shortDayLabel } from "@/ui/dates";
import { Enter } from "@/ui/motion";
import { Screen } from "@/ui/Screen";
import { T } from "@/ui/T";
import { colors, HUE, HueContext } from "@/ui/theme";
import { DiscoveryFigure } from "./DiscoveryFigure";

const no = (n: number) => `No. ${String(n).padStart(2, "0")}`;

export function CodexScreen({ player, initialEntry }: { player: PlayerState; initialEntry: string | null }) {
  const nav = useNav();
  const scroll = useRef<ScrollView>(null);
  const [sheetY, setSheetY] = useState(0);
  const discovered = CONTENT.discoveries.filter((d) => player.discoveries[d.id]);
  const [selected, setSelected] = useState<string>(
    initialEntry && CONTENT.discoveryById.has(initialEntry) ? initialEntry : (discovered[0]?.id ?? CONTENT.discoveries[0].id),
  );
  const entry = CONTENT.discoveryById.get(selected)!;
  const record = player.discoveries[selected];
  const related = CONTENT.quests.filter((q) => q.discoveries.some((d) => d.discovery === selected));
  const hue = HUE[entry.hue];

  const choose = (id: string) => {
    setSelected(id);
    scroll.current?.scrollTo({ y: Math.max(0, sheetY - 12), animated: true });
  };

  return (
    <Screen ref={scroll} hue="indigo">
      <T v="label" muted>
        Kodeks
      </T>
      <T v="hero">{discovered.length === 0 ? "Henüz bir keşif yok." : `${CONTENT.discoveries.length} kayıttan ${discovered.length} tanesi yazıldı.`}</T>
      <T v="bodyLg" secondary>
        {discovered.length === 0
          ? "İlk keşfin, bir görev saklamaya değer bir şey gösterdiğinde belirecek."
          : "Görevlerinin gösterdiği olgular — her biri, gerçekte nasıl göründüyse öyle yazıldı."}
      </T>

      <View style={styles.index} accessibilityLabel="Kodeks kayıtları">
        {CONTENT.discoveries.map((d) => {
          const found = Boolean(player.discoveries[d.id]);
          const on = selected === d.id;
          const h = HUE[d.hue];
          const count = player.discoveries[d.id]?.encounters.length ?? 0;
          return (
            <Pressable
              key={d.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => choose(d.id)}
              style={[styles.indexItem, on && { backgroundColor: found ? h.deep : colors.text }]}
            >
              <View style={[styles.swatch, { backgroundColor: found ? h.base : "transparent", borderColor: found ? h.base : colors.locked }]} />
              <T v="data" color={on ? colors.textInverse : colors.textMuted}>
                {no(d.number)}
              </T>
              <T style={{ flex: 1 }} color={on ? colors.textInverse : found ? colors.text : colors.textMuted} numberOfLines={1}>
                {found ? d.title : "Kaydedilmedi"}
              </T>
              {found && count > 1 && (
                <T v="data" color={on ? colors.textInverse : colors.textMuted}>
                  ×{count}
                </T>
              )}
            </Pressable>
          );
        })}
      </View>

      <HueContext.Provider value={entry.hue}>
        <View onLayout={(e) => setSheetY(e.nativeEvent.layout.y)}>
          <Enter key={selected} kind="fade">
            <View style={[styles.sheet, { borderTopColor: record ? hue.base : colors.locked }]}>
              {record ? (
                <>
                  <View style={[styles.plate, { backgroundColor: hue.wash }]}>
                    <DiscoveryFigure figure={entry.figure} size={220} accent={hue.base} />
                    <T v="data" color={hue.deep}>
                      Levha {no(entry.number).replace("No. ", "")}
                    </T>
                  </View>
                  <T v="data" muted>
                    {no(entry.number)} · {fullDate(record.firstAt)} tarihinde kaydedildi
                  </T>
                  <T v="h1" accessibilityRole="header">
                    {entry.title}
                  </T>
                  <T v="h2" italic>
                    {entry.summary}
                  </T>
                  <T v="bodyLg">{entry.explanation}</T>

                  <View style={{ gap: 10 }}>
                    <T v="label" color={hue.deep}>
                      Sende nasıl göründü
                    </T>
                    {[...record.encounters].reverse().map((e) => {
                      const quest = CONTENT.questById.get(e.questId);
                      return (
                        <View key={e.attemptId} style={styles.encounter}>
                          <T v="data" muted>
                            {shortDayLabel(e.at)} ·{" "}
                            {quest ? (
                              <T v="data" color={hue.deep} style={{ textDecorationLine: "underline" }} onPress={() => nav.push({ name: "questDetail", slug: quest.slug })}>
                                {quest.title}
                              </T>
                            ) : (
                              e.questId
                            )}
                          </T>
                          <T>{e.text}</T>
                        </View>
                      );
                    })}
                  </View>

                  <View style={{ gap: 8 }}>
                    <T v="label" color={hue.deep}>
                      Görünebileceği görevler
                    </T>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {related.map((q) => (
                        <Pressable key={q.id} accessibilityRole="link" onPress={() => nav.push({ name: "questDetail", slug: q.slug })} style={[styles.chip, { borderColor: hue.deep }]}>
                          <T v="bodySm" color={hue.deep}>
                            {q.title}
                          </T>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.caveat}>
                    <T v="label">Kanıt üzerine bir not</T>
                    <T v="bodySm" secondary>
                      {entry.caveat}
                    </T>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.plateEmpty} />
                  <T v="data" muted>
                    {no(entry.number)}
                  </T>
                  <T v="h1" accessibilityRole="header">
                    Kaydedilmedi.
                  </T>
                  <T v="bodyLg" secondary>
                    {entry.hint}
                  </T>
                  <T v="caption">Kayıtlar önceden okunmaz; görevler tarafından yazılır.</T>
                </>
              )}
            </View>
          </Enter>
        </View>
      </HueContext.Provider>
    </Screen>
  );
}

const styles = StyleSheet.create({
  index: { borderTopWidth: 1, borderColor: colors.borderStrong },
  indexItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: colors.border },
  swatch: { width: 10, height: 10, borderWidth: 1 },
  sheet: { gap: 16, paddingTop: 20, borderTopWidth: 3 },
  plate: { alignItems: "center", gap: 8, paddingVertical: 20 },
  plateEmpty: { height: 140, borderWidth: 1, borderStyle: "dashed", borderColor: colors.locked },
  encounter: { gap: 4, paddingVertical: 10, borderTopWidth: 1, borderColor: colors.border },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  caveat: { gap: 6, padding: 14, backgroundColor: colors.surfaceSunken },
});

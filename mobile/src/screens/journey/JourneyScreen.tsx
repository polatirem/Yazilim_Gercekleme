import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { CONTENT } from "@/content";
import type { PlayerState, QuestAttempt } from "@/domain/player-types";
import { computeMetrics } from "@/domain/behavior/metrics";
import { detectPatterns } from "@/domain/behavior/patterns";
import { weeklyReview } from "@/domain/behavior/weekly";
import { useNav } from "@/nav/router";
import { Button } from "@/ui/Button";
import { numericDate, shortDayLabel } from "@/ui/dates";
import { Screen } from "@/ui/Screen";
import { EmptyState } from "@/ui/States";
import { T } from "@/ui/T";
import { colors, fonts, HUE, hueSet } from "@/ui/theme";
import type { Hue } from "@/domain/content-types";

type Filter = "all" | "discoveries" | string;

function Summary({ player }: { player: PlayerState }) {
  const m = computeMetrics(CONTENT, player);
  const discovered = Object.keys(player.discoveries).length;
  const parts: { n: number; text: string; hue: Hue }[] = [
    { n: m.questsCompleted, text: "görev tamamlandı", hue: "vermilion" },
    { n: m.routinesInterrupted, text: "alışkanlık bozuldu", hue: "amber" },
    { n: m.predictionsMade, text: "tahmin yapıldı", hue: "saffron" },
    { n: m.detailsRecalled, text: "ayrıntı geri getirildi", hue: "teal" },
    { n: discovered, text: "olgu keşfedildi", hue: "indigo" },
    { n: m.realWorldMinutes, text: "dakika dünyada geçti", hue: "green" },
  ].filter((p) => p.n > 0) as { n: number; text: string; hue: Hue }[];
  return (
    <T v="h1">
      {parts.map((p, i) => (
        <T key={p.text} v="h1">
          <T v="h1" color={HUE[p.hue].base}>
            {p.n}
          </T>{" "}
          {p.text}
          {i < parts.length - 1 ? ". " : "."}
        </T>
      ))}
    </T>
  );
}

function Entry({ attempt }: { attempt: QuestAttempt }) {
  const nav = useNav();
  const quest = CONTENT.questById.get(attempt.questId);
  if (!quest) return null;
  const campaign = CONTENT.campaignById.get(quest.campaignId)!;
  const tone = HUE[campaign.tone];
  const open = () => nav.push({ name: "questDetail", slug: quest.slug });
  if (attempt.state === "ABANDONED") {
    return (
      <View style={styles.entry}>
        <View style={[styles.tone, { backgroundColor: colors.border }]} />
        <T v="bodySm" muted style={{ flex: 1 }}>
          Kenara kondu —{" "}
          <T v="bodySm" muted style={{ textDecorationLine: "underline" }} onPress={open}>
            {quest.title}
          </T>
        </T>
      </View>
    );
  }
  const outcome = attempt.outcome;
  return (
    <View style={styles.entry}>
      <View style={[styles.tone, { backgroundColor: tone.base }]} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <T style={{ fontFamily: fonts.uiMedium, textDecorationLine: "underline" }} onPress={open}>
            {quest.title}
          </T>
          {attempt.mystery && <T v="label" color={HUE.violet.deep} style={styles.tag}>Gizemli</T>}
          {attempt.simulated && <T v="label" muted style={styles.tag}>Simüle</T>}
        </View>
        {outcome?.journeyLine ? <T secondary>{outcome.journeyLine}</T> : null}
        {outcome && outcome.discoveries.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {outcome.discoveries.map((d) => {
              const disc = CONTENT.discoveryById.get(d.id);
              const h = hueSet(disc?.hue);
              return (
                <Pressable key={d.id} accessibilityRole="link" onPress={() => nav.reset({ name: "codex", entry: d.id })} style={[styles.chip, { backgroundColor: h.wash }]}>
                  <T v="caption" color={h.deep}>
                    {disc?.title}
                  </T>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

export function JourneyScreen({ player }: { player: PlayerState }) {
  const nav = useNav();
  const [filter, setFilter] = useState<Filter>("all");
  const now = useMemo(() => new Date(), []);
  const review = useMemo(() => weeklyReview(CONTENT, player, now), [player, now]);
  const report = useMemo(() => detectPatterns(player.events), [player.events]);

  const attempts = Object.values(player.attempts)
    .filter((a) => a.state === "COMPLETED" || a.state === "REVEAL" || a.state === "ABANDONED")
    .filter((a) => {
      if (filter === "all") return true;
      if (filter === "discoveries") return (a.outcome?.discoveries.length ?? 0) > 0;
      return CONTENT.questById.get(a.questId)?.campaignId === filter;
    })
    .sort((a, b) => ((a.completedAt ?? a.endedAt ?? "") < (b.completedAt ?? b.endedAt ?? "") ? 1 : -1));

  const days = new Map<string, { label: string; items: QuestAttempt[] }>();
  for (const a of attempts) {
    const at = a.completedAt ?? a.endedAt ?? a.createdAt;
    const key = numericDate(at);
    if (!days.has(key)) days.set(key, { label: shortDayLabel(at), items: [] });
    days.get(key)!.items.push(a);
  }

  const hasHistory = Object.values(player.attempts).some((a) => a.state === "COMPLETED" || a.state === "REVEAL");
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "Hepsi" },
    { id: "discoveries", label: "Keşif getirenler" },
    ...CONTENT.campaigns.map((c) => ({ id: c.id, label: c.title })),
  ];

  return (
    <Screen hue="teal">
      <T v="label" muted>
        Yolculuk
      </T>
      {hasHistory ? <Summary player={player} /> : <T v="hero">Henüz bir yolculuk yok.</T>}

      {!hasHistory && (
        <EmptyState
          title="İlk görevini kabul et."
          action={
            <Button variant="primary" icon="arrow-right" onPress={() => nav.reset({ name: "quest" })}>
              Bana bir görev ver
            </Button>
          }
        >
          Dışarıda yaptığın her şey buraya yazılacak — neyi tahmin ettiğin, gerçekte ne olduğu, neyi fark ettiğin.
        </EmptyState>
      )}

      {hasHistory && (
        <>
          {review && (
            <View style={styles.week}>
              <T v="label" color={colors.nightText}>
                Bu hafta
              </T>
              {review.lines.map((l) => (
                <View key={l.label} style={styles.weekRow}>
                  <T v="bodySm" color={colors.nightMuted} style={{ flex: 1 }}>
                    {l.label}
                  </T>
                  <T v="data" color={colors.nightText}>
                    {l.value}
                  </T>
                </View>
              ))}
              <View style={{ gap: 6, marginTop: 8 }}>
                <T v="label" color={colors.nightMuted}>
                  Sıradaki keşif sorusu
                </T>
                <T v="h2" color={colors.nightText}>
                  {review.focus.question}
                </T>
                <T v="caption" color={colors.nightMuted}>
                  Bu soruyu soran görevler biraz daha sık önerilecek.
                </T>
              </View>
            </View>
          )}

          <View style={{ gap: 12 }}>
            <T v="label">Zaman çizelgesi</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {filters.map((f) => {
                const on = filter === f.id;
                return (
                  <Pressable
                    key={f.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => setFilter(f.id)}
                    style={[styles.filter, on && { backgroundColor: HUE.teal.deep, borderColor: HUE.teal.deep }]}
                  >
                    <T v="bodySm" color={on ? colors.textInverse : colors.text}>
                      {f.label}
                    </T>
                  </Pressable>
                );
              })}
            </ScrollView>
            {days.size === 0 ? (
              <T secondary>Bu filtreye uyan bir şey henüz yok.</T>
            ) : (
              [...days.entries()].map(([key, day]) => (
                <View key={key} style={styles.day}>
                  <T v="data" color={HUE.teal.deep} style={styles.date}>
                    {day.label}
                  </T>
                  {day.items.map((a) => (
                    <Entry key={a.id} attempt={a} />
                  ))}
                </View>
              ))
            )}
          </View>

          <View style={{ gap: 12 }}>
            <T v="label">Örüntüler</T>
            {report.patterns.length === 0 && <T secondary>Henüz yok. Bir örüntü ancak arkasında yeterli kanıt olduğunda görünür.</T>}
            {report.patterns.map((p) => (
              <View key={p.id} style={styles.pattern}>
                <T>{p.statement}</T>
                <T v="caption">
                  {p.sampleSize} kayda dayanıyor · {p.confidence === "consistent" ? "şimdilik tutarlı" : "yeni beliriyor — hâlâ değişebilir"}
                </T>
              </View>
            ))}
            {report.pending.length > 0 && (
              <View style={{ gap: 8 }}>
                <T v="caption">Kanıt toplanıyor:</T>
                {report.pending.map((p) => (
                  <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flexDirection: "row", gap: 2 }}>
                      {Array.from({ length: p.need }, (_, i) => (
                        <View key={i} style={[styles.meter, i < p.have && { backgroundColor: HUE.teal.base, borderColor: HUE.teal.base }]} />
                      ))}
                    </View>
                    <T v="caption" style={{ flex: 1 }}>
                      {p.label}: {p.have} / {p.need}
                    </T>
                  </View>
                ))}
              </View>
            )}
            <T v="caption">Örüntüler görevlerin nasıl geçtiğini anlatır. Senin ölçümün değildir, tanı hiç değildir.</T>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  entry: { flexDirection: "row", gap: 12, paddingVertical: 12, borderTopWidth: 1, borderColor: colors.border },
  tone: { width: 4, alignSelf: "stretch" },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: colors.border },
  chip: { paddingHorizontal: 8, paddingVertical: 4 },
  week: { backgroundColor: colors.nightBackground, padding: 18, gap: 8 },
  weekRow: { flexDirection: "row", gap: 12, paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.nightBorder },
  filter: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  day: { gap: 0 },
  date: { paddingVertical: 8, letterSpacing: 1.6 },
  pattern: { gap: 4, padding: 14, backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: HUE.teal.base },
  meter: { width: 10, height: 10, borderWidth: 1, borderColor: colors.borderStrong },
});

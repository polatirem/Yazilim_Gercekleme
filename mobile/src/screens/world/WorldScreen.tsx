import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { CONTENT } from "@/content";
import type { PlayerState } from "@/domain/player-types";
import { acknowledgeWorld, activeAttempt } from "@/domain/game";
import { deriveWorld, isQuestUnlocked, type WorldView } from "@/domain/world";
import { computeMetrics } from "@/domain/behavior/metrics";
import { dailyQuest } from "@/domain/daily";
import { dispatch } from "@/state/store";
import { useNav } from "@/nav/router";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Enter } from "@/ui/motion";
import { Link, Screen } from "@/ui/Screen";
import { Sigil } from "@/ui/Sigil";
import { Ticks } from "@/ui/States";
import { T } from "@/ui/T";
import { colors, HUE, HueContext, hueSet } from "@/ui/theme";
import { durationLabel, PHASE_COPY } from "@/screens/quest/Requirements";
import { CityMap } from "./CityMap";

function LocationPanel({ locationId, world, onClose }: { locationId: string; world: WorldView; onClose: () => void }) {
  const nav = useNav();
  const location = CONTENT.locationById.get(locationId)!;
  const revealed = world.revealedLocations.has(locationId);
  const quests = CONTENT.quests.filter((q) => q.locationId === locationId);
  const homeOf = CONTENT.campaigns.filter((c) => c.homeLocationId === locationId);
  const hue = revealed ? HUE[location.hue] : hueSet(null);

  return (
    <HueContext.Provider value={revealed ? location.hue : null}>
      <Enter>
        <View style={[styles.panel, { borderTopColor: revealed ? hue.base : colors.borderStrong }]}>
          <View style={styles.panelHead}>
            <T v="label" muted>
              {revealed ? "Mekân" : "Haritasız"}
            </T>
            <Pressable accessibilityRole="button" accessibilityLabel="Mekân ayrıntılarını kapat" onPress={onClose} hitSlop={12}>
              <Icon name="close" size={20} />
            </Pressable>
          </View>
          <T v="h2">{revealed ? location.name : "Haritanın kenarının ötesinde bir şey"}</T>

          {revealed ? (
            <>
              <T secondary>{location.description}</T>
              <T v="data" color={hue.deep}>
                {location.modes.join(" · ")}
              </T>

              {homeOf.map((c) => {
                const npc = CONTENT.npcById.get(c.npcId)!;
                const next = c.questIds
                  .map((id) => CONTENT.questById.get(id)!)
                  .find((q) => !world.completedQuestIds.has(q.id) && isQuestUnlocked(q, world.completedQuestIds, world.campaignProgress));
                return (
                  <View key={c.id} style={styles.resident}>
                    <Sigil sigil={npc.sigil} size={36} color={hue.deep} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <T v="bodySm">
                        <T v="bodySm" italic>
                          {c.title}
                        </T>{" "}
                        kampanyasını burada <T v="bodySm" style={{ fontFamily: "PlexSansSemibold" }}>{npc.name}</T> yürütür.
                      </T>
                      {next && (
                        <Link v="bodySm" onPress={() => nav.push({ name: "questDetail", slug: next.slug })}>
                          Kampanyaya gir: {next.title}
                        </Link>
                      )}
                    </View>
                  </View>
                );
              })}

              <T v="label" muted style={{ marginTop: 8 }}>
                Buradaki görevler
              </T>
              <View>
                {quests.map((q) => {
                  const done = world.completedQuestIds.has(q.id);
                  const unlocked = isQuestUnlocked(q, world.completedQuestIds, world.campaignProgress);
                  return unlocked ? (
                    <Pressable
                      key={q.id}
                      accessibilityRole="link"
                      onPress={() => nav.push({ name: "questDetail", slug: q.slug })}
                      style={({ pressed }) => [styles.questRow, pressed && { backgroundColor: hue.wash }]}
                    >
                      <T v="data" muted>
                        {String(q.number).padStart(3, "0")}
                      </T>
                      <T style={{ flex: 1 }}>{q.title}</T>
                      {done ? <Icon name="check" size={16} color={hue.deep} /> : <T v="caption">Açık</T>}
                    </Pressable>
                  ) : (
                    <View key={q.id} style={[styles.questRow, { opacity: 0.55 }]} accessibilityLabel={`${q.number}. görev, kilitli`}>
                      <T v="data">{String(q.number).padStart(3, "0")}</T>
                      <T style={{ flex: 1 }} muted>
                        Henüz açık değil
                      </T>
                      <Icon name="lock" size={16} color={colors.textMuted} />
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <T secondary>{location.undiscoveredHint}</T>
              <T v="caption">
                {location.reveal === "mystery"
                  ? "Bir Gizemli Görev tamamlanınca ortaya çıkar — ne olduğunu bilmeden kabul edilen bir görev."
                  : `Burada geçen bir görev tamamlanınca ortaya çıkar. İçeride bir yerde ${quests.length} görev bekliyor.`}
              </T>
            </>
          )}
        </View>
      </Enter>
    </HueContext.Provider>
  );
}

export function WorldScreen({ player }: { player: PlayerState }) {
  const nav = useNav();
  const world = useMemo(() => deriveWorld(CONTENT, player), [player]);
  const metrics = useMemo(() => computeMetrics(CONTENT, player), [player]);
  const [today] = useState(() => new Date());
  const daily = useMemo(() => dailyQuest(CONTENT, player, today), [player, today]);
  // Capture what's new on first view; the animation plays once even after it's acknowledged.
  const [fresh] = useState(() => ({ locations: world.newLocations, paths: world.newPaths }));
  const [selected, setSelected] = useState<string | null>(null);
  const [panelY, setPanelY] = useState<number | null>(null);
  const scroll = useRef<ScrollView>(null);
  const active = activeAttempt(player);
  const activeQuest = active ? CONTENT.questById.get(active.questId)! : null;
  const season = CONTENT.seasons[0];
  const lastFragment = world.fragments.length ? world.fragments[world.fragments.length - 1] : undefined;

  useEffect(() => {
    if (!fresh.locations.length && !fresh.paths.length) return;
    const t = setTimeout(() => dispatch((s) => acknowledgeWorld(s, fresh.locations, fresh.paths)), 2600);
    return () => clearTimeout(t);
  }, [fresh]);

  useEffect(() => {
    if (selected && panelY !== null) scroll.current?.scrollTo({ y: Math.max(0, panelY - 16), animated: true });
  }, [selected, panelY]);

  const changes = [
    ...fresh.locations.map((id) => ({ text: `Yeni bir yer beliriyor: ${CONTENT.locationById.get(id)?.name}.`, hue: CONTENT.locationById.get(id)?.hue })),
    ...fresh.paths
      .filter((id) => !fresh.locations.includes(CONTENT.pathById.get(id)?.to ?? ""))
      .map((id) => {
        const p = CONTENT.pathById.get(id)!;
        const to = world.revealedLocations.has(p.to) ? CONTENT.locationById.get(p.to)! : null;
        return { text: `${CONTENT.locationById.get(p.from)?.name} çıkışında ${to ? `${to.name} yönüne` : "haritasız topraklara"} yeni bir yol açılıyor.`, hue: to?.hue };
      }),
  ];

  const dailyCampaign = daily ? CONTENT.campaignById.get(daily.campaignId)! : null;
  const fragmentTone = lastFragment ? CONTENT.campaignById.get(CONTENT.questById.get(lastFragment.questId)?.campaignId ?? "")?.tone : undefined;
  const activeTone = activeQuest ? CONTENT.campaignById.get(activeQuest.campaignId)?.tone : undefined;

  return (
    <Screen ref={scroll}>
      <CityMap
        world={world}
        selected={selected}
        onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
        fresh={fresh}
        activeLocationId={activeQuest?.locationId ?? null}
        seasonLabel={`Sezon ${String(season.number).padStart(2, "0")} · ${season.title}`}
      />
      {!selected && (
        <T v="caption" center>
          Bir mekâna dokun. Harita yana kayar.
        </T>
      )}

      {selected && (
        <View onLayout={(e) => setPanelY(e.nativeEvent.layout.y)}>
          <LocationPanel locationId={selected} world={world} onClose={() => setSelected(null)} />
        </View>
      )}

      <View style={{ gap: 14 }}>
        <T v="label" muted>
          Sezon {String(season.number).padStart(2, "0")} — {season.title}
        </T>
        <T v="h1" accessibilityRole="header">
          {world.completedQuestIds.size === 0 ? (
            "Şehrin çoğu hâlâ haritasız."
          ) : (
            <>
              <T v="hero" color={colors.accent}>
                {world.revealedLocations.size}
              </T>{" "}
              / {CONTENT.locations.length} yer haritalandı.
            </>
          )}
        </T>

        {changes.length > 0 && (
          <Enter kind="unfold">
            <View style={styles.changes} accessibilityLiveRegion="polite">
              <T v="label" color={colors.nightText}>
                Şehir değişti
              </T>
              {changes.map((c) => (
                <View key={c.text} style={styles.changeRow}>
                  <View style={[styles.changeMark, { backgroundColor: hueSet(c.hue).base }]} />
                  <T v="bodySm" color={colors.nightText} style={{ flex: 1 }}>
                    {c.text}
                  </T>
                </View>
              ))}
            </View>
          </Enter>
        )}

        {lastFragment ? (
          <View style={[styles.fragment, { borderLeftColor: hueSet(fragmentTone).base }]}>
            <T v="h2" italic>
              {lastFragment.text}
            </T>
            <T v="caption">{CONTENT.questById.get(lastFragment.questId)?.title} görevinden sonra</T>
          </View>
        ) : (
          <T v="bodyLg" secondary>
            Dışarıda bitirdiğin her görev, Şehrin bir parçasını daha buraya çizer.
          </T>
        )}

        {active && activeQuest ? (
          <HueContext.Provider value={activeTone ?? null}>
            <View style={[styles.inProgress, { borderColor: hueSet(activeTone).deep, backgroundColor: hueSet(activeTone).wash }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[styles.liveMark, { backgroundColor: colors.accent }]} />
                <T v="label">Devam eden görev</T>
              </View>
              <T v="h2">{activeQuest.title}</T>
              <T v="caption">{PHASE_COPY[active.state]}</T>
              <Button variant="primary" size="lg" icon="arrow-right" block onPress={() => nav.push({ name: "play" })}>
                {active.state === "ACTING" || active.state === "WAITING_FOR_RETURN" ? "Döndüm" : "Devam et"}
              </Button>
            </View>
          </HueContext.Provider>
        ) : (
          <View style={{ gap: 14 }}>
            <HueContext.Provider value="vermilion">
              <Button variant="primary" size="lg" icon="arrow-right" block onPress={() => nav.reset({ name: "quest" })}>
                Bana bir görev ver
              </Button>
            </HueContext.Provider>
            <Pressable accessibilityRole="link" onPress={() => nav.reset({ name: "quest", mystery: true })} style={styles.mysteryLink}>
              <Icon name="spark" size={16} color={HUE.violet.deep} />
              <T color={HUE.violet.deep} style={{ textDecorationLine: "underline" }}>
                Ya da gizemli bir görev kabul et
              </T>
            </Pressable>
          </View>
        )}
      </View>

      {daily && dailyCampaign && !active && (
        <Enter i={1}>
          <Pressable
            accessibilityRole="link"
            onPress={() => nav.push({ name: "questDetail", slug: daily.slug })}
            style={({ pressed }) => [styles.daily, { backgroundColor: HUE[dailyCampaign.tone].wash, borderColor: HUE[dailyCampaign.tone].deep }, pressed && { opacity: 0.85 }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="spark" size={16} color={HUE[dailyCampaign.tone].deep} />
              <T v="label" color={HUE[dailyCampaign.tone].deep}>
                Günün görevi
              </T>
            </View>
            <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
              <Sigil sigil={CONTENT.npcById.get(daily.npcId)!.sigil} size={40} color={HUE[dailyCampaign.tone].deep} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="h2">{daily.title}</T>
                <T v="bodySm" secondary>
                  {daily.subtitle}
                </T>
                <T v="data" color={HUE[dailyCampaign.tone].deep}>
                  {durationLabel(daily)} · {dailyCampaign.title}
                </T>
              </View>
              <Icon name="arrow-right" color={HUE[dailyCampaign.tone].deep} />
            </View>
          </Pressable>
        </Enter>
      )}

      <View style={{ gap: 4 }}>
        <T v="label" muted style={{ marginBottom: 8 }}>
          Kampanyalar
        </T>
        {CONTENT.campaigns.map((c) => {
          const p = world.campaignProgress[c.id];
          const npc = CONTENT.npcById.get(c.npcId)!;
          const next = c.questIds
            .map((id) => CONTENT.questById.get(id)!)
            .find((q) => !p.completedQuestIds.has(q.id) && isQuestUnlocked(q, world.completedQuestIds, world.campaignProgress));
          const isActive = world.activeCampaignId === c.id && world.completedQuestIds.size > 0;
          const hue = HUE[c.tone];
          return (
            <HueContext.Provider key={c.id} value={c.tone}>
              <View style={[styles.campaign, isActive && { borderLeftColor: hue.base, borderLeftWidth: 3, paddingLeft: 12, backgroundColor: hue.wash }]}>
                <Sigil sigil={npc.sigil} size={32} color={hue.deep} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.campaignHead}>
                    <T v="h3" style={{ flexShrink: 1 }}>
                      {c.title}
                    </T>
                    <Ticks done={p.completed} total={p.total} tone={c.tone} label={c.title} />
                  </View>
                  <T v="caption">{c.theme}</T>
                  <T v="bodySm" secondary>
                    {p.done ? "Tamamlandı." : isActive ? `Aktif · ${npc.name}` : npc.name}
                    {!p.done && next ? " · " : ""}
                    {!p.done && next ? (
                      <T v="bodySm" color={hue.deep} style={{ textDecorationLine: "underline" }} onPress={() => nav.push({ name: "questDetail", slug: next.slug })}>
                        Sıradaki: {next.title}
                      </T>
                    ) : null}
                  </T>
                </View>
              </View>
            </HueContext.Provider>
          );
        })}
      </View>

      <Pressable accessibilityRole="link" onPress={() => nav.reset({ name: "journey" })} style={({ pressed }) => [styles.journeyLine, pressed && { backgroundColor: HUE.teal.wash }]}>
        <T style={{ flex: 1 }} color={HUE.teal.deep}>
          {metrics.questsCompleted === 0
            ? "Henüz bir yolculuk yok."
            : `${metrics.questsCompleted} görev · ${Object.keys(player.discoveries).length} keşif · dünyada ${metrics.realWorldMinutes} dk`}
        </T>
        <Icon name="arrow-right" size={18} color={HUE.teal.deep} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12, padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderTopWidth: 3 },
  panelHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resident: { flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 8 },
  questRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: 1, borderColor: colors.border, minHeight: 48 },
  changes: { backgroundColor: colors.nightBackground, padding: 16, gap: 10 },
  changeRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  changeMark: { width: 8, height: 8, marginTop: 7 },
  fragment: { borderLeftWidth: 3, paddingLeft: 14, gap: 8 },
  inProgress: { gap: 10, padding: 16, borderWidth: 1 },
  liveMark: { width: 8, height: 8, borderRadius: 4 },
  mysteryLink: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingVertical: 6 },
  daily: { gap: 12, padding: 16, borderWidth: 1 },
  campaign: { flexDirection: "row", gap: 12, paddingVertical: 14, borderTopWidth: 1, borderColor: colors.border, borderLeftWidth: 0 },
  campaignHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" },
  journeyLine: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, paddingHorizontal: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: HUE.teal.base },
});

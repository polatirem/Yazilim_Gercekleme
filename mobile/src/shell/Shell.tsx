import { useEffect, useState } from "react";
import { AccessibilityInfo, Keyboard, Platform, Pressable, Share, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Hue } from "@/domain/content-types";
import type { PlayerState } from "@/domain/player-types";
import { activeAttempt } from "@/domain/game";
import { resetProgress, usePlayerStore } from "@/state/store";
import { useNav, type Route, type RouteName } from "@/nav/router";
import { Button } from "@/ui/Button";
import { Icon, type IconName } from "@/ui/Icon";
import { ReduceMotionContext } from "@/ui/motion";
import { Screen } from "@/ui/Screen";
import { ErrorPanel, Notice, Surveying } from "@/ui/States";
import { T } from "@/ui/T";
import { colors, fonts, GUTTER, HUE } from "@/ui/theme";
import { WorldScreen } from "@/screens/world/WorldScreen";
import { QuestDetail, QuestScreen } from "@/screens/quest/QuestScreen";
import { PlayScreen } from "@/screens/play/PlayScreen";
import { JourneyScreen } from "@/screens/journey/JourneyScreen";
import { CodexScreen } from "@/screens/codex/CodexScreen";
import { Playground } from "@/screens/playground/Playground";
import { SettingsScreen } from "@/screens/settings/SettingsScreen";
import { Onboarding } from "@/screens/onboarding/Onboarding";
import { DevPanel } from "@/screens/dev/DevPanel";

const NAV: { route: Route; tab: RouteName[]; label: string; icon: IconName; hue: Hue }[] = [
  { route: { name: "world" }, tab: ["world"], label: "Dünya", icon: "world", hue: "vermilion" },
  { route: { name: "quest" }, tab: ["quest", "questDetail"], label: "Görev", icon: "location", hue: "amber" },
  { route: { name: "playground" }, tab: ["playground"], label: "Oyun", icon: "play", hue: "green" },
  { route: { name: "journey" }, tab: ["journey"], label: "Yolculuk", icon: "journey", hue: "teal" },
  { route: { name: "codex" }, tab: ["codex"], label: "Kodeks", icon: "codex", hue: "indigo" },
];

/** Screens that own the whole display: onboarding and the quest flow. */
const IMMERSIVE: RouteName[] = ["begin", "play"];

export function Logo({ size = 9 }: { size?: number }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", width: size * 2 + 2, gap: 2 }}>
      {(["vermilion", "teal", "saffron", "indigo"] as const).map((h) => (
        <View key={h} style={{ width: size, height: size, backgroundColor: HUE[h].base }} />
      ))}
    </View>
  );
}

function CorruptSave({ error, raw }: { error: string; raw: string }) {
  const insets = useSafeAreaInsets();
  const [confirm, setConfirm] = useState(false);
  const [details, setDetails] = useState(false);
  return (
    <Screen contentStyle={{ paddingTop: insets.top + 32 }}>
      <ErrorPanel
        title="Kayıtlı yolculuğun okunamadı."
        actions={
          confirm ? (
            <>
              <Button variant="danger" onPress={resetProgress}>
                Sil ve baştan başla
              </Button>
              <Button variant="quiet" onPress={() => setConfirm(false)}>
                Şimdilik sakla
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onPress={() => Share.share({ message: raw }).catch(() => undefined)}>
                Ham kaydı paylaş
              </Button>
              <Button variant="quiet" onPress={() => setConfirm(true)}>
                Baştan başla…
              </Button>
            </>
          )
        }
      >
        <T secondary>Bu cihazda saklanan veri Sidequest&apos;in beklediğiyle uyuşmuyor. Hiçbir şey silinmedi. Saklamak istersen ham kaydı paylaş, sonra baştan başla.</T>
        <T v="caption" style={{ textDecorationLine: "underline" }} onPress={() => setDetails((d) => !d)}>
          Teknik ayrıntı
        </T>
        {details && (
          <T v="data" style={{ fontSize: 11 }}>
            {error}
          </T>
        )}
      </ErrorPanel>
    </Screen>
  );
}

function Header() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const onSettings = nav.route.name === "settings";
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <Pressable accessibilityRole="link" accessibilityLabel="Sidequest — Şehir" onPress={() => nav.reset({ name: "world" })} style={styles.wordmark} hitSlop={8}>
        <Logo />
        <T style={styles.name}>Sidequest</T>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        accessibilityState={{ selected: onSettings }}
        onPress={() => (onSettings ? nav.back() : nav.push({ name: "settings" }))}
        style={({ pressed }) => [styles.settings, (pressed || onSettings) && { backgroundColor: colors.surfaceSunken }]}
        hitSlop={6}
      >
        <Icon name="settings" size={18} />
        <T v="label">Ayarlar</T>
      </Pressable>
    </View>
  );
}

function TabBar({ questLive }: { questLive: boolean }) {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabs, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {NAV.map((item) => {
        const active = item.tab.includes(nav.route.name);
        const live = item.route.name === "quest" && questLive;
        const hue = HUE[item.hue];
        return (
          <Pressable
            key={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={live ? `${item.label} (devam ediyor)` : item.label}
            onPress={() => nav.reset(live ? { name: "play" } : item.route)}
            style={styles.tab}
          >
            <View style={[styles.tabMark, { backgroundColor: active ? hue.base : "transparent" }]} />
            <View>
              <Icon name={item.icon} size={22} color={active ? hue.deep : colors.textMuted} />
              {live && <View style={styles.live} />}
            </View>
            <T style={[styles.tabLabel, { color: active ? hue.deep : colors.textMuted }]} numberOfLines={1}>
              {item.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

function RouteView({ route, player }: { route: Route; player: PlayerState }) {
  switch (route.name) {
    case "world":
      return <WorldScreen player={player} />;
    case "quest":
      return <QuestScreen player={player} mysteryParam={Boolean(route.mystery)} />;
    case "questDetail":
      return <QuestDetail slug={route.slug} player={player} />;
    case "play":
      return <PlayScreen player={player} />;
    case "journey":
      return <JourneyScreen player={player} />;
    case "codex":
      return <CodexScreen player={player} initialEntry={route.entry ?? null} />;
    case "playground":
      return <Playground />;
    case "settings":
      return <SettingsScreen player={player} />;
    case "begin":
      return <Onboarding player={player} />;
    case "dev":
      return __DEV__ ? <DevPanel player={player} /> : <WorldScreen player={player} />;
  }
}

function useSystemReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setOpen(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

/**
 * Wraps every screen: loading, corrupt saves, storage failures and the
 * onboarding redirect in one place, then the header, the screen and the tabs.
 */
export function Shell() {
  const nav = useNav();
  const snap = usePlayerStore();
  const systemReduce = useSystemReduceMotion();
  const keyboardOpen = useKeyboardOpen();
  const { route, key } = nav;
  const needsOnboarding = snap.status === "ready" && !snap.player.preferences.onboarded && route.name !== "begin" && route.name !== "dev";

  useEffect(() => {
    if (needsOnboarding) nav.reset({ name: "begin" });
  }, [needsOnboarding, nav]);

  const reduce = systemReduce || (snap.status === "ready" && snap.player.preferences.motion === "reduce");

  let body;
  if (snap.status === "loading" || needsOnboarding) body = <Surveying />;
  else if (snap.status === "corrupt") body = <CorruptSave error={snap.error} raw={snap.raw} />;
  else body = <RouteView key={key} route={route} player={snap.player} />;

  const immersive = IMMERSIVE.includes(route.name) || snap.status !== "ready";
  const questLive = snap.status === "ready" && activeAttempt(snap.player) !== null;

  return (
    <ReduceMotionContext.Provider value={reduce}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        {!immersive && <Header />}
        {snap.status === "ready" && snap.saveError && (
          <View style={{ paddingHorizontal: GUTTER, paddingTop: 8 }}>
            <Notice tone="warning">{snap.saveError}</Notice>
          </View>
        )}
        <View style={{ flex: 1 }}>{body}</View>
        {!immersive && !keyboardOpen && <TabBar questLive={questLive} />}
      </View>
    </ReduceMotionContext.Provider>
  );
}


const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUTTER,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  wordmark: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 40 },
  name: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
  settings: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, minHeight: 38 },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, paddingTop: 0 },
  tab: { flex: 1, alignItems: "center", gap: 3, paddingBottom: 2 },
  tabMark: { height: 3, alignSelf: "stretch", marginBottom: 6 },
  tabLabel: { fontFamily: fonts.uiMedium, fontSize: 10.5, letterSpacing: 0.4 },
  live: { position: "absolute", right: -4, top: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.surface },
});

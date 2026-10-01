import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { T } from "./T";
import { colors, hueSet } from "./theme";
import { useReduceMotion } from "./motion";
import type { Hue } from "@/domain/content-types";

/** Contextual loading: a route being drawn, not a spinner. */
export function Surveying({ label = "Şehir haritalanıyor" }: { label?: string }) {
  const reduce = useReduceMotion();
  const w = useState(() => new Animated.Value(reduce ? 1 : 0))[0];
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.timing(w, { toValue: 1, duration: 1400, easing: Easing.bezier(0.65, 0, 0.35, 1), useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [w, reduce]);
  return (
    <View style={styles.surveying} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={styles.track}>
        <Animated.View style={[styles.route, { width: w.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
      </View>
      <T v="label" secondary>
        {label}…
      </T>
    </View>
  );
}

/** Honest error: narrative headline, plain explanation, a way forward. */
export function ErrorPanel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <T v="label" color={colors.danger}>
        Bir şeyler ters gitti
      </T>
      <T v="h2">{title}</T>
      <View style={{ gap: 8 }}>{typeof children === "string" ? <T secondary>{children}</T> : children}</View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  return (
    <View style={[styles.notice, tone === "warning" && styles.warning]} accessibilityRole={tone === "warning" ? "alert" : "text"}>
      {typeof children === "string" ? <T v="bodySm">{children}</T> : children}
    </View>
  );
}

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <T v="h2">{title}</T>
      {typeof children === "string" ? <T secondary>{children}</T> : children}
      {action ? <View style={styles.actions}>{action}</View> : null}
    </View>
  );
}

/** Campaign progress as survey ticks: one mark per quest, filled when completed. */
export function Ticks({ done, total, tone, label }: { done: number; total: number; tone?: Hue; label: string }) {
  const hue = hueSet(tone);
  return (
    <View style={styles.ticks} accessibilityRole="image" accessibilityLabel={`${label}: ${total} görevden ${done} tanesi tamamlandı`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.tick, { borderColor: hue.deep }, i < done && { backgroundColor: hue.base, borderColor: hue.base }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  surveying: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 32, minHeight: 240 },
  track: { width: 120, height: 3, backgroundColor: colors.border },
  route: { height: 3, backgroundColor: colors.accent },
  error: { gap: 12, padding: 20, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.surface },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 },
  notice: { padding: 14, borderLeftWidth: 3, borderLeftColor: colors.borderStrong, backgroundColor: colors.surface },
  warning: { borderLeftColor: colors.warning, backgroundColor: "#f7ecd6" },
  empty: { gap: 12, paddingVertical: 24 },
  ticks: { flexDirection: "row", gap: 3 },
  tick: { width: 8, height: 8, borderWidth: 1 },
});

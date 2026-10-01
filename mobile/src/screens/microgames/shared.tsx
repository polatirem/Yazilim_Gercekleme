import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, useHue } from "@/ui/theme";
import { useReduceMotion } from "@/ui/motion";

/** A bar that empties over `durationMs`: the only clock a micro-game ever shows. */
export function Drain({ durationMs, style }: { durationMs: number; style?: StyleProp<ViewStyle> }) {
  const hue = useHue();
  const reduce = useReduceMotion();
  const v = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    v.setValue(1);
    const a = Animated.timing(v, { toValue: 0, duration: durationMs, easing: Easing.linear, useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [v, durationMs]);
  return (
    <View style={[styles.track, style]}>
      <Animated.View
        style={[styles.fill, { backgroundColor: hue.base, width: reduce ? "100%" : v.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]}
      />
    </View>
  );
}

/** The framed area a micro-game plays out in. */
export function Stage({ children, live, style }: { children: ReactNode; live?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.stage, live && styles.live, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  track: { height: 4, backgroundColor: colors.border, overflow: "hidden" },
  fill: { height: 4 },
  stage: { gap: 16, padding: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "flex-start" },
  live: { alignItems: "center", backgroundColor: colors.surfaceElevated, borderColor: colors.borderStrong },
});

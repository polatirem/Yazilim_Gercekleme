import { forwardRef, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import type { Hue } from "@/domain/content-types";
import { T } from "./T";
import { colors, GUTTER, HueContext, useHue } from "./theme";

/** A scrolling page with the standard gutter. Keyboard-safe on both platforms. */
export const Screen = forwardRef<ScrollView, { children: ReactNode; hue?: Hue | null; dark?: boolean; contentStyle?: StyleProp<ViewStyle>; padded?: boolean }>(
  function Screen({ children, hue, dark, contentStyle, padded = true }, ref) {
    const body = (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={ref}
          style={{ flex: 1, backgroundColor: dark ? colors.nightBackground : colors.background }}
          contentContainerStyle={[padded && styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
    return hue !== undefined ? <HueContext.Provider value={hue}>{body}</HueContext.Provider> : body;
  },
);

/** Inline text link. */
export function Link({ children, onPress, color, style, v = "body" }: { children: ReactNode; onPress: () => void; color?: string; style?: StyleProp<TextStyle>; v?: "body" | "bodySm" | "caption" | "data" }) {
  const hue = useHue();
  return (
    <T v={v} accessibilityRole="link" onPress={onPress} suppressHighlighting={false} color={color ?? hue.deep} style={[{ textDecorationLine: "underline" }, style]}>
      {children}
    </T>
  );
}

/** A whole row that navigates somewhere. */
export function RowLink({ children, onPress, style, label }: { children: ReactNode; onPress: () => void; style?: StyleProp<ViewStyle>; label?: string }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [style, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

export function Rule({ color = colors.border, style }: { color?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: GUTTER, paddingTop: 20, paddingBottom: 48, gap: 20 },
});

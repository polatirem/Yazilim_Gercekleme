import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Icon, type IconName } from "./Icon";
import { colors, CONTROL_HEIGHT, CONTROL_HEIGHT_LG, fonts, radius, useHue } from "./theme";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "inverse";

/**
 * Primary takes the colour of the section it sits in (HueContext), ink otherwise.
 * Labels are uppercase, tracked — the same voice as the web buttons.
 */
export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconPosition = "end",
  block,
  disabled,
  onPress,
  children,
  style,
  accessibilityLabel,
}: {
  variant?: ButtonVariant;
  size?: "md" | "lg";
  icon?: IconName;
  iconPosition?: "start" | "end";
  block?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const hue = useHue();
  const lg = size === "lg";

  const look: Record<ButtonVariant, { bg: string; fg: string; border: string; shadow?: string }> = {
    primary: { bg: hue.deep, fg: colors.textInverse, border: hue.deep, shadow: hue.base },
    secondary: { bg: colors.surface, fg: hue.deep, border: hue.deep },
    quiet: { bg: "transparent", fg: colors.textSecondary, border: "transparent" },
    danger: { bg: "transparent", fg: colors.danger, border: colors.danger },
    inverse: { bg: colors.nightText, fg: colors.nightBackground, border: colors.nightText },
  };
  const l = look[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={variant === "quiet" ? 6 : 0}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: lg ? CONTROL_HEIGHT_LG : CONTROL_HEIGHT,
          paddingHorizontal: variant === "quiet" ? 10 : lg ? 26 : 20,
          backgroundColor: pressed && variant === "secondary" ? hue.wash : pressed && variant === "danger" ? "#f6e0da" : l.bg,
          borderColor: l.border,
          opacity: disabled ? 0.45 : 1,
          transform: pressed && !disabled ? [{ translateY: 2 }] : [],
        },
        l.shadow && !pressed ? { borderBottomWidth: 4, borderBottomColor: l.shadow } : null,
        l.shadow && pressed ? { borderBottomWidth: 2, borderBottomColor: l.shadow } : null,
        block ? styles.block : styles.inline,
        style,
      ]}
    >
      {variant === "primary" && <View style={[styles.signal, { backgroundColor: hue.base }]} />}
      {icon && iconPosition === "start" && <Icon name={icon} size={18} color={l.fg} />}
      <Text
        style={[
          styles.label,
          { color: l.fg, fontSize: lg ? 15 : 13.5, letterSpacing: lg ? 1.2 : 0.9 },
          variant === "quiet" && styles.quietLabel,
        ]}
        numberOfLines={2}
      >
        {children}
      </Text>
      {icon && iconPosition === "end" && <Icon name={icon} size={18} color={l.fg} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: radius.s,
  },
  inline: { alignSelf: "flex-start" },
  block: { alignSelf: "stretch" },
  signal: { width: 8, height: 8 },
  label: {
    fontFamily: fonts.uiMedium,
    textTransform: "uppercase",
    textAlign: "center",
    flexShrink: 1,
  },
  quietLabel: {
    textTransform: "none",
    letterSpacing: 0,
    fontFamily: fonts.ui,
    fontSize: 15,
    textDecorationLine: "underline",
    textDecorationColor: colors.border,
  },
});

/** A row of actions that wraps on narrow screens. */
export function Actions({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "center" }, style]}>{children}</View>;
}

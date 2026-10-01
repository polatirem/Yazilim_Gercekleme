import type { ReactNode } from "react";
import { Text, type StyleProp, type TextProps, type TextStyle } from "react-native";
import { colors, type as typeRoles, type TypeRole } from "./theme";

/** Typography: one component, the same type roles as the web app (t-display, t-label…). */
export function T({
  v = "body",
  color,
  muted,
  secondary,
  italic,
  center,
  style,
  children,
  ...rest
}: {
  v?: TypeRole;
  color?: string;
  muted?: boolean;
  secondary?: boolean;
  italic?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
} & Omit<TextProps, "style">) {
  const base = typeRoles[v];
  const tone = color ?? (muted || v === "caption" ? colors.textMuted : secondary ? colors.textSecondary : colors.text);
  return (
    <Text
      {...rest}
      style={[base, { color: tone }, italic && typeRoles.italic, center && { textAlign: "center" }, style]}
    >
      {children}
    </Text>
  );
}

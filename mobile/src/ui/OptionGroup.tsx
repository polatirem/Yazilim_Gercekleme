import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon, type IconName } from "./Icon";
import { T } from "./T";
import { colors, fonts, useHue } from "./theme";

export interface Option<V extends string | number> {
  value: V;
  label: string;
  hint?: string;
  icon?: IconName;
}

/**
 * A radio group drawn as architectural tiles: a grid ruled with ink lines,
 * the chosen tile filled with the section's deep colour.
 */
export function OptionGroup<V extends string | number>({
  legend,
  description,
  options,
  value,
  onChange,
  columns = 2,
  size = "md",
  legendAs = "label",
}: {
  legend: ReactNode;
  description?: ReactNode;
  options: Option<V>[];
  value: V | null;
  onChange: (value: V) => void;
  /** "row" keeps every option on one line (e.g. a 1–5 scale). */
  columns?: "row" | 1 | 2 | 3 | 4;
  size?: "md" | "lg";
  legendAs?: "label" | "prompt";
}) {
  const hue = useHue();
  const perRow = columns === "row" ? options.length : columns;
  const rows: Option<V>[][] = [];
  for (let i = 0; i < options.length; i += perRow) rows.push(options.slice(i, i + perRow));

  return (
    <View accessibilityRole="radiogroup">
      {legendAs === "prompt" ? (
        <T v="h1" style={styles.prompt}>
          {legend}
        </T>
      ) : (
        <T v="label" secondary style={styles.legend}>
          {legend}
        </T>
      )}
      {description ? (
        <T v="bodySm" muted style={styles.description}>
          {description}
        </T>
      ) : null}
      <View style={styles.grid}>
        {rows.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((o) => {
              const on = value === o.value;
              return (
                <Pressable
                  key={String(o.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={o.hint ? `${o.label}, ${o.hint}` : o.label}
                  onPress={() => onChange(o.value)}
                  style={({ pressed }) => [
                    styles.option,
                    { minHeight: size === "lg" ? 74 : columns === "row" ? 58 : 54 },
                    columns === "row" && styles.optionRow,
                    { backgroundColor: on ? hue.deep : pressed ? hue.wash : colors.surface },
                  ]}
                >
                  {o.icon && <Icon name={o.icon} size={22} color={on ? colors.textInverse : hue.deep === colors.text ? colors.textSecondary : hue.deep} />}
                  <T style={[styles.label, columns === "row" && { textAlign: "center" }]} color={on ? colors.textInverse : colors.text}>
                    {o.label}
                  </T>
                  {o.hint ? (
                    <T v="caption" color={on ? colors.textInverse : colors.textMuted} style={columns === "row" ? { textAlign: "center", fontSize: 11, lineHeight: 14 } : null}>
                      {o.hint}
                    </T>
                  ) : null}
                </Pressable>
              );
            })}
            {row.length < perRow && Array.from({ length: perRow - row.length }, (_, k) => <View key={`pad${k}`} style={[styles.option, styles.pad]} />)}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: { marginBottom: 20 },
  legend: { marginBottom: 12 },
  description: { marginTop: -6, marginBottom: 12 },
  grid: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: colors.borderStrong },
  row: { flexDirection: "row" },
  option: {
    flex: 1,
    minWidth: 0,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
    gap: 4,
  },
  optionRow: { paddingHorizontal: 4, alignItems: "center" },
  pad: { backgroundColor: colors.surfaceSunken },
  label: { fontFamily: fonts.uiMedium, fontSize: 15, lineHeight: 20 },
});

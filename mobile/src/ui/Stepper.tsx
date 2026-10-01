import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Icon } from "./Icon";
import { T } from "./T";
import { colors, fonts, useHue } from "./theme";

/** Large numeric input with −/+ controls. The number itself stays editable. */
export function Stepper({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  const hue = useHue();
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const round = (v: number) => Math.round(v / step) * step;
  const [draft, setDraft] = useState(String(value).replace(".", ","));
  const [shown, setShown] = useState(value);
  // When the value changes from outside (−/+), show it; typed drafts stay as typed.
  if (shown !== value) {
    setShown(value);
    if (Number(draft.replace(",", ".")) !== value) setDraft(String(value).replace(".", ","));
  }

  const commit = (text: string) => {
    const v = Number(text.replace(",", "."));
    const next = text.trim() !== "" && Number.isFinite(v) ? clamp(v) : value;
    setDraft(String(next).replace(".", ","));
    if (next !== value) onChange(next);
  };

  const control = (dir: -1 | 1) => {
    const disabled = dir < 0 ? value <= min : value >= max;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} — ${dir < 0 ? "azalt" : "artır"}`}
        disabled={disabled}
        onPress={() => onChange(clamp(round(Number((value + dir * step).toFixed(4)))))}
        style={({ pressed }) => [styles.control, { opacity: disabled ? 0.35 : 1, backgroundColor: pressed ? hue.wash : colors.surface }]}
      >
        <Icon name={dir < 0 ? "minus" : "plus"} size={24} />
      </Pressable>
    );
  };

  return (
    <View>
      <T v="h1" style={styles.label}>
        {label}
      </T>
      {hint ? (
        <T v="bodySm" muted style={styles.hint}>
          {hint}
        </T>
      ) : null}
      <View style={styles.row}>
        {control(-1)}
        <View style={styles.field}>
          <TextInput
            accessibilityLabel={label}
            style={[styles.input, { color: colors.text }]}
            keyboardType="decimal-pad"
            value={draft}
            onChangeText={(text) => {
              setDraft(text);
              // Pass valid in-range values on immediately: a submit tapped while the
              // keyboard is still open must see what was typed.
              const v = Number(text.replace(",", "."));
              if (text.trim() !== "" && Number.isFinite(v) && v >= min && v <= max) onChange(v);
            }}
            onEndEditing={(e) => commit(e.nativeEvent.text)}
            onSubmitEditing={(e) => commit(e.nativeEvent.text)}
            selectTextOnFocus
            returnKeyType="done"
          />
          {unit ? (
            <T v="data" muted style={styles.unit}>
              {unit}
            </T>
          ) : null}
        </View>
        {control(1)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8 },
  hint: { marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "stretch", borderWidth: 1, borderColor: colors.borderStrong, marginTop: 8 },
  control: { width: 64, alignItems: "center", justifyContent: "center" },
  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 6,
    gap: 6,
  },
  input: { fontFamily: fonts.display, fontSize: 52, lineHeight: 62, minWidth: 60, textAlign: "center", padding: 0 },
  unit: { fontSize: 15 },
});

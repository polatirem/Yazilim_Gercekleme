/** Prompt-style steps: narrative, estimate, actual, choice, count, scale, list, item-check, text, twist. */
import { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { CONTENT } from "@/content";
import { measuredValue } from "@/domain/game";
import { formatValue } from "@/domain/refs";
import { Actions, Button } from "@/ui/Button";
import { Enter } from "@/ui/motion";
import { OptionGroup } from "@/ui/OptionGroup";
import { Sigil } from "@/ui/Sigil";
import { Stepper } from "@/ui/Stepper";
import { T } from "@/ui/T";
import { colors, fonts, useHue } from "@/ui/theme";
import { nowMs, type StepProps } from "./types";

const UNIT_LABEL = { min: "dk", sec: "sn", count: "" } as const;

/** Latency is measured from when the step first rendered. */
function useStartTime() {
  const [start] = useState(nowMs);
  return () => Math.round(nowMs() - start);
}

export function NarrativeStep({ step, submit }: StepProps<"narrative">) {
  const npc = step.speaker ? CONTENT.npcById.get(step.speaker) : undefined;
  const hue = useHue();
  return (
    <View style={styles.step}>
      <View style={npc ? styles.narrative : undefined}>
        {npc && <Sigil sigil={npc.sigil} size={48} color={hue.deep} />}
        <View style={styles.lines}>
          {step.lines.map((line, i) => (
            <Enter key={line} i={i + 1}>
              <T v="h2">{line}</T>
            </Enter>
          ))}
          {npc && <T v="label" muted>{npc.name}</T>}
        </View>
      </View>
      <Button variant="primary" icon="arrow-right" onPress={() => submit({})}>
        Devam
      </Button>
    </View>
  );
}

export function EstimateStep({ step, attempt, submit }: StepProps<"estimate">) {
  const anchor = step.anchor ? step.anchor.values[attempt.seed % 2] : null;
  const [anchorAnswer, setAnchorAnswer] = useState<"more" | "less" | null>(null);
  const [value, setValue] = useState(step.initial);
  const elapsed = useStartTime();
  const unit = UNIT_LABEL[step.unit];

  if (step.anchor && anchor !== null && anchorAnswer === null) {
    return (
      <View style={styles.step}>
        <T v="h1">{step.anchor.prompt.replace("{anchor}", String(anchor))}</T>
        <Actions>
          {(["less", "more"] as const).map((a) => (
            <Button key={a} variant="secondary" size="lg" onPress={() => setAnchorAnswer(a)}>
              {a === "less" ? "Daha kısa" : "Daha uzun"}
            </Button>
          ))}
        </Actions>
      </View>
    );
  }

  return (
    <View style={styles.step}>
      <Stepper label={step.prompt} hint="Bir tahmin, söz değil. Yanlış cevap yok." value={value} onChange={setValue} min={step.min} max={step.max} step={step.step} unit={unit} />
      <Button variant="primary" icon="arrow-right" onPress={() => submit({ value, anchor, anchorAnswer, latencyMs: elapsed() })}>
        {`Kilitle: ${String(value).replace(".", ",")}${unit ? ` ${unit}` : ""}`}
      </Button>
    </View>
  );
}

export function ActualStep({ step, attempt, submit }: StepProps<"actual">) {
  const measured = measuredValue(step, attempt.answers);
  const [value, setValue] = useState<number>(measured ?? step.min);
  const unit = UNIT_LABEL[step.unit];
  return (
    <View style={styles.step}>
      {measured !== null && (
        <View style={styles.measured}>
          <T v="label" muted>
            Ölçülen
          </T>
          <T v="data">{formatValue(measured, step.unit === "min" ? "min" : step.unit === "sec" ? "duration" : "count")}</T>
        </View>
      )}
      <Stepper label={step.prompt} value={value} onChange={setValue} min={step.min} max={step.max} step={step.unit === "min" ? 0.5 : step.step} unit={unit} />
      <Button variant="primary" icon="arrow-right" onPress={() => submit({ value, measured, corrected: measured !== null && value !== measured })}>
        {measured !== null && value === measured ? "Doğru" : "Devam"}
      </Button>
    </View>
  );
}

export function ChoiceStep({ step, submit, track }: StepProps<"choice">) {
  const [selected, setSelected] = useState<string | null>(null);
  const changes = useRef(0);
  const elapsed = useStartTime();
  return (
    <View style={styles.step}>
      <OptionGroup
        legend={step.prompt}
        legendAs="prompt"
        options={step.options.map((o) => ({ value: o.id, label: o.label, hint: o.hint }))}
        value={selected}
        columns={step.columns === 1 || step.options.some((o) => o.label.length > 22) ? 1 : 2}
        onChange={(v) => {
          if (selected !== null && selected !== v && step.role === "decision") {
            changes.current++;
            track({ type: "decision_changed", stepId: step.id, interaction: "choice", value: { from: selected, to: v }, responseTimeMs: elapsed() });
          }
          setSelected(v);
        }}
      />
      <Button
        variant="primary"
        icon="arrow-right"
        disabled={!selected}
        onPress={() => {
          const option = step.options.find((o) => o.id === selected);
          if (!option) return;
          const ms = elapsed();
          submit({ optionId: option.id, label: option.label, latencyMs: ms, changes: changes.current }, ms);
        }}
      >
        {step.role === "decision" ? "Seç" : "Devam"}
      </Button>
    </View>
  );
}

export function CountStep({ step, submit }: StepProps<"count">) {
  const [value, setValue] = useState(step.initial);
  return (
    <View style={styles.step}>
      <Stepper label={step.prompt} hint={step.hint} value={value} onChange={(v) => setValue(Math.round(v))} min={step.min} max={step.max} />
      <Button variant="primary" icon="arrow-right" onPress={() => submit({ value })}>
        Devam
      </Button>
    </View>
  );
}

export function ScaleStep({ step, submit }: StepProps<"scale">) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <View style={styles.step}>
      <OptionGroup
        legend={step.prompt}
        legendAs="prompt"
        options={Array.from({ length: step.points }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
        value={value}
        onChange={setValue}
        columns="row"
      />
      <View style={styles.scaleEnds}>
        <T v="caption" style={{ flex: 1 }}>
          1 — {step.lowLabel}
        </T>
        <T v="caption" style={{ flex: 1, textAlign: "right" }}>
          {step.highLabel} — {step.points}
        </T>
      </View>
      <Button variant="primary" icon="arrow-right" disabled={value === null} onPress={() => value !== null && submit({ value })}>
        Devam
      </Button>
    </View>
  );
}

export function ListStep({ step, submit }: StepProps<"list">) {
  const [items, setItems] = useState<string[]>(() => Array.from({ length: step.slots }, () => ""));
  const inputs = useRef<(TextInput | null)[]>([]);
  const filled = items.filter((i) => i.trim()).length;
  return (
    <View style={styles.step}>
      <View style={{ gap: 8 }}>
        <T v="h1">{step.prompt}</T>
        {step.hint ? <T secondary>{step.hint}</T> : null}
      </View>
      <View style={styles.list}>
        {items.map((item, i) => (
          <View key={i} style={styles.slot}>
            <T v="data" muted style={styles.slotNumber}>
              {i + 1}
            </T>
            <TextInput
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={item}
              placeholder={i === 0 ? step.placeholder : ""}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={`${step.prompt} — ${i + 1}. madde${i < step.required ? " (gerekli)" : " (isteğe bağlı)"}`}
              maxLength={120}
              style={styles.slotInput}
              returnKeyType={i < items.length - 1 ? "next" : "done"}
              submitBehavior={i < items.length - 1 ? "submit" : "blurAndSubmit"}
              onSubmitEditing={() => inputs.current[i + 1]?.focus()}
              onChangeText={(text) => setItems((prev) => prev.map((p, j) => (j === i ? text : p)))}
            />
          </View>
        ))}
      </View>
      <T v="caption">Yalnızca bu cihazda kalır. Kısa notlar yeterli.</T>
      <Actions>
        <Button variant="primary" icon="arrow-right" disabled={filled < step.required} onPress={() => filled >= step.required && submit({ items })}>
          {filled < step.required ? `${step.required - filled} tane daha` : "Devam"}
        </Button>
        {step.required === 0 && filled === 0 && <T v="caption">Hiç yazmamak da olur.</T>}
      </Actions>
    </View>
  );
}

export function ItemCheckStep({ step, attempt, submit }: StepProps<"item-check">) {
  const hue = useHue();
  const source = ((attempt.answers[step.source]?.items as string[] | undefined) ?? []).filter(Boolean);
  const [marks, setMarks] = useState<(string | null)[]>(() => source.map(() => null));
  const done = marks.every(Boolean);
  return (
    <View style={styles.step}>
      <T v="h1">{step.prompt}</T>
      <View style={{ gap: 14 }}>
        {source.map((item, i) => (
          <View key={i} style={styles.checkRow} accessibilityRole="radiogroup" accessibilityLabel={item}>
            <T style={{ fontFamily: fonts.uiMedium }}>{item}</T>
            <View style={styles.segmented}>
              {step.options.map((o, k) => {
                const on = marks[i] === o.id;
                return (
                  <Pressable
                    key={o.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => setMarks((m) => m.map((x, j) => (j === i ? o.id : x)))}
                    style={[styles.segment, k > 0 && { borderLeftWidth: 1 }, { backgroundColor: on ? hue.deep : colors.surface }]}
                  >
                    <T v="bodySm" center color={on ? colors.textInverse : colors.text}>
                      {o.label}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </View>
      <Button
        variant="primary"
        icon="arrow-right"
        disabled={!done}
        onPress={() => {
          if (!done) return;
          const counts = Object.fromEntries(step.options.map((o) => [o.id, marks.filter((m) => m === o.id).length]));
          submit({ marks, counts });
        }}
      >
        Devam
      </Button>
    </View>
  );
}

export function TextStep({ step, submit }: StepProps<"text">) {
  const [text, setText] = useState("");
  return (
    <View style={styles.step}>
      <T v="h1">{step.prompt}</T>
      {step.hint ? <T secondary>{step.hint}</T> : null}
      <TextInput accessibilityLabel={step.prompt} style={styles.textInput} value={text} maxLength={200} onChangeText={setText} multiline />
      <T v="caption">Yalnızca bu cihazda kalır.</T>
      <Button variant="primary" icon="arrow-right" disabled={!step.optional && !text.trim()} onPress={() => submit({ text: text.trim() })}>
        {text.trim() || !step.optional ? "Devam" : "Bunu geç"}
      </Button>
    </View>
  );
}

export function TwistStep({ step, submit }: StepProps<"twist">) {
  const hue = useHue();
  return (
    <View style={styles.step}>
      <Enter kind="unfold">
        <View style={[styles.twist, { backgroundColor: colors.nightBackground, borderLeftColor: hue.base }]} accessibilityRole="alert">
          <T v="label" color={hue.base === colors.accent ? colors.accent : hue.base}>
            Sürpriz
          </T>
          <T v="hero" color={colors.nightText}>
            {step.title}
          </T>
          <T v="bodyLg" color={colors.nightText}>
            {step.body}
          </T>
        </View>
      </Enter>
      <Button variant="primary" icon="arrow-right" onPress={() => submit({})}>
        Yeniden planla
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { gap: 24 },
  narrative: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  lines: { flex: 1, gap: 14 },
  measured: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.surfaceSunken },
  scaleEnds: { flexDirection: "row", gap: 12, marginTop: -12 },
  list: { borderTopWidth: 1, borderColor: colors.borderStrong },
  slot: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: colors.border, minHeight: 52 },
  slotNumber: { width: 28 },
  slotInput: { flex: 1, fontFamily: fonts.ui, fontSize: 17, color: colors.text, paddingVertical: 12 },
  checkRow: { gap: 8 },
  segmented: { flexDirection: "row", borderWidth: 1, borderColor: colors.borderStrong },
  segment: { flex: 1, minHeight: 46, justifyContent: "center", paddingHorizontal: 6, borderColor: colors.borderStrong },
  textInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceElevated,
    padding: 12,
    fontFamily: fonts.ui,
    fontSize: 17,
    color: colors.text,
    textAlignVertical: "top",
  },
  twist: { padding: 20, gap: 12, borderLeftWidth: 4 },
});

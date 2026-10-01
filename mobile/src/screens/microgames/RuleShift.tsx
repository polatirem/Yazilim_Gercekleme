/** RULE SHIFT engine — respond by a rule that changes with little warning. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { RULES, generateTrials, scoreRuleShift, type Side, type TrialResponse } from "@/domain/engines/rule-shift";
import type { RuleShiftResult } from "@/domain/player-types";
import { stepSeed } from "@/domain/random";
import { formatValue } from "@/domain/refs";
import { Button } from "@/ui/Button";
import { Glyph } from "@/ui/Glyph";
import { T } from "@/ui/T";
import { colors, fonts, useHue } from "@/ui/theme";
import { nowMs, type StepProps } from "@/screens/steps/types";
import { Stage } from "./shared";

const ITI_MS = 350;

export function RuleShift({ step, attempt, submit }: StepProps<"rule-shift">) {
  const hue = useHue();
  const trials = useMemo(() => generateTrials(step, stepSeed(attempt.seed, step.id)), [step, attempt.seed]);
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState<RuleShiftResult | null>(null);
  const shownAt = useRef(0);
  const responses = useRef<TrialResponse[]>([]);

  useEffect(() => {
    if (phase !== "running" || visible) return;
    const t = setTimeout(
      () => {
        shownAt.current = nowMs();
        setVisible(true);
      },
      index === 0 ? 700 : ITI_MS,
    );
    return () => clearTimeout(t);
  }, [phase, index, visible]);

  const respond = useCallback(
    (answer: Side) => {
      if (phase !== "running" || !visible) return;
      responses.current.push({ answer, rtMs: Math.round(nowMs() - shownAt.current) });
      setVisible(false);
      if (index + 1 < trials.length) setIndex((i) => i + 1);
      else {
        setResult(scoreRuleShift(trials, responses.current));
        setPhase("done");
      }
    },
    [phase, visible, index, trials],
  );

  const trial = trials[index];
  const rule = RULES[trial.rule];

  if (phase === "intro") {
    return (
      <View style={styles.game}>
        <T v="h2">{step.instruction}</T>
        <View style={styles.rules}>
          {step.rules.map((r) => (
            <View key={r} style={styles.ruleRow}>
              <T v="label" color={hue.deep}>
                {RULES[r].name}
              </T>
              <T>{RULES[r].instruction}</T>
            </View>
          ))}
        </View>
        <T v="caption">Alttaki iki düğmeyle cevap ver. Hız biraz önemli; doğru olmak daha önemli.</T>
        <Button variant="primary" onPress={() => setPhase("running")}>
          {`Başla — ${trials.length} işaret`}
        </Button>
      </View>
    );
  }

  if (phase === "done" && result) {
    return (
      <Stage>
        <T v="h2">
          {result.switchCostMs > 60 ? `Her kural değişimi ilk anda sana yaklaşık ${formatValue(result.switchCostMs, "ms")} kaybettirdi.` : "Kural değişimleri seni pek yavaşlatmadı."}
        </T>
        <T secondary>
          {result.trials} işaretten {result.correct} tanesi doğru ayrıldı.
        </T>
        <Button variant="primary" icon="arrow-right" onPress={() => submit(result as unknown as Record<string, unknown>)}>
          Devam
        </Button>
      </Stage>
    );
  }

  const glyph = { shape: trial.stimulus.shape, fill: trial.stimulus.fill, gap: false } as const;
  return (
    <View style={styles.game}>
      <View
        key={`${trial.rule}-${trial.isSwitch ? index : "run"}`}
        style={[styles.banner, trial.isSwitch ? { backgroundColor: hue.base, borderColor: hue.base } : { borderColor: colors.borderStrong }]}
        accessibilityLiveRegion="assertive"
      >
        <T v="label" color={trial.isSwitch ? colors.textInverse : colors.textMuted}>
          {trial.isSwitch ? "Kural değişti" : "Kural"}
        </T>
        <T v="h2" color={trial.isSwitch ? colors.textInverse : colors.text}>
          {rule.instruction}
        </T>
      </View>
      <View style={styles.arena}>
        <View style={[styles.half, { borderRightWidth: 1 }]}>{visible && trial.stimulus.side === "left" && <Glyph glyph={glyph} size={88} />}</View>
        <View style={styles.half}>{visible && trial.stimulus.side === "right" && <Glyph glyph={glyph} size={88} />}</View>
      </View>
      <View style={styles.responses}>
        {(["left", "right"] as const).map((side) => (
          <Pressable
            key={side}
            accessibilityRole="button"
            accessibilityLabel={side === "left" ? rule.left : rule.right}
            onPress={() => respond(side)}
            style={({ pressed }) => [styles.response, { backgroundColor: pressed ? hue.wash : colors.surface }]}
          >
            <T style={{ fontFamily: fonts.uiMedium, fontSize: 17 }} center>
              {side === "left" ? `← ${rule.left}` : `${rule.right} →`}
            </T>
          </Pressable>
        ))}
      </View>
      <T v="data" muted center>
        {index + 1} / {trials.length}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  game: { gap: 18 },
  rules: { borderTopWidth: 1, borderColor: colors.borderStrong },
  ruleRow: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border, gap: 4 },
  banner: { padding: 14, borderWidth: 1, gap: 4 },
  arena: { flexDirection: "row", height: 180, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceElevated },
  half: { flex: 1, alignItems: "center", justifyContent: "center", borderColor: colors.border },
  responses: { flexDirection: "row", gap: 10 },
  response: { flex: 1, minHeight: 72, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.borderStrong },
});

/** SIGNAL FILTER engine — find the targets among near-identical lures, against a short clock. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { generateRound, scoreFilter, type RoundResponse } from "@/domain/engines/signal-filter";
import type { SignalFilterResult } from "@/domain/player-types";
import { stepSeed } from "@/domain/random";
import { trLower } from "@/domain/text";
import { Button } from "@/ui/Button";
import { Glyph, describeGlyph } from "@/ui/Glyph";
import { T } from "@/ui/T";
import { colors, useHue } from "@/ui/theme";
import { nowMs, type StepProps } from "@/screens/steps/types";
import { Drain, Stage } from "./shared";

export function SignalFilter({ step, attempt, submit }: StepProps<"signal-filter">) {
  const hue = useHue();
  const seed = stepSeed(attempt.seed, step.id);
  const [phase, setPhase] = useState<"ready" | "round" | "done">("ready");
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<SignalFilterResult | null>(null);
  const responses = useRef<RoundResponse[]>([]);
  const roundStart = useRef(0);
  const cells = useMemo(() => generateRound(step, seed, round), [step, seed, round]);
  const target = { shape: step.target.shape ?? "circle", fill: step.target.fill ?? "open", gap: step.target.gap ?? false } as const;

  const endRound = useCallback(() => {
    responses.current.push({
      targets: cells.map((c, i) => (c.isTarget ? i : -1)).filter((i) => i >= 0),
      selected,
      ms: Math.round(nowMs() - roundStart.current),
    });
    setSelected([]);
    if (round + 1 < step.rounds) setRound((r) => r + 1);
    else {
      setResult(scoreFilter(responses.current));
      setPhase("done");
    }
  }, [cells, selected, round, step.rounds]);

  // The timer must call the latest endRound (it closes over the current selection).
  const endRef = useRef(endRound);
  useEffect(() => {
    endRef.current = endRound;
  });

  useEffect(() => {
    if (phase !== "round") return;
    roundStart.current = nowMs();
    const t = setTimeout(() => endRef.current(), step.secondsPerRound * 1000);
    return () => clearTimeout(t);
  }, [phase, round, step.secondsPerRound]);

  const rows: number[][] = [];
  for (let i = 0; i < cells.length; i += step.cols) rows.push(Array.from({ length: Math.min(step.cols, cells.length - i) }, (_, k) => i + k));

  return (
    <View style={styles.game}>
      <T v="h2">{step.instruction}</T>
      <View style={styles.targetKey}>
        <T v="label" muted>
          Aranan
        </T>
        <Glyph glyph={target} size={32} color={hue.deep} />
        <T>{step.targetLabel}</T>
      </View>

      {phase === "ready" && (
        <Stage>
          <T v="bodyLg" secondary>
            {step.rounds} tur, her biri {step.secondsPerRound} saniye.
          </T>
          <Button variant="primary" onPress={() => setPhase("round")}>
            Başla
          </Button>
        </Stage>
      )}

      {phase === "round" && (
        <>
          <View style={styles.roundHead}>
            <T v="data">
              Tur {round + 1} / {step.rounds}
            </T>
            <T v="data" muted>
              {selected.length} işaretlendi
            </T>
          </View>
          <Drain key={round} durationMs={step.secondsPerRound * 1000} />
          <View style={styles.field} accessibilityLabel={`Tur ${round + 1}: her ${trLower(step.targetLabel)} işaretle`}>
            {rows.map((row, r) => (
              <View key={`${round}-${r}`} style={styles.row}>
                {row.map((i) => {
                  const on = selected.includes(i);
                  return (
                    <Pressable
                      key={i}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={describeGlyph(cells[i].glyph)}
                      onPress={() => setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))}
                      style={[styles.cell, on && { backgroundColor: hue.wash, borderColor: hue.deep, borderWidth: 2 }]}
                    >
                      <Glyph glyph={cells[i].glyph} rotation={cells[i].rotation} size={step.cols >= 7 ? 30 : 34} color={on ? hue.deep : colors.text} />
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
          <Button variant="secondary" onPress={endRound}>
            {round + 1 < step.rounds ? "Sonraki tur" : "Bitir"}
          </Button>
        </>
      )}

      {phase === "done" && result && (
        <Stage>
          <T v="h2">
            {result.targets} hedeften {result.hits} tanesi bulundu{result.falseAlarms ? `, ${result.falseAlarms} tanesi yanlışlıkla işaretlendi` : ""}.
          </T>
          <T secondary>Gözlerin ısındı. Öyle kalsınlar.</T>
          <Button variant="primary" icon="arrow-right" onPress={() => submit(result as unknown as Record<string, unknown>)}>
            Devam
          </Button>
        </Stage>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  game: { gap: 16 },
  targetKey: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, backgroundColor: colors.surfaceSunken, alignSelf: "flex-start" },
  roundHead: { flexDirection: "row", justifyContent: "space-between" },
  field: { gap: 4 },
  row: { flexDirection: "row", gap: 4 },
  cell: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
});

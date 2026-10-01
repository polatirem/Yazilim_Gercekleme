/** SEQUENCE RECALL engine — encode now, rebuild after the real world has had its turn. */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { SequenceItem, StepOf } from "@/domain/content-types";
import type { SequenceEncodeResult } from "@/domain/player-types";
import { generateEncoding, generateSceneChange, recallPalette, scoreOrder, scoreScene } from "@/domain/engines/sequence";
import { stepSeed } from "@/domain/random";
import { Actions, Button } from "@/ui/Button";
import { Glyph, describeGlyph } from "@/ui/Glyph";
import { Enter } from "@/ui/motion";
import { T } from "@/ui/T";
import { colors, fonts, useHue } from "@/ui/theme";
import type { StepProps } from "@/screens/steps/types";
import { Drain, Stage } from "./shared";

function Item({ item, size = 56, color }: { item: SequenceItem; size?: number; color?: string }) {
  return item.glyph ? (
    <Glyph glyph={item.glyph} size={size} color={color} />
  ) : (
    <T style={{ fontFamily: fonts.display, fontSize: size * 0.42, lineHeight: size * 0.5 }} color={color} center>
      {item.label}
    </T>
  );
}

/** Rows of equal cells; returns index-addressed cells like a CSS grid. */
function Grid<C>({ cells, cols, render }: { cells: C[]; cols: number; render: (cell: C, i: number) => ReactNode }) {
  const rows: number[][] = [];
  for (let i = 0; i < cells.length; i += cols) rows.push(Array.from({ length: Math.min(cols, cells.length - i) }, (_, k) => i + k));
  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.gridRow}>
          {row.map((i) => (
            <View key={i} style={styles.gridCell}>
              {render(cells[i], i)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function SequenceEncode({ step, attempt, submit }: StepProps<"sequence-encode">) {
  const hue = useHue();
  const encoding = useMemo(() => generateEncoding(step, stepSeed(attempt.seed, step.id)), [step, attempt.seed]);
  const [phase, setPhase] = useState<"ready" | "showing" | "done">("ready");
  const [index, setIndex] = useState(0);
  const byId = useMemo(() => new Map(step.pool.map((p) => [p.id, p])), [step.pool]);

  useEffect(() => {
    if (phase !== "showing") return;
    const t = setTimeout(() => {
      if (step.mode === "order" && index < encoding.items.length - 1) setIndex((i) => i + 1);
      else setPhase("done");
    }, step.displayMs);
    return () => clearTimeout(t);
  }, [phase, index, step.mode, step.displayMs, encoding.items.length]);

  const grid = step.grid ?? { cols: 4, rows: 3 };

  return (
    <View style={styles.game}>
      <T v="h2">{step.instruction}</T>

      {phase === "ready" && (
        <Stage>
          <T v="bodyLg" secondary>
            {step.mode === "order" ? `Art arda ${encoding.items.length} tane, birer birer. Gösterilirken hiçbir şeye basma.` : `${Math.round(step.displayMs / 1000)} saniyen olacak.`}
          </T>
          <Button variant="primary" icon="eye" onPress={() => setPhase("showing")}>
            Göster
          </Button>
        </Stage>
      )}

      {phase === "showing" && step.mode === "order" && (
        <Stage live style={{ minHeight: 280, justifyContent: "center" }}>
          <Enter key={index} kind="fade">
            <View style={{ alignItems: "center", gap: 12 }} accessibilityLiveRegion="assertive">
              <Item item={byId.get(encoding.items[index])!} size={120} color={hue.deep} />
              <T v="h2" center>
                {byId.get(encoding.items[index])!.label}
              </T>
            </View>
          </Enter>
          <View style={styles.pips}>
            {encoding.items.map((_, i) => (
              <View key={i} style={[styles.pip, i <= index && { backgroundColor: hue.base, borderColor: hue.base }]} />
            ))}
          </View>
        </Stage>
      )}

      {phase === "showing" && step.mode === "scene" && (
        <View style={{ gap: 10 }}>
          <Grid
            cells={encoding.cells}
            cols={grid.cols}
            render={(id, i) => (
              <View style={styles.sceneCell} accessibilityLabel={id ? `${i + 1}. konum: ${describeGlyph(byId.get(id)!.glyph!)}` : `${i + 1}. konum: boş`}>
                {id && <Item item={byId.get(id)!} size={42} />}
              </View>
            )}
          />
          <Drain durationMs={step.displayMs} />
        </View>
      )}

      {phase === "done" && (
        <Stage>
          <T v="h2">Aklında. Sonra lazım olacak.</T>
          <Button variant="primary" icon="arrow-right" onPress={() => submit(encoding as unknown as Record<string, unknown>)}>
            Devam
          </Button>
        </Stage>
      )}
    </View>
  );
}

function encodeStepFor(props: StepProps<"sequence-recall">): StepOf<"sequence-encode"> {
  return props.quest.prime.find((s) => s.id === props.step.source) as StepOf<"sequence-encode">;
}

export function SequenceRecall(props: StepProps<"sequence-recall">) {
  return props.step.mode === "order" ? <OrderRecall {...props} /> : <SceneChange {...props} />;
}

function OrderRecall(props: StepProps<"sequence-recall">) {
  const { step, attempt, submit } = props;
  const hue = useHue();
  const encodeStep = encodeStepFor(props);
  const encoding = attempt.answers[step.source] as unknown as SequenceEncodeResult;
  const palette = useMemo(() => recallPalette(encodeStep.pool, stepSeed(attempt.seed, step.id)), [encodeStep.pool, attempt.seed, step.id]);
  const byId = new Map(encodeStep.pool.map((p) => [p.id, p]));
  const [response, setResponse] = useState<string[]>([]);
  const total = encoding.items.length;
  const full = response.length >= total;

  return (
    <View style={styles.game}>
      <T v="h1">{step.prompt}</T>
      <View style={styles.slots} accessibilityLabel={`Senin dizin, ${total} yerden ${response.length} dolu`}>
        {Array.from({ length: total }, (_, i) => {
          const id = response[i];
          return (
            <View key={i} style={[styles.slotBox, id ? { borderColor: colors.borderStrong, backgroundColor: colors.surfaceElevated } : null, i === response.length && { borderColor: hue.base, borderWidth: 2 }]}>
              <T v="data" muted style={styles.slotNumber}>
                {i + 1}
              </T>
              {id ? <Item item={byId.get(id)!} size={34} /> : null}
            </View>
          );
        })}
      </View>
      <View style={styles.palette} accessibilityLabel="Sıradakini ekle">
        {palette.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={p.label}
            disabled={full}
            onPress={() => setResponse((r) => (r.length < total ? [...r, p.id] : r))}
            style={({ pressed }) => [styles.paletteButton, { opacity: full ? 0.4 : 1, backgroundColor: pressed ? hue.wash : colors.surface }]}
          >
            <Item item={p} size={32} />
            <T v="caption" color={colors.text} center numberOfLines={2}>
              {p.label}
            </T>
          </Pressable>
        ))}
      </View>
      <Actions>
        <Button variant="primary" icon="arrow-right" disabled={!full} onPress={() => submit(scoreOrder(encoding.items, response) as unknown as Record<string, unknown>)}>
          Sıra bu
        </Button>
        <Button variant="quiet" disabled={response.length === 0} onPress={() => setResponse((r) => r.slice(0, -1))}>
          Sonuncuyu geri al
        </Button>
      </Actions>
    </View>
  );
}

function SceneChange(props: StepProps<"sequence-recall">) {
  const { step, attempt, submit } = props;
  const hue = useHue();
  const encodeStep = encodeStepFor(props);
  const encoding = attempt.answers[step.source] as unknown as SequenceEncodeResult;
  const change = useMemo(
    () => generateSceneChange(encoding, encodeStep.pool, step.changes, stepSeed(attempt.seed, step.id)),
    [encoding, encodeStep.pool, step.changes, attempt.seed, step.id],
  );
  const byId = new Map(encodeStep.pool.map((p) => [p.id, p]));
  const [selected, setSelected] = useState<number[]>([]);
  const grid = encodeStep.grid ?? { cols: 4, rows: 3 };

  const toggle = (i: number) => setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : s.length >= step.changes ? [...s.slice(1), i] : [...s, i]));

  return (
    <View style={styles.game}>
      <T v="h1">{step.prompt}</T>
      <Grid
        cells={change.after}
        cols={grid.cols}
        render={(id, i) =>
          id ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selected.includes(i) }}
              accessibilityLabel={`${i + 1}. konum: ${describeGlyph(byId.get(id)!.glyph!)}`}
              onPress={() => toggle(i)}
              style={[styles.sceneCell, selected.includes(i) && { backgroundColor: hue.wash, borderColor: hue.deep, borderWidth: 2 }]}
            >
              <Item item={byId.get(id)!} size={42} color={selected.includes(i) ? hue.deep : undefined} />
            </Pressable>
          ) : (
            <View style={styles.sceneCell} />
          )
        }
      />
      <Actions>
        <Button variant="primary" icon="arrow-right" disabled={selected.length === 0} onPress={() => submit(scoreScene(change.changed, selected, change.after) as unknown as Record<string, unknown>)}>
          Değişen bu
        </Button>
        <Button variant="quiet" onPress={() => submit(scoreScene(change.changed, [], change.after) as unknown as Record<string, unknown>)}>
          Bilemiyorum
        </Button>
      </Actions>
    </View>
  );
}

const styles = StyleSheet.create({
  game: { gap: 20 },
  grid: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: colors.borderStrong },
  gridRow: { flexDirection: "row" },
  gridCell: { flex: 1, aspectRatio: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.borderStrong },
  sceneCell: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceElevated, borderColor: "transparent" },
  pips: { flexDirection: "row", gap: 6, marginTop: 12 },
  pip: { width: 10, height: 10, borderWidth: 1, borderColor: colors.borderStrong },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotBox: { width: 60, height: 60, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  slotNumber: { position: "absolute", top: 2, left: 4, fontSize: 10 },
  palette: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  paletteButton: { width: "31%", minHeight: 84, alignItems: "center", justifyContent: "center", gap: 4, padding: 6, borderWidth: 1, borderColor: colors.borderStrong },
});

/** PRIORITY BOARD engine — arrange competing items under constraints and a time budget. */
import { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { BoardConstraint } from "@/domain/content-types";
import type { BoardResult } from "@/domain/player-types";
import { boardItems, constraintSatisfied, countViolations, initialPlan, move, positionsChanged, totalMinutes, type BoardItem } from "@/domain/engines/priority-board";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { T } from "@/ui/T";
import { colors, fonts, useHue } from "@/ui/theme";
import { nowMs, type StepProps } from "@/screens/steps/types";

function describe(c: BoardConstraint, label: (id: string) => string): string {
  switch (c.kind) {
    case "first":
      return `${label(c.item)} en başta`;
    case "last":
      return `${label(c.item)} en sonda`;
    case "before":
      return `${label(c.a)}, ${label(c.b)} maddesinden önce`;
    case "keep":
      return `${label(c.item)} planda kalmalı`;
  }
}

function SmallButton({ label, onPress, disabled, icon, text }: { label: string; onPress: () => void; disabled?: boolean; icon?: "up" | "down"; text?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.small, text ? styles.smallText : null, { opacity: disabled ? 0.3 : 1, backgroundColor: pressed ? colors.surfaceSunken : colors.surface }]}
    >
      {icon ? <Icon name={icon} size={18} /> : <T v="caption" color={colors.text}>{text}</T>}
    </Pressable>
  );
}

export function PriorityBoard({ step, quest, attempt, submit }: StepProps<"priority-board">) {
  const hue = useHue();
  const items = useMemo(() => boardItems(quest, step), [quest, step]);
  const byId = useMemo(() => new Map<string, BoardItem>(items.map((i) => [i.id, i])), [items]);
  const start = useMemo(() => initialPlan(quest, step, attempt.answers), [quest, step, attempt.answers]);
  const [order, setOrder] = useState(() => start.order.filter((id) => !start.dropped.includes(id)));
  const [dropped, setDropped] = useState(start.dropped);
  const [lastMoved, setLastMoved] = useState<string | null>(null);
  const moves = useRef(0);
  const [startedAt] = useState(nowMs);

  const label = (id: string) => byId.get(id)?.label ?? id;
  const total = totalMinutes(order, items);
  const violations = countViolations(order, items, step);
  const budget = step.budgetMinutes;
  const previous = step.revises ? (attempt.answers[step.revises] as unknown as BoardResult | undefined) : undefined;

  const shift = (id: string, dir: "up" | "down") => {
    setOrder((o) => {
      const from = o.indexOf(id);
      return move(o, from, dir === "up" ? from - 1 : from + 1);
    });
    moves.current++;
    setLastMoved(id);
  };
  const drop = (id: string) => {
    setOrder((o) => o.filter((x) => x !== id));
    setDropped((d) => [...d, id]);
    moves.current++;
  };
  const restore = (id: string) => {
    setDropped((d) => d.filter((x) => x !== id));
    setOrder((o) => [...o, id]);
    moves.current++;
    setLastMoved(id);
  };

  const lock = () => {
    const result: BoardResult = {
      order,
      dropped,
      totalMinutes: total,
      violations,
      moves: moves.current,
      latencyMs: Math.round(nowMs() - startedAt),
      revised: Boolean(step.revises),
      positionsChanged: previous ? positionsChanged(previous.order, order) : 0,
    };
    submit(result as unknown as Record<string, unknown>, result.latencyMs);
  };

  return (
    <View style={styles.game}>
      <T v="h1">{step.prompt}</T>

      {budget !== undefined && (
        <View style={{ gap: 8 }}>
          <View style={styles.budgetHead}>
            <T v="label" muted>
              Zaman çizelgesi
            </T>
            <T v="data" color={total > budget ? colors.danger : colors.text}>
              {total} / {budget} dk
            </T>
          </View>
          <View style={styles.timetable}>
            {order.map((id, i) => (
              <View
                key={id}
                style={{ flexGrow: byId.get(id)!.minutes, flexBasis: 0, backgroundColor: id === lastMoved ? hue.base : i % 2 ? hue.deep : colors.textSecondary, borderRightWidth: 2, borderColor: colors.surface }}
              />
            ))}
            {total < budget && <View style={{ flexGrow: budget - total, flexBasis: 0, backgroundColor: colors.surfaceSunken }} />}
          </View>
          {total > budget && (
            <T v="bodySm" color={colors.danger}>
              {total - budget} dk fazla{step.droppable ? " — bir şeyi kenara koy." : "."}
            </T>
          )}
        </View>
      )}

      {step.constraints.length > 0 && (
        <View style={{ gap: 6 }} accessibilityLabel="Bu planın kuralları">
          {step.constraints.map((c, i) => {
            const ok = constraintSatisfied(c, order);
            return (
              <View key={i} style={styles.constraint} accessibilityLabel={`${describe(c, label)}${ok ? " (karşılandı)" : " (karşılanmadı)"}`}>
                <Icon name={ok ? "check" : "close"} size={16} color={ok ? colors.success : colors.danger} />
                <T v="bodySm" color={ok ? colors.success : colors.danger} style={{ flex: 1 }}>
                  {describe(c, label)}
                </T>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.board}>
        {order.map((id, i) => {
          const item = byId.get(id)!;
          return (
            <View key={id} style={[styles.row, id === lastMoved && { backgroundColor: hue.wash }]}>
              <T v="data" muted style={styles.index}>
                {i + 1}
              </T>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: fonts.uiMedium }}>{item.label}</T>
                <T v="data" muted>
                  {item.minutes} dk
                </T>
              </View>
              <View style={styles.controls}>
                <SmallButton icon="up" label={`${item.label} öne al`} disabled={i === 0} onPress={() => shift(id, "up")} />
                <SmallButton icon="down" label={`${item.label} geriye al`} disabled={i === order.length - 1} onPress={() => shift(id, "down")} />
                {step.droppable && <SmallButton text="Kenara" label={`${item.label} kenara koy`} onPress={() => drop(id)} />}
              </View>
            </View>
          );
        })}
      </View>

      {dropped.length > 0 && (
        <View style={styles.droppedBox}>
          <T v="label" muted>
            Kenara konanlar
          </T>
          {dropped.map((id) => (
            <View key={id} style={styles.droppedRow}>
              <T style={{ flex: 1, textDecorationLine: "line-through" }} secondary>
                {label(id)}
              </T>
              <SmallButton text="Geri koy" label={`${label(id)} geri koy`} onPress={() => restore(id)} />
            </View>
          ))}
        </View>
      )}

      <Button variant="primary" icon="arrow-right" onPress={lock} disabled={order.length === 0}>
        {violations ? `Yine de kilitle (${violations} kural karşılanmadı)` : "Planı kilitle"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  game: { gap: 20 },
  budgetHead: { flexDirection: "row", justifyContent: "space-between" },
  timetable: { flexDirection: "row", height: 18, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  constraint: { flexDirection: "row", gap: 8, alignItems: "center" },
  board: { borderTopWidth: 1, borderColor: colors.borderStrong },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border },
  index: { width: 22, fontSize: 15 },
  controls: { flexDirection: "row", gap: 6 },
  small: { minWidth: 40, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.borderStrong },
  smallText: { paddingHorizontal: 8 },
  droppedBox: { gap: 8, padding: 12, backgroundColor: colors.surfaceSunken },
  droppedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});

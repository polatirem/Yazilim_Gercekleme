"use client";
/** PRIORITY BOARD engine — arrange competing items under constraints and a time budget. */
import { useEffect, useMemo, useRef, useState } from "react";
import type { BoardConstraint } from "@/domain/content-types";
import type { BoardResult } from "@/domain/player-types";
import { boardItems, constraintSatisfied, countViolations, initialPlan, move, positionsChanged, totalMinutes, type BoardItem } from "@/domain/engines/priority-board";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { StepProps } from "@/components/steps/types";
import styles from "./Microgames.module.css";

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

export function PriorityBoard({ step, quest, attempt, submit }: StepProps<"priority-board">) {
  const items = useMemo(() => boardItems(quest, step), [quest, step]);
  const byId = useMemo(() => new Map<string, BoardItem>(items.map((i) => [i.id, i])), [items]);
  const start = useMemo(() => initialPlan(quest, step, attempt.answers), [quest, step, attempt.answers]);
  const [order, setOrder] = useState(() => start.order.filter((id) => !start.dropped.includes(id)));
  const [dropped, setDropped] = useState(start.dropped);
  const [lastMoved, setLastMoved] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<{ id: string; dir: "up" | "down" } | null>(null);
  const moves = useRef(0);
  const [startedAt] = useState(() => performance.now());
  const buttons = useRef(new Map<string, HTMLButtonElement | null>());

  const label = (id: string) => byId.get(id)?.label ?? id;
  const total = totalMinutes(order, items);
  const violations = countViolations(order, items, step);
  const budget = step.budgetMinutes;
  const previous = step.revises ? (attempt.answers[step.revises] as unknown as BoardResult | undefined) : undefined;

  useEffect(() => {
    if (!focusTarget) return;
    const el = buttons.current.get(`${focusTarget.id}-${focusTarget.dir}`);
    (el && !el.disabled ? el : buttons.current.get(`${focusTarget.id}-${focusTarget.dir === "up" ? "down" : "up"}`))?.focus();
  }, [focusTarget, order]);

  const shift = (id: string, dir: "up" | "down") => {
    const from = order.indexOf(id);
    setOrder((o) => move(o, from, dir === "up" ? from - 1 : from + 1));
    moves.current++;
    setLastMoved(id);
    setFocusTarget({ id, dir });
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
      latencyMs: Math.round(performance.now() - startedAt),
      revised: Boolean(step.revises),
      positionsChanged: previous ? positionsChanged(previous.order, order) : 0,
    };
    submit(result as unknown as Record<string, unknown>, result.latencyMs);
  };

  return (
    <div className={styles.game}>
      <h2 className={styles.prompt}>{step.prompt}</h2>

      {budget !== undefined && (
        <div className={styles.budget}>
          <div className={styles.budgetHead}>
            <span className="t-label muted">Zaman çizelgesi</span>
            <span className="t-data" data-over={total > budget}>
              {total} / {budget} dk
            </span>
          </div>
          <div className={styles.timetable} aria-hidden>
            {order.map((id) => (
              <span key={id} style={{ flexGrow: byId.get(id)!.minutes }} data-moved={id === lastMoved || undefined} />
            ))}
            {total < budget && <span className={styles.slack} style={{ flexGrow: budget - total }} />}
          </div>
          {total > budget && <p className={styles.over}>{total - budget} dk fazla{step.droppable ? " — bir şeyi kenara koy." : "."}</p>}
        </div>
      )}

      {step.constraints.length > 0 && (
        <ul className={styles.constraints} aria-label="Bu planın kuralları">
          {step.constraints.map((c, i) => {
            const ok = constraintSatisfied(c, order);
            return (
              <li key={i} data-ok={ok}>
                <Icon name={ok ? "check" : "close"} size={16} />
                {describe(c, label)}
                <span className="visually-hidden">{ok ? " (karşılandı)" : " (karşılanmadı)"}</span>
              </li>
            );
          })}
        </ul>
      )}

      <ol className={styles.board}>
        {order.map((id, i) => {
          const item = byId.get(id)!;
          return (
            <li key={id} className={styles.boardRow} data-moved={id === lastMoved || undefined}>
              <span className={styles.boardIndex}>{i + 1}</span>
              <span className={styles.boardLabel}>
                {item.label}
                <span className="t-data muted"> · {item.minutes} dk</span>
              </span>
              <span className={styles.boardControls}>
                <button type="button" ref={(el) => void buttons.current.set(`${id}-up`, el)} disabled={i === 0} onClick={() => shift(id, "up")} aria-label={`${item.label} öne al`}>
                  <Icon name="up" size={18} />
                </button>
                <button type="button" ref={(el) => void buttons.current.set(`${id}-down`, el)} disabled={i === order.length - 1} onClick={() => shift(id, "down")} aria-label={`${item.label} geriye al`}>
                  <Icon name="down" size={18} />
                </button>
                {step.droppable && (
                  <button type="button" className={styles.aside} onClick={() => drop(id)} aria-label={`${item.label} kenara koy`}>
                    Kenara koy
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      {dropped.length > 0 && (
        <div className={styles.droppedBox}>
          <p className="t-label muted">Kenara konanlar</p>
          <ul>
            {dropped.map((id) => (
              <li key={id}>
                <span>{label(id)}</span>
                <button type="button" className={styles.aside} onClick={() => restore(id)}>
                  Geri koy
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.row}>
        <Button variant="primary" icon="arrow-right" onClick={lock} disabled={order.length === 0}>
          {violations ? `Yine de kilitle (${violations} kural karşılanmadı)` : "Planı kilitle"}
        </Button>
      </div>
    </div>
  );
}

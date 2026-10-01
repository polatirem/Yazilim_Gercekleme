/** PRIORITY BOARD engine: arrange competing items under constraints and a time budget. */
import type { BoardConstraint, Quest, StepOf } from "../content-types";
import type { BoardResult } from "../player-types";
import type { Answers } from "../refs";

type Board = StepOf<"priority-board">;
export type BoardItem = Board["items"][number];

function findBoard(quest: Quest, id: string): Board | null {
  const step = [...quest.prime, ...quest.recall, ...quest.reflection].find((s) => s.id === id);
  return step && step.kind === "priority-board" ? step : null;
}

/** All items available to a board, following its revision chain. */
export function boardItems(quest: Quest, board: Board): BoardItem[] {
  const parent = board.revises ? findBoard(quest, board.revises) : null;
  const base = parent && parent !== board ? boardItems(quest, parent) : [];
  const own = board.items;
  const merged = new Map<string, BoardItem>();
  for (const item of [...base, ...own, ...board.addItems]) merged.set(item.id, item);
  return [...merged.values()];
}

/** Starting arrangement: authored order, or the previous plan plus any items a twist added. */
export function initialPlan(quest: Quest, board: Board, answers: Answers): { order: string[]; dropped: string[] } {
  const items = boardItems(quest, board);
  const previous = board.revises ? (answers[board.revises] as unknown as BoardResult | undefined) : undefined;
  if (!previous) return { order: items.map((i) => i.id), dropped: [] };
  const known = new Set([...previous.order, ...previous.dropped]);
  const added = items.filter((i) => !known.has(i.id)).map((i) => i.id);
  return { order: [...previous.order, ...added], dropped: [...previous.dropped] };
}

export function totalMinutes(order: string[], items: BoardItem[]): number {
  const byId = new Map(items.map((i) => [i.id, i]));
  return order.reduce((sum, id) => sum + (byId.get(id)?.minutes ?? 0), 0);
}

export function constraintSatisfied(c: BoardConstraint, order: string[]): boolean {
  switch (c.kind) {
    case "first":
      return order[0] === c.item;
    case "last":
      return order[order.length - 1] === c.item;
    case "keep":
      return order.includes(c.item);
    case "before": {
      const a = order.indexOf(c.a);
      const b = order.indexOf(c.b);
      // A constraint about a dropped item is moot unless it is required elsewhere.
      if (a === -1 || b === -1) return true;
      return a < b;
    }
  }
}

export function countViolations(order: string[], items: BoardItem[], board: Board): number {
  const broken = board.constraints.filter((c) => !constraintSatisfied(c, order)).length;
  const overBudget = board.budgetMinutes !== undefined && totalMinutes(order, items) > board.budgetMinutes ? 1 : 0;
  return broken + overBudget;
}

export function positionsChanged(before: string[], after: string[]): number {
  let changed = 0;
  const max = Math.max(before.length, after.length);
  for (let i = 0; i < max; i++) if (before[i] !== after[i]) changed++;
  return changed;
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

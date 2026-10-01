/** SEQUENCE RECALL engine: encode an ordered sequence or a spatial scene, reconstruct it later. */
import type { SequenceItem, StepOf } from "../content-types";
import type { OrderRecallResult, SceneChangeResult, SequenceEncodeResult } from "../player-types";
import { intBetween, mulberry32, shuffle } from "../random";

export function generateEncoding(step: StepOf<"sequence-encode">, seed: number): SequenceEncodeResult {
  const rand = mulberry32(seed);
  if (step.mode === "order") {
    // Sequences may repeat items (e.g. turn directions); draw with replacement
    // when the pool is smaller than the sequence.
    const items =
      step.pool.length >= step.length
        ? shuffle(step.pool, rand).slice(0, step.length).map((i) => i.id)
        : Array.from({ length: step.length }, () => step.pool[Math.floor(rand() * step.pool.length)].id);
    return { items, cells: [] };
  }
  const grid = step.grid ?? { cols: 4, rows: 3 };
  const size = grid.cols * grid.rows;
  const positions = shuffle(
    Array.from({ length: size }, (_, i) => i),
    rand,
  ).slice(0, step.length);
  const chosen = shuffle(step.pool, rand).slice(0, step.length);
  const cells: (string | null)[] = Array.from({ length: size }, () => null);
  positions.forEach((pos, i) => (cells[pos] = chosen[i % chosen.length].id));
  return { items: chosen.map((c) => c.id), cells };
}

/** Options offered when rebuilding an ordered sequence: all pool items, stable order. */
export function recallPalette(pool: SequenceItem[], seed: number): SequenceItem[] {
  const unique = new Map(pool.map((p) => [p.id, p]));
  return shuffle([...unique.values()], mulberry32(seed));
}

export function scoreOrder(expected: string[], response: string[]): OrderRecallResult {
  const hits = expected.map((id, i) => response[i] === id);
  const correct = hits.filter(Boolean).length;
  const middle = hits.slice(1, -1);
  return {
    response,
    hits,
    correct,
    total: expected.length,
    accuracy: expected.length ? correct / expected.length : 0,
    firstCorrect: hits[0] ?? false,
    lastCorrect: hits[hits.length - 1] ?? false,
    middleAccuracy: middle.length ? middle.filter(Boolean).length / middle.length : 0,
  };
}

/** Changes `count` occupied cells to a different item from the pool. */
export function generateSceneChange(
  encoding: SequenceEncodeResult,
  pool: SequenceItem[],
  count: number,
  seed: number,
): { after: (string | null)[]; changed: number[] } {
  const rand = mulberry32(seed);
  const occupied = encoding.cells.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
  const changed = shuffle(occupied, rand).slice(0, Math.min(count, occupied.length)).sort((a, b) => a - b);
  const after = [...encoding.cells];
  const inScene = new Set(encoding.cells.filter(Boolean));
  const replacements = shuffle(
    pool.filter((p) => !inScene.has(p.id)),
    rand,
  );
  changed.forEach((cell, i) => {
    const replacement = replacements[i] ?? pool[intBetween(rand, 0, pool.length - 1)];
    after[cell] = replacement.id;
  });
  return { after, changed };
}

export function scoreScene(changed: number[], selected: number[], after: (string | null)[]): SceneChangeResult {
  const changedSet = new Set(changed);
  const hits = selected.filter((s) => changedSet.has(s)).length;
  return {
    changed,
    selected,
    after,
    hits,
    misses: changed.length - hits,
    falseAlarms: selected.length - hits,
    detected: hits === changed.length && selected.length === hits,
  };
}

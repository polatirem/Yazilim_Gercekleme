/** SIGNAL FILTER engine: find the targets among near-identical lures and other shapes. */
import type { Glyph, GlyphRule, StepOf } from "../content-types";
import type { SignalFilterResult } from "../player-types";
import { intBetween, mulberry32, shuffle } from "../random";

export function matchesRule(glyph: Glyph, rule: GlyphRule): boolean {
  if (rule.shape !== undefined && glyph.shape !== rule.shape) return false;
  if (rule.fill !== undefined && glyph.fill !== rule.fill) return false;
  if (rule.gap !== undefined && glyph.gap !== rule.gap) return false;
  return true;
}

export interface FilterCell {
  glyph: Glyph;
  isTarget: boolean;
  /** Quarter-turn rotation, purely visual variety. */
  rotation: number;
}

export function generateRound(step: StepOf<"signal-filter">, seed: number, round: number): FilterCell[] {
  const rand = mulberry32(seed + round * 7919);
  const size = step.cols * step.rows;
  const targetGlyph: Glyph = {
    shape: step.target.shape ?? "circle",
    fill: step.target.fill ?? "open",
    gap: step.target.gap ?? false,
  };
  const targetCount = intBetween(rand, step.targetsPerRound[0], step.targetsPerRound[1]);
  const lures = step.lures.filter((g) => !matchesRule(g, step.target));
  const others = step.others.filter((g) => !matchesRule(g, step.target));
  const cells: FilterCell[] = [];
  for (let i = 0; i < size; i++) {
    if (i < targetCount) {
      cells.push({ glyph: targetGlyph, isTarget: true, rotation: 0 });
    } else {
      const pool = rand() < 0.6 ? lures : others;
      cells.push({ glyph: pool[Math.floor(rand() * pool.length)], isTarget: false, rotation: 0 });
    }
  }
  return shuffle(cells, rand).map((c) => ({ ...c, rotation: Math.floor(rand() * 4) * 90 }));
}

export interface RoundResponse {
  targets: number[];
  selected: number[];
  ms: number;
}

export function scoreFilter(rounds: RoundResponse[]): SignalFilterResult {
  let targets = 0;
  let hits = 0;
  let falseAlarms = 0;
  for (const r of rounds) {
    const t = new Set(r.targets);
    targets += t.size;
    for (const s of r.selected) {
      if (t.has(s)) hits++;
      else falseAlarms++;
    }
  }
  const totalMs = rounds.reduce((sum, r) => sum + r.ms, 0);
  return {
    targets,
    hits,
    misses: targets - hits,
    falseAlarms,
    accuracy: targets ? hits / targets : 0,
    meanRoundMs: rounds.length ? Math.round(totalMs / rounds.length) : 0,
  };
}

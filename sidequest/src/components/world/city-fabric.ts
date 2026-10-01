/**
 * The City's fabric: a figure-ground plan of blocks, generated
 * deterministically (same city for everyone) and computed once.
 * Blocks leave room for the river, the routes and each location's plaza.
 */
import { LOCATIONS, MAP_SIZE, PATHS } from "@/content/world";
import { mulberry32 } from "@/domain/random";

type Pt = [number, number];

export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

/** The river as cubic segments, matching RIVER_D in content/world.ts. */
const RIVER_CUBICS: [Pt, Pt, Pt, Pt][] = [
  [[-20, 250], [160, 245], [250, 150], [430, 150]],
  [[430, 150], [610, 150], [700, 200], [820, 140]],
  [[820, 140], [940, 80], [1060, 55], [1220, 70]],
];

function cubicPoints([p0, p1, p2, p3]: [Pt, Pt, Pt, Pt], steps = 24): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

export function polylineOf(d: string): Pt[] {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const pts: Pt[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return pts;
}

function distToSegment([px, py]: Pt, [ax, ay]: Pt, [bx, by]: Pt): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distToPolyline(p: Pt, line: Pt[]): number {
  let min = Infinity;
  for (let i = 0; i + 1 < line.length; i++) min = Math.min(min, distToSegment(p, line[i], line[i + 1]));
  return min;
}

const RIVER_LINE = RIVER_CUBICS.flatMap((c) => cubicPoints(c));
const ROUTE_LINES = PATHS.map((p) => polylineOf(p.d));

function generate(): Block[] {
  const CELL = 40;
  const rand = mulberry32(1729);
  const blocks: Block[] = [];
  for (let gy = 0; gy < MAP_SIZE.height / CELL; gy++) {
    for (let gx = 0; gx < MAP_SIZE.width / CELL; gx++) {
      const cx = gx * CELL + CELL / 2;
      const cy = gy * CELL + CELL / 2;
      const r = rand();
      const inset = 4 + Math.floor(rand() * 4);
      const shrinkW = Math.floor(rand() * 6);
      const shrinkH = Math.floor(rand() * 6);
      if (distToPolyline([cx, cy], RIVER_LINE) < 36) continue;
      if (ROUTE_LINES.some((l) => distToPolyline([cx, cy], l) < 17)) continue;
      if (LOCATIONS.some((l) => Math.hypot(l.x - cx, l.y - cy) < 66)) continue;
      if (r < 0.1) continue; // courtyards and small squares
      blocks.push({
        x: gx * CELL + inset,
        y: gy * CELL + inset,
        w: CELL - inset * 2 - shrinkW,
        h: CELL - inset * 2 - shrinkH,
        cx,
        cy,
      });
    }
  }
  return blocks;
}

export const BLOCKS: Block[] = generate();

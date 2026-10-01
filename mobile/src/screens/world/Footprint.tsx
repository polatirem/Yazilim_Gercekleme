import { Circle, G, Path, Rect } from "react-native-svg";
import type { WorldLocation } from "@/domain/content-types";

/**
 * Architectural plan drawings for each location, centred on (0,0) within
 * roughly ±55 units. They read as buildings on a survey plan, not icons.
 */
export function Footprint({ kind, color, soft }: { kind: WorldLocation["footprint"]; color: string; soft: string }) {
  const line = { stroke: color, strokeWidth: 1.75, fill: "none" };
  const thin = { stroke: color, strokeWidth: 0.9, strokeOpacity: 0.8, fill: "none" };
  const fill = { fill: color, stroke: "none" };
  switch (kind) {
    case "crossroads":
      return (
        <G>
          <Path d="M-55 -9H-9V-55M9 -55V-9H55M55 9H9V55M-9 55V9H-55" {...line} />
          <Circle r="16" {...line} />
          <Circle r="3" {...fill} />
          <Path d="M-30 -30l-10 -10M30 -30l10 -10M30 30l10 10M-30 30l-10 10" {...thin} />
        </G>
      );
    case "observatory":
      return (
        <G>
          <Circle r="38" {...line} />
          <Circle r="25" {...line} />
          <Path d="M-5 -25 L-5 25 M5 -25 L5 25" {...line} />
          <Path
            d={Array.from({ length: 16 }, (_, i) => {
              const a = (i / 16) * Math.PI * 2;
              return `M${(Math.cos(a) * 38).toFixed(2)} ${(Math.sin(a) * 38).toFixed(2)} L${(Math.cos(a) * 46).toFixed(2)} ${(Math.sin(a) * 46).toFixed(2)}`;
            }).join(" ")}
            {...thin}
          />
        </G>
      );
    case "archive":
      return (
        <G>
          <Rect x="-48" y="-34" width="96" height="68" {...line} />
          <Path d={[-24, -12, 0, 12, 24].map((y) => `M-38 ${y} H38`).join(" ")} {...thin} />
          <Path d="M-48 -34 V34" {...line} />
          <Rect x="-8" y="30" width="16" height="8" {...fill} />
        </G>
      );
    case "workshop":
      return (
        <G>
          <Path d="M-50 32 V-14 L-30 -32 V-14 L-10 -32 V-14 L10 -32 V-14 L30 -32 V-14 L50 -32 V32 Z" {...line} />
          <Path d="M-38 8 H-14 M-4 8 H20 M-38 20 H-14 M-4 20 H20" {...thin} />
          <Rect x="30" y="4" width="12" height="28" fill={soft} stroke={color} strokeWidth={1.75} />
        </G>
      );
    case "station":
      return (
        <G>
          <Path d="M-70 -18 H70 M-70 -6 H70 M-70 6 H70 M-70 18 H70" {...thin} />
          <Rect x="-44" y="-26" width="88" height="14" {...line} />
          <Rect x="-44" y="12" width="88" height="14" {...line} />
          <Path d={[-36, -20, -4, 12, 28].map((x) => `M${x} -12 V12`).join(" ")} {...thin} />
        </G>
      );
    case "market":
      return (
        <G>
          <Rect x="-46" y="-32" width="92" height="64" {...line} />
          <Rect x="-26" y="-14" width="52" height="28" {...line} />
          {[-38, -22, -6, 10, 26, 38].map((x) => (
            <G key={x}>
              <Rect x={x - 2} y="-28" width="4" height="4" {...fill} />
              <Rect x={x - 2} y="24" width="4" height="4" {...fill} />
            </G>
          ))}
        </G>
      );
    case "garden":
      return (
        <G>
          <Path d="M-46 -8 C-50 -34 -18 -46 6 -40 C34 -34 52 -16 46 10 C40 36 8 44 -16 38 C-38 32 -44 16 -46 -8 Z" {...line} />
          <Path d="M-40 8 C-20 -4 -4 20 14 4 S 36 -20 44 -4" {...thin} />
          {[
            [-24, -20],
            [-2, -26],
            [22, -18],
            [-18, 22],
            [10, 26],
            [30, 14],
          ].map(([x, y]) => (
            <Circle key={`${x}${y}`} cx={x} cy={y} r="4" {...line} />
          ))}
        </G>
      );
    case "unknown":
      return (
        <G>
          <Path d="M-40 -20 L-10 -42 L30 -30 L44 6 L18 38 L-26 32 L-46 8 Z" strokeDasharray="4 5" {...line} />
          <Path d="M-14 -8 L14 -8 M0 -22 L0 6" {...thin} />
        </G>
      );
  }
}

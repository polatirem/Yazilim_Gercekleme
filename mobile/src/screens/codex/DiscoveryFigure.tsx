import type { ReactNode } from "react";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import { colors } from "@/ui/theme";

/**
 * Small plate illustrations for Codex entries. Line drawings on an 80×56 grid,
 * one idea each — closer to a diagram in a field notebook than to an icon.
 */
export function DiscoveryFigure({ figure, size = 160, accent, ink = colors.text }: { figure: string; size?: number; accent: string; ink?: string }) {
  const s = { stroke: ink, fill: "none", strokeWidth: 1.25 };
  let body: ReactNode;
  switch (figure) {
    case "habituation":
      body = (
        <>
          {[40, 30, 22, 16, 12, 9, 7, 6].map((h, i) => (
            <Rect key={i} x={6 + i * 9} y={50 - h} width="5" height={h} fill={i === 0 ? accent : ink} stroke={ink} strokeWidth={1.25} />
          ))}
          <Path d="M4 50.5H76" {...s} />
        </>
      );
      break;
    case "capture-error":
      body = (
        <>
          <Path d="M8 28H36" {...s} strokeWidth={1.5} />
          <Path d="M36 28C50 28 54 12 72 12" {...s} strokeWidth={4} />
          <Path d="M36 28C50 28 54 44 72 44" {...s} strokeDasharray="2 3" />
          <Circle cx="36" cy="28" r="3" fill={accent} />
          <Path d="M66 8l6 4-6 4" {...s} />
        </>
      );
      break;
    case "task-switching-cost":
      body = (
        <>
          <Path d="M4 40H22V22H26V40H44V22H48V40H76" {...s} />
          <Path d="M22 22V40M44 22V40" {...s} stroke={accent} strokeWidth={2} />
          <Path d="M4 50.5H76" {...s} strokeDasharray="1 3" />
        </>
      );
      break;
    case "confirmation-bias":
      body = (
        <>
          {[
            [16, 16],
            [28, 24],
            [22, 36],
            [34, 14],
            [40, 32],
            [52, 20],
            [60, 38],
            [66, 16],
            [48, 44],
            [12, 44],
          ].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r="2.5" fill={i < 5 ? ink : "none"} stroke={ink} strokeWidth={1.25} opacity={i < 5 ? 1 : 0.5} />
          ))}
          <Ellipse cx="27" cy="25" rx="19" ry="16" {...s} stroke={accent} />
        </>
      );
      break;
    case "choice-overload":
      body = (
        <>
          {[0, 1, 2].map((i) => (
            <Rect key={i} x={6 + i * 10} y="22" width="7" height="12" {...s} />
          ))}
          <Path d="M40 8V48" {...s} strokeDasharray="1 3" />
          {Array.from({ length: 12 }, (_, i) => (
            <Rect key={i} x={46 + (i % 4) * 7.5} y={14 + Math.floor(i / 4) * 10} width="5" height="7" {...s} stroke={i === 7 ? accent : ink} />
          ))}
        </>
      );
      break;
    case "primacy-effect":
    case "recency-effect": {
      const left = figure === "primacy-effect";
      body = (
        <>
          <Path d="M6 12C18 30 24 44 40 44S62 30 74 12" {...s} />
          <Circle cx={left ? 6 : 74} cy="12" r="4" fill={accent} />
          <Path d="M4 50.5H76" {...s} />
        </>
      );
      break;
    }
    case "inattentional-blindness":
      body = (
        <>
          <Path d="M8 8L40 28L8 48Z" fill={ink} opacity={0.12} />
          <Path d="M8 8L40 28L8 48" {...s} />
          <Circle cx="12" cy="28" r="2.5" fill={ink} />
          <Rect x="58" y="14" width="12" height="12" {...s} stroke={accent} />
        </>
      );
      break;
    case "change-blindness":
      body = (
        <>
          <Rect x="4" y="10" width="32" height="36" {...s} />
          <Rect x="44" y="10" width="32" height="36" {...s} />
          <Circle cx="14" cy="22" r="3" {...s} />
          <Rect x="22" y="30" width="7" height="7" {...s} />
          <Circle cx="54" cy="22" r="3" {...s} />
          <Path d="M62 30l4 7h-8z" {...s} stroke={accent} />
        </>
      );
      break;
    case "selective-attention":
      body = (
        <>
          {[12, 20, 28, 36, 44].map((y) => (
            <Path key={y} d={`M4 ${y}H76`} fill="none" opacity={y === 28 ? 1 : 0.35} stroke={y === 28 ? accent : ink} strokeWidth={y === 28 ? 2 : 1} />
          ))}
          <Circle cx="40" cy="28" r="10" {...s} />
        </>
      );
      break;
    case "prospective-timing":
      body = (
        <>
          <Circle cx="20" cy="28" r="14" {...s} />
          <Path d="M20 28V18M20 28l6 4" {...s} stroke={accent} strokeWidth={1.75} />
          <Path d="M44 20H76M44 36H64" {...s} />
          <Path d="M44 16v8M76 16v8M44 32v8M64 32v8" {...s} />
        </>
      );
      break;
    case "planning-fallacy":
      body = (
        <>
          <Rect x="6" y="16" width="30" height="8" {...s} />
          <Rect x="6" y="32" width="66" height="8" fill={accent} />
          <Path d="M36 12V44" {...s} strokeDasharray="1 3" />
        </>
      );
      break;
    case "anchoring":
      body = (
        <>
          <Path d="M40 6V50" {...s} stroke={accent} strokeWidth={2} />
          {[30, 34, 37, 43, 46, 49, 52].map((x, i) => (
            <Circle key={i} cx={x} cy={14 + i * 5} r="2.2" fill={ink} />
          ))}
          <Path d="M4 50.5H76" {...s} />
        </>
      );
      break;
    case "generation-effect":
      body = (
        <>
          {[14, 22, 30, 38].map((y) => (
            <Path key={`r${y}`} d={`M6 ${y}H32`} {...s} opacity={0.4} />
          ))}
          <Path d="M40 10V46" {...s} strokeDasharray="1 3" />
          {[14, 22, 30, 38].map((y, i) => (
            <Path key={`w${y}`} d={`M48 ${y}c4-3 8 3 12 0s8-3 12 0`} {...s} stroke={i === 1 ? accent : ink} strokeWidth={1.75} />
          ))}
        </>
      );
      break;
    case "context-dependent-memory":
      body = (
        <>
          <Rect x="6" y="10" width="28" height="36" {...s} />
          <Rect x="46" y="10" width="28" height="36" {...s} />
          <Circle cx="20" cy="28" r="5" fill={accent} />
          <Circle cx="60" cy="28" r="5" {...s} strokeDasharray="2 2" />
          <Path d="M26 28H54" {...s} strokeDasharray="1 3" />
          <Path d="M50 24l4 4-4 4" {...s} />
        </>
      );
      break;
    case "zeigarnik-effect":
      body = (
        <>
          <Circle cx="22" cy="28" r="14" {...s} />
          <Path d="M22 14A14 14 0 1 1 8.1 30" fill="none" stroke={accent} strokeWidth={2.5} />
          <Circle cx="58" cy="28" r="14" fill={ink} opacity={0.18} />
          <Path d="M51 28l5 5 9-10" {...s} />
        </>
      );
      break;
    default:
      body = <Rect x="8" y="8" width="64" height="40" {...s} strokeDasharray="3 4" />;
  }
  return (
    <Svg width={size} height={(size * 56) / 80} viewBox="0 0 80 56">
      {body}
    </Svg>
  );
}

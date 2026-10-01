import type { WorldLocation } from "@/domain/content-types";

/**
 * Architectural plan drawings for each location, centred on (0,0) within
 * roughly ±55 units. They read as buildings on a survey plan, not icons.
 */
export function Footprint({ kind }: { kind: WorldLocation["footprint"] }) {
  switch (kind) {
    case "crossroads":
      return (
        <g>
          <path d="M-55 -9H-9V-55M9 -55V-9H55M55 9H9V55M-9 55V9H-55" />
          <circle r="16" />
          <circle r="3" className="fill" />
          <path d="M-30 -30l-10 -10M30 -30l10 -10M30 30l10 10M-30 30l-10 10" className="thin" />
        </g>
      );
    case "observatory":
      return (
        <g>
          <circle r="38" />
          <circle r="25" />
          <path d="M-5 -25 L-5 25 M5 -25 L5 25" />
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return <path key={i} d={`M${Math.cos(a) * 38} ${Math.sin(a) * 38} L${Math.cos(a) * 46} ${Math.sin(a) * 46}`} className="thin" />;
          })}
        </g>
      );
    case "archive":
      return (
        <g>
          <rect x="-48" y="-34" width="96" height="68" />
          {[-24, -12, 0, 12, 24].map((y) => (
            <path key={y} d={`M-38 ${y} H38`} className="thin" />
          ))}
          <path d="M-48 -34 V34" />
          <rect x="-8" y="30" width="16" height="8" className="fill" />
        </g>
      );
    case "workshop":
      return (
        <g>
          <path d="M-50 32 V-14 L-30 -32 V-14 L-10 -32 V-14 L10 -32 V-14 L30 -32 V-14 L50 -32 V32 Z" />
          <path d="M-38 8 H-14 M-4 8 H20 M-38 20 H-14 M-4 20 H20" className="thin" />
          <rect x="30" y="4" width="12" height="28" className="fill-soft" />
        </g>
      );
    case "station":
      return (
        <g>
          <path d="M-70 -18 H70 M-70 -6 H70 M-70 6 H70 M-70 18 H70" className="thin" />
          <rect x="-44" y="-26" width="88" height="14" />
          <rect x="-44" y="12" width="88" height="14" />
          {[-36, -20, -4, 12, 28].map((x) => (
            <path key={x} d={`M${x} -12 V12`} className="thin" />
          ))}
        </g>
      );
    case "market":
      return (
        <g>
          <rect x="-46" y="-32" width="92" height="64" />
          <rect x="-26" y="-14" width="52" height="28" />
          {[-38, -22, -6, 10, 26, 38].map((x) => (
            <g key={x}>
              <rect x={x - 2} y="-28" width="4" height="4" className="fill" />
              <rect x={x - 2} y="24" width="4" height="4" className="fill" />
            </g>
          ))}
        </g>
      );
    case "garden":
      return (
        <g>
          <path d="M-46 -8 C-50 -34 -18 -46 6 -40 C34 -34 52 -16 46 10 C40 36 8 44 -16 38 C-38 32 -44 16 -46 -8 Z" />
          <path d="M-40 8 C-20 -4 -4 20 14 4 S 36 -20 44 -4" className="thin" />
          {[
            [-24, -20],
            [-2, -26],
            [22, -18],
            [-18, 22],
            [10, 26],
            [30, 14],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="4" />
          ))}
        </g>
      );
    case "unknown":
      return (
        <g>
          <path d="M-40 -20 L-10 -42 L30 -30 L44 6 L18 38 L-26 32 L-46 8 Z" strokeDasharray="4 5" />
          <path d="M-14 -8 L14 -8 M0 -22 L0 6" className="thin" />
        </g>
      );
  }
}

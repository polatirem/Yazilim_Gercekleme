/**
 * Small plate illustrations for Codex entries. Line drawings on an 80×56 grid,
 * one idea each — closer to a diagram in a field notebook than to an icon.
 */
export function DiscoveryFigure({ figure, size = 160 }: { figure: string; size?: number }) {
  const accent = "var(--hue)";
  let body: React.ReactNode;
  switch (figure) {
    case "habituation":
      body = (
        <>
          {[40, 30, 22, 16, 12, 9, 7, 6].map((h, i) => (
            <rect key={i} x={6 + i * 9} y={50 - h} width="5" height={h} fill={i === 0 ? accent : "currentColor"} />
          ))}
          <path d="M4 50.5H76" />
        </>
      );
      break;
    case "capture-error":
      body = (
        <>
          <path d="M8 28H36" strokeWidth="1.5" />
          <path d="M36 28C50 28 54 12 72 12" strokeWidth="4" />
          <path d="M36 28C50 28 54 44 72 44" strokeDasharray="2 3" />
          <circle cx="36" cy="28" r="3" fill={accent} stroke="none" />
          <path d="M66 8l6 4-6 4" />
        </>
      );
      break;
    case "task-switching-cost":
      body = (
        <>
          <path d="M4 40H22V22H26V40H44V22H48V40H76" />
          <path d="M22 22V40M44 22V40" stroke={accent} strokeWidth="2" />
          <path d="M4 50.5H76" strokeDasharray="1 3" />
        </>
      );
      break;
    case "confirmation-bias":
      body = (
        <>
          {[
            [16, 16], [28, 24], [22, 36], [34, 14], [40, 32], [52, 20], [60, 38], [66, 16], [48, 44], [12, 44],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill={i < 5 ? "currentColor" : "none"} opacity={i < 5 ? 1 : 0.5} />
          ))}
          <ellipse cx="27" cy="25" rx="19" ry="16" stroke={accent} />
        </>
      );
      break;
    case "choice-overload":
      body = (
        <>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={6 + i * 10} y="22" width="7" height="12" />
          ))}
          <path d="M40 8V48" strokeDasharray="1 3" />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={46 + (i % 4) * 7.5} y={14 + Math.floor(i / 4) * 10} width="5" height="7" stroke={i === 7 ? accent : "currentColor"} />
          ))}
        </>
      );
      break;
    case "primacy-effect":
    case "recency-effect": {
      const left = figure === "primacy-effect";
      body = (
        <>
          <path d="M6 12C18 30 24 44 40 44S62 30 74 12" />
          <circle cx={left ? 6 : 74} cy="12" r="4" fill={accent} stroke="none" />
          <path d="M4 50.5H76" />
        </>
      );
      break;
    }
    case "inattentional-blindness":
      body = (
        <>
          <path d="M8 8L40 28L8 48Z" fill="currentColor" opacity="0.12" />
          <path d="M8 8L40 28L8 48" />
          <circle cx="12" cy="28" r="2.5" fill="currentColor" stroke="none" />
          <rect x="58" y="14" width="12" height="12" stroke={accent} />
        </>
      );
      break;
    case "change-blindness":
      body = (
        <>
          <rect x="4" y="10" width="32" height="36" />
          <rect x="44" y="10" width="32" height="36" />
          <circle cx="14" cy="22" r="3" />
          <rect x="22" y="30" width="7" height="7" />
          <circle cx="54" cy="22" r="3" />
          <path d="M62 30l4 7h-8z" stroke={accent} />
        </>
      );
      break;
    case "selective-attention":
      body = (
        <>
          {[12, 20, 28, 36, 44].map((y) => (
            <path key={y} d={`M4 ${y}H76`} opacity={y === 28 ? 1 : 0.35} stroke={y === 28 ? accent : "currentColor"} strokeWidth={y === 28 ? 2 : 1} />
          ))}
          <circle cx="40" cy="28" r="10" />
        </>
      );
      break;
    case "prospective-timing":
      body = (
        <>
          <circle cx="20" cy="28" r="14" />
          <path d="M20 28V18M20 28l6 4" stroke={accent} strokeWidth="1.75" />
          <path d="M44 20H76M44 36H64" />
          <path d="M44 16v8M76 16v8M44 32v8M64 32v8" />
        </>
      );
      break;
    case "planning-fallacy":
      body = (
        <>
          <rect x="6" y="16" width="30" height="8" />
          <rect x="6" y="32" width="66" height="8" fill={accent} stroke="none" />
          <path d="M36 12V44" strokeDasharray="1 3" />
        </>
      );
      break;
    case "anchoring":
      body = (
        <>
          <path d="M40 6V50" stroke={accent} strokeWidth="2" />
          {[30, 34, 37, 43, 46, 49, 52].map((x, i) => (
            <circle key={i} cx={x} cy={14 + i * 5} r="2.2" fill="currentColor" stroke="none" />
          ))}
          <path d="M4 50.5H76" />
        </>
      );
      break;
    case "generation-effect":
      body = (
        <>
          {[14, 22, 30, 38].map((y) => (
            <path key={`r${y}`} d={`M6 ${y}H32`} opacity="0.4" />
          ))}
          <path d="M40 10V46" strokeDasharray="1 3" />
          {[14, 22, 30, 38].map((y, i) => (
            <path key={`w${y}`} d={`M48 ${y}c4-3 8 3 12 0s8-3 12 0`} stroke={i === 1 ? accent : "currentColor"} strokeWidth="1.75" />
          ))}
        </>
      );
      break;
    case "context-dependent-memory":
      body = (
        <>
          <rect x="6" y="10" width="28" height="36" />
          <rect x="46" y="10" width="28" height="36" />
          <circle cx="20" cy="28" r="5" fill={accent} stroke="none" />
          <circle cx="60" cy="28" r="5" strokeDasharray="2 2" />
          <path d="M26 28H54" strokeDasharray="1 3" />
          <path d="M50 24l4 4-4 4" />
        </>
      );
      break;
    case "zeigarnik-effect":
      body = (
        <>
          <circle cx="22" cy="28" r="14" />
          <path d="M22 14A14 14 0 1 1 8.1 30" stroke={accent} strokeWidth="2.5" fill="none" />
          <circle cx="58" cy="28" r="14" fill="currentColor" opacity="0.18" />
          <path d="M51 28l5 5 9-10" />
        </>
      );
      break;
    default:
      body = <rect x="8" y="8" width="64" height="40" strokeDasharray="3 4" />;
  }
  return (
    <svg width={size} height={(size * 56) / 80} viewBox="0 0 80 56" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
      {body}
    </svg>
  );
}

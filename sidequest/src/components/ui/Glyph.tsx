import type { Glyph as GlyphData } from "@/domain/content-types";

/**
 * The visual vocabulary of the micro-mechanics: architectural marks drawn on a
 * 40-unit grid. Filled marks use currentColor; open marks are outlined.
 */
export function Glyph({ glyph, size = 40, rotation = 0, title }: { glyph: GlyphData; size?: number; rotation?: number; title?: string }) {
  const solid = glyph.fill === "solid";
  const common = {
    fill: solid ? "currentColor" : "none",
    stroke: "currentColor",
    strokeWidth: 2.5,
    strokeLinejoin: "miter" as const,
  };
  let shape: React.ReactNode;
  switch (glyph.shape) {
    case "circle":
      shape = glyph.gap ? (
        <path d="M27.5 9.6A12 12 0 1 0 30.4 12.5" {...common} fill="none" />
      ) : (
        <circle cx="20" cy="20" r="12" {...common} />
      );
      break;
    case "square":
      shape = <rect x="9" y="9" width="22" height="22" {...common} />;
      break;
    case "triangle":
      shape = <path d="M20 7.5 32.5 31h-25z" {...common} />;
      break;
    case "arch":
      shape = <path d="M9 32V20a11 11 0 0 1 22 0v12z" {...common} />;
      break;
    case "diamond":
      shape = <path d="M20 6.5 33.5 20 20 33.5 6.5 20z" {...common} />;
      break;
    case "bar":
      shape = <rect x="8" y="16" width="24" height="8" {...common} />;
      break;
    case "turn-left":
      shape = <path d="M24 33V17H10m6-6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square" />;
      break;
    case "turn-right":
      shape = <path d="M16 33V17h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square" />;
      break;
    case "straight":
      shape = <path d="M20 34V8m-6 6 6-6 6 6" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="square" />;
      break;
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
    >
      {shape}
    </svg>
  );
}

export function describeGlyph(g: GlyphData): string {
  if (g.shape === "turn-left") return "Sol";
  if (g.shape === "turn-right") return "Sağ";
  if (g.shape === "straight") return "Düz";
  const names: Record<string, string> = { circle: "halka", square: "kare", triangle: "üçgen", arch: "kemer", diamond: "eşkenar dörtgen", bar: "çubuk" };
  const name = names[g.shape];
  return `${g.gap ? "Aralıklı " : ""}${g.fill === "solid" ? "dolu" : "boş"} ${name}`.replace(/^./, (c) => c.toLocaleUpperCase("tr"));
}

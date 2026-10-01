import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { Glyph as GlyphData } from "@/domain/content-types";
import { colors } from "./theme";

/**
 * The visual vocabulary of the micro-mechanics: architectural marks drawn on a
 * 40-unit grid. Filled marks use the colour; open marks are outlined.
 */
export function Glyph({ glyph, size = 40, rotation = 0, color = colors.text }: { glyph: GlyphData; size?: number; rotation?: number; color?: string }) {
  const solid = glyph.fill === "solid";
  const common = { fill: solid ? color : "none", stroke: color, strokeWidth: 2.5, strokeLinejoin: "miter" as const };
  const arrow = { fill: "none", stroke: color, strokeWidth: 3, strokeLinecap: "square" as const };
  let shape: ReactNode;
  switch (glyph.shape) {
    case "circle":
      shape = glyph.gap ? <Path d="M27.5 9.6A12 12 0 1 0 30.4 12.5" {...common} fill="none" /> : <Circle cx="20" cy="20" r="12" {...common} />;
      break;
    case "square":
      shape = <Rect x="9" y="9" width="22" height="22" {...common} />;
      break;
    case "triangle":
      shape = <Path d="M20 7.5 32.5 31h-25z" {...common} />;
      break;
    case "arch":
      shape = <Path d="M9 32V20a11 11 0 0 1 22 0v12z" {...common} />;
      break;
    case "diamond":
      shape = <Path d="M20 6.5 33.5 20 20 33.5 6.5 20z" {...common} />;
      break;
    case "bar":
      shape = <Rect x="8" y="16" width="24" height="8" {...common} />;
      break;
    case "turn-left":
      shape = <Path d="M24 33V17H10m6-6-6 6 6 6" {...arrow} />;
      break;
    case "turn-right":
      shape = <Path d="M16 33V17h14m-6-6 6 6-6 6" {...arrow} />;
      break;
    case "straight":
      shape = <Path d="M20 34V8m-6 6 6-6 6 6" {...arrow} />;
      break;
  }
  return (
    <View style={rotation ? { transform: [{ rotate: `${rotation}deg` }] } : undefined}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        {shape}
      </Svg>
    </View>
  );
}

export { describeGlyph } from "@/domain/glyph-names";

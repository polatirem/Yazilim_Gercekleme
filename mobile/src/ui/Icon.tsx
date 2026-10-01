import Svg, { Path } from "react-native-svg";
import { colors } from "./theme";

/**
 * The only icon system in the product: 20px grid, 1.5 stroke, square caps.
 * Icons support labels — they never replace important text.
 */
const PATHS = {
  "arrow-right": "M4 10h12M11 5l5 5-5 5",
  "arrow-left": "M16 10H4M9 5l-5 5 5 5",
  close: "M5 5l10 10M15 5L5 15",
  plus: "M10 4v12M4 10h12",
  minus: "M4 10h12",
  up: "M10 15V5M5 10l5-5 5 5",
  down: "M10 5v10M5 10l5 5 5-5",
  check: "M4 10.5l4 4 8-9",
  lock: "M5.5 9h9v8h-9zM7.5 9V6.5a2.5 2.5 0 015 0V9",
  clock: "M10 3.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM10 6.5V10l2.5 1.5",
  home: "M3.5 9.5L10 4l6.5 5.5M5.5 8v8h9V8M8.5 16v-4h3v4",
  outside: "M10 3l4.5 7h-3l3.5 5h-10l3.5-5h-3zM10 15v2.5",
  work: "M4 16.5V5.5h8v11M12 9h4v7.5M2.5 16.5h15M6.5 8h1M6.5 11h1M9 8h1M9 11h1",
  commuting: "M5 3.5h10v9H5zM5 9h10M7 12.5l-2 4M13 12.5l2 4M7.5 6.3h.01M12.5 6.3h.01",
  people: "M7 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2.5 16c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5M13.5 9a2 2 0 100-4M14.5 11.6c1.8.4 3 2 3 4.4",
  solo: "M10 9a2.75 2.75 0 100-5.5A2.75 2.75 0 0010 9zM5 16.5c0-2.8 2.2-5 5-5s5 2.2 5 5",
  "no-purchase": "M5 7h10l-1 9H6zM7.5 7V5.5a2.5 2.5 0 015 0V7M3 3l14 14",
  energy: "M4.5 15v-2M8.5 15V9.5M12.5 15V7M16.5 15V4",
  world: "M10 2.5v15M2.5 10h15M10 5.5l1.5 4.5L10 14.5 8.5 10z",
  journey: "M4 16.5c3-1 3-5 6-6s3-5 6-6M4 16.5h.01M16 4.5h.01",
  codex: "M4 4.5h5a1.5 1.5 0 011.5 1.5v10a1.5 1.5 0 00-1.5-1.5H4zM16 4.5h-5A1.5 1.5 0 009.5 6v10a1.5 1.5 0 011.5-1.5h5z",
  settings: "M4 6h6M14 6h2M4 14h2M10 14h6M12 4v4M8 12v4",
  seal: "M3.5 5.5h13v9h-13zM3.5 5.5l6.5 5 6.5-5",
  return: "M6 7h8a3 3 0 010 6H8M8.5 10.5L6 13l2.5 2.5",
  eye: "M2.5 10s2.7-5 7.5-5 7.5 5 7.5 5-2.7 5-7.5 5-7.5-5-7.5-5zM10 12a2 2 0 100-4 2 2 0 000 4z",
  play: "M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM13.5 11v5M11 13.5h5",
  spark: "M10 2.5v4M10 13.5v4M2.5 10h4M13.5 10h4M5 5l2.5 2.5M12.5 12.5L15 15M15 5l-2.5 2.5M7.5 12.5L5 15",
  location: "M10 17s5-4.6 5-8.5A5 5 0 005 8.5C5 12.4 10 17 10 17zM10 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter">
      <Path d={PATHS[name]} />
    </Svg>
  );
}

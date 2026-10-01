/**
 * SIDEQUEST design tokens for React Native. Mirrors src/styles/tokens.css of
 * the web app: raw palette values live only here, components use these names.
 */
import { createContext, useContext } from "react";
import type { Hue } from "@/domain/content-types";

export const palette = {
  paper50: "#fbf9f4",
  paper100: "#f3efe6",
  paper200: "#e8e2d4",
  paper300: "#d6cdbb",
  paper400: "#b8ad98",
  ink900: "#1b1a17",
  ink800: "#2a2824",
  ink600: "#4d4a43",
  ink500: "#67635a",
  signal500: "#d2461f",
  signal600: "#b23a17",
  signal100: "#f5dccf",
  brass500: "#7f5d18",
  brass100: "#efe3c6",
  night950: "#111315",
  night900: "#171a1d",
  night850: "#1c2024",
  night800: "#23282c",
  night700: "#30363b",
  night600: "#464d53",
  night400: "#858c91",
  night200: "#c8c2b4",
  night100: "#ece6d8",
  moss600: "#3d6844",
} as const;

export const colors = {
  background: palette.paper100,
  surface: palette.paper50,
  surfaceSunken: palette.paper200,
  surfaceElevated: "#fffdf8",
  text: palette.ink900,
  textSecondary: palette.ink600,
  textMuted: palette.ink500,
  textInverse: palette.paper50,
  border: palette.paper300,
  borderStrong: palette.ink900,
  accent: palette.signal500,
  accentText: palette.signal600,
  accentWash: palette.signal100,
  success: palette.moss600,
  warning: "#8a5d0c",
  danger: "#a3321c",
  discovery: palette.brass500,
  discoveryWash: palette.brass100,
  locked: palette.paper400,
  nightBackground: palette.night900,
  nightSurface: palette.night850,
  nightText: palette.night100,
  nightMuted: palette.night400,
  nightBorder: palette.night700,
  mapGround: palette.night900,
  mapBlock: palette.night800,
  mapBlockEdge: palette.night700,
  mapWater: "#1f272c",
  mapWaterEdge: "#2f3a40",
} as const;

export interface HueSet {
  base: string;
  deep: string;
  wash: string;
}

export const HUE: Record<Hue, HueSet> = {
  vermilion: { base: "#e4572e", deep: "#7a2210", wash: "#fde4db" },
  teal: { base: "#12a594", deep: "#0a4a44", wash: "#d5f3ee" },
  indigo: { base: "#4c6ef5", deep: "#1f2b70", wash: "#e0e6fe" },
  amber: { base: "#f08c1c", deep: "#6f3a05", wash: "#fdebd4" },
  saffron: { base: "#e8b416", deep: "#5e4505", wash: "#fbf0c8" },
  magenta: { base: "#d9366f", deep: "#6b1233", wash: "#fbdde8" },
  green: { base: "#2f9e4f", deep: "#124d24", wash: "#d9f2df" },
  violet: { base: "#8f5bd0", deep: "#3a1f64", wash: "#ece2f9" },
};

/** Neutral set used where no section hue applies (ink, like the web fallbacks). */
export const NEUTRAL: HueSet = { base: colors.accent, deep: colors.text, wash: colors.surfaceSunken };

export function hueSet(hue: Hue | null | undefined): HueSet {
  return hue ? HUE[hue] : NEUTRAL;
}

/**
 * The web app themes a subtree with data-hue; here a context does the same.
 * Components that "take the colour of the section they sit in" read it.
 */
export const HueContext = createContext<Hue | null>(null);
export function useHue(): HueSet {
  return hueSet(useContext(HueContext));
}
export function useHueName(): Hue | null {
  return useContext(HueContext);
}

export const fonts = {
  display: "InstrumentSerif",
  displayItalic: "InstrumentSerifItalic",
  ui: "PlexSans",
  uiMedium: "PlexSansMedium",
  uiSemibold: "PlexSansSemibold",
  mono: "PlexMono",
  monoMedium: "PlexMonoMedium",
} as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 } as const;
export const GUTTER = 20;
export const radius = { s: 2, m: 4, l: 10 } as const;
export const CONTROL_HEIGHT = 46;
export const CONTROL_HEIGHT_LG = 56;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, letterSpacing: -0.5 },
  hero: { fontFamily: fonts.display, fontSize: 36, lineHeight: 39, letterSpacing: -0.4 },
  h1: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34 },
  h2: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30 },
  h3: { fontFamily: fonts.uiMedium, fontSize: 18, lineHeight: 23 },
  bodyLg: { fontFamily: fonts.ui, fontSize: 18, lineHeight: 27 },
  body: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 21 },
  label: { fontFamily: fonts.uiMedium, fontSize: 11.5, lineHeight: 15, letterSpacing: 1.6, textTransform: "uppercase" as const },
  caption: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19 },
  data: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
  italic: { fontFamily: fonts.displayItalic },
} as const;

export type TypeRole = keyof typeof type;

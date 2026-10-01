import type { Glyph } from "./content-types";
import { upperFirst } from "./text";

/** Spoken name of a glyph ("Aralıklı boş halka"), for labels and screen readers. */
export function describeGlyph(g: Glyph): string {
  if (g.shape === "turn-left") return "Sol";
  if (g.shape === "turn-right") return "Sağ";
  if (g.shape === "straight") return "Düz";
  const names: Record<string, string> = { circle: "halka", square: "kare", triangle: "üçgen", arch: "kemer", diamond: "eşkenar dörtgen", bar: "çubuk" };
  return upperFirst(`${g.gap ? "Aralıklı " : ""}${g.fill === "solid" ? "dolu" : "boş"} ${names[g.shape]}`);
}

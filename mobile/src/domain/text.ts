/**
 * Turkish-aware case mapping that does not depend on the JS engine's locale
 * support. Hermes may ignore the "tr" locale in toLocaleLowerCase, which would
 * turn "İ" into "i̇" (i + combining dot) and break every Turkish text match.
 */
export function trLower(text: string): string {
  return text.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
}

export function trUpper(text: string): string {
  return text.replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase();
}

/** Uppercase letters of Turkish and basic Latin, for regexes without \p{Lu}. */
export const UPPER_TR = "A-ZÇĞİÖŞÜÂÎÛ";
/** Lowercase letters of Turkish and basic Latin, for regexes without \p{L}. */
export const LOWER_TR = "a-zçğıöşüâîû";

export function lowerFirst(text: string): string {
  return text.charAt(0) ? trLower(text.charAt(0)) + text.slice(1) : text;
}

export function upperFirst(text: string): string {
  return text.charAt(0) ? trUpper(text.charAt(0)) + text.slice(1) : text;
}

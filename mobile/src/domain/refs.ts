/**
 * Interpreter for the declarative parts of quest content:
 * refs ("estimate.value"), conditions and `{ref|format}` templates.
 */
import type { Condition, Format, Variant } from "./content-types";
import { trLower } from "./text";

export type Answers = Record<string, Record<string, unknown>>;

export function resolveRef(answers: Answers, ref: string): unknown {
  const [stepId, ...path] = ref.split(".");
  let current: unknown = answers[stepId];
  for (const key of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function compare(a: unknown, op: "eq" | "ne" | "gt" | "gte" | "lt" | "lte", b: number | string | boolean): boolean {
  if (op === "eq") return a === b;
  if (op === "ne") return a !== b;
  const x = asNumber(a);
  const y = typeof b === "number" ? b : null;
  if (x === null || y === null) return false;
  switch (op) {
    case "gt":
      return x > y;
    case "gte":
      return x >= y;
    case "lt":
      return x < y;
    case "lte":
      return x <= y;
  }
}

export function evaluate(condition: Condition, answers: Answers): boolean {
  if ("all" in condition) return condition.all.every((c) => evaluate(c, answers));
  if ("any" in condition) return condition.any.some((c) => evaluate(c, answers));
  if ("not" in condition) return !evaluate(condition.not, answers);
  if ("compare" in condition) {
    const rawA = resolveRef(answers, condition.compare.a);
    const rawB = resolveRef(answers, condition.compare.b);
    if (condition.compare.op === "eq") return rawA !== undefined && rawA === rawB;
    if (condition.compare.op === "ne") return rawA !== rawB;
    const a = asNumber(rawA);
    const b = asNumber(rawB);
    if (a === null || b === null) return false;
    return compare(a, condition.compare.op, b * (condition.compare.ratio ?? 1));
  }
  const value = resolveRef(answers, condition.ref);
  if (condition.op === "exists") return value !== undefined && value !== null && value !== "";
  return compare(value, condition.op, condition.value);
}

const MINUS = "−";
/** Shown when a value is missing. An en dash, so it never collides with prose em dashes. */
export const MISSING = "–";

function trimNumber(n: number, decimals: number): string {
  return Number(n.toFixed(decimals)).toString();
}

export function formatMinutes(min: number): string {
  if (min < 1) return `${Math.round(min * 60)} sn`;
  if (min < 10) return `${trimNumber(Math.round(min * 2) / 2, 1).replace(".", ",")} dk`;
  return `${Math.round(min)} dk`;
}

export function formatDuration(totalSec: number): string {
  const sec = Math.round(Math.abs(totalSec));
  if (sec < 60) return `${sec} sn`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 10 || s === 0) return `${Math.round(sec / 60)} dk`;
  return `${m} dk ${s} sn`;
}

function sign(n: number): string {
  if (n > 0) return "+";
  if (n < 0) return MINUS;
  return "±";
}

export function formatValue(value: unknown, format: Format): string {
  if (value === undefined || value === null || value === "") return MISSING;
  if (format === "text") return Array.isArray(value) ? value.join(", ") : String(value);
  // "phrase": an option label placed mid-sentence ("en yakın parka yürü"). Turkish-aware lowercasing.
  if (format === "phrase") return String(value).replace(/^([A-ZÇĞİÖŞÜÂÎÛ])(?![A-ZÇĞİÖŞÜÂÎÛ])/, (c) => trLower(c));
  const n = asNumber(value);
  if (n === null) return String(value);
  switch (format) {
    case "min":
      return formatMinutes(n);
    case "signed-min":
      return `${sign(n)}${formatMinutes(Math.abs(n))}`;
    case "duration":
      return formatDuration(n);
    case "signed-duration":
      return `${sign(n)}${formatDuration(n)}`;
    case "count":
      return String(Math.round(n));
    case "signed-count":
      return `${sign(Math.round(n))}${Math.abs(Math.round(n))}`;
    case "ms":
      return `${Math.round(n)} ms`;
    case "signed-ms":
      return `${sign(Math.round(n))}${Math.abs(Math.round(n))} ms`;
    case "percent":
      return `%${Math.round(n * 100)}`;
  }
}

const PLACEHOLDER = /\{([a-z0-9-]+(?:\.[a-zA-Z0-9-]+)+)(?:\|([a-z-]+))?\}/g;

export function renderTemplate(template: string, answers: Answers): string {
  return template.replace(PLACEHOLDER, (_, ref: string, format?: string) =>
    formatValue(resolveRef(answers, ref), (format as Format | undefined) ?? "text"),
  );
}

/** Refs used inside a template — used by content integrity tests. */
export function templateRefs(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((m) => m[1]);
}

export function conditionRefs(condition: Condition): string[] {
  if ("all" in condition) return condition.all.flatMap(conditionRefs);
  if ("any" in condition) return condition.any.flatMap(conditionRefs);
  if ("not" in condition) return conditionRefs(condition.not);
  if ("compare" in condition) return [condition.compare.a, condition.compare.b];
  return [condition.ref];
}

export function pickVariant(variants: Variant[], answers: Answers): Variant | null {
  return variants.find((v) => !v.when || evaluate(v.when, answers)) ?? null;
}

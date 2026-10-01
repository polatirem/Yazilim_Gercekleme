"use client";
import { useId, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import styles from "./OptionGroup.module.css";

export interface Option<V extends string | number> {
  value: V;
  label: string;
  hint?: string;
  icon?: IconName;
}

/**
 * Native radio group styled as architectural tiles.
 * Keyboard: arrow keys move within the group (browser behaviour).
 */
export function OptionGroup<V extends string | number>({
  legend,
  description,
  options,
  value,
  onChange,
  columns = "auto",
  size = "md",
  name,
  legendAs = "label",
}: {
  legend: ReactNode;
  description?: ReactNode;
  options: Option<V>[];
  value: V | null;
  onChange: (value: V) => void;
  /** "row" keeps every option on one line at all widths (e.g. a 1–5 scale). */
  columns?: "auto" | "row" | 1 | 2 | 3 | 4 | 5;
  size?: "md" | "lg";
  name?: string;
  /** "prompt" renders the legend as the step's question rather than a small label. */
  legendAs?: "label" | "prompt";
}) {
  const auto = useId();
  const group = name ?? auto;
  return (
    <fieldset className={styles.fieldset}>
      <legend className={legendAs === "prompt" ? styles.legendPrompt : styles.legend}>{legend}</legend>
      {description && <p className={styles.description}>{description}</p>}
      <div
        className={styles.options}
        data-columns={columns}
        data-size={size}
        style={columns === "row" ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
      >
        {options.map((o) => (
          <label key={String(o.value)} className={styles.option}>
            <input
              className={styles.input}
              type="radio"
              name={group}
              value={String(o.value)}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span className={styles.face}>
              {o.icon && <Icon name={o.icon} className={styles.icon} />}
              <span className={styles.label}>{o.label}</span>
              {o.hint && <span className={styles.hint}>{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

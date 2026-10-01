"use client";
import { useId } from "react";
import { Icon } from "./Icon";
import styles from "./Stepper.module.css";

/** Large numeric input with −/+ controls. The number itself stays a real, editable input. */
export function Stepper({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  const id = useId();
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const round = (v: number) => Math.round(v / step) * step;
  return (
    <div className={styles.stepper}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {hint && (
        <p className={styles.hint} id={`${id}-hint`}>
          {hint}
        </p>
      )}
      <div className={styles.row}>
        <button type="button" className={styles.control} onClick={() => onChange(clamp(round(value - step)))} disabled={value <= min} aria-label={`${label} — azalt`}>
          <Icon name="minus" />
        </button>
        <div className={styles.field}>
          <input
            id={id}
            className={styles.input}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={Number.isFinite(value) ? value : ""}
            aria-describedby={hint ? `${id}-hint` : undefined}
            onChange={(e) => {
              const v = e.target.valueAsNumber;
              if (Number.isFinite(v)) onChange(clamp(v));
            }}
          />
          {unit && <span className={styles.unit}>{unit}</span>}
        </div>
        <button type="button" className={styles.control} onClick={() => onChange(clamp(round(value + step)))} disabled={value >= max} aria-label={`${label} — artır`}>
          <Icon name="plus" />
        </button>
      </div>
    </div>
  );
}

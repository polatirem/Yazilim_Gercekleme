"use client";
/** Prompt-style steps: narrative, estimate, actual, choice, count, scale, list, item-check, text, twist. */
import { useRef, useState } from "react";
import { CONTENT } from "@/content";
import type { ListResult } from "@/domain/player-types";
import { measuredValue } from "@/domain/game";
import { formatValue } from "@/domain/refs";
import { Button } from "@/components/ui/Button";
import { OptionGroup } from "@/components/ui/OptionGroup";
import { Sigil } from "@/components/ui/Sigil";
import { Stepper } from "@/components/ui/Stepper";
import type { StepProps } from "./types";
import styles from "./Steps.module.css";

const UNIT_LABEL = { min: "min", sec: "sec", count: "" } as const;

/** Latency is measured from when the step first rendered. */
function useStartTime() {
  const [start] = useState(() => performance.now());
  return () => Math.round(performance.now() - start);
}

export function NarrativeStep({ step, submit }: StepProps<"narrative">) {
  const npc = step.speaker ? CONTENT.npcById.get(step.speaker) : undefined;
  return (
    <div className={styles.step}>
      <div className={npc ? styles.narrative : undefined}>
        {npc && <Sigil sigil={npc.sigil} size={48} />}
        <div className={styles.lines}>
          {step.lines.map((line, i) => (
            <p key={line} className="enter" style={{ ["--i" as string]: i + 1 }}>
              {line}
            </p>
          ))}
          {npc && <p className={styles.speaker}>{npc.name}</p>}
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="primary" icon="arrow-right" onClick={() => submit({})} autoFocus>
          Devam
        </Button>
      </div>
    </div>
  );
}

export function EstimateStep({ step, attempt, submit }: StepProps<"estimate">) {
  const anchor = step.anchor ? step.anchor.values[attempt.seed % 2] : null;
  const [anchorAnswer, setAnchorAnswer] = useState<"more" | "less" | null>(null);
  const [value, setValue] = useState(step.initial);
  const elapsed = useStartTime();
  const unit = UNIT_LABEL[step.unit];

  if (step.anchor && anchor !== null && anchorAnswer === null) {
    return (
      <div className={`${styles.step} ${styles.anchor}`}>
        <h2 className={styles.prompt}>{step.anchor.prompt.replace("{anchor}", String(anchor))}</h2>
        <div className={styles.actions}>
          {(["less", "more"] as const).map((a) => (
            <Button key={a} variant="secondary" size="lg" onClick={() => setAnchorAnswer(a)}>
              {a === "less" ? "Daha kısa" : "Daha uzun"}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form
      className={styles.step}
      onSubmit={(e) => {
        e.preventDefault();
        submit({ value, anchor, anchorAnswer, latencyMs: elapsed() });
      }}
    >
      <Stepper
        label={step.prompt}
        hint="Bir tahmin, söz değil. Yanlış cevap yok."
        value={value}
        onChange={setValue}
        min={step.min}
        max={step.max}
        step={step.step}
        unit={unit}
      />
      <div className={styles.actions}>
        <Button type="submit" variant="primary" icon="arrow-right">
          Kilitle: {value}
          {unit ? ` ${unit}` : ""}
        </Button>
      </div>
    </form>
  );
}

export function ActualStep({ step, attempt, submit }: StepProps<"actual">) {
  const measured = measuredValue(step, attempt.answers);
  const [value, setValue] = useState<number>(measured ?? step.min);
  const unit = UNIT_LABEL[step.unit];
  return (
    <form
      className={styles.step}
      onSubmit={(e) => {
        e.preventDefault();
        submit({ value, measured, corrected: measured !== null && value !== measured });
      }}
    >
      {measured !== null && (
        <p className={styles.measured}>
          <span className="t-label muted">Ölçülen</span>
          <span className="t-data">{formatValue(measured, step.unit === "min" ? "min" : step.unit === "sec" ? "duration" : "count")}</span>
        </p>
      )}
      <Stepper label={step.prompt} value={value} onChange={setValue} min={step.min} max={step.max} step={step.unit === "min" ? 0.5 : step.step} unit={unit} />
      <div className={styles.actions}>
        <Button type="submit" variant="primary" icon="arrow-right">
          {measured !== null && value === measured ? "Doğru" : "Devam"}
        </Button>
      </div>
    </form>
  );
}

export function ChoiceStep({ step, submit, track }: StepProps<"choice">) {
  const [selected, setSelected] = useState<string | null>(null);
  const changes = useRef(0);
  const elapsed = useStartTime();
  return (
    <form
      className={styles.step}
      onSubmit={(e) => {
        e.preventDefault();
        const option = step.options.find((o) => o.id === selected);
        if (!option) return;
        submit({ optionId: option.id, label: option.label, latencyMs: elapsed(), changes: changes.current }, elapsed());
      }}
    >
      <OptionGroup
        legend={step.prompt}
        legendAs="prompt"
        options={step.options.map((o) => ({ value: o.id, label: o.label, hint: o.hint }))}
        value={selected}
        columns={step.columns === 1 ? 1 : 2}
        onChange={(v) => {
          if (selected !== null && selected !== v && step.role === "decision") {
            changes.current++;
            track({ type: "decision_changed", stepId: step.id, interaction: "choice", value: { from: selected, to: v }, responseTimeMs: elapsed() });
          }
          setSelected(v);
        }}
      />
      <div className={styles.actions}>
        <Button type="submit" variant="primary" icon="arrow-right" disabled={!selected}>
          {step.role === "decision" ? "Seç" : "Devam"}
        </Button>
      </div>
    </form>
  );
}

export function CountStep({ step, submit }: StepProps<"count">) {
  const [value, setValue] = useState(step.initial);
  return (
    <form
      className={styles.step}
      onSubmit={(e) => {
        e.preventDefault();
        submit({ value });
      }}
    >
      <Stepper label={step.prompt} hint={step.hint} value={value} onChange={setValue} min={step.min} max={step.max} />
      <div className={styles.actions}>
        <Button type="submit" variant="primary" icon="arrow-right">
          Devam
        </Button>
      </div>
    </form>
  );
}

export function ScaleStep({ step, submit }: StepProps<"scale">) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <form
      className={styles.step}
      onSubmit={(e) => {
        e.preventDefault();
        if (value !== null) submit({ value });
      }}
    >
      <div>
        <OptionGroup
          legend={step.prompt}
          legendAs="prompt"
          options={Array.from({ length: step.points }, (_, i) => ({
            value: i + 1,
            label: String(i + 1),
            hint: i === 0 ? step.lowLabel : i === step.points - 1 ? step.highLabel : undefined,
          }))}
          value={value}
          onChange={setValue}
          columns="row"
        />
      </div>
      <div className={styles.actions}>
        <Button type="submit" variant="primary" icon="arrow-right" disabled={value === null}>
          Devam
        </Button>
      </div>
    </form>
  );
}

export function ListStep({ step, submit }: StepProps<"list">) {
  const [items, setItems] = useState<string[]>(() => Array.from({ length: step.slots }, () => ""));
  const filled = items.filter((i) => i.trim()).length;
  return (
    <form
      className={styles.step}
      onSubmit={(e) => {
        e.preventDefault();
        if (filled >= step.required) submit({ items } satisfies Pick<ListResult, "items">);
      }}
    >
      <div>
        <h2 className={styles.prompt} id={`${step.id}-prompt`}>
          {step.prompt}
        </h2>
        {step.hint && <p className="secondary">{step.hint}</p>}
      </div>
      <ol className={styles.list} aria-labelledby={`${step.id}-prompt`}>
        {items.map((item, i) => (
          <li key={i} className={styles.slot}>
            <span aria-hidden>{i + 1}</span>
            <input
              value={item}
              placeholder={i === 0 ? step.placeholder : ""}
              aria-label={`${step.prompt} — ${i + 1}. madde${i < step.required ? " (gerekli)" : " (isteğe bağlı)"}`}
              maxLength={120}
              autoFocus={i === 0}
              onChange={(e) => setItems((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
            />
          </li>
        ))}
      </ol>
      <p className={styles.privacy}>Yalnızca bu cihazda kalır. Kısa notlar yeterli.</p>
      <div className={styles.actions}>
        <Button type="submit" variant="primary" icon="arrow-right" disabled={filled < step.required}>
          {filled < step.required ? `${step.required - filled} tane daha` : "Devam"}
        </Button>
        {step.required === 0 && filled === 0 && <span className="t-caption">Hiç yazmamak da olur.</span>}
      </div>
    </form>
  );
}

export function ItemCheckStep({ step, attempt, submit }: StepProps<"item-check">) {
  const source = ((attempt.answers[step.source]?.items as string[] | undefined) ?? []).filter(Boolean);
  const [marks, setMarks] = useState<(string | null)[]>(() => source.map(() => null));
  const done = marks.every(Boolean);
  return (
    <form
      className={styles.step}
      onSubmit={(e) => {
        e.preventDefault();
        if (!done) return;
        const counts = Object.fromEntries(step.options.map((o) => [o.id, marks.filter((m) => m === o.id).length]));
        submit({ marks, counts });
      }}
    >
      <h2 className={styles.prompt}>{step.prompt}</h2>
      <div className={styles.checkRows}>
        {source.map((item, i) => (
          <div key={i} className={styles.checkRow}>
            <fieldset>
              <legend>{item}</legend>
              <div className={styles.segmented}>
                {step.options.map((o) => (
                  <label key={o.id}>
                    <input type="radio" name={`${step.id}-${i}`} checked={marks[i] === o.id} onChange={() => setMarks((m) => m.map((x, j) => (j === i ? o.id : x)))} />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ))}
      </div>
      <div className={styles.actions}>
        <Button type="submit" variant="primary" icon="arrow-right" disabled={!done}>
          Devam
        </Button>
      </div>
    </form>
  );
}

export function TextStep({ step, submit }: StepProps<"text">) {
  const [text, setText] = useState("");
  return (
    <form
      className={styles.step}
      onSubmit={(e) => {
        e.preventDefault();
        submit({ text: text.trim() });
      }}
    >
      <label className={styles.prompt} htmlFor={step.id}>
        {step.prompt}
      </label>
      {step.hint && <p className={styles.hint}>{step.hint}</p>}
      <input id={step.id} className={styles.textarea} style={{ minHeight: 56 }} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />
      <p className={styles.privacy}>Yalnızca bu cihazda kalır.</p>
      <div className={styles.actions}>
        <Button type="submit" variant="primary" icon="arrow-right" disabled={!step.optional && !text.trim()}>
          {text.trim() || !step.optional ? "Devam" : "Bunu geç"}
        </Button>
      </div>
    </form>
  );
}

export function TwistStep({ step, submit }: StepProps<"twist">) {
  return (
    <div className={styles.step}>
      <div className={`${styles.twist} unfold`} role="alert">
        <p className={`t-label ${styles.twistLabel}`}>Sürpriz</p>
        <p className="t-hero">{step.title}</p>
        <p className="t-body-lg">{step.body}</p>
      </div>
      <div className={styles.actions}>
        <Button variant="primary" icon="arrow-right" onClick={() => submit({})} autoFocus>
          Yeniden planla
        </Button>
      </div>
    </div>
  );
}

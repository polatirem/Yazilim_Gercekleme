"use client";
/** RULE SHIFT engine — respond by a rule that changes with little warning. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RULES, generateTrials, scoreRuleShift, type Side, type TrialResponse } from "@/domain/engines/rule-shift";
import type { RuleShiftResult } from "@/domain/player-types";
import { stepSeed } from "@/domain/random";
import { formatValue } from "@/domain/refs";
import { Button } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Glyph";
import type { StepProps } from "@/components/steps/types";
import styles from "./Microgames.module.css";

const ITI_MS = 350;

export function RuleShift({ step, attempt, submit }: StepProps<"rule-shift">) {
  const trials = useMemo(() => generateTrials(step, stepSeed(attempt.seed, step.id)), [step, attempt.seed]);
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState<RuleShiftResult | null>(null);
  const shownAt = useRef(0);
  const responses = useRef<TrialResponse[]>([]);

  useEffect(() => {
    if (phase !== "running" || visible) return;
    const t = window.setTimeout(() => {
      shownAt.current = performance.now();
      setVisible(true);
    }, index === 0 ? 700 : ITI_MS);
    return () => window.clearTimeout(t);
  }, [phase, index, visible]);

  const respond = useCallback(
    (answer: Side) => {
      if (phase !== "running" || !visible) return;
      responses.current.push({ answer, rtMs: Math.round(performance.now() - shownAt.current) });
      setVisible(false);
      if (index + 1 < trials.length) setIndex((i) => i + 1);
      else {
        setResult(scoreRuleShift(trials, responses.current));
        setPhase("done");
      }
    },
    [phase, visible, index, trials],
  );

  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "f" || e.key === "F") respond("left");
      if (e.key === "ArrowRight" || e.key === "j" || e.key === "J") respond("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, respond]);

  const trial = trials[index];
  const rule = RULES[trial.rule];

  if (phase === "intro") {
    return (
      <div className={styles.game}>
        <p className={styles.instruction}>{step.instruction}</p>
        <dl className={styles.rules}>
          {step.rules.map((r) => (
            <div key={r}>
              <dt className="t-label">{RULES[r].name}</dt>
              <dd>{RULES[r].instruction}</dd>
            </div>
          ))}
        </dl>
        <p className="t-caption">İki düğmeyle ya da ← → tuşlarıyla cevap ver. Hız biraz önemli; doğru olmak daha önemli.</p>
        <div className={styles.row}>
          <Button variant="primary" onClick={() => setPhase("running")} autoFocus>
            Başla — {trials.length} işaret
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "done" && result) {
    return (
      <div className={styles.game}>
        <div className={styles.stage} data-state="idle">
          <p className="t-h2">{result.switchCostMs > 60 ? `Her kural değişimi ilk anda sana yaklaşık ${formatValue(result.switchCostMs, "ms")} kaybettirdi.` : "Kural değişimleri seni pek yavaşlatmadı."}</p>
          <p className="secondary">
            {result.trials} işaretten {result.correct} tanesi doğru ayrıldı.
          </p>
          <Button variant="primary" icon="arrow-right" onClick={() => submit(result as unknown as Record<string, unknown>)} autoFocus>
            Devam
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.game}>
      <div key={`${trial.rule}-${trial.isSwitch ? index : "run"}`} className={styles.ruleBanner} data-switch={trial.isSwitch} aria-live="assertive">
        <span className="t-label">{trial.isSwitch ? "Kural değişti" : "Kural"}</span>
        <span className={styles.ruleText}>{rule.instruction}</span>
      </div>
      <div className={styles.arena} aria-hidden>
        <div className={styles.half}>{visible && trial.stimulus.side === "left" && <Glyph glyph={{ shape: trial.stimulus.shape, fill: trial.stimulus.fill, gap: false }} size={96} />}</div>
        <div className={styles.half}>{visible && trial.stimulus.side === "right" && <Glyph glyph={{ shape: trial.stimulus.shape, fill: trial.stimulus.fill, gap: false }} size={96} />}</div>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {visible ? `${trial.stimulus.side === "left" ? "Solda" : "Sağda"} ${trial.stimulus.fill === "solid" ? "dolu" : "boş"} bir işaret` : ""}
      </p>
      <div className={styles.responses}>
        <button type="button" className={styles.responseButton} onClick={() => respond("left")}>
          <span className="t-data muted">←</span> {rule.left}
        </button>
        <button type="button" className={styles.responseButton} onClick={() => respond("right")}>
          {rule.right} <span className="t-data muted">→</span>
        </button>
      </div>
      <p className="t-data muted">
        {index + 1} / {trials.length}
      </p>
    </div>
  );
}

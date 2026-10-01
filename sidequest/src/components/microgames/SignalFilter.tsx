"use client";
/** SIGNAL FILTER engine — find the targets among near-identical lures, against a short clock. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generateRound, scoreFilter, type RoundResponse } from "@/domain/engines/signal-filter";
import type { SignalFilterResult } from "@/domain/player-types";
import { stepSeed } from "@/domain/random";
import { Button } from "@/components/ui/Button";
import { Glyph, describeGlyph } from "@/components/ui/Glyph";
import type { StepProps } from "@/components/steps/types";
import styles from "./Microgames.module.css";

export function SignalFilter({ step, attempt, submit }: StepProps<"signal-filter">) {
  const seed = stepSeed(attempt.seed, step.id);
  const [phase, setPhase] = useState<"ready" | "round" | "done">("ready");
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<SignalFilterResult | null>(null);
  const responses = useRef<RoundResponse[]>([]);
  const roundStart = useRef(0);
  const cells = useMemo(() => generateRound(step, seed, round), [step, seed, round]);
  const target = { shape: step.target.shape ?? "circle", fill: step.target.fill ?? "open", gap: step.target.gap ?? false } as const;

  const endRound = useCallback(() => {
    responses.current.push({
      targets: cells.map((c, i) => (c.isTarget ? i : -1)).filter((i) => i >= 0),
      selected,
      ms: Math.round(performance.now() - roundStart.current),
    });
    setSelected([]);
    if (round + 1 < step.rounds) {
      setRound((r) => r + 1);
    } else {
      setResult(scoreFilter(responses.current));
      setPhase("done");
    }
  }, [cells, selected, round, step.rounds]);

  useEffect(() => {
    if (phase !== "round") return;
    roundStart.current = performance.now();
    const t = window.setTimeout(endRound, step.secondsPerRound * 1000);
    return () => window.clearTimeout(t);
    // The timer restarts only when a new round begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round]);

  return (
    <div className={styles.game}>
      <p className={styles.instruction}>{step.instruction}</p>
      <div className={styles.targetKey}>
        <span className="t-label muted">Aranan</span>
        <Glyph glyph={target} size={32} />
        <span>{step.targetLabel}</span>
      </div>

      {phase === "ready" && (
        <div className={styles.stage} data-state="idle">
          <p className="t-body-lg secondary">
            {step.rounds} tur, her biri {step.secondsPerRound} saniye.
          </p>
          <Button variant="primary" onClick={() => setPhase("round")} autoFocus>
            Başla
          </Button>
        </div>
      )}

      {phase === "round" && (
        <>
          <div className={styles.roundHead}>
            <span className="t-data">
              Tur {round + 1} / {step.rounds}
            </span>
            <span className="t-data muted">{selected.length} işaretlendi</span>
          </div>
          <div key={round} className={styles.drain} style={{ animationDuration: `${step.secondsPerRound}s` }} aria-hidden />
          <div className={`${styles.field} fade`} style={{ gridTemplateColumns: `repeat(${step.cols}, 1fr)` }} role="group" aria-label={`Tur ${round + 1}: her ${step.targetLabel.toLocaleLowerCase("tr")} işaretle`}>
            {cells.map((c, i) => (
              <button
                key={i}
                type="button"
                className={styles.fieldCell}
                aria-pressed={selected.includes(i)}
                aria-label={describeGlyph(c.glyph)}
                onClick={() => setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))}
              >
                <Glyph glyph={c.glyph} rotation={c.rotation} size={34} />
              </button>
            ))}
          </div>
          <div className={styles.row}>
            <Button variant="secondary" onClick={endRound}>
              {round + 1 < step.rounds ? "Sonraki tur" : "Bitir"}
            </Button>
          </div>
        </>
      )}

      {phase === "done" && result && (
        <div className={styles.stage} data-state="idle">
          <p className="t-h2">
            {result.targets} hedeften {result.hits} tanesi bulundu{result.falseAlarms ? `, ${result.falseAlarms} tanesi yanlışlıkla işaretlendi` : ""}.
          </p>
          <p className="secondary">Gözlerin ısındı. Öyle kalsınlar.</p>
          <Button variant="primary" icon="arrow-right" onClick={() => submit(result as unknown as Record<string, unknown>)} autoFocus>
            Devam
          </Button>
        </div>
      )}
    </div>
  );
}

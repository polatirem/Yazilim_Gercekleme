"use client";
/** SEQUENCE RECALL engine — encode now, rebuild after the real world has had its turn. */
import { useEffect, useMemo, useState } from "react";
import type { SequenceItem, StepOf } from "@/domain/content-types";
import type { SequenceEncodeResult } from "@/domain/player-types";
import { generateEncoding, generateSceneChange, recallPalette, scoreOrder, scoreScene } from "@/domain/engines/sequence";
import { stepSeed } from "@/domain/random";
import { Button } from "@/components/ui/Button";
import { Glyph, describeGlyph } from "@/components/ui/Glyph";
import type { StepProps } from "@/components/steps/types";
import styles from "./Microgames.module.css";

function Item({ item, size = 56 }: { item: SequenceItem; size?: number }) {
  return item.glyph ? <Glyph glyph={item.glyph} size={size} /> : <span className={styles.wordItem}>{item.label}</span>;
}

export function SequenceEncode({ step, attempt, submit }: StepProps<"sequence-encode">) {
  const encoding = useMemo(() => generateEncoding(step, stepSeed(attempt.seed, step.id)), [step, attempt.seed]);
  const [phase, setPhase] = useState<"ready" | "showing" | "done">("ready");
  const [index, setIndex] = useState(0);
  const byId = useMemo(() => new Map(step.pool.map((p) => [p.id, p])), [step.pool]);

  useEffect(() => {
    if (phase !== "showing") return;
    const duration = step.mode === "order" ? step.displayMs : step.displayMs;
    const t = window.setTimeout(() => {
      if (step.mode === "order" && index < encoding.items.length - 1) setIndex((i) => i + 1);
      else setPhase("done");
    }, duration);
    return () => window.clearTimeout(t);
  }, [phase, index, step.mode, step.displayMs, encoding.items.length]);

  const grid = step.grid ?? { cols: 4, rows: 3 };

  return (
    <div className={styles.game}>
      <p className={styles.instruction}>{step.instruction}</p>

      {phase === "ready" && (
        <div className={styles.stage} data-state="idle">
          <p className="t-body-lg secondary">
            {step.mode === "order" ? `Art arda ${encoding.items.length} tane, birer birer. Gösterilirken hiçbir şeye basma.` : `${Math.round(step.displayMs / 1000)} saniyen olacak.`}
          </p>
          <Button variant="primary" icon="eye" onClick={() => setPhase("showing")} autoFocus>
            Göster
          </Button>
        </div>
      )}

      {phase === "showing" && step.mode === "order" && (
        <div className={styles.stage} data-state="live">
          <div key={index} className={`${styles.single} fade`} aria-live="assertive">
            <Item item={byId.get(encoding.items[index])!} size={120} />
            <span className={styles.singleLabel}>{byId.get(encoding.items[index])!.label}</span>
          </div>
          <ol className={styles.pips} aria-hidden>
            {encoding.items.map((_, i) => (
              <li key={i} data-on={i <= index} />
            ))}
          </ol>
        </div>
      )}

      {phase === "showing" && step.mode === "scene" && (
        <div className={styles.stage} data-state="live">
          <div className={styles.scene} style={{ gridTemplateColumns: `repeat(${grid.cols}, 1fr)` }} role="list" aria-label="Hatırlanacak düzen">
            {encoding.cells.map((id, i) => (
              <div key={i} className={styles.sceneCell} role="listitem" aria-label={id ? `${i + 1}. konum: ${describeGlyph(byId.get(id)!.glyph!)}` : `${i + 1}. konum: boş`}>
                {id && <Item item={byId.get(id)!} size={44} />}
              </div>
            ))}
          </div>
          <div className={styles.drain} style={{ animationDuration: `${step.displayMs}ms` }} aria-hidden />
        </div>
      )}

      {phase === "done" && (
        <div className={styles.stage} data-state="idle">
          <p className="t-h2">Aklında. Sonra lazım olacak.</p>
          <Button variant="primary" icon="arrow-right" onClick={() => submit(encoding as unknown as Record<string, unknown>)} autoFocus>
            Devam
          </Button>
        </div>
      )}
    </div>
  );
}

function encodeStepFor(props: StepProps<"sequence-recall">): StepOf<"sequence-encode"> {
  return props.quest.prime.find((s) => s.id === props.step.source) as StepOf<"sequence-encode">;
}

export function SequenceRecall(props: StepProps<"sequence-recall">) {
  return props.step.mode === "order" ? <OrderRecall {...props} /> : <SceneChange {...props} />;
}

function OrderRecall(props: StepProps<"sequence-recall">) {
  const { step, attempt, submit } = props;
  const encodeStep = encodeStepFor(props);
  const encoding = attempt.answers[step.source] as unknown as SequenceEncodeResult;
  const palette = useMemo(() => recallPalette(encodeStep.pool, stepSeed(attempt.seed, step.id)), [encodeStep.pool, attempt.seed, step.id]);
  const byId = new Map(encodeStep.pool.map((p) => [p.id, p]));
  const [response, setResponse] = useState<string[]>([]);
  const total = encoding.items.length;

  return (
    <div className={styles.game}>
      <h2 className={styles.prompt}>{step.prompt}</h2>
      <ol className={styles.slots} aria-label={`Senin dizin, ${total} yerden ${response.length} dolu`}>
        {Array.from({ length: total }, (_, i) => {
          const id = response[i];
          return (
            <li key={i} className={styles.slotBox} data-filled={Boolean(id)} data-next={i === response.length}>
              <span className={styles.slotNumber}>{i + 1}</span>
              {id ? (
                <span className="fade">
                  <Item item={byId.get(id)!} size={40} />
                  <span className="visually-hidden">{byId.get(id)!.label}</span>
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className={styles.palette} role="group" aria-label="Sıradakini ekle">
        {palette.map((p) => (
          <button key={p.id} type="button" className={styles.paletteButton} disabled={response.length >= total} onClick={() => setResponse((r) => [...r, p.id])}>
            <Item item={p} size={36} />
            <span>{p.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.row}>
        <Button variant="primary" icon="arrow-right" disabled={response.length < total} onClick={() => submit(scoreOrder(encoding.items, response) as unknown as Record<string, unknown>)}>
          Sıra bu
        </Button>
        <Button variant="quiet" disabled={response.length === 0} onClick={() => setResponse((r) => r.slice(0, -1))}>
          Sonuncuyu geri al
        </Button>
      </div>
    </div>
  );
}

function SceneChange(props: StepProps<"sequence-recall">) {
  const { step, attempt, submit } = props;
  const encodeStep = encodeStepFor(props);
  const encoding = attempt.answers[step.source] as unknown as SequenceEncodeResult;
  const change = useMemo(() => generateSceneChange(encoding, encodeStep.pool, step.changes, stepSeed(attempt.seed, step.id)), [encoding, encodeStep.pool, step.changes, attempt.seed, step.id]);
  const byId = new Map(encodeStep.pool.map((p) => [p.id, p]));
  const [selected, setSelected] = useState<number[]>([]);
  const grid = encodeStep.grid ?? { cols: 4, rows: 3 };

  const toggle = (i: number) =>
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : s.length >= step.changes ? [...s.slice(1), i] : [...s, i]));

  return (
    <div className={styles.game}>
      <h2 className={styles.prompt}>{step.prompt}</h2>
      <div className={styles.scene} style={{ gridTemplateColumns: `repeat(${grid.cols}, 1fr)` }}>
        {change.after.map((id, i) =>
          id ? (
            <button
              key={i}
              type="button"
              className={styles.sceneCell}
              data-selectable
              aria-pressed={selected.includes(i)}
              aria-label={`${i + 1}. konum: ${describeGlyph(byId.get(id)!.glyph!)}`}
              onClick={() => toggle(i)}
            >
              <Item item={byId.get(id)!} size={44} />
            </button>
          ) : (
            <div key={i} className={styles.sceneCell} aria-hidden />
          ),
        )}
      </div>
      <div className={styles.row}>
        <Button variant="primary" icon="arrow-right" disabled={selected.length === 0} onClick={() => submit(scoreScene(change.changed, selected, change.after) as unknown as Record<string, unknown>)}>
          Değişen bu
        </Button>
        <Button variant="quiet" onClick={() => submit(scoreScene(change.changed, [], change.after) as unknown as Record<string, unknown>)}>
          Bilemiyorum
        </Button>
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDuration } from "@/domain/refs";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { OptionGroup } from "@/components/ui/OptionGroup";
import { StepRenderer } from "@/components/steps/StepRenderer";
import { GAMES, LEVEL_LABEL, loadRecords, practiceAttempt, practiceQuest, saveResult, type GameDef, type Level, type Records, type Summary } from "./games";
import styles from "./Playground.module.css";

function newSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

function Result({ level, summary, isBest, record, onAgain, onBack }: { level: Level; summary: Summary; isBest: boolean; record: Records[string] | undefined; onAgain: () => void; onBack: () => void }) {
  return (
    <div className={`${styles.result} unfold`} role="status">
      {isBest && (
        <p className={styles.best}>
          <Icon name="spark" size={18} /> Yeni kişisel rekor
        </p>
      )}
      <p className="t-hero">{summary.headline}</p>
      <p className="t-body-lg">{summary.detail}</p>
      <dl className={styles.stats}>
        <div>
          <dt className="t-label">Bu tur</dt>
          <dd>{summary.score === 9999 ? "–" : summary.score}</dd>
        </div>
        <div>
          <dt className="t-label">Rekor ({LEVEL_LABEL[level]})</dt>
          <dd>{record?.best ?? "–"}</dd>
        </div>
        <div>
          <dt className="t-label">Oynama</dt>
          <dd>{record?.plays ?? 1}</dd>
        </div>
      </dl>
      <p className="t-caption">Birim: {summary.unit}. Isınma sonuçları yalnızca bu cihazda tutulur; Yolculuk&apos;una yazılmaz ve bir ölçüm değildir.</p>
      <div className={styles.row}>
        <Button variant="primary" icon="return" onClick={onAgain}>
          Tekrar oyna
        </Button>
        <Button variant="secondary" onClick={onBack}>
          Başka bir oyun
        </Button>
      </div>
      <p className={styles.nudge}>
        Hazır mısın? Gerçek dünyada da dene: <Link href="/quest">bana bir görev ver</Link>.
      </p>
    </div>
  );
}

function StepsGame({ game, level, onDone }: { game: GameDef; level: Level; onDone: (s: Summary) => void }) {
  const [seed] = useState(newSeed);
  const steps = useMemo(() => game.build!(level), [game, level]);
  const quest = useMemo(() => practiceQuest(steps), [steps]);
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [index, setIndex] = useState(0);
  const step = quest.prime[index];

  return (
    <div key={`${step.id}-${index}`} className="enter">
      <p className={`t-label ${styles.stepCount}`}>
        {index + 1} / {quest.prime.length}
      </p>
      <StepRenderer
        step={step}
        quest={quest}
        attempt={practiceAttempt(seed, answers)}
        track={() => undefined}
        submit={(result) => {
          const next = { ...answers, [step.id]: result };
          setAnswers(next);
          if (index + 1 < quest.prime.length) setIndex(index + 1);
          else onDone(game.summarize!(next));
        }}
      />
    </div>
  );
}

/** İç Saat: hedef süreyi saat görmeden tahmin et. */
function TimingGame({ level, onDone }: { level: Level; onDone: (s: Summary) => void }) {
  const [target] = useState(() => {
    const [lo, hi] = [[5, 10], [8, 20], [15, 40]][level - 1];
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  });
  const [phase, setPhase] = useState<"ready" | "running">("ready");
  const start = useRef(0);

  const stop = () => {
    const elapsed = (performance.now() - start.current) / 1000;
    const error = elapsed - target;
    const abs = Math.abs(error);
    onDone({
      headline: abs < 0.5 ? "Neredeyse kusursuz." : `${formatDuration(abs)} ${error > 0 ? "geç" : "erken"} durdun.`,
      detail: `Hedef ${target} saniyeydi; sen ${elapsed.toFixed(1).replace(".", ",")} saniyede durdun. ${error < 0 ? "Dikkat ettiğin zaman uzun gelir." : "Zaman sayılmadan akıp gitti."}`,
      score: Math.round(abs * 10) / 10,
      better: "lower",
      unit: "sn sapma",
    });
  };

  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className={styles.timing}>
      {phase === "ready" ? (
        <>
          <p className="t-label">Hedef</p>
          <p className={styles.target}>{target} saniye</p>
          <p className="t-body-lg">Başla&apos;ya bas, saymadan bekle ve tam {target} saniye geçtiğini hissettiğinde Dur&apos;a bas.</p>
          <Button
            variant="primary"
            size="lg"
            autoFocus
            onClick={() => {
              start.current = performance.now();
              setPhase("running");
            }}
          >
            Başla
          </Button>
        </>
      ) : (
        <>
          <span className={styles.pulse} aria-hidden />
          <p className="t-h1">Saat çalışıyor. Göremezsin.</p>
          <button type="button" className={styles.stop} onClick={stop} autoFocus>
            Dur
          </button>
          <p className="t-caption">Boşluk ya da Enter tuşu da olur.</p>
        </>
      )}
    </div>
  );
}

export function Playground() {
  const [active, setActive] = useState<GameDef | null>(null);
  const [level, setLevel] = useState<Level>(1);
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<{ summary: Summary; isBest: boolean; records: Records } | null>(null);
  // Yalnızca istemcide çizilir (GameGate hazır olduğunda), bu yüzden localStorage burada güvenli.
  const [records, setRecords] = useState<Records>(loadRecords);

  const finish = (summary: Summary) => {
    if (!active) return;
    const saved = saveResult(active.id, level, summary);
    setRecords(saved.records);
    setResult({ summary, isBest: saved.isBest, records: saved.records });
  };

  if (active) {
    return (
      <div className={styles.page} data-hue={active.hue}>
        <button type="button" className={styles.back} onClick={() => { setActive(null); setResult(null); }}>
          <Icon name="arrow-left" size={18} /> Oyun Alanı
        </button>
        <header className={styles.gameHead}>
          <span className={styles.gameIcon}>
            <Icon name={active.icon} size={28} />
          </span>
          <div>
            <h1 className="t-h1">{active.title}</h1>
            <p className="secondary">
              {active.tagline} · {LEVEL_LABEL[level]}
            </p>
          </div>
        </header>
        {result ? (
          <Result
            level={level}
            summary={result.summary}
            isBest={result.isBest}
            record={result.records[`${active.id}:${level}`]}
            onAgain={() => {
              setResult(null);
              setRun((r) => r + 1);
            }}
            onBack={() => {
              setActive(null);
              setResult(null);
            }}
          />
        ) : active.kind === "timing" ? (
          <TimingGame key={run} level={level} onDone={finish} />
        ) : (
          <StepsGame key={run} game={active} level={level} onDone={finish} />
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className="t-label muted">Oyun Alanı</p>
        <h1 className="t-hero">Isın, oyna, rekorunu kır.</h1>
        <p className="t-body-lg secondary">Görevlerdeki mikro oyunları burada serbestçe oynayabilirsin. Kısa, renkli ve tekrar tekrar oynanabilir. Asıl macera yine de dışarıda.</p>
      </header>

      <div className={styles.levelPick} data-hue="green">
        <OptionGroup
          legend="Zorluk"
          options={[
            { value: 1 as Level, label: "Kolay" },
            { value: 2 as Level, label: "Orta" },
            { value: 3 as Level, label: "Zor" },
          ]}
          value={level}
          onChange={setLevel}
          columns="row"
        />
      </div>

      <ul className={styles.grid}>
        {GAMES.map((game, i) => {
          const rec = records[`${game.id}:${level}`];
          return (
            <li key={game.id} data-hue={game.hue} className="enter" style={{ ["--i" as string]: i }}>
              <button
                type="button"
                className={styles.card}
                onClick={() => {
                  setActive(game);
                  setResult(null);
                  setRun((r) => r + 1);
                }}
              >
                <span className={styles.cardIcon}>
                  <Icon name={game.icon} size={28} />
                </span>
                <span className={styles.cardTitle}>{game.title}</span>
                <span className={styles.cardTag}>{game.tagline}</span>
                <span className={styles.cardMeta}>{rec?.best != null ? `Rekor: ${rec.best} · ${rec.plays} kez oynandı` : "Henüz oynanmadı"}</span>
                <span className={styles.cardPlay}>
                  Oyna <Icon name="arrow-right" size={16} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className={styles.cta} data-hue="vermilion">
        <p className="t-h2">Isındın mı? Gerçek dünya seni bekliyor.</p>
        <ButtonLink href="/quest" variant="primary" size="lg" icon="arrow-right">
          Bana bir görev ver
        </ButtonLink>
      </div>
    </div>
  );
}

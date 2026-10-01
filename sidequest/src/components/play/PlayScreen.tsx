"use client";
import Link from "next/link";
import { useState } from "react";
import { CONTENT, questCode } from "@/content";
import type { Quest } from "@/domain/content-types";
import type { PlayerState, QuestAttempt } from "@/domain/player-types";
import { GameError, abandonQuest, beginQuest, startAct, submitStep, trackInteraction } from "@/domain/game";
import { InvalidTransitionError, isInProgress, movementOf, stepsFor } from "@/domain/quest-machine";
import { renderTemplate } from "@/domain/refs";
import { npcCallback } from "@/domain/npc";
import type { Ctx } from "@/domain/behavior/events";
import { dispatch } from "@/state/store";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sigil } from "@/components/ui/Sigil";
import { EmptyState, ErrorPanel, Notice } from "@/components/ui/States";
import { Requirements, durationLabel } from "@/components/quest/Requirements";
import { StepRenderer } from "@/components/steps/StepRenderer";
import { ActScreen, ReturnTransition } from "./ActScreen";
import { RevealView } from "./RevealView";
import styles from "./Play.module.css";

type Command = (s: PlayerState, ctx: Ctx) => PlayerState;

/** Runs a command, turning rule violations into an honest message instead of a crash. */
export function useRun() {
  const [error, setError] = useState<string | null>(null);
  const run = (command: Command) => {
    try {
      dispatch(command);
      setError(null);
    } catch (e) {
      if (e instanceof GameError || e instanceof InvalidTransitionError) setError(e.message);
      else setError(`Bir şey kaydedilemedi: ${(e as Error).message}`);
    }
  };
  return { run, error };
}

const MOVEMENTS = [
  { id: "think", label: "Düşün" },
  { id: "act", label: "Yap" },
  { id: "discover", label: "Keşfet" },
] as const;

export function PhaseIndicator({ attempt }: { attempt: QuestAttempt }) {
  const current = movementOf(attempt.state);
  return (
    <ol className={styles.phases} aria-label="Görev aşaması">
      {MOVEMENTS.map((m) => (
        <li key={m.id} data-current={current === m.id} aria-current={current === m.id ? "step" : undefined}>
          {m.label}
        </li>
      ))}
    </ol>
  );
}

function SetAside({ run }: { run: (c: Command) => void }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm)
    return (
      <Button variant="quiet" onClick={() => setConfirm(true)}>
        Kenara koy
      </Button>
    );
  return (
    <span className={styles.confirm} role="group" aria-label="Bu görev kenara konsun mu?">
      <span className="t-caption">Kenara konsun mu? Hiçbir şey kaybolmaz.</span>
      <Button variant="danger" onClick={() => run((s, ctx) => abandonQuest(s, CONTENT, ctx))}>
        Kenara koy
      </Button>
      <Button variant="quiet" onClick={() => setConfirm(false)}>
        Devam et
      </Button>
    </span>
  );
}

function PlayHeader({ quest, attempt, run }: { quest: Quest; attempt: QuestAttempt; run: (c: Command) => void }) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.back}>
        <Icon name="arrow-left" size={18} />
        <span>Şehir</span>
      </Link>
      <p className={`t-data ${styles.code}`}>
        {questCode(quest)} · {quest.title}
      </p>
      <PhaseIndicator attempt={attempt} />
      {attempt.state !== "REVEAL" && <SetAside run={run} />}
    </header>
  );
}

function Briefing({ quest, attempt, player, run }: { quest: Quest; attempt: QuestAttempt; player: PlayerState; run: (c: Command) => void }) {
  const npc = CONTENT.npcById.get(quest.npcId)!;
  const campaign = CONTENT.campaignById.get(quest.campaignId)!;
  const callback = npcCallback(CONTENT, npc.id, { ...player, events: player.events.filter((e) => e.attemptId !== attempt.id) });
  const thinkSteps = quest.prime.filter((s) => s.kind !== "narrative").length;
  return (
    <section className={styles.section}>
      {attempt.mystery && <p className={`t-label ${styles.accentLabel} fade`}>Gizemli görev — mühür açıldı</p>}
      <p className={`t-data muted ${attempt.mystery ? "fade" : ""}`} style={{ ["--i" as string]: 1 }}>
        {questCode(quest)} · {campaign.title}
      </p>
      <h1 className={`t-display ${styles.title} ${attempt.mystery ? "unfold" : "enter"}`} style={{ ["--i" as string]: 2 }}>
        {quest.title}
      </h1>
      <p className="t-h2 t-italic secondary enter" style={{ ["--i" as string]: 3 }}>
        {quest.subtitle}
      </p>
      <p className="t-body-lg enter" style={{ ["--i" as string]: 4, maxWidth: "var(--measure)" }}>
        {quest.description}
      </p>
      <figure className={`${styles.voice} enter`} style={{ ["--i" as string]: 5 }}>
        <Sigil sigil={npc.sigil} size={44} />
        <div>
          <blockquote>“{quest.npcLine}”</blockquote>
          {callback && <p className={styles.callback}>{callback}</p>}
          <figcaption className="t-caption">{npc.name}</figcaption>
        </div>
      </figure>
      <ol className={`${styles.plan} enter`} style={{ ["--i" as string]: 6 }}>
        <li>
          <span className="t-label">Düşün</span>
          <span>{thinkSteps ? `Önce burada ${thinkSteps} kısa adım.` : "Görevi okumak için bir an."}</span>
        </li>
        <li>
          <span className="t-label">Yap</span>
          <span>Dışarıda {durationLabel(quest)}, cihaz kenarda.</span>
        </li>
        <li>
          <span className="t-label">Keşfet</span>
          <span>Geri dön, hatırla, neyi gösterdiğini gör.</span>
        </li>
      </ol>
      <div className={styles.actions}>
        <Button variant="primary" size="lg" icon="arrow-right" onClick={() => run((s, ctx) => beginQuest(s, CONTENT, ctx))} autoFocus>
          Başla
        </Button>
      </div>
    </section>
  );
}

const PHASE_TITLES: Partial<Record<QuestAttempt["state"], { label: string; hint: string }>> = {
  PRIMING: { label: "Düşün", hint: "Hazırlık. Bir iki dakika." },
  RECALL: { label: "Hatırla", hint: "Neyi hatırlıyorsun?" },
  REFLECTION: { label: "Düşün ve yorumla", hint: "Sonuçtan önce." },
};

function StepPhase({ quest, attempt, run }: { quest: Quest; attempt: QuestAttempt; run: (c: Command) => void }) {
  const steps = stepsFor(quest, attempt.state);
  const step = steps[attempt.stepIndex];
  const title = PHASE_TITLES[attempt.state]!;
  if (!step) return <ErrorPanel title="Bu adım eksik.">Görevin içeriği kayıtlı ilerlemeyle uyuşmuyor. Kenara koy ve yeniden başla.</ErrorPanel>;
  return (
    <section className={styles.section} aria-labelledby="phase-label">
      <p id="phase-label" className={`t-label ${styles.phaseLabel}`}>
        {title.label}
        <span className="t-data muted">
          {" "}
          {attempt.stepIndex + 1} / {steps.length}
        </span>
      </p>
      <div key={`${attempt.state}-${attempt.stepIndex}`} className="enter">
        <StepRenderer
          step={step}
          quest={quest}
          attempt={attempt}
          submit={(result, rt) => run((s, ctx) => submitStep(s, CONTENT, step.id, result, ctx, rt ?? null))}
          track={(i) => run((s, ctx) => trackInteraction(s, CONTENT, { stepId: step.id, ...i }, ctx))}
        />
      </div>
    </section>
  );
}

function Mission({ quest, attempt, run }: { quest: Quest; attempt: QuestAttempt; run: (c: Command) => void }) {
  const t = (text: string) => renderTemplate(text, attempt.answers);
  return (
    <section className={styles.section}>
      <p className={`t-label ${styles.accentLabel}`}>Görev</p>
      <h1 className={`t-hero ${styles.mission} unfold`}>{t(quest.act.instruction)}</h1>
      {quest.act.details.length > 0 && (
        <ul className={styles.details}>
          {quest.act.details.map((d) => (
            <li key={d}>{t(d)}</li>
          ))}
        </ul>
      )}
      {quest.act.segments.length > 0 && (
        <ol className={styles.segments}>
          {quest.act.segments.map((s) => (
            <li key={s.id}>
              <span className="t-label">{s.label}</span>
              <span>{s.instruction}</span>
            </li>
          ))}
        </ol>
      )}
      <Requirements quest={quest} showDifficulty={false} />
      <ul className={styles.safetyList} aria-label="Güvenlik">
        {quest.safety.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <p className="t-caption">Hiçbir saat gösterilmeyecek. Saatçi sessizce tutar; ne zaman döndüğüne yalnızca sen karar verirsin.</p>
      <div className={styles.actions}>
        <Button variant="primary" size="lg" icon="arrow-right" onClick={() => run((s, ctx) => startAct(s, CONTENT, ctx))}>
          Başla — cihaz kenara
        </Button>
        <ButtonLink href="/" variant="secondary" size="lg">
          Henüz değil
        </ButtonLink>
      </div>
    </section>
  );
}

export function PlayScreen({ player }: { player: PlayerState }) {
  const { run, error } = useRun();
  const attempt = player.activeAttemptId ? player.attempts[player.activeAttemptId] : null;

  if (!attempt || !isInProgress(attempt.state)) {
    return (
      <div className={styles.empty}>
        <EmptyState title="Devam eden görev yok." action={<ButtonLink href="/quest" variant="primary" icon="arrow-right">Bana bir görev ver</ButtonLink>}>
          Şehir bekliyor. Onun dışındaki her şey de.
        </EmptyState>
        <Link href="/" className="t-caption">
          Şehre dön
        </Link>
      </div>
    );
  }

  const quest = CONTENT.questById.get(attempt.questId);
  if (!quest) {
    return (
      <div className={styles.empty}>
        <ErrorPanel title="Bu görev artık yok." actions={<Button variant="secondary" onClick={() => run((s, ctx) => abandonQuest(s, CONTENT, ctx))}>Kenara koy</Button>}>
          Kayıtlı ilerleme “{attempt.questId}” görevini gösteriyor; bu görev Şehrin bu sürümünde yok.
        </ErrorPanel>
      </div>
    );
  }

  if (attempt.state === "ACTING" || attempt.state === "WAITING_FOR_RETURN") return <ActScreen quest={quest} attempt={attempt} run={run} error={error} />;
  if (attempt.state === "RETURNED") return <ReturnTransition run={run} />;

  return (
    <div className={styles.page} data-movement={movementOf(attempt.state)} data-hue={CONTENT.campaignById.get(quest.campaignId)?.tone}>
      <PlayHeader quest={quest} attempt={attempt} run={run} />
      <div className={styles.body}>
        {error && <Notice tone="warning">{error}</Notice>}
        {attempt.state === "ACCEPTED" && <Briefing quest={quest} attempt={attempt} player={player} run={run} />}
        {(attempt.state === "PRIMING" || attempt.state === "RECALL" || attempt.state === "REFLECTION") && <StepPhase quest={quest} attempt={attempt} run={run} />}
        {attempt.state === "READY_TO_ACT" && <Mission quest={quest} attempt={attempt} run={run} />}
        {attempt.state === "REVEAL" && <RevealView quest={quest} attempt={attempt} />}
      </div>
    </div>
  );
}

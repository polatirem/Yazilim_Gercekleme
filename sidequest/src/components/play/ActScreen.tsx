"use client";
import { useEffect, useState } from "react";
import { CONTENT } from "@/content";
import type { Quest } from "@/domain/content-types";
import type { PlayerState, QuestAttempt } from "@/domain/player-types";
import { abandonQuest, leaveAct, markSegment, openSealed, proceedAfterReturn, returnFromAct } from "@/domain/game";
import { renderTemplate } from "@/domain/refs";
import type { Ctx } from "@/domain/behavior/events";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import styles from "./Play.module.css";

type Run = (c: (s: PlayerState, ctx: Ctx) => PlayerState) => void;

/**
 * ACT. The interface steps out of the way: no navigation, no clock, one
 * button. Leaving the tab is expected; it's recorded as "away", not failure.
 */
export function ActScreen({ quest, attempt, run, error }: { quest: Quest; attempt: QuestAttempt; run: Run; error: string | null }) {
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const campaign = CONTENT.campaignById.get(quest.campaignId)!;
  const t = (text: string) => renderTemplate(text, attempt.answers);
  const segments = quest.act.segments;
  const segmentIndex = attempt.segmentMarks.length;
  const segment = segments[segmentIndex];
  const lastSegment = segmentIndex >= segments.length - 1;
  const away = attempt.state === "WAITING_FOR_RETURN";

  useEffect(() => {
    if (attempt.state !== "ACTING") return;
    const onHide = () => {
      if (document.visibilityState === "hidden") run((s, ctx) => leaveAct(s, CONTENT, ctx));
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [attempt.state, run]);

  return (
    <div className={styles.act} data-hue={campaign.tone}>
      <span className={styles.actOrb} aria-hidden />
      <div className={styles.actInner}>
        <p className={`t-label ${styles.actKicker}`}>
          <span className={styles.actSignal} aria-hidden />
          {campaign.title} — Görev sürüyor
        </p>

        <h1 className={`t-hero ${styles.actHeadline}`}>{away ? "Tekrar hoş geldin." : "Cihazı bırak."}</h1>

        {segment ? (
          <div className={styles.actSegment} key={segment.id}>
            <p className="t-label">
              {segment.label} <span className="t-data">· {segmentIndex + 1} / {segments.length}</span>
            </p>
            <p className={styles.actInstruction}>{segment.instruction}</p>
          </div>
        ) : (
          <p className={styles.actInstruction}>{t(quest.act.instruction)}</p>
        )}

        <p className={styles.actReminder}>{t(quest.act.reminder)}</p>

        {quest.act.sealed &&
          (attempt.sealedOpenedAt ? (
            <div className={`${styles.sealedOpen} unfold`} role="status">
              <p className="t-label">Mühürlü not</p>
              <p>{quest.act.sealed.body}</p>
            </div>
          ) : (
            <button type="button" className={styles.sealed} onClick={() => run((s, ctx) => openSealed(s, CONTENT, ctx))}>
              <Icon name="seal" />
              <span>
                <span className="t-label">Mühürlü not</span>
                <span>{quest.act.sealed.trigger}</span>
              </span>
            </button>
          ))}

        {error && (
          <p className={styles.actError} role="alert">
            {error}
          </p>
        )}

        <div className={styles.actActions}>
          {segments.length > 1 && !lastSegment ? (
            <Button variant="inverse" size="lg" icon="arrow-right" onClick={() => run((s, ctx) => markSegment(s, CONTENT, ctx))}>
              Sonraki bölüm
            </Button>
          ) : (
            <Button variant="inverse" size="lg" icon="return" onClick={() => run((s, ctx) => returnFromAct(s, CONTENT, ctx))}>
              Döndüm
            </Button>
          )}
          <p className={styles.actFootnote}>Bitirince geri dön. Saat de yok, acele de.</p>
        </div>

        <div className={styles.actFooter}>
          <p>{quest.safety.notes[0]}</p>
          {confirmAbandon ? (
            <span className={styles.confirm}>
              <span>Kenara konsun mu? Hiçbir şey kaybolmaz.</span>
              <button type="button" onClick={() => run((s, ctx) => abandonQuest(s, CONTENT, ctx))}>
                Kenara koy
              </button>
              <button type="button" onClick={() => setConfirmAbandon(false)}>
                Devam et
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmAbandon(true)}>
              Bu görevi kenara koy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Re-entering the game world: night fades to paper, then recall begins. */
export function ReturnTransition({ run }: { run: Run }) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
    const t = window.setTimeout(() => run((s, ctx) => proceedAfterReturn(s, CONTENT, ctx)), reduce ? 0 : 1600);
    return () => window.clearTimeout(t);
    // Runs once per arrival in RETURNED.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={styles.returning} role="status" aria-live="polite">
      <svg viewBox="0 0 160 24" width="160" height="24" aria-hidden className={styles.returnRoute}>
        <path d="M2 12H60L70 4L80 20L90 12H158" pathLength={1} />
      </svg>
      <p className="t-label">Şehre geri dönülüyor</p>
    </div>
  );
}

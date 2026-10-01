"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CONTENT } from "@/content";
import type { TimeBudget } from "@/domain/content-types";
import type { ContextInput, PlayerState } from "@/domain/player-types";
import { EXCLUSION_COPY, type ExclusionReason } from "@/domain/context-engine";
import { abandonQuest, activeAttempt } from "@/domain/game";
import { dispatch } from "@/state/store";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { PHASE_COPY } from "@/components/world/WorldScreen";
import { ContextForm } from "./ContextForm";
import { MysteryDossier, QuestDossier } from "./QuestDossier";
import { PLACE_LABEL } from "./Requirements";
import { useQuestOffer } from "./useQuestOffer";
import styles from "./QuestScreen.module.css";

const ENERGY_LABEL = { low: "düşük", normal: "normal", high: "yüksek" } as const;

export function defaultContext(player: PlayerState): ContextInput {
  return player.lastContext ?? { place: player.preferences.primaryPlace ?? "home", minutes: player.preferences.typicalMinutes ?? 15 };
}

function InProgress({ player }: { player: PlayerState }) {
  const [confirm, setConfirm] = useState(false);
  const attempt = activeAttempt(player)!;
  const quest = CONTENT.questById.get(attempt.questId)!;
  return (
    <div className={styles.page}>
      <p className="t-label muted">Devam eden görev</p>
      <h1 className="t-hero">{quest.title}</h1>
      <p className="t-body-lg secondary">{PHASE_COPY[attempt.state]}. Her seferinde tek görev — dünya yeterince büyük.</p>
      <div className={styles.row}>
        <ButtonLink href="/play" variant="primary" size="lg" icon="arrow-right">
          Devam et
        </ButtonLink>
        {confirm ? (
          <>
            <Button variant="danger" size="lg" onClick={() => dispatch((s, ctx) => abandonQuest(s, CONTENT, ctx))}>
              Evet, kenara koy
            </Button>
            <Button variant="quiet" onClick={() => setConfirm(false)}>
              Kalsın
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="lg" onClick={() => setConfirm(true)}>
            Kenara koy
          </Button>
        )}
      </div>
      {confirm && <p className="t-caption">Bir görevi kenara koymanın hiçbir bedeli yok. Sonra için açık kalır.</p>}
    </div>
  );
}

function nextBudget(m: TimeBudget): TimeBudget | null {
  return m === 2 ? 5 : m === 5 ? 15 : m === 15 ? 30 : null;
}

export function QuestScreen({ player, mysteryParam }: { player: PlayerState; mysteryParam: boolean }) {
  const router = useRouter();
  const [context, setContext] = useState<ContextInput | null>(null);
  const [mystery, setMystery] = useState(mysteryParam);
  const offer = useQuestOffer(player, context, mystery);
  const currentId = offer.current?.quest.id;
  const { markViewed } = offer;

  useEffect(() => {
    if (currentId) markViewed(currentId);
    // markViewed is stable in behaviour; re-run only when a different quest is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  if (activeAttempt(player)) return <InProgress player={player} />;

  if (!context) {
    return (
      <div className={styles.page}>
        <header className={styles.intro}>
          <p className="t-label muted">Bana bir görev ver</p>
          <h1 className="t-hero">Şu an neredesin?</h1>
          <p className="t-body-lg secondary">Görevler bulunduğun yere ve gerçekten ayırabileceğin zamana göre seçilir.</p>
        </header>
        <ContextForm
          initial={defaultContext(player)}
          initialMystery={mysteryParam}
          onSubmit={(c, m) => {
            setMystery(m);
            setContext(c);
          }}
        />
      </div>
    );
  }

  const back = (
    <button type="button" className={styles.back} onClick={() => setContext(null)}>
      {PLACE_LABEL[context.place]} · {context.minutes === 30 ? "30+" : context.minutes} dk{context.energy ? ` · ${ENERGY_LABEL[context.energy]} enerji` : ""} — değiştir
    </button>
  );

  if (offer.current) {
    const quest = offer.current.quest;
    return (
      <div className={styles.page}>
        {back}
        {mystery ? (
          <MysteryDossier key={quest.id} quest={quest} onAccept={offer.accept} onNotNow={() => router.push("/")} onSkip={offer.skip} error={offer.error} />
        ) : (
          <QuestDossier key={quest.id} quest={quest} player={player} onAccept={offer.accept} onNotNow={() => router.push("/")} onSkip={offer.skip} position={offer.position} error={offer.error} />
        )}
      </div>
    );
  }

  const reasons = new Map<ExclusionReason, number>();
  for (const e of offer.recommendation?.excluded ?? []) reasons.set(e.reason, (reasons.get(e.reason) ?? 0) + 1);
  const more = nextBudget(context.minutes);

  return (
    <div className={styles.page}>
      {back}
      {offer.exhausted ? (
        <EmptyState
          title="Şu an uyan görevlerin hepsi bu kadar."
          action={
            <>
              <Button variant="secondary" onClick={offer.reset}>
                Yeniden bak
              </Button>
              <Button variant="quiet" onClick={() => setContext(null)}>
                Yeri ya da süreyi değiştir
              </Button>
            </>
          }
        >
          Atlamanın bedeli yok. Geçtiklerin başka bir zaman yeniden karşına çıkacak.
        </EmptyState>
      ) : (
        <EmptyState
          title={`${PLACE_LABEL[context.place]} için ${context.minutes === 30 ? "30+" : context.minutes} dakikaya uyan bir görev henüz yok.`}
          action={
            <>
              {more && (
                <Button variant="primary" icon="arrow-right" onClick={() => setContext({ ...context, minutes: more })}>
                  {more === 30 ? "30+" : more} dakikayı dene
                </Button>
              )}
              <Button variant="quiet" onClick={() => setContext(null)}>
                Bulunduğun yeri değiştir
              </Button>
            </>
          }
        >
          {CONTENT.quests.length} görevden: {[...reasons].map(([r, n]) => `${n} tanesi ${EXCLUSION_COPY[r]}`).join(", ")}.
        </EmptyState>
      )}
    </div>
  );
}

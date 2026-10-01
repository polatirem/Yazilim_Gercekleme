"use client";
import Link from "next/link";
import { CONTENT, questCode } from "@/content";
import type { Quest } from "@/domain/content-types";
import type { PlayerState } from "@/domain/player-types";
import { activeAttempt } from "@/domain/game";
import { npcCallback } from "@/domain/npc";
import { deriveWorld, isQuestUnlocked, resolvedAttempts } from "@/domain/world";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Sigil } from "@/components/ui/Sigil";
import { Notice } from "@/components/ui/States";
import { Requirements, requirementsOf } from "./Requirements";
import styles from "./QuestDossier.module.css";

interface Actions {
  onAccept: () => void;
  onNotNow: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  position?: string;
  error?: string | null;
}

export function formatDateTr(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }) {
  return new Date(iso).toLocaleDateString("tr-TR", opts);
}

/** Görev keşif ekranı: ne, nerede, ne kadar sürer, kim istiyor — ve ne güvenli. */
export function QuestDossier({ quest, player, onAccept, onNotNow, onSkip, skipLabel = "Atla", position, error }: { quest: Quest; player: PlayerState } & Actions) {
  const campaign = CONTENT.campaignById.get(quest.campaignId)!;
  const location = CONTENT.locationById.get(quest.locationId)!;
  const npc = CONTENT.npcById.get(quest.npcId)!;
  const callback = npcCallback(CONTENT, npc.id, player);
  const world = deriveWorld(CONTENT, player);
  const unlocked = isQuestUnlocked(quest, world.completedQuestIds, world.campaignProgress);
  const active = activeAttempt(player);
  const blockedBy = active && active.questId !== quest.id ? CONTENT.questById.get(active.questId) : null;
  const previous = resolvedAttempts(player).filter((a) => a.questId === quest.id).at(-1);
  const needed = quest.availability.requiresCampaignProgress - (world.campaignProgress[campaign.id]?.completed ?? 0);

  return (
    <article className={`${styles.dossier} enter`} aria-labelledby={`quest-${quest.id}`} data-hue={campaign.tone}>
      <header className={styles.band}>
        <div className={styles.bandTop}>
          <p className={`t-data ${styles.meta}`}>
            <span>{questCode(quest)}</span>
            <span>{campaign.title}</span>
            <span data-hue={location.hue} className={styles.place}>
              {world.revealedLocations.has(location.id) ? location.name : "Haritasız topraklar"}
            </span>
          </p>
          {position && <span className={`t-data ${styles.position}`}>{position}</span>}
        </div>
        <h1 id={`quest-${quest.id}`} className={`t-display ${styles.title}`}>
          {quest.title}
        </h1>
        <p className={`t-h2 t-italic ${styles.subtitle}`}>{quest.subtitle}</p>
        <span className={styles.bandShape} aria-hidden />
      </header>

      <p className={`t-body-lg ${styles.description}`}>{quest.description}</p>

      <Requirements quest={quest} />

      <figure className={styles.voice}>
        <span className={styles.sigil}>
          <Sigil sigil={npc.sigil} size={48} />
        </span>
        <div>
          <blockquote className={styles.line}>“{quest.npcLine}”</blockquote>
          {callback && <p className={styles.callback}>{callback}</p>}
          <figcaption className="t-caption">{npc.name}</figcaption>
        </div>
      </figure>

      <details className={styles.safety}>
        <summary className="t-label">Yola çıkmadan önce</summary>
        <ul>
          {quest.safety.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </details>

      {previous && <p className="t-caption">{formatDateTr(previous.completedAt!)} tarihinde tamamlandı. Yeniden oynanabilir; Şehir ikisini de hatırlar.</p>}
      {error && <Notice tone="warning">{error}</Notice>}

      {!unlocked ? (
        <Notice>
          Henüz açık değil. {needed > 0 ? `Açmak için ${campaign.title} kampanyasında ${needed} görev daha tamamla.` : "Önce ondan önceki görevleri tamamla."}
        </Notice>
      ) : blockedBy ? (
        <div className={styles.actions}>
          <Notice>
            <strong>{blockedBy.title}</strong> hâlâ devam ediyor. Önce onu bitir ya da kenara koy.
          </Notice>
          <ButtonLink href="/play" variant="secondary" icon="arrow-right">
            {blockedBy.title} görevine git
          </ButtonLink>
        </div>
      ) : (
        <div className={styles.actions}>
          <Button variant="primary" size="lg" icon="arrow-right" onClick={onAccept}>
            Görevi kabul et
          </Button>
          <Button variant="secondary" size="lg" onClick={onNotNow}>
            Şimdi değil
          </Button>
          {onSkip && (
            <Button variant="quiet" onClick={onSkip}>
              {skipLabel}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

/** Gizemli Görev: gereksinimler ve güvenlik tam gösterilir; yalnızca görevin kendisi mühürlüdür. */
export function MysteryDossier({ quest, onAccept, onNotNow, onSkip, error }: { quest: Quest } & Actions) {
  return (
    <article className={`${styles.dossier} ${styles.mystery} enter`} aria-labelledby="mystery-title" data-hue="violet">
      <header className={styles.band}>
        <p className={`t-data ${styles.meta}`}>
          <span>Gizemli görev</span>
          <span>Mühürlü</span>
        </p>
        <h1 id="mystery-title" className={`t-display ${styles.title}`}>
          Bir şey bekliyor.
        </h1>
        <p className={`t-h2 t-italic ${styles.subtitle}`}>Ne olduğunu, evet dedikten sonra öğreneceksin.</p>
        <span className={styles.bandShape} aria-hidden />
      </header>
      <div className={styles.seal} aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <p className="t-body-lg">Kabul etmeden önce bilmen gerekenler:</p>
      <ul className={styles.mysteryReqs}>
        {requirementsOf(quest).map((r) => (
          <li key={r.label} className="t-data">
            {r.label}
          </li>
        ))}
      </ul>
      <details className={styles.safety} open>
        <summary className="t-label">Güvenlik — eksiksiz</summary>
        <ul>
          {quest.safety.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </details>
      <p className="t-caption">Kabul ettikten sonra da istediğin an, hiçbir bedel ödemeden kenara koyabilirsin.</p>
      {error && <Notice tone="warning">{error}</Notice>}
      <div className={styles.actions}>
        <Button variant="primary" size="lg" icon="arrow-right" onClick={onAccept}>
          Gizemli görevi kabul et
        </Button>
        <Button variant="secondary" size="lg" onClick={onNotNow}>
          Şimdi değil
        </Button>
        {onSkip && (
          <Button variant="quiet" onClick={onSkip}>
            Başka bir tane mühürle
          </Button>
        )}
      </div>
      <p className="t-caption">
        Önce bilmeyi mi tercih edersin? <Link href="/quest">Normal bir görev seç.</Link>
      </p>
    </article>
  );
}

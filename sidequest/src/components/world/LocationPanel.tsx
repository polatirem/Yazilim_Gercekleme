"use client";
import Link from "next/link";
import { forwardRef } from "react";
import { CONTENT } from "@/content";
import type { WorldView } from "@/domain/world";
import { isQuestUnlocked } from "@/domain/world";
import { Icon } from "@/components/ui/Icon";
import { Sigil } from "@/components/ui/Sigil";
import styles from "./WorldScreen.module.css";

export const LocationPanel = forwardRef<HTMLHeadingElement, { locationId: string; world: WorldView; onClose: () => void }>(function LocationPanel({ locationId, world, onClose }, headingRef) {
  const location = CONTENT.locationById.get(locationId)!;
  const revealed = world.revealedLocations.has(locationId);
  const quests = CONTENT.quests.filter((q) => q.locationId === locationId);
  const homeOf = CONTENT.campaigns.filter((c) => c.homeLocationId === locationId);

  return (
    <section className={`${styles.panel} enter`} aria-labelledby="location-heading" data-hue={revealed ? location.hue : undefined}>
      <div className={styles.panelHead}>
        <p className="t-label muted">{revealed ? "Mekân" : "Haritasız"}</p>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Mekân ayrıntılarını kapat">
          <Icon name="close" size={18} />
        </button>
      </div>
      <h2 id="location-heading" className="t-h2" ref={headingRef} tabIndex={-1}>
        {revealed ? location.name : "Haritanın kenarının ötesinde bir şey"}
      </h2>

      {revealed ? (
        <>
          <p className="secondary">{location.description}</p>
          <p className={styles.modes}>{location.modes.join(" · ")}</p>

          {homeOf.map((c) => {
            const npc = CONTENT.npcById.get(c.npcId)!;
            const next = c.questIds.map((id) => CONTENT.questById.get(id)!).find((q) => !world.completedQuestIds.has(q.id) && isQuestUnlocked(q, world.completedQuestIds, world.campaignProgress));
            return (
              <div key={c.id} className={styles.resident}>
                <Sigil sigil={npc.sigil} size={36} />
                <div>
                  <p className="t-body-sm">
                    <em>{c.title}</em> kampanyasını burada <strong>{npc.name}</strong> yürütür.
                  </p>
                  {next && (
                    <Link href={`/quest/${next.slug}`} className={styles.inlineLink}>
                      Kampanyaya gir: {next.title}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}

          <h3 className={`t-label ${styles.subhead}`}>Buradaki görevler</h3>
          <ul className={styles.questList}>
            {quests.map((q) => {
              const done = world.completedQuestIds.has(q.id);
              const unlocked = isQuestUnlocked(q, world.completedQuestIds, world.campaignProgress);
              return (
                <li key={q.id}>
                  {unlocked ? (
                    <Link href={`/quest/${q.slug}`} className={styles.questRow}>
                      <span className="t-data muted">{String(q.number).padStart(3, "0")}</span>
                      <span>{q.title}</span>
                      <span className={styles.status}>{done ? <Icon name="check" size={16} label="Tamamlandı" /> : <span className="t-caption">Açık</span>}</span>
                    </Link>
                  ) : (
                    <span className={styles.questRow} data-locked>
                      <span className="t-data">{String(q.number).padStart(3, "0")}</span>
                      <span>Henüz açık değil</span>
                      <span className={styles.status}>
                        <Icon name="lock" size={16} label="Kilitli" />
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          <p className="secondary">{location.undiscoveredHint}</p>
          <p className="t-caption">
            {location.reveal === "mystery"
              ? "Bir Gizemli Görev tamamlanınca ortaya çıkar — ne olduğunu bilmeden kabul edilen bir görev."
              : `Burada geçen bir görev tamamlanınca ortaya çıkar. İçeride bir yerde ${quests.length} görev bekliyor.`}
          </p>
        </>
      )}
    </section>
  );
});

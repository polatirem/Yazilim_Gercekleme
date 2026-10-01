"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CONTENT } from "@/content";
import type { PlayerState, QuestState } from "@/domain/player-types";
import { acknowledgeWorld, activeAttempt } from "@/domain/game";
import { deriveWorld, isQuestUnlocked } from "@/domain/world";
import { computeMetrics } from "@/domain/behavior/metrics";
import { dailyQuest } from "@/domain/daily";
import { dispatch } from "@/state/store";
import { ButtonLink } from "@/components/ui/Button";
import { Ticks } from "@/components/ui/Ticks";
import { Icon } from "@/components/ui/Icon";
import { Sigil } from "@/components/ui/Sigil";
import { durationLabel } from "@/components/quest/Requirements";
import { CityMap } from "./CityMap";
import { LocationPanel } from "./LocationPanel";
import styles from "./WorldScreen.module.css";

export const PHASE_COPY: Partial<Record<QuestState, string>> = {
  ACCEPTED: "Kabul edildi, henüz başlamadı",
  PRIMING: "Hazırlanıyor",
  READY_TO_ACT: "Dışarı çıkmaya hazır",
  ACTING: "Dışarıda, dünyada",
  WAITING_FOR_RETURN: "Dışarıda, dünyada",
  RETURNED: "Geri döndü",
  RECALL: "Döndü — hatırlıyor",
  REFLECTION: "Döndü — düşünüyor",
  REVEAL: "Gösterilecek bir şey var",
};

export function WorldScreen({ player }: { player: PlayerState }) {
  const world = useMemo(() => deriveWorld(CONTENT, player), [player]);
  const metrics = useMemo(() => computeMetrics(CONTENT, player), [player]);
  const [today] = useState(() => new Date());
  const daily = useMemo(() => dailyQuest(CONTENT, player, today), [player, today]);
  // Yenilikleri ilk açılışta yakala; animasyon onaylandıktan sonra da bir kez oynasın.
  const [fresh] = useState(() => ({ locations: world.newLocations, paths: world.newPaths }));
  const [selected, setSelected] = useState<string | null>(null);
  const panelHeading = useRef<HTMLHeadingElement>(null);
  const active = activeAttempt(player);
  const activeQuest = active ? CONTENT.questById.get(active.questId)! : null;
  const season = CONTENT.seasons[0];
  const lastFragment = world.fragments.at(-1);

  useEffect(() => {
    if (!fresh.locations.length && !fresh.paths.length) return;
    const t = window.setTimeout(() => dispatch((s) => acknowledgeWorld(s, fresh.locations, fresh.paths)), 2600);
    return () => window.clearTimeout(t);
  }, [fresh]);

  useEffect(() => {
    if (selected) panelHeading.current?.focus({ preventScroll: false });
  }, [selected]);

  const changes = [
    ...fresh.locations.map((id) => ({ text: `Yeni bir yer beliriyor: ${CONTENT.locationById.get(id)?.name}.`, hue: CONTENT.locationById.get(id)?.hue })),
    ...fresh.paths
      .filter((id) => !fresh.locations.includes(CONTENT.pathById.get(id)?.to ?? ""))
      .map((id) => {
        const p = CONTENT.pathById.get(id)!;
        const to = world.revealedLocations.has(p.to) ? CONTENT.locationById.get(p.to)! : null;
        return { text: `${CONTENT.locationById.get(p.from)?.name} çıkışında ${to ? `${to.name} yönüne` : "haritasız topraklara"} yeni bir yol açılıyor.`, hue: to?.hue };
      }),
  ];

  const dailyCampaign = daily ? CONTENT.campaignById.get(daily.campaignId)! : null;

  return (
    <div className={styles.world}>
      <div className={styles.map}>
        <h1 className="visually-hidden">Şehir</h1>
        <CityMap
          world={world}
          selected={selected}
          onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
          fresh={fresh}
          activeLocationId={activeQuest?.locationId ?? null}
          seasonLabel={`Sezon ${String(season.number).padStart(2, "0")} · ${season.title}`}
        />
      </div>

      <div className={styles.intro}>
        <p className="t-label muted">
          Sezon {String(season.number).padStart(2, "0")} — {season.title}
        </p>
        <p className={`t-h1 ${styles.headline}`}>
          {world.completedQuestIds.size === 0 ? (
            "Şehrin çoğu hâlâ haritasız."
          ) : (
            <>
              <span className={styles.bigCount}>{world.revealedLocations.size}</span> / {CONTENT.locations.length} yer haritalandı.
            </>
          )}
        </p>

        <div aria-live="polite">
          {changes.length > 0 && (
            <div className={`${styles.changes} unfold`}>
              <p className="t-label">Şehir değişti</p>
              <ul>
                {changes.map((c) => (
                  <li key={c.text} data-hue={c.hue}>
                    {c.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {lastFragment ? (
          <blockquote className={styles.fragment} data-hue={CONTENT.campaignById.get(CONTENT.questById.get(lastFragment.questId)?.campaignId ?? "")?.tone}>
            <p>{lastFragment.text}</p>
            <footer className="t-caption">{CONTENT.questById.get(lastFragment.questId)?.title} görevinden sonra</footer>
          </blockquote>
        ) : (
          <p className="t-body-lg secondary">Dışarıda bitirdiğin her görev, Şehrin bir parçasını daha buraya çizer.</p>
        )}

        {active && activeQuest ? (
          <div className={styles.inProgress} data-hue={CONTENT.campaignById.get(activeQuest.campaignId)?.tone}>
            <p className="t-label">
              <span className={styles.liveMark} aria-hidden /> Devam eden görev
            </p>
            <p className="t-h2">{activeQuest.title}</p>
            <p className="t-caption">{PHASE_COPY[active.state]}</p>
            <ButtonLink href="/play" variant="primary" size="lg" icon="arrow-right" block>
              {active.state === "ACTING" || active.state === "WAITING_FOR_RETURN" ? "Döndüm" : "Devam et"}
            </ButtonLink>
          </div>
        ) : (
          <div className={styles.cta}>
            <ButtonLink href="/quest" variant="primary" size="lg" icon="arrow-right" block>
              Bana bir görev ver
            </ButtonLink>
            <Link href="/quest?mystery=1" className={styles.mysteryLink} data-hue="violet">
              <Icon name="spark" size={16} /> Ya da gizemli bir görev kabul et
            </Link>
          </div>
        )}
      </div>

      <div className={styles.details}>
        {selected && <LocationPanel ref={panelHeading} locationId={selected} world={world} onClose={() => setSelected(null)} />}

        {daily && dailyCampaign && !active && (
          <Link href={`/quest/${daily.slug}`} className={`${styles.daily} enter`} data-hue={dailyCampaign.tone}>
            <span className={styles.dailyLabel}>
              <Icon name="spark" size={16} /> Günün görevi
            </span>
            <span className={styles.dailyBody}>
              <span className={styles.dailySigil}>
                <Sigil sigil={CONTENT.npcById.get(daily.npcId)!.sigil} size={40} />
              </span>
              <span>
                <span className={styles.dailyTitle}>{daily.title}</span>
                <span className={styles.dailySub}>{daily.subtitle}</span>
                <span className="t-data">
                  {durationLabel(daily)} · {dailyCampaign.title}
                </span>
              </span>
            </span>
            <Icon name="arrow-right" className={styles.dailyArrow} />
          </Link>
        )}

        <section aria-labelledby="campaigns-heading" className={styles.campaigns}>
          <h2 id="campaigns-heading" className="t-label muted">
            Kampanyalar
          </h2>
          <ul>
            {CONTENT.campaigns.map((c) => {
              const p = world.campaignProgress[c.id];
              const npc = CONTENT.npcById.get(c.npcId)!;
              const next = c.questIds.map((id) => CONTENT.questById.get(id)!).find((q) => !p.completedQuestIds.has(q.id) && isQuestUnlocked(q, world.completedQuestIds, world.campaignProgress));
              const isActive = world.activeCampaignId === c.id && world.completedQuestIds.size > 0;
              return (
                <li key={c.id} className={styles.campaign} data-active={isActive} data-hue={c.tone}>
                  <span className={styles.campaignSigil} aria-hidden>
                    <Sigil sigil={npc.sigil} size={32} />
                  </span>
                  <div className={styles.campaignBody}>
                    <div className={styles.campaignHead}>
                      <span className="t-h3">{c.title}</span>
                      <Ticks done={p.completed} total={p.total} tone={c.tone} label={c.title} />
                    </div>
                    <p className="t-caption">{c.theme}</p>
                    <p className={styles.campaignMeta}>
                      {p.done ? "Tamamlandı." : isActive ? `Aktif · ${npc.name}` : npc.name}
                      {!p.done && next && (
                        <>
                          {" · "}
                          <Link href={`/quest/${next.slug}`}>Sıradaki: {next.title}</Link>
                        </>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <Link href="/journey" className={styles.journeyLine} data-hue="teal">
          <span>
            {metrics.questsCompleted === 0
              ? "Henüz bir yolculuk yok."
              : `${metrics.questsCompleted} görev · ${Object.keys(player.discoveries).length} keşif · dünyada ${metrics.realWorldMinutes} dk`}
          </span>
          <Icon name="arrow-right" size={18} />
        </Link>
      </div>
    </div>
  );
}

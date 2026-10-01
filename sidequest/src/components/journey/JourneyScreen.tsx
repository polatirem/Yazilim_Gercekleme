"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CONTENT } from "@/content";
import type { PlayerState, QuestAttempt } from "@/domain/player-types";
import { computeMetrics } from "@/domain/behavior/metrics";
import { detectPatterns } from "@/domain/behavior/patterns";
import { weeklyReview } from "@/domain/behavior/weekly";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import styles from "./Journey.module.css";

type Filter = "all" | "discoveries" | string;

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }).toLocaleUpperCase("tr");
}

function Summary({ player }: { player: PlayerState }) {
  const m = computeMetrics(CONTENT, player);
  const discovered = Object.keys(player.discoveries).length;
  const parts = [
    { n: m.questsCompleted, one: "görev tamamlandı", many: "görev tamamlandı", hue: "vermilion" },
    { n: m.routinesInterrupted, one: "alışkanlık bozuldu", many: "alışkanlık bozuldu", hue: "amber" },
    { n: m.predictionsMade, one: "tahmin yapıldı", many: "tahmin yapıldı", hue: "saffron" },
    { n: m.detailsRecalled, one: "ayrıntı geri getirildi", many: "ayrıntı geri getirildi", hue: "teal" },
    { n: discovered, one: "olgu keşfedildi", many: "olgu keşfedildi", hue: "indigo" },
    { n: m.realWorldMinutes, one: "dakika dünyada geçti", many: "dakika dünyada geçti", hue: "green" },
  ].filter((p) => p.n > 0);
  return (
    <p className={styles.summary}>
      {parts.map((p, i) => (
        <span key={p.many}>
          <span className={styles.num} data-hue={p.hue}>{p.n}</span> {p.n === 1 ? p.one : p.many}
          {i < parts.length - 1 ? ". " : "."}
        </span>
      ))}
    </p>
  );
}

function Entry({ attempt }: { attempt: QuestAttempt }) {
  const quest = CONTENT.questById.get(attempt.questId);
  if (!quest) return null;
  const campaign = CONTENT.campaignById.get(quest.campaignId)!;
  if (attempt.state === "ABANDONED") {
    return (
      <li className={styles.entry} data-kind="abandoned">
        <span className={styles.tone} data-hue={campaign.tone} aria-hidden />
        <div>
          <p className="t-body-sm muted">
            Kenara kondu — <Link href={`/quest/${quest.slug}`}>{quest.title}</Link>
          </p>
        </div>
      </li>
    );
  }
  const outcome = attempt.outcome;
  return (
    <li className={styles.entry}>
      <span className={styles.tone} data-hue={campaign.tone} aria-hidden />
      <div className={styles.entryBody}>
        <p className={styles.entryTitle}>
          <Link href={`/quest/${quest.slug}`}>{quest.title}</Link>
          {attempt.mystery && <span className={styles.tag}>Gizemli</span>}
          {attempt.simulated && <span className={styles.tag}>Simüle</span>}
        </p>
        <p className="secondary">{outcome?.journeyLine}</p>
        {outcome && outcome.discoveries.length > 0 && (
          <p className={styles.found}>
            {outcome.discoveries.map((d) => (
              <Link key={d.id} href={`/codex?entry=${d.id}`} data-hue={CONTENT.discoveryById.get(d.id)?.hue}>
                {CONTENT.discoveryById.get(d.id)?.title}
              </Link>
            ))}
          </p>
        )}
      </div>
    </li>
  );
}

export function JourneyScreen({ player }: { player: PlayerState }) {
  const [filter, setFilter] = useState<Filter>("all");
  const now = useMemo(() => new Date(), []);
  const review = useMemo(() => weeklyReview(CONTENT, player, now), [player, now]);
  const report = useMemo(() => detectPatterns(player.events), [player.events]);

  const attempts = Object.values(player.attempts)
    .filter((a) => a.state === "COMPLETED" || a.state === "REVEAL" || a.state === "ABANDONED")
    .filter((a) => {
      if (filter === "all") return true;
      if (filter === "discoveries") return (a.outcome?.discoveries.length ?? 0) > 0;
      return CONTENT.questById.get(a.questId)?.campaignId === filter;
    })
    .sort((a, b) => ((a.completedAt ?? a.endedAt ?? "") < (b.completedAt ?? b.endedAt ?? "") ? 1 : -1));

  const days = new Map<string, { label: string; items: QuestAttempt[] }>();
  for (const a of attempts) {
    const at = a.completedAt ?? a.endedAt ?? a.createdAt;
    const key = dayKey(at);
    if (!days.has(key)) days.set(key, { label: dayLabel(at), items: [] });
    days.get(key)!.items.push(a);
  }

  const hasHistory = Object.values(player.attempts).some((a) => a.state === "COMPLETED" || a.state === "REVEAL");

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className="t-label muted">Yolculuk</p>
        {hasHistory ? <Summary player={player} /> : <h1 className="t-hero">Henüz bir yolculuk yok.</h1>}
        {hasHistory && <h1 className="visually-hidden">Yolculuk</h1>}
      </header>

      {!hasHistory && (
        <EmptyState title="İlk görevini kabul et." action={<ButtonLink href="/quest" variant="primary" icon="arrow-right">Bana bir görev ver</ButtonLink>}>
          Dışarıda yaptığın her şey buraya yazılacak — neyi tahmin ettiğin, gerçekte ne olduğu, neyi fark ettiğin.
        </EmptyState>
      )}

      {hasHistory && (
        <div className={styles.columns}>
          <section aria-labelledby="timeline-heading" className={styles.timeline}>
            <div className={styles.timelineHead}>
              <h2 id="timeline-heading" className="t-label">
                Zaman çizelgesi
              </h2>
              <label className={styles.filter}>
                <span className="t-caption">Göster</span>
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">Hepsi</option>
                  <option value="discoveries">Keşif getiren görevler</option>
                  {CONTENT.campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {days.size === 0 ? (
              <p className="secondary">Bu filtreye uyan bir şey henüz yok.</p>
            ) : (
              <ol className={styles.days}>
                {[...days.entries()].map(([key, day]) => (
                  <li key={key} className={styles.day}>
                    <time className={styles.date}>{day.label}</time>
                    <ol className={styles.entries}>
                      {day.items.map((a) => (
                        <Entry key={a.id} attempt={a} />
                      ))}
                    </ol>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <aside className={styles.side}>
            {review && (
              <section aria-labelledby="week-heading" className={styles.week}>
                <h2 id="week-heading" className="t-label">
                  Bu hafta
                </h2>
                <dl>
                  {review.lines.map((l) => (
                    <div key={l.label}>
                      <dt>{l.label}</dt>
                      <dd className="t-data">{l.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className={styles.explore}>
                  <p className="t-label muted">Sıradaki keşif sorusu</p>
                  <p className="t-h2">{review.focus.question}</p>
                  <p className="t-caption">Bu soruyu soran görevler biraz daha sık önerilecek.</p>
                </div>
              </section>
            )}

            <section aria-labelledby="patterns-heading" className={styles.patterns}>
              <h2 id="patterns-heading" className="t-label">
                Örüntüler
              </h2>
              {report.patterns.length === 0 && <p className="secondary">Henüz yok. Bir örüntü ancak arkasında yeterli kanıt olduğunda görünür.</p>}
              <ul>
                {report.patterns.map((p) => (
                  <li key={p.id}>
                    <p>{p.statement}</p>
                    <p className="t-caption">
                      {p.sampleSize} kayda dayanıyor · {p.confidence === "consistent" ? "şimdilik tutarlı" : "yeni beliriyor — hâlâ değişebilir"}
                    </p>
                  </li>
                ))}
              </ul>
              {report.pending.length > 0 && (
                <div className={styles.pending}>
                  <p className="t-caption">Kanıt toplanıyor:</p>
                  <ul>
                    {report.pending.map((p) => (
                      <li key={p.id} className="t-caption">
                        <span className={styles.meter} aria-hidden>
                          {Array.from({ length: p.need }, (_, i) => (
                            <span key={i} data-on={i < p.have} />
                          ))}
                        </span>
                        {p.label}: {p.have} / {p.need}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="t-caption">Örüntüler görevlerin nasıl geçtiğini anlatır. Senin ölçümün değildir, tanı hiç değildir.</p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

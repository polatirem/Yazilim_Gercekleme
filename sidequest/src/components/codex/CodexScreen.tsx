"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { CONTENT } from "@/content";
import type { PlayerState } from "@/domain/player-types";
import { DiscoveryFigure } from "./DiscoveryFigure";
import styles from "./Codex.module.css";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

const no = (n: number) => `No. ${String(n).padStart(2, "0")}`;

export function CodexScreen({ player, initialEntry }: { player: PlayerState; initialEntry: string | null }) {
  const discovered = CONTENT.discoveries.filter((d) => player.discoveries[d.id]);
  const [selected, setSelected] = useState<string>(
    initialEntry && CONTENT.discoveryById.has(initialEntry) ? initialEntry : (discovered[0]?.id ?? CONTENT.discoveries[0].id),
  );
  const sheetHeading = useRef<HTMLHeadingElement>(null);
  const entry = CONTENT.discoveryById.get(selected)!;
  const record = player.discoveries[selected];
  const related = CONTENT.quests.filter((q) => q.discoveries.some((d) => d.discovery === selected));

  const choose = (id: string) => {
    setSelected(id);
    requestAnimationFrame(() => sheetHeading.current?.focus());
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className="t-label muted">Kodeks</p>
        <h1 className="t-hero">
          {discovered.length === 0 ? "Henüz bir keşif yok." : `${CONTENT.discoveries.length} kayıttan ${discovered.length} tanesi yazıldı.`}
        </h1>
        <p className="t-body-lg secondary">
          {discovered.length === 0
            ? "İlk keşfin, bir görev saklamaya değer bir şey gösterdiğinde belirecek."
            : "Görevlerinin gösterdiği olgular — her biri, gerçekte nasıl göründüyse öyle yazıldı."}
        </p>
      </header>

      <div className={styles.catalogue}>
        <nav aria-label="Kodeks kayıtları" className={styles.index}>
          <ol>
            {CONTENT.discoveries.map((d) => {
              const found = Boolean(player.discoveries[d.id]);
              return (
                <li key={d.id}>
                  <button type="button" className={styles.indexItem} aria-current={selected === d.id ? "true" : undefined} data-found={found} data-hue={d.hue} onClick={() => choose(d.id)}>
                    <span className="t-data">{no(d.number)}</span>
                    <span>{found ? d.title : "Kaydedilmedi"}</span>
                    {found && (player.discoveries[d.id].encounters.length ?? 0) > 1 && <span className="t-data muted">×{player.discoveries[d.id].encounters.length}</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <article className={styles.sheet} key={selected} aria-labelledby="entry-title" data-found={Boolean(record)} data-hue={entry.hue}>
          {record ? (
            <>
              <div className={`${styles.plate} fade`}>
                <DiscoveryFigure figure={entry.figure} size={240} />
                <span className="t-data">Levha {no(entry.number).replace("No. ", "")}</span>
              </div>
              <p className="t-data muted">
                {no(entry.number)} · {formatDate(record.firstAt)} tarihinde kaydedildi
              </p>
              <h2 id="entry-title" className="t-h1" ref={sheetHeading} tabIndex={-1}>
                {entry.title}
              </h2>
              <p className="t-h2 t-italic">{entry.summary}</p>
              <p className="t-body-lg">{entry.explanation}</p>

              <section className={styles.encounters} aria-labelledby="encounters-heading">
                <h3 id="encounters-heading" className="t-label">
                  Sende nasıl göründü
                </h3>
                <ol>
                  {[...record.encounters].reverse().map((e) => {
                    const quest = CONTENT.questById.get(e.questId);
                    return (
                      <li key={e.attemptId}>
                        <p className="t-data muted">
                          {new Date(e.at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }).toLocaleUpperCase("tr")} · {quest ? <Link href={`/quest/${quest.slug}`}>{quest.title}</Link> : e.questId}
                        </p>
                        <p>{e.text}</p>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section className={styles.related} aria-labelledby="related-heading">
                <h3 id="related-heading" className="t-label">
                  Görünebileceği görevler
                </h3>
                <ul>
                  {related.map((q) => (
                    <li key={q.id}>
                      <Link href={`/quest/${q.slug}`}>{q.title}</Link>
                    </li>
                  ))}
                </ul>
              </section>

              <p className={styles.caveat}>
                <span className="t-label">Kanıt üzerine bir not</span> {entry.caveat}
              </p>
            </>
          ) : (
            <>
              <div className={styles.plateEmpty} aria-hidden />
              <p className="t-data muted">{no(entry.number)}</p>
              <h2 id="entry-title" className="t-h1" ref={sheetHeading} tabIndex={-1}>
                Kaydedilmedi.
              </h2>
              <p className="t-body-lg secondary">{entry.hint}</p>
              <p className="t-caption">Kayıtlar önceden okunmaz; görevler tarafından yazılır.</p>
            </>
          )}
        </article>
      </div>
    </div>
  );
}

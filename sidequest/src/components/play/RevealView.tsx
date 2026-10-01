"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CONTENT, questCode } from "@/content";
import type { Quest } from "@/domain/content-types";
import type { QuestAttempt, RenderedBlock } from "@/domain/player-types";
import { acknowledgeReveal } from "@/domain/game";
import { formatValue } from "@/domain/refs";
import { dispatch } from "@/state/store";
import { Button } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Glyph";
import { Sigil } from "@/components/ui/Sigil";
import { DiscoveryFigure } from "@/components/codex/DiscoveryFigure";
import styles from "./Reveal.module.css";

function Block({ block, lead }: { block: RenderedBlock; lead: boolean }) {
  switch (block.kind) {
    case "figures":
      return (
        <dl className={styles.figures}>
          {block.items.map((f) => (
            <div key={f.label}>
              <dt className="t-label">{f.label}</dt>
              <dd>{f.display}</dd>
            </div>
          ))}
          {block.delta && (
            <div className={styles.delta}>
              <dt className="t-label">{block.delta.label}</dt>
              <dd>{block.delta.display}</dd>
            </div>
          )}
        </dl>
      );
    case "text":
      return <p className={lead ? styles.leadText : styles.text}>{block.text}</p>;
    case "list":
      return (
        <div className={styles.list}>
          <p className="t-label muted">{block.label}</p>
          <ol>
            {block.items.map((item, i) => (
              <li key={i}>
                <span className="t-data muted">{String(i + 1).padStart(2, "0")}</span> {item}
              </li>
            ))}
          </ol>
        </div>
      );
    case "sequence":
      return (
        <div className={styles.sequence}>
          <div>
            <p className="t-label muted">Verilen</p>
            <ol>
              {block.expected.map((e, i) => (
                <li key={i}>{e.glyph ? <Glyph glyph={e.glyph} size={36} title={e.label} /> : e.label}</li>
              ))}
            </ol>
          </div>
          <div>
            <p className="t-label muted">Senin kurduğun</p>
            <ol>
              {block.response.map((e, i) => (
                <li key={i} data-hit={block.hits[i]}>
                  {e.glyph ? <Glyph glyph={e.glyph} size={36} title={`${e.label}${block.hits[i] ? ", correct" : ", different"}`} /> : e.label}
                </li>
              ))}
            </ol>
          </div>
        </div>
      );
    case "scene":
      return (
        <div className={styles.scene} style={{ gridTemplateColumns: `repeat(${block.cols}, 1fr)` }} role="img" aria-label={`Değişiklikten sonraki düzen. ${block.selected.some((s) => block.changed.includes(s)) ? "Değişen işareti buldun." : "Değişen işaret çerçeveyle gösteriliyor."}`}>
          {block.cells.map((g, i) => (
            <span key={i} data-changed={block.changed.includes(i)} data-selected={block.selected.includes(i)}>
              {g && <Glyph glyph={g} size={34} />}
            </span>
          ))}
        </div>
      );
    case "filter":
      return (
        <div className={styles.filter}>
          <p className="t-label muted">Isınma</p>
          <p>
            <span className={styles.bigData}>
              {block.hits} / {block.targets}
            </span>{" "}
            bulundu{block.falseAlarms ? ` · ${block.falseAlarms} tanesi yanlışlıkla işaretlendi` : ""}
          </p>
          <span className={styles.hitRow} aria-hidden>
            {Array.from({ length: block.targets }, (_, i) => (
              <span key={i} data-hit={i < block.hits} />
            ))}
          </span>
        </div>
      );
    case "switch": {
      const max = Math.max(block.repeatMeanMs, block.switchMeanMs, 1);
      return (
        <div className={styles.switch}>
          <p className="t-label muted">Isınma · tepki süresi</p>
          {[
            { label: "Kural aynıyken", ms: block.repeatMeanMs },
            { label: "Kural değişir değişmez", ms: block.switchMeanMs },
          ].map((r, i) => (
            <div key={r.label} className={styles.bar}>
              <span className="t-caption">{r.label}</span>
              <span className={styles.barTrack}>
                <span style={{ width: `${(r.ms / max) * 100}%` }} data-accent={i === 1} />
              </span>
              <span className="t-data">{formatValue(r.ms, "ms")}</span>
            </div>
          ))}
        </div>
      );
    }
    case "plan":
      return (
        <div className={styles.plan}>
          <div>
            <p className="t-label muted">İlk plan</p>
            <ol>
              {block.before.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ol>
          </div>
          <div>
            <p className="t-label muted">Sürprizden sonra</p>
            <ol>
              {block.after.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ol>
            {block.dropped.length > 0 && (
              <ul className={styles.dropped}>
                {block.dropped.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      );
  }
}

export function RevealView({ quest, attempt }: { quest: Quest; attempt: QuestAttempt }) {
  const router = useRouter();
  const outcome = attempt.outcome!;
  const npc = CONTENT.npcById.get(quest.npcId)!;
  const campaign = CONTENT.campaignById.get(quest.campaignId)!;
  const suggestion = outcome.suggestion ? CONTENT.questById.get(outcome.suggestion) : null;
  const firstText = outcome.blocks.findIndex((b) => b.kind === "text");
  let i = 0;
  const next = () => ({ ["--i" as string]: ++i });

  const leave = (href: string) => {
    router.push(href);
    dispatch((s, ctx) => acknowledgeReveal(s, CONTENT, ctx));
  };

  return (
    <article className={styles.reveal} aria-labelledby="reveal-title" data-hue={campaign.tone}>
      <header className={`${styles.head} enter`} style={next()}>
        <p className="t-data muted">
          {questCode(quest)} · {campaign.title}
        </p>
        <h1 id="reveal-title" className="t-display">
          {quest.title}
        </h1>
        <p className="t-h2 t-italic secondary">Tamam. İşte gösterdikleri.</p>
      </header>

      <section className={styles.blocks} aria-label="Neler oldu">
        {outcome.blocks.map((b, idx) => (
          <div key={idx} className="enter" style={next()}>
            <Block block={b} lead={idx === firstText} />
          </div>
        ))}
      </section>

      {outcome.npcLine && (
        <figure className={`${styles.npc} enter`} style={next()}>
          <Sigil sigil={npc.sigil} size={36} />
          <figcaption>
            <span>{outcome.npcLine}</span>
            <span className="t-caption">{npc.name}</span>
          </figcaption>
        </figure>
      )}

      <section className={styles.discoveries} aria-label="Keşifler">
        {outcome.discoveries.length === 0 ? (
          <p className="t-caption enter" style={next()}>
            Bu sefer Kodeks’e yeni bir şey girmedi. Şehir yine de not aldı.
          </p>
        ) : (
          outcome.discoveries.map((d) => {
            const discovery = CONTENT.discoveryById.get(d.id)!;
            return (
              <div key={d.id} className={`${styles.discovery} unfold`} style={next()} data-hue={discovery.hue}>
                <div className={styles.discoveryFigure}>
                  <DiscoveryFigure figure={discovery.figure} size={140} />
                </div>
                <div className={styles.discoveryBody}>
                  <p className={`t-label ${styles.discoveryLabel}`}>{d.isNew ? "Keşif bulundu" : "Yeniden karşılaşıldı"}</p>
                  <h2 className="t-h1">{discovery.title}</h2>
                  <p className="t-body-lg">{d.text}</p>
                  <p className="secondary">Bu görev, genellikle “{discovery.title}” diye anılan bir olguyu gösterdi: {discovery.summary.charAt(0).toLocaleLowerCase("tr") + discovery.summary.slice(1)}</p>
                  <Link href={`/codex?entry=${discovery.id}`} className="t-caption">
                    {d.isNew ? "Kodeks’e girdi" : "Kodeks kaydına eklendi"} — No. {String(discovery.number).padStart(2, "0")}
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </section>

      <section className={`${styles.world} enter`} style={next()} aria-label="Şehir">
        <p className="t-label">Şehir</p>
        {outcome.campaignCompleted && <p className={styles.campaignDone}>Kampanya tamamlandı — {CONTENT.campaignById.get(outcome.campaignCompleted)?.title}</p>}
        {outcome.worldChanges.length > 0 && (
          <ul>
            {outcome.worldChanges.map((w) => (
              <li key={w.id}>{w.kind === "location" ? `Yeni bir yer beliriyor: ${w.label}.` : `Yeni bir yol açılıyor: ${w.label}.`}</li>
            ))}
          </ul>
        )}
        <p className={styles.fragment}>{outcome.fragment}</p>
      </section>

      {suggestion && (
        <p className={`${styles.nextHint} enter`} style={next()}>
          <span className="t-label muted">Sırada belki</span>
          <span>
            <strong>{suggestion.title}</strong> — {suggestion.subtitle}
          </span>
        </p>
      )}

      <div className={`${styles.actions} enter`} style={next()}>
        <Button variant="primary" size="lg" icon="arrow-right" onClick={() => leave("/")}>
          Şehre dön
        </Button>
        <Button variant="secondary" size="lg" onClick={() => leave(suggestion ? `/quest/${suggestion.slug}` : "/quest")}>
          {suggestion ? "Sıradaki görev" : "Başka bir görev"}
        </Button>
      </div>
    </article>
  );
}

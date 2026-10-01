"use client";
/**
 * Demo tools (development only; see app/dev/enabled.ts). Every action goes
 * through the real command pipeline. Simulated attempts are flagged and shown
 * as "Simulated" in the Journey.
 */
import { useMemo, useState } from "react";
import { CONTENT } from "@/content";
import type { Place, TimeBudget } from "@/domain/content-types";
import type { PlayerState } from "@/domain/player-types";
import { activeAttempt, returnFromAct, setPreferences } from "@/domain/game";
import { simulateQuest } from "@/domain/simulate";
import { recommend } from "@/domain/context-engine";
import { computeMetrics } from "@/domain/behavior/metrics";
import { deriveWorld } from "@/domain/world";
import { dispatch, resetProgress } from "@/state/store";
import { GameGate } from "@/components/shell/GameGate";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/States";
import styles from "./Dev.module.css";

function Panel({ player }: { player: PlayerState }) {
  const [message, setMessage] = useState<string | null>(null);
  const [questId, setQuestId] = useState(CONTENT.quests[0].id);
  const [discoveryId, setDiscoveryId] = useState(CONTENT.discoveries[0].id);
  const [minutes, setMinutes] = useState(12);
  const [place, setPlace] = useState<Place>("home");
  const [budget, setBudget] = useState<TimeBudget>(15);
  const active = activeAttempt(player);
  const world = useMemo(() => deriveWorld(CONTENT, player), [player]);
  const recs = useMemo(() => recommend(CONTENT, player, { place, minutes: budget }, { now: new Date() }), [player, place, budget]);

  const act = (label: string, fn: () => void) => {
    try {
      fn();
      setMessage(`${label} — tamam.`);
    } catch (e) {
      setMessage(`${label} başarısız: ${(e as Error).message}`);
    }
  };

  const completeCampaignNext = () =>
    dispatch((s, ctx) => {
      let next = s;
      const w = deriveWorld(CONTENT, next);
      for (const c of CONTENT.campaigns) {
        const id = c.questIds.find((q) => !w.completedQuestIds.has(q));
        if (id) next = simulateQuest(next, CONTENT, id, { ...ctx, now: new Date(Date.now() + next.events.length) }, minutes);
      }
      return next;
    });

  return (
    <div className={styles.page}>
      <header>
        <p className="t-label muted">Yalnızca geliştirme</p>
        <h1 className="t-hero">Demo araçları</h1>
        <p className="secondary">İşlemler gerçek oyun komutlarından geçer. Simüle edilen görevler Yolculuk’ta etiketlenir.</p>
      </header>
      {message && <Notice>{message}</Notice>}

      <section className={styles.section}>
        <h2 className="t-label">İlerleme</h2>
        <div className={styles.row}>
          <Button variant="danger" onClick={() => act("İlerlemeyi sıfırla", resetProgress)}>
            Tüm ilerlemeyi sıfırla
          </Button>
          <Button variant="secondary" onClick={() => act("Tanıtımı atla", () => dispatch((s) => setPreferences(s, { onboarded: true, primaryPlace: "home", typicalMinutes: 15, peopleComfort: "yes" })))}>
            Tanıtımı atla
          </Button>
          <Button variant="secondary" onClick={() => act("Her kampanyada sıradaki görev", completeCampaignNext)} disabled={Boolean(active)}>
            Her kampanyada sıradaki görevi tamamla
          </Button>
          <Button
            variant="secondary"
            disabled={Boolean(active)}
            onClick={() =>
              act("Her yeri aç", () =>
                dispatch((s, ctx) => {
                  let next = s;
                  for (const loc of CONTENT.locations) {
                    const q = CONTENT.quests.find((x) => x.locationId === loc.id && x.availability.requiresCampaignProgress === 0);
                    if (q && !deriveWorld(CONTENT, next).revealedLocations.has(loc.id)) next = simulateQuest(next, CONTENT, q.id, ctx, minutes);
                  }
                  return simulateQuest(next, CONTENT, "q015", ctx, 3, true);
                }),
              )
            }
          >
            Her yeri aç
          </Button>
        </div>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className="t-caption">Görev</span>
            <select value={questId} onChange={(e) => setQuestId(e.target.value)}>
              {CONTENT.quests.map((q) => (
                <option key={q.id} value={q.id}>
                  {String(q.number).padStart(3, "0")} {q.title}
                  {world.completedQuestIds.has(q.id) ? " ✓" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className="t-caption">Dışarıda dakika</span>
            <input type="number" min={1} max={180} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 1)} />
          </label>
          <Button variant="secondary" disabled={Boolean(active)} onClick={() => act(`${questId} tamamla`, () => dispatch((s, ctx) => simulateQuest(s, CONTENT, questId, ctx, minutes)))}>
            Görevi tamamla
          </Button>
          <Button variant="secondary" disabled={Boolean(active)} onClick={() => act(`${questId} gizemli olarak tamamla`, () => dispatch((s, ctx) => simulateQuest(s, CONTENT, questId, ctx, minutes, true)))}>
            Gizemli olarak tamamla
          </Button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className="t-label">Devam eden görev</h2>
        {active ? (
          <>
            <p>
              <strong>{CONTENT.questById.get(active.questId)?.title}</strong> · {active.state} · adım {active.stepIndex}
            </p>
            {(active.state === "ACTING" || active.state === "WAITING_FOR_RETURN") && (
              <Button
                variant="primary"
                onClick={() =>
                  act(`${minutes} dk sonra dönüş`, () =>
                    dispatch((s, ctx) => returnFromAct(s, CONTENT, { ...ctx, now: new Date(Date.parse(active.actStartedAt!) + minutes * 60_000) })),
                  )
                }
              >
                {minutes} dk sonra dönüşü simüle et
              </Button>
            )}
            <pre className={styles.json}>{JSON.stringify(active, null, 2)}</pre>
          </>
        ) : (
          <p className="secondary">Devam eden görev yok.</p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className="t-label">Keşifler</h2>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className="t-caption">Olgu</span>
            <select value={discoveryId} onChange={(e) => setDiscoveryId(e.target.value)}>
              {CONTENT.discoveries.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                  {player.discoveries[d.id] ? " ✓" : ""}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="secondary"
            onClick={() =>
              act("Keşfi tetikle", () =>
                dispatch((s, ctx) => ({
                  ...s,
                  discoveries: {
                    ...s.discoveries,
                    [discoveryId]: {
                      firstAt: s.discoveries[discoveryId]?.firstAt ?? ctx.now.toISOString(),
                      encounters: [...(s.discoveries[discoveryId]?.encounters ?? []), { attemptId: `demo-${ctx.id()}`, questId: "demo", at: ctx.now.toISOString(), text: "Bir görevden değil, demo araçlarından açıldı." }],
                    },
                  },
                })),
              )
            }
          >
            Keşfi tetikle
          </Button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className="t-label">Bağlam Motoru</h2>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className="t-caption">Yer</span>
            <select value={place} onChange={(e) => setPlace(e.target.value as Place)}>
              {["home", "outside", "work", "commuting", "with-people"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className="t-caption">Dakika</span>
            <select value={budget} onChange={(e) => setBudget(Number(e.target.value) as TimeBudget)}>
              {[2, 5, 15, 30].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Görev</th>
                <th>Puan</th>
                {Object.keys(recs.ranked[0]?.breakdown ?? {}).map((k) => (
                  <th key={k}>{k.replace(/([A-Z])/g, " $1").toLowerCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recs.ranked.map((r) => (
                <tr key={r.quest.id}>
                  <td>{r.quest.title}</td>
                  <td>{r.score.toFixed(2)}</td>
                  {Object.values(r.breakdown).map((v, i) => (
                    <td key={i}>{v.toFixed(2)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="t-caption">Dışlananlar: {recs.excluded.map((e) => `${e.quest.title} (${e.reason})`).join(", ") || "yok"}</p>
      </section>

      <section className={styles.section}>
        <h2 className="t-label">Türetilmiş durum</h2>
        <pre className={styles.json}>
          {JSON.stringify(
            {
              revealedLocations: [...world.revealedLocations],
              openPaths: [...world.openPaths],
              marks: world.marks,
              metrics: computeMetrics(CONTENT, player),
              events: player.events.length,
            },
            null,
            2,
          )}
        </pre>
      </section>
    </div>
  );
}

export function DevPanel() {
  return <GameGate requireOnboarded={false}>{(player) => <Panel player={player} />}</GameGate>;
}

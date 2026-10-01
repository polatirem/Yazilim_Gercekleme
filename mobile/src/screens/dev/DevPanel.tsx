/**
 * Demo tools (development builds only, like /dev on the web). Every action goes
 * through the real command pipeline. Simulated attempts are flagged and shown
 * as "Simüle" in the Journey.
 */
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { CONTENT } from "@/content";
import type { Place, TimeBudget } from "@/domain/content-types";
import type { PlayerState } from "@/domain/player-types";
import { activeAttempt, returnFromAct, setPreferences } from "@/domain/game";
import { simulateQuest } from "@/domain/simulate";
import { recommend } from "@/domain/context-engine";
import { computeMetrics } from "@/domain/behavior/metrics";
import { deriveWorld } from "@/domain/world";
import { dispatch, resetProgress } from "@/state/store";
import { useNav } from "@/nav/router";
import { Actions, Button } from "@/ui/Button";
import { Screen } from "@/ui/Screen";
import { Notice } from "@/ui/States";
import { Stepper } from "@/ui/Stepper";
import { T } from "@/ui/T";
import { colors } from "@/ui/theme";

function Chips<V extends string | number>({ items, value, onChange, label }: { items: { value: V; label: string }[]; value: V; onChange: (v: V) => void; label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T v="caption">{label}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {items.map((it) => {
          const on = it.value === value;
          return (
            <Pressable key={String(it.value)} onPress={() => onChange(it.value)} style={[styles.chip, on && { backgroundColor: colors.text }]}>
              <T v="caption" color={on ? colors.textInverse : colors.text}>
                {it.label}
              </T>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function DevPanel({ player }: { player: PlayerState }) {
  const nav = useNav();
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

  return (
    <Screen>
      <Button variant="quiet" onPress={() => nav.back()}>
        ← Geri
      </Button>
      <T v="label" muted>
        Yalnızca geliştirme
      </T>
      <T v="hero">Demo araçları</T>
      <T secondary>İşlemler gerçek oyun komutlarından geçer. Simüle edilen görevler Yolculuk’ta etiketlenir.</T>
      {message ? <Notice>{message}</Notice> : null}

      <View style={styles.section}>
        <T v="label">İlerleme</T>
        <Actions>
          <Button variant="danger" onPress={() => act("İlerlemeyi sıfırla", resetProgress)}>
            Tüm ilerlemeyi sıfırla
          </Button>
          <Button variant="secondary" onPress={() => act("Tanıtımı atla", () => dispatch((s) => setPreferences(s, { onboarded: true, primaryPlace: "home", typicalMinutes: 15, peopleComfort: "yes" })))}>
            Tanıtımı atla
          </Button>
          <Button
            variant="secondary"
            disabled={Boolean(active)}
            onPress={() =>
              act("Her kampanyada sıradaki görev", () =>
                dispatch((s, ctx) => {
                  let next = s;
                  const w = deriveWorld(CONTENT, next);
                  for (const c of CONTENT.campaigns) {
                    const id = c.questIds.find((q) => !w.completedQuestIds.has(q));
                    if (id) next = simulateQuest(next, CONTENT, id, { ...ctx, now: new Date(Date.now() + next.events.length) }, minutes);
                  }
                  return next;
                }),
              )
            }
          >
            Her kampanyada sıradakini tamamla
          </Button>
          <Button
            variant="secondary"
            disabled={Boolean(active)}
            onPress={() =>
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
        </Actions>
        <Chips
          label="Görev"
          value={questId}
          onChange={setQuestId}
          items={CONTENT.quests.map((q) => ({ value: q.id, label: `${String(q.number).padStart(3, "0")} ${q.title}${world.completedQuestIds.has(q.id) ? " ✓" : ""}` }))}
        />
        <Stepper label="Dışarıda dakika" value={minutes} onChange={(v) => setMinutes(Math.round(v))} min={1} max={180} />
        <Actions>
          <Button variant="secondary" disabled={Boolean(active)} onPress={() => act(`${questId} tamamla`, () => dispatch((s, ctx) => simulateQuest(s, CONTENT, questId, ctx, minutes)))}>
            Görevi tamamla
          </Button>
          <Button variant="secondary" disabled={Boolean(active)} onPress={() => act(`${questId} gizemli`, () => dispatch((s, ctx) => simulateQuest(s, CONTENT, questId, ctx, minutes, true)))}>
            Gizemli olarak tamamla
          </Button>
        </Actions>
      </View>

      <View style={styles.section}>
        <T v="label">Devam eden görev</T>
        {active ? (
          <>
            <T>
              {CONTENT.questById.get(active.questId)?.title} · {active.state} · adım {active.stepIndex}
            </T>
            {(active.state === "ACTING" || active.state === "WAITING_FOR_RETURN") && (
              <Button
                variant="primary"
                onPress={() =>
                  act(`${minutes} dk sonra dönüş`, () => dispatch((s, ctx) => returnFromAct(s, CONTENT, { ...ctx, now: new Date(Date.parse(active.actStartedAt!) + minutes * 60_000) })))
                }
              >
                {`${minutes} dk sonra dönüşü simüle et`}
              </Button>
            )}
          </>
        ) : (
          <T secondary>Devam eden görev yok.</T>
        )}
      </View>

      <View style={styles.section}>
        <T v="label">Keşifler</T>
        <Chips
          label="Olgu"
          value={discoveryId}
          onChange={setDiscoveryId}
          items={CONTENT.discoveries.map((d) => ({ value: d.id, label: `${d.title}${player.discoveries[d.id] ? " ✓" : ""}` }))}
        />
        <Button
          variant="secondary"
          onPress={() =>
            act("Keşfi tetikle", () =>
              dispatch((s, ctx) => ({
                ...s,
                discoveries: {
                  ...s.discoveries,
                  [discoveryId]: {
                    firstAt: s.discoveries[discoveryId]?.firstAt ?? ctx.now.toISOString(),
                    encounters: [
                      ...(s.discoveries[discoveryId]?.encounters ?? []),
                      { attemptId: `demo-${ctx.id()}`, questId: "demo", at: ctx.now.toISOString(), text: "Bir görevden değil, demo araçlarından açıldı." },
                    ],
                  },
                },
              })),
            )
          }
        >
          Keşfi tetikle
        </Button>
      </View>

      <View style={styles.section}>
        <T v="label">Bağlam Motoru</T>
        <Chips label="Yer" value={place} onChange={setPlace} items={(["home", "outside", "work", "commuting", "with-people"] as Place[]).map((p) => ({ value: p, label: p }))} />
        <Chips label="Dakika" value={budget} onChange={setBudget} items={([2, 5, 15, 30] as TimeBudget[]).map((m) => ({ value: m, label: String(m) }))} />
        {recs.ranked.map((r) => (
          <T key={r.quest.id} v="data">
            {r.score.toFixed(2)} · {r.quest.title}
          </T>
        ))}
        <T v="caption">Dışlananlar: {recs.excluded.map((e) => `${e.quest.title} (${e.reason})`).join(", ") || "yok"}</T>
      </View>

      <View style={styles.section}>
        <T v="label">Türetilmiş durum</T>
        <T v="data" style={{ fontSize: 11 }}>
          {JSON.stringify(
            { revealedLocations: [...world.revealedLocations], openPaths: [...world.openPaths], marks: world.marks, metrics: computeMetrics(CONTENT, player), events: player.events.length },
            null,
            2,
          )}
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, paddingTop: 16, borderTopWidth: 1, borderColor: colors.border },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.borderStrong },
});

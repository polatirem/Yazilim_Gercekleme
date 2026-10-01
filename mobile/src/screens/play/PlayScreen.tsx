import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CONTENT, questCode } from "@/content";
import type { Quest } from "@/domain/content-types";
import type { PlayerState, QuestAttempt } from "@/domain/player-types";
import { GameError, abandonQuest, beginQuest, startAct, submitStep, trackInteraction } from "@/domain/game";
import { InvalidTransitionError, isInProgress, movementOf, stepsFor } from "@/domain/quest-machine";
import { renderTemplate } from "@/domain/refs";
import { npcCallback } from "@/domain/npc";
import type { Ctx } from "@/domain/behavior/events";
import { dispatch } from "@/state/store";
import { useNav } from "@/nav/router";
import { Actions, Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Enter } from "@/ui/motion";
import { Screen } from "@/ui/Screen";
import { Sigil } from "@/ui/Sigil";
import { EmptyState, ErrorPanel, Notice } from "@/ui/States";
import { T } from "@/ui/T";
import { colors, GUTTER, HUE, HueContext, useHue } from "@/ui/theme";
import { Requirements, durationLabel } from "@/screens/quest/Requirements";
import { StepRenderer } from "@/screens/steps/StepRenderer";
import { ActScreen, ReturnTransition } from "./ActScreen";
import { RevealView } from "./RevealView";

type Command = (s: PlayerState, ctx: Ctx) => PlayerState;

/** Runs a command, turning rule violations into an honest message instead of a crash. */
export function useRun() {
  const [error, setError] = useState<string | null>(null);
  const run = (command: Command) => {
    try {
      dispatch(command);
      setError(null);
    } catch (e) {
      if (e instanceof GameError || e instanceof InvalidTransitionError) setError(e.message);
      else setError(`Bir şey kaydedilemedi: ${(e as Error).message}`);
    }
  };
  return { run, error };
}

const MOVEMENTS = [
  { id: "think", label: "Düşün" },
  { id: "act", label: "Yap" },
  { id: "discover", label: "Keşfet" },
] as const;

function PhaseIndicator({ attempt }: { attempt: QuestAttempt }) {
  const hue = useHue();
  const current = movementOf(attempt.state);
  return (
    <View style={styles.phases} accessibilityLabel="Görev aşaması">
      {MOVEMENTS.map((m) => {
        const on = current === m.id;
        return (
          <View key={m.id} style={[styles.phase, on && { borderBottomColor: hue.base }]} accessibilityState={{ selected: on }}>
            <T v="label" color={on ? colors.text : colors.textMuted}>
              {m.label}
            </T>
          </View>
        );
      })}
    </View>
  );
}

function SetAside({ run }: { run: (c: Command) => void }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm)
    return (
      <Button variant="quiet" onPress={() => setConfirm(true)}>
        Kenara koy
      </Button>
    );
  return (
    <View style={styles.confirm}>
      <T v="caption">Kenara konsun mu? Hiçbir şey kaybolmaz.</T>
      <Actions>
        <Button variant="danger" onPress={() => run((s, ctx) => abandonQuest(s, CONTENT, ctx))}>
          Kenara koy
        </Button>
        <Button variant="quiet" onPress={() => setConfirm(false)}>
          Devam et
        </Button>
      </Actions>
    </View>
  );
}

function PlayHeader({ quest, attempt, run }: { quest: Quest; attempt: QuestAttempt; run: (c: Command) => void }) {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerTop}>
        <Pressable accessibilityRole="link" onPress={() => nav.reset({ name: "world" })} hitSlop={10} style={styles.back}>
          <Icon name="arrow-left" size={18} />
          <T v="label">Şehir</T>
        </Pressable>
        <T v="data" muted numberOfLines={1} style={{ flex: 1, textAlign: "right" }}>
          {questCode(quest)} · {quest.title}
        </T>
      </View>
      <PhaseIndicator attempt={attempt} />
      {attempt.state !== "REVEAL" && (
        <View style={{ alignItems: "flex-end" }}>
          <SetAside run={run} />
        </View>
      )}
    </View>
  );
}

function Briefing({ quest, attempt, player, run }: { quest: Quest; attempt: QuestAttempt; player: PlayerState; run: (c: Command) => void }) {
  const hue = useHue();
  const npc = CONTENT.npcById.get(quest.npcId)!;
  const campaign = CONTENT.campaignById.get(quest.campaignId)!;
  const callback = npcCallback(CONTENT, npc.id, { ...player, events: player.events.filter((e) => e.attemptId !== attempt.id) });
  const thinkSteps = quest.prime.filter((s) => s.kind !== "narrative").length;
  const plan = [
    { label: "Düşün", text: thinkSteps ? `Önce burada ${thinkSteps} kısa adım.` : "Görevi okumak için bir an." },
    { label: "Yap", text: `Dışarıda ${durationLabel(quest)}, cihaz kenarda.` },
    { label: "Keşfet", text: "Geri dön, hatırla, neyi gösterdiğini gör." },
  ];
  return (
    <View style={styles.section}>
      {attempt.mystery && (
        <Enter kind="fade">
          <T v="label" color={HUE.violet.deep}>
            Gizemli görev — mühür açıldı
          </T>
        </Enter>
      )}
      <Enter i={1} kind={attempt.mystery ? "fade" : "enter"}>
        <T v="data" muted>
          {questCode(quest)} · {campaign.title}
        </T>
      </Enter>
      <Enter i={2} kind={attempt.mystery ? "unfold" : "enter"}>
        <T v="display" accessibilityRole="header">
          {quest.title}
        </T>
      </Enter>
      <Enter i={3}>
        <T v="h2" italic secondary>
          {quest.subtitle}
        </T>
      </Enter>
      <Enter i={4}>
        <T v="bodyLg">{quest.description}</T>
      </Enter>
      <Enter i={5}>
        <View style={styles.voice}>
          <Sigil sigil={npc.sigil} size={44} color={hue.deep} />
          <View style={{ flex: 1, gap: 6 }}>
            <T v="h2" italic>
              “{quest.npcLine}”
            </T>
            {callback ? (
              <T v="bodySm" color={hue.deep}>
                {callback}
              </T>
            ) : null}
            <T v="caption">{npc.name}</T>
          </View>
        </View>
      </Enter>
      <Enter i={6}>
        <View style={styles.plan}>
          {plan.map((p) => (
            <View key={p.label} style={styles.planRow}>
              <T v="label" color={hue.deep} style={{ width: 70 }}>
                {p.label}
              </T>
              <T style={{ flex: 1 }}>{p.text}</T>
            </View>
          ))}
        </View>
      </Enter>
      <Button variant="primary" size="lg" icon="arrow-right" block onPress={() => run((s, ctx) => beginQuest(s, CONTENT, ctx))}>
        Başla
      </Button>
    </View>
  );
}

const PHASE_TITLES: Partial<Record<QuestAttempt["state"], { label: string; hint: string }>> = {
  PRIMING: { label: "Düşün", hint: "Hazırlık. Bir iki dakika." },
  RECALL: { label: "Hatırla", hint: "Neyi hatırlıyorsun?" },
  REFLECTION: { label: "Düşün ve yorumla", hint: "Sonuçtan önce." },
};

function StepPhase({ quest, attempt, run }: { quest: Quest; attempt: QuestAttempt; run: (c: Command) => void }) {
  const hue = useHue();
  const steps = stepsFor(quest, attempt.state);
  const step = steps[attempt.stepIndex];
  const title = PHASE_TITLES[attempt.state]!;
  if (!step) return <ErrorPanel title="Bu adım eksik.">Görevin içeriği kayıtlı ilerlemeyle uyuşmuyor. Kenara koy ve yeniden başla.</ErrorPanel>;
  return (
    <View style={styles.section}>
      <T v="label" color={hue.deep}>
        {title.label}
        <T v="data" muted>
          {`  ${attempt.stepIndex + 1} / ${steps.length}`}
        </T>
      </T>
      <Enter key={`${attempt.state}-${attempt.stepIndex}`}>
        <StepRenderer
          step={step}
          quest={quest}
          attempt={attempt}
          submit={(result, rt) => run((s, ctx) => submitStep(s, CONTENT, step.id, result, ctx, rt ?? null))}
          track={(i) => run((s, ctx) => trackInteraction(s, CONTENT, { stepId: step.id, ...i }, ctx))}
        />
      </Enter>
    </View>
  );
}

function Mission({ quest, attempt, run }: { quest: Quest; attempt: QuestAttempt; run: (c: Command) => void }) {
  const nav = useNav();
  const hue = useHue();
  const t = (text: string) => renderTemplate(text, attempt.answers);
  return (
    <View style={styles.section}>
      <T v="label" color={hue.deep}>
        Görev
      </T>
      <Enter kind="unfold">
        <T v="hero">{t(quest.act.instruction)}</T>
      </Enter>
      {quest.act.details.length > 0 && (
        <View style={{ gap: 8 }}>
          {quest.act.details.map((d) => (
            <View key={d} style={styles.bullet}>
              <View style={[styles.dot, { backgroundColor: hue.base }]} />
              <T style={{ flex: 1 }}>{t(d)}</T>
            </View>
          ))}
        </View>
      )}
      {quest.act.segments.length > 0 && (
        <View style={styles.plan}>
          {quest.act.segments.map((s, i) => (
            <View key={s.id} style={styles.planRow}>
              <T v="label" color={hue.deep} style={{ width: 90 }}>
                {`${i + 1}. ${s.label}`}
              </T>
              <T style={{ flex: 1 }}>{s.instruction}</T>
            </View>
          ))}
        </View>
      )}
      <Requirements quest={quest} showDifficulty={false} />
      <View style={{ gap: 6 }} accessibilityLabel="Güvenlik">
        {quest.safety.notes.map((n) => (
          <View key={n} style={styles.bullet}>
            <View style={[styles.dot, { backgroundColor: colors.text }]} />
            <T v="bodySm" style={{ flex: 1 }}>
              {n}
            </T>
          </View>
        ))}
      </View>
      <T v="caption">Hiçbir saat gösterilmeyecek. Saatçi sessizce tutar; ne zaman döndüğüne yalnızca sen karar verirsin.</T>
      <Button variant="primary" size="lg" icon="arrow-right" block onPress={() => run((s, ctx) => startAct(s, CONTENT, ctx))}>
        Başla — cihaz kenara
      </Button>
      <Button variant="secondary" size="lg" block onPress={() => nav.reset({ name: "world" })}>
        Henüz değil
      </Button>
    </View>
  );
}

export function PlayScreen({ player }: { player: PlayerState }) {
  const nav = useNav();
  const { run, error } = useRun();
  const scroll = useRef<ScrollView>(null);
  const attempt = player.activeAttemptId ? player.attempts[player.activeAttemptId] : null;

  // Each new step starts at the top of the page.
  const stepKey = attempt ? `${attempt.state}-${attempt.stepIndex}` : "";
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [stepKey]);

  if (!attempt || !isInProgress(attempt.state)) {
    return (
      <Screen contentStyle={{ paddingTop: 80 }}>
        <EmptyState
          title="Devam eden görev yok."
          action={
            <Button variant="primary" icon="arrow-right" onPress={() => nav.reset({ name: "quest" })}>
              Bana bir görev ver
            </Button>
          }
        >
          Şehir bekliyor. Onun dışındaki her şey de.
        </EmptyState>
        <Button variant="quiet" onPress={() => nav.reset({ name: "world" })}>
          Şehre dön
        </Button>
      </Screen>
    );
  }

  const quest = CONTENT.questById.get(attempt.questId);
  if (!quest) {
    return (
      <Screen contentStyle={{ paddingTop: 80 }}>
        <ErrorPanel
          title="Bu görev artık yok."
          actions={
            <Button variant="secondary" onPress={() => run((s, ctx) => abandonQuest(s, CONTENT, ctx))}>
              Kenara koy
            </Button>
          }
        >
          {`Kayıtlı ilerleme “${attempt.questId}” görevini gösteriyor; bu görev Şehrin bu sürümünde yok.`}
        </ErrorPanel>
      </Screen>
    );
  }

  if (attempt.state === "ACTING" || attempt.state === "WAITING_FOR_RETURN") return <ActScreen quest={quest} attempt={attempt} run={run} error={error} />;
  if (attempt.state === "RETURNED") return <ReturnTransition run={run} />;

  const tone = CONTENT.campaignById.get(quest.campaignId)?.tone ?? null;
  return (
    <HueContext.Provider value={tone}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <PlayHeader quest={quest} attempt={attempt} run={run} />
        <Screen ref={scroll} contentStyle={{ paddingTop: 20 }}>
          {error ? <Notice tone="warning">{error}</Notice> : null}
          {attempt.state === "ACCEPTED" && <Briefing quest={quest} attempt={attempt} player={player} run={run} />}
          {(attempt.state === "PRIMING" || attempt.state === "RECALL" || attempt.state === "REFLECTION") && <StepPhase quest={quest} attempt={attempt} run={run} />}
          {attempt.state === "READY_TO_ACT" && <Mission quest={quest} attempt={attempt} run={run} />}
          {attempt.state === "REVEAL" && <RevealView quest={quest} attempt={attempt} />}
        </Screen>
      </View>
    </HueContext.Provider>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: GUTTER, paddingBottom: 4, gap: 10, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36 },
  phases: { flexDirection: "row", gap: 18 },
  phase: { paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: "transparent" },
  confirm: { gap: 8, alignItems: "flex-end", paddingBottom: 8 },
  section: { gap: 20 },
  voice: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  plan: { borderTopWidth: 1, borderColor: colors.borderStrong },
  planRow: { flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border, alignItems: "flex-start" },
  bullet: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  dot: { width: 6, height: 6, marginTop: 9 },
});

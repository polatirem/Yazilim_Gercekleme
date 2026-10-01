import { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { AppState, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CONTENT } from "@/content";
import type { Quest } from "@/domain/content-types";
import type { PlayerState, QuestAttempt } from "@/domain/player-types";
import { abandonQuest, leaveAct, markSegment, openSealed, proceedAfterReturn, returnFromAct } from "@/domain/game";
import { renderTemplate } from "@/domain/refs";
import type { Ctx } from "@/domain/behavior/events";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Enter, useReduceMotion } from "@/ui/motion";
import { T } from "@/ui/T";
import { colors, GUTTER, HUE, HueContext } from "@/ui/theme";

export type Run = (c: (s: PlayerState, ctx: Ctx) => PlayerState) => void;

/**
 * ACT. The interface steps out of the way: no navigation, no clock, one
 * button. Leaving the app is expected; it's recorded as "away", not failure.
 */
export function ActScreen({ quest, attempt, run, error }: { quest: Quest; attempt: QuestAttempt; run: Run; error: string | null }) {
  const insets = useSafeAreaInsets();
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const campaign = CONTENT.campaignById.get(quest.campaignId)!;
  const hue = HUE[campaign.tone];
  const t = (text: string) => renderTemplate(text, attempt.answers);
  const segments = quest.act.segments;
  const segmentIndex = attempt.segmentMarks.length;
  const segment = segments[segmentIndex];
  const lastSegment = segmentIndex >= segments.length - 1;
  const away = attempt.state === "WAITING_FOR_RETURN";

  // The phone going into a pocket (app backgrounded) is the "tab hidden" of the web version.
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });
  useEffect(() => {
    if (attempt.state !== "ACTING") return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "background") runRef.current((s, ctx) => leaveAct(s, CONTENT, ctx));
    });
    return () => sub.remove();
  }, [attempt.state]);

  return (
    <HueContext.Provider value={campaign.tone}>
      <StatusBar style="light" />
      <ScrollView style={{ flex: 1, backgroundColor: colors.nightBackground }} contentContainerStyle={[styles.act, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}>
        <View style={[styles.orb, { backgroundColor: hue.base }]} />
        <View style={styles.kicker}>
          <View style={[styles.signal, { backgroundColor: hue.base }]} />
          <T v="label" color={colors.nightMuted}>
            {campaign.title} — Görev sürüyor
          </T>
        </View>

        <T v="display" color={colors.nightText} accessibilityRole="header">
          {away ? "Tekrar hoş geldin." : "Cihazı bırak."}
        </T>

        {segment ? (
          <Enter key={segment.id}>
            <View style={[styles.segment, { borderLeftColor: hue.base }]}>
              <T v="label" color={hue.base}>
                {segment.label}
                <T v="data" color={colors.nightMuted}>
                  {`  · ${segmentIndex + 1} / ${segments.length}`}
                </T>
              </T>
              <T v="h2" color={colors.nightText}>
                {segment.instruction}
              </T>
            </View>
          </Enter>
        ) : (
          <T v="h2" color={colors.nightText}>
            {t(quest.act.instruction)}
          </T>
        )}

        <T v="bodyLg" color={colors.nightMuted}>
          {t(quest.act.reminder)}
        </T>

        {quest.act.sealed &&
          (attempt.sealedOpenedAt ? (
            <Enter kind="unfold">
              <View style={[styles.sealedOpen, { borderColor: hue.base }]} accessibilityLiveRegion="polite">
                <T v="label" color={hue.base}>
                  Mühürlü not
                </T>
                <T v="bodyLg" color={colors.nightText}>
                  {quest.act.sealed.body}
                </T>
              </View>
            </Enter>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => run((s, ctx) => openSealed(s, CONTENT, ctx))} style={({ pressed }) => [styles.sealed, pressed && { backgroundColor: colors.nightSurface }]}>
              <Icon name="seal" color={colors.nightText} />
              <View style={{ flex: 1, gap: 4 }}>
                <T v="label" color={colors.nightMuted}>
                  Mühürlü not
                </T>
                <T color={colors.nightText}>{quest.act.sealed.trigger}</T>
              </View>
            </Pressable>
          ))}

        {error ? (
          <T v="bodySm" color="#f3a58f" accessibilityRole="alert">
            {error}
          </T>
        ) : null}

        <View style={{ gap: 12, marginTop: 8 }}>
          {segments.length > 1 && !lastSegment ? (
            <Button variant="inverse" size="lg" icon="arrow-right" block onPress={() => run((s, ctx) => markSegment(s, CONTENT, ctx))}>
              Sonraki bölüm
            </Button>
          ) : (
            <Button variant="inverse" size="lg" icon="return" block onPress={() => run((s, ctx) => returnFromAct(s, CONTENT, ctx))}>
              Döndüm
            </Button>
          )}
          <T v="caption" color={colors.nightMuted}>
            Bitirince geri dön. Saat de yok, acele de.
          </T>
        </View>

        <View style={styles.footer}>
          <T v="caption" color={colors.nightMuted}>
            {quest.safety.notes[0]}
          </T>
          {confirmAbandon ? (
            <View style={{ gap: 10 }}>
              <T v="bodySm" color={colors.nightText}>
                Kenara konsun mu? Hiçbir şey kaybolmaz.
              </T>
              <View style={{ flexDirection: "row", gap: 20 }}>
                <T color="#f3a58f" style={styles.footerLink} onPress={() => run((s, ctx) => abandonQuest(s, CONTENT, ctx))}>
                  Kenara koy
                </T>
                <T color={colors.nightText} style={styles.footerLink} onPress={() => setConfirmAbandon(false)}>
                  Devam et
                </T>
              </View>
            </View>
          ) : (
            <T color={colors.nightMuted} style={styles.footerLink} onPress={() => setConfirmAbandon(true)}>
              Bu görevi kenara koy
            </T>
          )}
        </View>
      </ScrollView>
    </HueContext.Provider>
  );
}

/** Re-entering the game world: night fades to paper, then recall begins. */
export function ReturnTransition({ run }: { run: Run }) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  useEffect(() => {
    const t = setTimeout(() => run((s, ctx) => proceedAfterReturn(s, CONTENT, ctx)), reduce ? 0 : 1600);
    return () => clearTimeout(t);
    // Runs once per arrival in RETURNED.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={[styles.returning, { paddingTop: insets.top }]} accessibilityLiveRegion="polite">
      <Enter kind="fade">
        <View style={{ alignItems: "center", gap: 16 }}>
          <View style={styles.returnLine}>
            <View style={[styles.returnSeg, { width: 60 }]} />
            <View style={[styles.returnSeg, { width: 16, backgroundColor: colors.accent }]} />
            <View style={[styles.returnSeg, { width: 60 }]} />
          </View>
          <T v="label" secondary>
            Şehre geri dönülüyor
          </T>
        </View>
      </Enter>
    </View>
  );
}

const styles = StyleSheet.create({
  act: { paddingHorizontal: GUTTER + 4, gap: 24, minHeight: "100%", overflow: "hidden" },
  orb: { position: "absolute", width: 320, height: 320, borderRadius: 160, right: -140, top: -120, opacity: 0.18 },
  kicker: { flexDirection: "row", alignItems: "center", gap: 10 },
  signal: { width: 8, height: 8 },
  segment: { borderLeftWidth: 3, paddingLeft: 14, gap: 8 },
  sealed: { flexDirection: "row", gap: 14, alignItems: "flex-start", padding: 16, borderWidth: 1, borderStyle: "dashed", borderColor: colors.nightBorder },
  sealedOpen: { padding: 16, borderWidth: 1, gap: 8, backgroundColor: colors.nightSurface },
  footer: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderColor: colors.nightBorder, gap: 12 },
  footerLink: { textDecorationLine: "underline", paddingVertical: 6 },
  returning: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  returnLine: { flexDirection: "row", alignItems: "center", gap: 4 },
  returnSeg: { height: 2, backgroundColor: colors.text },
});

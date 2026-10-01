import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { CONTENT, questCode } from "@/content";
import type { Quest } from "@/domain/content-types";
import type { PlayerState } from "@/domain/player-types";
import { activeAttempt } from "@/domain/game";
import { npcCallback } from "@/domain/npc";
import { deriveWorld, isQuestUnlocked, resolvedAttempts } from "@/domain/world";
import { useNav } from "@/nav/router";
import { Actions, Button } from "@/ui/Button";
import { dayMonth } from "@/ui/dates";
import { Icon } from "@/ui/Icon";
import { Enter } from "@/ui/motion";
import { Link } from "@/ui/Screen";
import { Sigil } from "@/ui/Sigil";
import { Notice } from "@/ui/States";
import { T } from "@/ui/T";
import { colors, HUE, HueContext, hueSet } from "@/ui/theme";
import { Requirements, requirementsOf } from "./Requirements";

interface OfferActions {
  onAccept: () => void;
  onNotNow: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  position?: string;
  error?: string | null;
}

/** "Yola çıkmadan önce": a collapsible list of safety notes. */
function SafetyNotes({ notes, title, open: initiallyOpen = false }: { notes: string[]; title: string; open?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={styles.safety}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} style={styles.safetyHead}>
        <T v="label">{title}</T>
        <Icon name={open ? "up" : "down"} size={16} />
      </Pressable>
      {open &&
        notes.map((n) => (
          <View key={n} style={styles.bullet}>
            <View style={styles.dot} />
            <T v="bodySm" style={{ flex: 1 }}>
              {n}
            </T>
          </View>
        ))}
    </View>
  );
}

/** Band header: code, campaign, place, big serif title on the campaign's colour. */
function Band({ meta, title, subtitle, position, hue }: { meta: string[]; title: string; subtitle: string; position?: string; hue: ReturnType<typeof hueSet> }) {
  return (
    <View style={[styles.band, { backgroundColor: hue.deep }]}>
      <View style={styles.bandTop}>
        <T v="data" color={hue.wash} style={{ flex: 1 }}>
          {meta.join("  ·  ")}
        </T>
        {position ? (
          <T v="data" color={hue.wash}>
            {position}
          </T>
        ) : null}
      </View>
      <T v="display" color={colors.textInverse} accessibilityRole="header">
        {title}
      </T>
      <T v="h2" italic color={hue.wash}>
        {subtitle}
      </T>
      <View style={[styles.bandShape, { backgroundColor: hue.base }]} />
    </View>
  );
}

/** Görev keşif ekranı: ne, nerede, ne kadar sürer, kim istiyor — ve ne güvenli. */
export function QuestDossier({ quest, player, onAccept, onNotNow, onSkip, skipLabel = "Atla", position, error }: { quest: Quest; player: PlayerState } & OfferActions) {
  const nav = useNav();
  const campaign = CONTENT.campaignById.get(quest.campaignId)!;
  const location = CONTENT.locationById.get(quest.locationId)!;
  const npc = CONTENT.npcById.get(quest.npcId)!;
  const callback = npcCallback(CONTENT, npc.id, player);
  const world = deriveWorld(CONTENT, player);
  const unlocked = isQuestUnlocked(quest, world.completedQuestIds, world.campaignProgress);
  const active = activeAttempt(player);
  const blockedBy = active && active.questId !== quest.id ? CONTENT.questById.get(active.questId) : null;
  const previousList = resolvedAttempts(player).filter((a) => a.questId === quest.id);
  const previous = previousList[previousList.length - 1];
  const needed = quest.availability.requiresCampaignProgress - (world.campaignProgress[campaign.id]?.completed ?? 0);
  const hue = HUE[campaign.tone];

  return (
    <HueContext.Provider value={campaign.tone}>
      <Enter>
        <View style={styles.dossier}>
          <Band
            hue={hue}
            meta={[questCode(quest), campaign.title, world.revealedLocations.has(location.id) ? location.name : "Haritasız topraklar"]}
            title={quest.title}
            subtitle={quest.subtitle}
            position={position}
          />

          <T v="bodyLg">{quest.description}</T>

          <Requirements quest={quest} />

          <View style={styles.voice}>
            <Sigil sigil={npc.sigil} size={48} color={hue.deep} />
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

          <SafetyNotes notes={quest.safety.notes} title="Yola çıkmadan önce" />

          {previous?.completedAt ? <T v="caption">{dayMonth(previous.completedAt)} tarihinde tamamlandı. Yeniden oynanabilir; Şehir ikisini de hatırlar.</T> : null}
          {error ? <Notice tone="warning">{error}</Notice> : null}

          {!unlocked ? (
            <Notice>
              {`Henüz açık değil. ${needed > 0 ? `Açmak için ${campaign.title} kampanyasında ${needed} görev daha tamamla.` : "Önce ondan önceki görevleri tamamla."}`}
            </Notice>
          ) : blockedBy ? (
            <View style={{ gap: 12 }}>
              <Notice>{`${blockedBy.title} hâlâ devam ediyor. Önce onu bitir ya da kenara koy.`}</Notice>
              <Button variant="secondary" icon="arrow-right" onPress={() => nav.reset({ name: "play" })}>
                {`${blockedBy.title} görevine git`}
              </Button>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <Button variant="primary" size="lg" icon="arrow-right" block onPress={onAccept}>
                Görevi kabul et
              </Button>
              <Actions>
                <Button variant="secondary" onPress={onNotNow}>
                  Şimdi değil
                </Button>
                {onSkip && (
                  <Button variant="quiet" onPress={onSkip}>
                    {skipLabel}
                  </Button>
                )}
              </Actions>
            </View>
          )}
        </View>
      </Enter>
    </HueContext.Provider>
  );
}

/** Gizemli Görev: gereksinimler ve güvenlik tam gösterilir; yalnızca görevin kendisi mühürlüdür. */
export function MysteryDossier({ quest, onAccept, onNotNow, onSkip, error, onNormal }: { quest: Quest; onNormal: () => void } & OfferActions) {
  const hue = HUE.violet;
  return (
    <HueContext.Provider value="violet">
      <Enter>
        <View style={styles.dossier}>
          <Band hue={hue} meta={["Gizemli görev", "Mühürlü"]} title="Bir şey bekliyor." subtitle="Ne olduğunu, evet dedikten sonra öğreneceksin." />
          <View style={styles.seal}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.sealBar, { backgroundColor: hue.base, opacity: 1 - i * 0.28 }]} />
            ))}
          </View>
          <T v="bodyLg">Kabul etmeden önce bilmen gerekenler:</T>
          <View style={{ gap: 6 }}>
            {requirementsOf(quest).map((r) => (
              <View key={r.label} style={styles.bullet}>
                <Icon name={r.icon} size={16} color={hue.deep} />
                <T v="data" style={{ flex: 1 }}>
                  {r.label}
                </T>
              </View>
            ))}
          </View>
          <SafetyNotes notes={quest.safety.notes} title="Güvenlik — eksiksiz" open />
          <T v="caption">Kabul ettikten sonra da istediğin an, hiçbir bedel ödemeden kenara koyabilirsin.</T>
          {error ? <Notice tone="warning">{error}</Notice> : null}
          <Button variant="primary" size="lg" icon="arrow-right" block onPress={onAccept}>
            Gizemli görevi kabul et
          </Button>
          <Actions>
            <Button variant="secondary" onPress={onNotNow}>
              Şimdi değil
            </Button>
            {onSkip && (
              <Button variant="quiet" onPress={onSkip}>
                Başka bir tane mühürle
              </Button>
            )}
          </Actions>
          <T v="caption">
            Önce bilmeyi mi tercih edersin?{" "}
            <Link v="caption" onPress={onNormal}>
              Normal bir görev seç.
            </Link>
          </T>
        </View>
      </Enter>
    </HueContext.Provider>
  );
}

const styles = StyleSheet.create({
  dossier: { gap: 20 },
  band: { padding: 20, paddingBottom: 24, gap: 10, overflow: "hidden", marginHorizontal: -4 },
  bandTop: { flexDirection: "row", gap: 12, marginBottom: 6 },
  bandShape: { position: "absolute", right: -30, bottom: -30, width: 90, height: 90, transform: [{ rotate: "45deg" }], opacity: 0.9 },
  voice: { flexDirection: "row", gap: 14, alignItems: "flex-start", paddingVertical: 4 },
  safety: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 4, gap: 8 },
  safetyHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 44 },
  bullet: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingBottom: 6 },
  dot: { width: 5, height: 5, backgroundColor: colors.text, marginTop: 8 },
  seal: { flexDirection: "row", gap: 6 },
  sealBar: { flex: 1, height: 10 },
});

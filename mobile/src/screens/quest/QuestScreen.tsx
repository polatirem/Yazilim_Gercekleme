import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { CONTENT } from "@/content";
import type { TimeBudget } from "@/domain/content-types";
import type { ContextInput, PlayerState } from "@/domain/player-types";
import { EXCLUSION_COPY, type ExclusionReason } from "@/domain/context-engine";
import { GameError, abandonQuest, acceptQuest, activeAttempt, viewQuest } from "@/domain/game";
import { dispatch } from "@/state/store";
import { useNav } from "@/nav/router";
import { Actions, Button } from "@/ui/Button";
import { Screen } from "@/ui/Screen";
import { EmptyState } from "@/ui/States";
import { T } from "@/ui/T";
import { HueContext, useHue } from "@/ui/theme";
import { ContextForm } from "./ContextForm";
import { MysteryDossier, QuestDossier } from "./QuestDossier";
import { PHASE_COPY, PLACE_LABEL } from "./Requirements";
import { useQuestOffer } from "./useQuestOffer";

const ENERGY_LABEL = { low: "düşük", normal: "normal", high: "yüksek" } as const;

export function defaultContext(player: PlayerState): ContextInput {
  return player.lastContext ?? { place: player.preferences.primaryPlace ?? "home", minutes: player.preferences.typicalMinutes ?? 15 };
}

function InProgress({ player }: { player: PlayerState }) {
  const nav = useNav();
  const [confirm, setConfirm] = useState(false);
  const attempt = activeAttempt(player)!;
  const quest = CONTENT.questById.get(attempt.questId)!;
  return (
    <Screen hue={CONTENT.campaignById.get(quest.campaignId)?.tone ?? null}>
      <T v="label" muted>
        Devam eden görev
      </T>
      <T v="hero">{quest.title}</T>
      <T v="bodyLg" secondary>
        {PHASE_COPY[attempt.state]}. Her seferinde tek görev — dünya yeterince büyük.
      </T>
      <Button variant="primary" size="lg" icon="arrow-right" block onPress={() => nav.push({ name: "play" })}>
        Devam et
      </Button>
      <Actions>
        {confirm ? (
          <>
            <Button variant="danger" onPress={() => dispatch((s, ctx) => abandonQuest(s, CONTENT, ctx))}>
              Evet, kenara koy
            </Button>
            <Button variant="quiet" onPress={() => setConfirm(false)}>
              Kalsın
            </Button>
          </>
        ) : (
          <Button variant="secondary" onPress={() => setConfirm(true)}>
            Kenara koy
          </Button>
        )}
      </Actions>
      {confirm && <T v="caption">Bir görevi kenara koymanın hiçbir bedeli yok. Sonra için açık kalır.</T>}
    </Screen>
  );
}

function nextBudget(m: TimeBudget): TimeBudget | null {
  return m === 2 ? 5 : m === 5 ? 15 : m === 15 ? 30 : null;
}

function BackChip({ label, onPress }: { label: string; onPress: () => void }) {
  const hue = useHue();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ alignSelf: "flex-start", paddingVertical: 6 }}>
      <T v="data" color={hue.deep} style={{ textDecorationLine: "underline" }}>
        {label}
      </T>
    </Pressable>
  );
}

export function QuestScreen({ player, mysteryParam }: { player: PlayerState; mysteryParam: boolean }) {
  const nav = useNav();
  const [context, setContext] = useState<ContextInput | null>(null);
  const [mystery, setMystery] = useState(mysteryParam);
  const offer = useQuestOffer(player, context, mystery);
  const currentId = offer.current?.quest.id;
  const { markViewed } = offer;

  useEffect(() => {
    if (currentId) markViewed(currentId);
    // Re-run only when a different quest is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  if (activeAttempt(player)) return <InProgress player={player} />;

  if (!context) {
    return (
      <Screen hue={mysteryParam ? "violet" : "amber"}>
        <T v="label" muted>
          Bana bir görev ver
        </T>
        <T v="hero">Şu an neredesin?</T>
        <T v="bodyLg" secondary>
          Görevler bulunduğun yere ve gerçekten ayırabileceğin zamana göre seçilir.
        </T>
        <ContextForm
          initial={defaultContext(player)}
          initialMystery={mysteryParam}
          onSubmit={(c, m) => {
            setMystery(m);
            setContext(c);
          }}
        />
      </Screen>
    );
  }

  const back = (
    <BackChip
      onPress={() => setContext(null)}
      label={`${PLACE_LABEL[context.place]} · ${context.minutes === 30 ? "30+" : context.minutes} dk${context.energy ? ` · ${ENERGY_LABEL[context.energy]} enerji` : ""} — değiştir`}
    />
  );

  if (offer.current) {
    const quest = offer.current.quest;
    return (
      <Screen key={quest.id}>
        {back}
        {mystery ? (
          <MysteryDossier
            quest={quest}
            onAccept={offer.accept}
            onNotNow={() => nav.reset({ name: "world" })}
            onSkip={offer.skip}
            error={offer.error}
            onNormal={() => {
              setMystery(false);
              setContext(null);
            }}
          />
        ) : (
          <QuestDossier
            quest={quest}
            player={player}
            onAccept={offer.accept}
            onNotNow={() => nav.reset({ name: "world" })}
            onSkip={offer.skip}
            position={offer.position}
            error={offer.error}
          />
        )}
      </Screen>
    );
  }

  const reasons = new Map<ExclusionReason, number>();
  for (const e of offer.recommendation?.excluded ?? []) reasons.set(e.reason, (reasons.get(e.reason) ?? 0) + 1);
  const more = nextBudget(context.minutes);

  return (
    <Screen hue="amber">
      {back}
      {offer.exhausted ? (
        <EmptyState
          title="Şu an uyan görevlerin hepsi bu kadar."
          action={
            <>
              <Button variant="secondary" onPress={offer.reset}>
                Yeniden bak
              </Button>
              <Button variant="quiet" onPress={() => setContext(null)}>
                Yeri ya da süreyi değiştir
              </Button>
            </>
          }
        >
          Atlamanın bedeli yok. Geçtiklerin başka bir zaman yeniden karşına çıkacak.
        </EmptyState>
      ) : (
        <EmptyState
          title={`${PLACE_LABEL[context.place]} için ${context.minutes === 30 ? "30+" : context.minutes} dakikaya uyan bir görev henüz yok.`}
          action={
            <>
              {more && (
                <Button variant="primary" icon="arrow-right" onPress={() => setContext({ ...context, minutes: more })}>
                  {`${more === 30 ? "30+" : more} dakikayı dene`}
                </Button>
              )}
              <Button variant="quiet" onPress={() => setContext(null)}>
                Bulunduğun yeri değiştir
              </Button>
            </>
          }
        >
          {`${CONTENT.quests.length} görevden: ${[...reasons].map(([r, n]) => `${n} tanesi ${EXCLUSION_COPY[r]}`).join(", ")}.`}
        </EmptyState>
      )}
    </Screen>
  );
}

/** /quest/[slug]: a quest opened directly from the map, a campaign, the Journey or the Codex. */
export function QuestDetail({ slug, player }: { slug: string; player: PlayerState }) {
  const nav = useNav();
  const quest = CONTENT.questBySlug.get(slug);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quest) dispatch((s, ctx) => viewQuest(s, quest.id, ctx, { source: "direct" }));
  }, [quest]);

  if (!quest) {
    return (
      <Screen>
        <EmptyState
          title="Bu sokak haritada yok."
          action={
            <Button variant="primary" icon="arrow-right" onPress={() => nav.reset({ name: "world" })}>
              Şehre dön
            </Button>
          }
        >
          Aradığın görev bulunamadı. Belki henüz haritalanmadı.
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen>
      <HueContext.Provider value={CONTENT.campaignById.get(quest.campaignId)?.tone ?? null}>
        <View>
          <BackChip label="← Geri" onPress={() => (nav.depth > 1 ? nav.back() : nav.reset({ name: "world" }))} />
        </View>
      </HueContext.Provider>
      <QuestDossier
        quest={quest}
        player={player}
        error={error}
        onAccept={() => {
          try {
            dispatch((s, ctx) => acceptQuest(s, CONTENT, quest.id, { context: null, mystery: false }, ctx));
            nav.reset({ name: "play" });
          } catch (e) {
            setError(e instanceof GameError ? e.message : `O yol açılmadı. ${(e as Error).message}`);
          }
        }}
        onNotNow={() => (nav.depth > 1 ? nav.back() : nav.reset({ name: "world" }))}
      />
    </Screen>
  );
}

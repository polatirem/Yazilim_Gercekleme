import { useEffect, useMemo, useState, type ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Hue } from "@/domain/content-types";
import type { PlayerState, Preferences } from "@/domain/player-types";
import { setLastContext, setPreferences } from "@/domain/game";
import { dispatch } from "@/state/store";
import { useNav } from "@/nav/router";
import { Actions, Button } from "@/ui/Button";
import { Enter } from "@/ui/motion";
import { OptionGroup } from "@/ui/OptionGroup";
import { Link, Screen } from "@/ui/Screen";
import { T } from "@/ui/T";
import { colors, GUTTER, HUE, HueContext } from "@/ui/theme";
import { QuestDossier } from "@/screens/quest/QuestDossier";
import { useQuestOffer } from "@/screens/quest/useQuestOffer";

type Place = "home" | "school" | "work" | "outside";
const TOTAL = 5;

function BigLogo() {
  return (
    <View style={styles.bigLogo}>
      {(["vermilion", "teal", "saffron", "indigo"] as const).map((h, i) => (
        <Enter key={h} i={i} kind="fade">
          <View style={[styles.logoCell, { backgroundColor: HUE[h].base }]} />
        </Enter>
      ))}
    </View>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <View style={styles.progress} accessibilityLabel={`Adım ${step} / ${TOTAL}`}>
      <T v="data">
        {String(step).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
      </T>
      <View style={styles.progressBar}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <View key={i} style={[styles.progressCell, i < step && { backgroundColor: colors.text }]} />
        ))}
      </View>
    </View>
  );
}

function FirstQuest({ player }: { player: PlayerState }) {
  const nav = useNav();
  const context = useMemo(
    () => ({ place: player.preferences.primaryPlace ?? "home", minutes: player.preferences.typicalMinutes ?? 15 }) as const,
    [player.preferences.primaryPlace, player.preferences.typicalMinutes],
  );
  const offer = useQuestOffer(player, context, false);
  const currentId = offer.current?.quest.id;
  const { markViewed } = offer;
  useEffect(() => {
    if (currentId) markViewed(currentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  if (!offer.current) {
    return (
      <Screen contentStyle={{ paddingTop: 80 }}>
        <T v="hero">Şehir hazır.</T>
        <Button variant="primary" size="lg" icon="arrow-right" onPress={() => nav.reset({ name: "quest" })}>
          Bir görev bul
        </Button>
      </Screen>
    );
  }
  return (
    <Screen key={offer.current.quest.id}>
      <T v="label" color={colors.accentText}>
        İlk görevin
      </T>
      <QuestDossier
        quest={offer.current.quest}
        player={player}
        onAccept={offer.accept}
        onNotNow={() => nav.reset({ name: "world" })}
        onSkip={offer.skip}
        skipLabel="Başka birini göster"
        error={offer.error}
      />
    </Screen>
  );
}

function Night({ hue, children }: { hue: Hue; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <HueContext.Provider value={hue}>
      <StatusBar style="light" />
      <ScrollView style={{ flex: 1, backgroundColor: colors.nightBackground }} contentContainerStyle={[styles.night, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 40 }]}>
        <View style={[styles.orb, { backgroundColor: HUE[hue].base }]} />
        {children}
      </ScrollView>
    </HueContext.Provider>
  );
}

export function Onboarding({ player }: { player: PlayerState }) {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(player.preferences.onboarded ? 6 : 1);
  const [place, setPlace] = useState<Place | null>(null);
  const [minutes, setMinutes] = useState<5 | 15 | 30 | null>(null);
  const [people, setPeople] = useState<Preferences["peopleComfort"]>(null);

  const finish = (comfort: NonNullable<Preferences["peopleComfort"]>) => {
    const primaryPlace = place === "school" || place === "work" ? "work" : (place ?? "home");
    const typicalMinutes = minutes ?? 15;
    dispatch((s) => setLastContext(setPreferences(s, { onboarded: true, primaryPlace, typicalMinutes, peopleComfort: comfort }), { place: primaryPlace, minutes: typicalMinutes }));
    setStep(6);
  };

  if (step === 1) {
    return (
      <Night hue="indigo">
        <BigLogo />
        <Enter>
          <T v="display" color={colors.nightText} style={{ fontSize: 48, lineHeight: 50 }}>
            Dünya bir süredir otomatik pilotta.
          </T>
        </Enter>
        <Enter i={3}>
          <Button variant="inverse" size="lg" icon="arrow-right" onPress={() => setStep(2)}>
            Devam
          </Button>
        </Enter>
      </Night>
    );
  }

  if (step === 2) {
    return (
      <Night hue="vermilion">
        <Enter>
          <T v="display" color={colors.nightText} style={{ fontSize: 48, lineHeight: 50 }}>
            Hadi onu bölelim.
          </T>
        </Enter>
        <Enter i={2}>
          <View style={styles.loop}>
            {(
              [
                ["amber", "Düşün", "Burada bir dakikalık hazırlık."],
                ["teal", "Yap", "Dışarıda, cihaz kenara konmuşken."],
                ["saffron", "Keşfet", "Geri dön ve neler olduğunu bul."],
              ] as const
            ).map(([h, label, text]) => (
              <View key={label} style={styles.loopRow}>
                <T v="label" color={HUE[h].base} style={{ width: 72 }}>
                  {label}
                </T>
                <T color={colors.nightText} style={{ flex: 1 }}>
                  {text}
                </T>
              </View>
            ))}
          </View>
        </Enter>
        <Enter i={3}>
          <T v="bodySm" color={colors.nightMuted}>
            Hesap yok. Konum yok. Her şey bu cihazda kalır. Bir test değil, bir tedavi değil — kısmen gerçek dünyada geçen bir macera.
          </T>
        </Enter>
        <Enter i={4}>
          <Button variant="inverse" size="lg" icon="arrow-right" onPress={() => setStep(3)}>
            Başla
          </Button>
        </Enter>
      </Night>
    );
  }

  if (step === 6) return <FirstQuest player={player} />;

  const skip = (
    <Link
      v="bodySm"
      color={colors.textSecondary}
      onPress={() => {
        dispatch((s) => setPreferences(s, { onboarded: true }));
        nav.reset({ name: "world" });
      }}
    >
      Doğrudan Şehre geç
    </Link>
  );

  return (
    <Screen hue="vermilion" contentStyle={{ paddingTop: insets.top + 24, gap: 28 }}>
      <Progress step={step} />
      {step === 3 && (
        <Enter key="place">
          <View style={styles.question}>
            <OptionGroup
              legend="Zamanının çoğunu nerede geçiriyorsun?"
              legendAs="prompt"
              options={[
                { value: "home" as Place, label: "Ev", icon: "home" },
                { value: "school" as Place, label: "Okul", icon: "work" },
                { value: "work" as Place, label: "İş", icon: "work" },
                { value: "outside" as Place, label: "Dışarısı", icon: "outside" },
              ]}
              value={place}
              onChange={setPlace}
              columns={2}
              size="lg"
            />
            <Button variant="primary" size="lg" icon="arrow-right" disabled={!place} onPress={() => setStep(4)}>
              Devam
            </Button>
          </View>
        </Enter>
      )}
      {step === 4 && (
        <Enter key="time">
          <View style={styles.question}>
            <OptionGroup
              legend="Bir göreve genellikle ne kadar zaman ayırabilirsin?"
              legendAs="prompt"
              options={[
                { value: 5 as const, label: "5 dk" },
                { value: 15 as const, label: "15 dk" },
                { value: 30 as const, label: "30 dk" },
              ]}
              value={minutes}
              onChange={setMinutes}
              columns={3}
              size="lg"
            />
            <Actions>
              <Button variant="primary" size="lg" icon="arrow-right" disabled={!minutes} onPress={() => setStep(5)}>
                Devam
              </Button>
              <Button variant="quiet" onPress={() => setStep(3)}>
                Geri
              </Button>
            </Actions>
          </View>
        </Enter>
      )}
      {step === 5 && (
        <Enter key="people">
          <View style={styles.question}>
            <OptionGroup
              legend="Başka insanları içeren görevler sana uyar mı?"
              legendAs="prompt"
              description="Yalnızca zaten tanıdığın insanlar. Asla yabancılar değil."
              options={[
                { value: "yes" as const, label: "Evet" },
                { value: "sometimes" as const, label: "Bazen" },
                { value: "no" as const, label: "Hayır" },
              ]}
              value={people}
              onChange={setPeople}
              columns={3}
              size="lg"
            />
            <Actions>
              <Button variant="primary" size="lg" icon="arrow-right" disabled={!people} onPress={() => people && finish(people)}>
                Devam
              </Button>
              <Button variant="quiet" onPress={() => setStep(4)}>
                Geri
              </Button>
            </Actions>
          </View>
        </Enter>
      )}
      <View style={{ marginTop: 12 }}>{skip}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  night: { paddingHorizontal: GUTTER + 4, gap: 32, minHeight: "100%", justifyContent: "center", overflow: "hidden" },
  orb: { position: "absolute", width: 360, height: 360, borderRadius: 180, right: -160, bottom: -120, opacity: 0.22 },
  bigLogo: { flexDirection: "row", flexWrap: "wrap", width: 76, gap: 4 },
  logoCell: { width: 36, height: 36 },
  loop: { borderTopWidth: 1, borderColor: colors.nightBorder },
  loopRow: { flexDirection: "row", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.nightBorder, alignItems: "center" },
  progress: { flexDirection: "row", alignItems: "center", gap: 14 },
  progressBar: { flex: 1, flexDirection: "row", gap: 4 },
  progressCell: { flex: 1, height: 4, backgroundColor: colors.border },
  question: { gap: 24 },
});

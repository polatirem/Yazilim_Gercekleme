import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { formatDuration } from "@/domain/refs";
import { useNav } from "@/nav/router";
import { Actions, Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Enter, useReduceMotion } from "@/ui/motion";
import { OptionGroup } from "@/ui/OptionGroup";
import { Link, Screen } from "@/ui/Screen";
import { T } from "@/ui/T";
import { colors, fonts, HUE, HueContext, useHue } from "@/ui/theme";
import { StepRenderer } from "@/screens/steps/StepRenderer";
import { nowMs } from "@/screens/steps/types";
import { GAMES, LEVEL_LABEL, applyResult, loadRecords, practiceAttempt, practiceQuest, type GameDef, type Level, type Records, type Summary } from "./games";

function newSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

function Result({ level, summary, isBest, record, onAgain, onBack }: { level: Level; summary: Summary; isBest: boolean; record: Records[string] | undefined; onAgain: () => void; onBack: () => void }) {
  const nav = useNav();
  const hue = useHue();
  return (
    <Enter kind="unfold">
      <View style={styles.result} accessibilityLiveRegion="polite">
        {isBest && (
          <View style={[styles.best, { backgroundColor: hue.base }]}>
            <Icon name="spark" size={18} color={colors.textInverse} />
            <T v="label" color={colors.textInverse}>
              Yeni kişisel rekor
            </T>
          </View>
        )}
        <T v="hero">{summary.headline}</T>
        <T v="bodyLg">{summary.detail}</T>
        <View style={styles.stats}>
          {[
            { label: "Bu tur", value: summary.score === 9999 ? "–" : String(summary.score) },
            { label: `Rekor (${LEVEL_LABEL[level]})`, value: record?.best != null ? String(record.best) : "–" },
            { label: "Oynama", value: String(record?.plays ?? 1) },
          ].map((s) => (
            <View key={s.label} style={styles.stat}>
              <T v="label" muted>
                {s.label}
              </T>
              <T v="h1" color={hue.deep}>
                {s.value}
              </T>
            </View>
          ))}
        </View>
        <T v="caption">Birim: {summary.unit}. Isınma sonuçları yalnızca bu cihazda tutulur; Yolculuk&apos;una yazılmaz ve bir ölçüm değildir.</T>
        <Actions>
          <Button variant="primary" icon="return" onPress={onAgain}>
            Tekrar oyna
          </Button>
          <Button variant="secondary" onPress={onBack}>
            Başka bir oyun
          </Button>
        </Actions>
        <T secondary>
          Hazır mısın? Gerçek dünyada da dene:{" "}
          <Link onPress={() => nav.reset({ name: "quest" })}>bana bir görev ver</Link>.
        </T>
      </View>
    </Enter>
  );
}

function StepsGame({ game, level, onDone, onStep }: { game: GameDef; level: Level; onDone: (s: Summary) => void; onStep: () => void }) {
  const [seed] = useState(newSeed);
  const steps = useMemo(() => game.build!(level), [game, level]);
  const quest = useMemo(() => practiceQuest(steps), [steps]);
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [index, setIndex] = useState(0);
  const step = quest.prime[index];

  return (
    <Enter key={`${step.id}-${index}`}>
      <View style={{ gap: 12 }}>
        <T v="label" muted>
          {index + 1} / {quest.prime.length}
        </T>
        <StepRenderer
          step={step}
          quest={quest}
          attempt={practiceAttempt(seed, answers)}
          track={() => undefined}
          submit={(result) => {
            const next = { ...answers, [step.id]: result };
            setAnswers(next);
            if (index + 1 < quest.prime.length) {
              setIndex(index + 1);
              onStep();
            } else onDone(game.summarize!(next));
          }}
        />
      </View>
    </Enter>
  );
}

/** İç Saat: hedef süreyi saat görmeden tahmin et. */
function TimingGame({ level, onDone }: { level: Level; onDone: (s: Summary) => void }) {
  const hue = useHue();
  const reduce = useReduceMotion();
  const [target] = useState(() => {
    const [lo, hi] = [
      [5, 10],
      [8, 20],
      [15, 40],
    ][level - 1];
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  });
  const [phase, setPhase] = useState<"ready" | "running">("ready");
  const start = useRef(0);
  const pulse = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (phase !== "running" || reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse, reduce]);

  const stop = () => {
    const elapsed = (nowMs() - start.current) / 1000;
    const error = elapsed - target;
    const abs = Math.abs(error);
    onDone({
      headline: abs < 0.5 ? "Neredeyse kusursuz." : `${formatDuration(abs)} ${error > 0 ? "geç" : "erken"} durdun.`,
      detail: `Hedef ${target} saniyeydi; sen ${elapsed.toFixed(1).replace(".", ",")} saniyede durdun. ${error < 0 ? "Dikkat ettiğin zaman uzun gelir." : "Zaman sayılmadan akıp gitti."}`,
      score: Math.round(abs * 10) / 10,
      better: "lower",
      unit: "sn sapma",
    });
  };

  return (
    <View style={styles.timing}>
      {phase === "ready" ? (
        <>
          <T v="label">Hedef</T>
          <T style={{ fontFamily: fonts.display, fontSize: 64, lineHeight: 70 }} color={hue.deep}>
            {target} saniye
          </T>
          <T v="bodyLg">Başla&apos;ya bas, saymadan bekle ve tam {target} saniye geçtiğini hissettiğinde Dur&apos;a bas.</T>
          <Button
            variant="primary"
            size="lg"
            onPress={() => {
              start.current = nowMs();
              setPhase("running");
            }}
          >
            Başla
          </Button>
        </>
      ) : (
        <>
          <Animated.View style={[styles.pulse, { backgroundColor: hue.base, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] }) }] }]} />
          <T v="h1" center>
            Saat çalışıyor. Göremezsin.
          </T>
          <Pressable accessibilityRole="button" accessibilityLabel="Dur" onPress={stop} style={({ pressed }) => [styles.stop, { backgroundColor: pressed ? hue.base : hue.deep }]}>
            <T style={{ fontFamily: fonts.display, fontSize: 44, lineHeight: 50 }} color={colors.textInverse}>
              Dur
            </T>
          </Pressable>
        </>
      )}
    </View>
  );
}

export function Playground() {
  const nav = useNav();
  const scroll = useRef<ScrollView>(null);
  const [active, setActive] = useState<GameDef | null>(null);
  const [level, setLevel] = useState<Level>(1);
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<{ summary: Summary; isBest: boolean } | null>(null);
  const [records, setRecords] = useState<Records>({});

  useEffect(() => {
    let alive = true;
    loadRecords().then((r) => alive && setRecords(r));
    return () => {
      alive = false;
    };
  }, []);

  const toTop = () => setTimeout(() => scroll.current?.scrollTo({ y: 0, animated: false }), 0);

  const finish = (summary: Summary) => {
    if (!active) return;
    const saved = applyResult(records, active.id, level, summary);
    setRecords(saved.records);
    setResult({ summary, isBest: saved.isBest });
    toTop();
  };

  if (active) {
    return (
      <Screen ref={scroll} hue={active.hue}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setActive(null);
            setResult(null);
          }}
          style={styles.back}
        >
          <Icon name="arrow-left" size={18} />
          <T v="label">Oyun Alanı</T>
        </Pressable>
        <View style={styles.gameHead}>
          <View style={[styles.gameIcon, { backgroundColor: HUE[active.hue].base }]}>
            <Icon name={active.icon} size={28} color={colors.textInverse} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="h1">{active.title}</T>
            <T secondary>
              {active.tagline} · {LEVEL_LABEL[level]}
            </T>
          </View>
        </View>
        {result ? (
          <Result
            level={level}
            summary={result.summary}
            isBest={result.isBest}
            record={records[`${active.id}:${level}`]}
            onAgain={() => {
              setResult(null);
              setRun((r) => r + 1);
            }}
            onBack={() => {
              setActive(null);
              setResult(null);
            }}
          />
        ) : active.kind === "timing" ? (
          <TimingGame key={run} level={level} onDone={finish} />
        ) : (
          <StepsGame key={run} game={active} level={level} onDone={finish} onStep={toTop} />
        )}
      </Screen>
    );
  }

  return (
    <Screen ref={scroll} hue="green">
      <T v="label" muted>
        Oyun Alanı
      </T>
      <T v="hero">Isın, oyna, rekorunu kır.</T>
      <T v="bodyLg" secondary>
        Görevlerdeki mikro oyunları burada serbestçe oynayabilirsin. Kısa, renkli ve tekrar tekrar oynanabilir. Asıl macera yine de dışarıda.
      </T>

      <OptionGroup
        legend="Zorluk"
        options={[
          { value: 1 as Level, label: "Kolay" },
          { value: 2 as Level, label: "Orta" },
          { value: 3 as Level, label: "Zor" },
        ]}
        value={level}
        onChange={setLevel}
        columns="row"
      />

      <View style={styles.grid}>
        {GAMES.map((game, i) => {
          const rec = records[`${game.id}:${level}`];
          const h = HUE[game.hue];
          return (
            <HueContext.Provider key={game.id} value={game.hue}>
              <Enter i={i} style={styles.cardWrap}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${game.title}. ${game.tagline}`}
                  onPress={() => {
                    setActive(game);
                    setResult(null);
                    setRun((r) => r + 1);
                    toTop();
                  }}
                  style={({ pressed }) => [styles.card, { backgroundColor: pressed ? h.base : h.wash, borderColor: h.deep }]}
                >
                  <View style={[styles.cardIcon, { backgroundColor: h.deep }]}>
                    <Icon name={game.icon} size={24} color={colors.textInverse} />
                  </View>
                  <T v="h2">{game.title}</T>
                  <T v="bodySm" secondary style={{ flex: 1 }}>
                    {game.tagline}
                  </T>
                  <T v="data" color={h.deep}>
                    {rec?.best != null ? `Rekor: ${rec.best} · ${rec.plays} kez` : "Henüz oynanmadı"}
                  </T>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <T v="label" color={h.deep}>
                      Oyna
                    </T>
                    <Icon name="arrow-right" size={16} color={h.deep} />
                  </View>
                </Pressable>
              </Enter>
            </HueContext.Provider>
          );
        })}
      </View>

      <HueContext.Provider value="vermilion">
        <View style={[styles.cta, { borderColor: HUE.vermilion.base }]}>
          <T v="h2">Isındın mı? Gerçek dünya seni bekliyor.</T>
          <Button variant="primary" size="lg" icon="arrow-right" block onPress={() => nav.reset({ name: "quest" })}>
            Bana bir görev ver
          </Button>
        </View>
      </HueContext.Provider>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 6 },
  gameHead: { flexDirection: "row", gap: 14, alignItems: "center" },
  gameIcon: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  cardWrap: { width: "48.5%" },
  card: { minHeight: 230, padding: 14, gap: 8, borderWidth: 1 },
  cardIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  cta: { gap: 14, padding: 18, borderWidth: 2 },
  result: { gap: 16 },
  best: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6 },
  stats: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.borderStrong },
  stat: { flex: 1, paddingVertical: 12, gap: 4 },
  timing: { gap: 20, alignItems: "center", paddingVertical: 24 },
  pulse: { width: 140, height: 140, borderRadius: 70 },
  stop: { width: 180, height: 180, borderRadius: 90, alignItems: "center", justifyContent: "center" },
});

import { StyleSheet, View } from "react-native";
import { CONTENT, questCode } from "@/content";
import type { Quest } from "@/domain/content-types";
import type { QuestAttempt, RenderedBlock } from "@/domain/player-types";
import { acknowledgeReveal } from "@/domain/game";
import { formatValue } from "@/domain/refs";
import { lowerFirst } from "@/domain/text";
import { dispatch } from "@/state/store";
import { useNav, type Route } from "@/nav/router";
import { Button } from "@/ui/Button";
import { Glyph } from "@/ui/Glyph";
import { Enter } from "@/ui/motion";
import { Link } from "@/ui/Screen";
import { Sigil } from "@/ui/Sigil";
import { T } from "@/ui/T";
import { colors, HUE, HueContext, useHue } from "@/ui/theme";
import { DiscoveryFigure } from "@/screens/codex/DiscoveryFigure";

function Block({ block, lead }: { block: RenderedBlock; lead: boolean }) {
  const hue = useHue();
  switch (block.kind) {
    case "figures":
      return (
        <View style={styles.figures}>
          {block.items.map((f) => (
            <View key={f.label} style={styles.figure}>
              <T v="label" muted>
                {f.label}
              </T>
              <T v="hero">{f.display}</T>
            </View>
          ))}
          {block.delta && (
            <View style={[styles.figure, styles.delta, { backgroundColor: hue.deep }]}>
              <T v="label" color={hue.wash}>
                {block.delta.label}
              </T>
              <T v="hero" color={colors.textInverse}>
                {block.delta.display}
              </T>
            </View>
          )}
        </View>
      );
    case "text":
      return lead ? <T v="h1">{block.text}</T> : <T v="bodyLg">{block.text}</T>;
    case "list":
      return (
        <View style={{ gap: 8 }}>
          <T v="label" muted>
            {block.label}
          </T>
          {block.items.map((item, i) => (
            <View key={i} style={styles.listRow}>
              <T v="data" muted>
                {String(i + 1).padStart(2, "0")}
              </T>
              <T style={{ flex: 1 }}>{item}</T>
            </View>
          ))}
        </View>
      );
    case "sequence":
      return (
        <View style={{ gap: 14 }}>
          {[
            { label: "Verilen", items: block.expected, hits: null },
            { label: "Senin kurduğun", items: block.response, hits: block.hits },
          ].map((row) => (
            <View key={row.label} style={{ gap: 8 }}>
              <T v="label" muted>
                {row.label}
              </T>
              <View style={styles.seqRow}>
                {row.items.map((e, i) => {
                  const hit = row.hits ? row.hits[i] : null;
                  return (
                    <View
                      key={i}
                      style={[styles.seqCell, hit === true && { borderColor: colors.success, backgroundColor: "#e3eee2" }, hit === false && { borderColor: colors.danger, borderStyle: "dashed" }]}
                      accessibilityLabel={`${e.label}${hit === null ? "" : hit ? ", doğru" : ", farklı"}`}
                    >
                      {e.glyph ? <Glyph glyph={e.glyph} size={30} /> : <T v="caption" color={colors.text} center>{e.label}</T>}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      );
    case "scene": {
      const rows: number[][] = [];
      for (let i = 0; i < block.cells.length; i += block.cols) rows.push(Array.from({ length: Math.min(block.cols, block.cells.length - i) }, (_, k) => i + k));
      return (
        <View
          style={styles.scene}
          accessibilityLabel={`Değişiklikten sonraki düzen. ${block.selected.some((s) => block.changed.includes(s)) ? "Değişen işareti buldun." : "Değişen işaret çerçeveyle gösteriliyor."}`}
        >
          {rows.map((row, r) => (
            <View key={r} style={{ flexDirection: "row" }}>
              {row.map((i) => {
                const changed = block.changed.includes(i);
                const sel = block.selected.includes(i);
                return (
                  <View key={i} style={[styles.sceneCell, changed && { borderColor: hue.base, borderWidth: 3 }, sel && !changed && { backgroundColor: "#f6e0da" }, sel && changed && { backgroundColor: hue.wash }]}>
                    {block.cells[i] && <Glyph glyph={block.cells[i]!} size={30} />}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      );
    }
    case "filter":
      return (
        <View style={{ gap: 8 }}>
          <T v="label" muted>
            Isınma
          </T>
          <T>
            <T v="h1">
              {block.hits} / {block.targets}
            </T>{" "}
            bulundu{block.falseAlarms ? ` · ${block.falseAlarms} tanesi yanlışlıkla işaretlendi` : ""}
          </T>
          <View style={styles.hitRow}>
            {Array.from({ length: block.targets }, (_, i) => (
              <View key={i} style={[styles.hit, { borderColor: hue.deep }, i < block.hits && { backgroundColor: hue.base, borderColor: hue.base }]} />
            ))}
          </View>
        </View>
      );
    case "switch": {
      const max = Math.max(block.repeatMeanMs, block.switchMeanMs, 1);
      return (
        <View style={{ gap: 10 }}>
          <T v="label" muted>
            Isınma · tepki süresi
          </T>
          {[
            { label: "Kural aynıyken", ms: block.repeatMeanMs },
            { label: "Kural değişir değişmez", ms: block.switchMeanMs },
          ].map((r, i) => (
            <View key={r.label} style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <T v="caption">{r.label}</T>
                <T v="data">{formatValue(r.ms, "ms")}</T>
              </View>
              <View style={styles.barTrack}>
                <View style={{ height: 10, width: `${(r.ms / max) * 100}%`, backgroundColor: i === 1 ? hue.base : colors.textSecondary }} />
              </View>
            </View>
          ))}
        </View>
      );
    }
    case "plan":
      return (
        <View style={{ gap: 16 }}>
          {[
            { label: "İlk plan", items: block.before },
            { label: "Sürprizden sonra", items: block.after },
          ].map((col) => (
            <View key={col.label} style={{ gap: 6 }}>
              <T v="label" muted>
                {col.label}
              </T>
              {col.items.map((b, i) => (
                <View key={b} style={styles.listRow}>
                  <T v="data" muted>
                    {i + 1}
                  </T>
                  <T style={{ flex: 1 }}>{b}</T>
                </View>
              ))}
            </View>
          ))}
          {block.dropped.length > 0 && (
            <View style={{ gap: 4 }}>
              {block.dropped.map((d) => (
                <T key={d} secondary style={{ textDecorationLine: "line-through" }}>
                  {d}
                </T>
              ))}
            </View>
          )}
        </View>
      );
  }
}

export function RevealView({ quest, attempt }: { quest: Quest; attempt: QuestAttempt }) {
  const nav = useNav();
  const outcome = attempt.outcome!;
  const npc = CONTENT.npcById.get(quest.npcId)!;
  const campaign = CONTENT.campaignById.get(quest.campaignId)!;
  const hue = HUE[campaign.tone];
  const suggestion = outcome.suggestion ? CONTENT.questById.get(outcome.suggestion) : null;
  const firstText = outcome.blocks.findIndex((b) => b.kind === "text");
  let i = 0;
  const next = () => ++i;

  const leave = (route: Route) => {
    dispatch((s, ctx) => acknowledgeReveal(s, CONTENT, ctx));
    nav.reset(route);
  };

  return (
    <View style={{ gap: 28 }}>
      <Enter i={next()}>
        <View style={{ gap: 8 }}>
          <T v="data" muted>
            {questCode(quest)} · {campaign.title}
          </T>
          <T v="display" accessibilityRole="header">
            {quest.title}
          </T>
          <T v="h2" italic secondary>
            Tamam. İşte gösterdikleri.
          </T>
        </View>
      </Enter>

      <View style={{ gap: 24 }} accessibilityLabel="Neler oldu">
        {outcome.blocks.map((b, idx) => (
          <Enter key={idx} i={next()}>
            <Block block={b} lead={idx === firstText} />
          </Enter>
        ))}
      </View>

      {outcome.npcLine && (
        <Enter i={next()}>
          <View style={styles.npc}>
            <Sigil sigil={npc.sigil} size={36} color={hue.deep} />
            <View style={{ flex: 1, gap: 4 }}>
              <T v="h2" italic>
                {outcome.npcLine}
              </T>
              <T v="caption">{npc.name}</T>
            </View>
          </View>
        </Enter>
      )}

      <View style={{ gap: 16 }} accessibilityLabel="Keşifler">
        {outcome.discoveries.length === 0 ? (
          <Enter i={next()}>
            <T v="caption">Bu sefer Kodeks’e yeni bir şey girmedi. Şehir yine de not aldı.</T>
          </Enter>
        ) : (
          outcome.discoveries.map((d) => {
            const discovery = CONTENT.discoveryById.get(d.id)!;
            const dh = HUE[discovery.hue];
            return (
              <HueContext.Provider key={d.id} value={discovery.hue}>
                <Enter kind="unfold" i={next()}>
                  <View style={[styles.discovery, { backgroundColor: dh.wash, borderColor: dh.deep }]}>
                    <View style={[styles.discoveryFigure, { backgroundColor: colors.surfaceElevated }]}>
                      <DiscoveryFigure figure={discovery.figure} size={150} accent={dh.base} />
                    </View>
                    <T v="label" color={dh.deep}>
                      {d.isNew ? "Keşif bulundu" : "Yeniden karşılaşıldı"}
                    </T>
                    <T v="h1">{discovery.title}</T>
                    <T v="bodyLg">{d.text}</T>
                    <T secondary>
                      Bu görev, genellikle “{discovery.title}” diye anılan bir olguyu gösterdi: {lowerFirst(discovery.summary)}
                    </T>
                    <Link v="caption" onPress={() => leave({ name: "codex", entry: discovery.id })}>
                      {`${d.isNew ? "Kodeks’e girdi" : "Kodeks kaydına eklendi"} — No. ${String(discovery.number).padStart(2, "0")}`}
                    </Link>
                  </View>
                </Enter>
              </HueContext.Provider>
            );
          })
        )}
      </View>

      <Enter i={next()}>
        <View style={styles.world} accessibilityLabel="Şehir">
          <T v="label" color={colors.nightMuted}>
            Şehir
          </T>
          {outcome.campaignCompleted && (
            <T v="h2" color={hue.base}>
              Kampanya tamamlandı — {CONTENT.campaignById.get(outcome.campaignCompleted)?.title}
            </T>
          )}
          {outcome.worldChanges.map((w) => (
            <T key={w.id} v="bodySm" color={colors.nightText}>
              {w.kind === "location" ? `Yeni bir yer beliriyor: ${w.label}.` : `Yeni bir yol açılıyor: ${w.label}.`}
            </T>
          ))}
          <T v="h2" italic color={colors.nightText}>
            {outcome.fragment}
          </T>
        </View>
      </Enter>

      {suggestion && (
        <Enter i={next()}>
          <View style={{ gap: 4 }}>
            <T v="label" muted>
              Sırada belki
            </T>
            <T>
              <T style={{ fontFamily: "PlexSansSemibold" }}>{suggestion.title}</T> — {suggestion.subtitle}
            </T>
          </View>
        </Enter>
      )}

      <Enter i={next()}>
        <View style={{ gap: 12 }}>
          <Button variant="primary" size="lg" icon="arrow-right" block onPress={() => leave({ name: "world" })}>
            Şehre dön
          </Button>
          <Button variant="secondary" size="lg" block onPress={() => leave(suggestion ? { name: "questDetail", slug: suggestion.slug } : { name: "quest" })}>
            {suggestion ? "Sıradaki görev" : "Başka bir görev"}
          </Button>
        </View>
      </Enter>
    </View>
  );
}

const styles = StyleSheet.create({
  figures: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderLeftWidth: 1, borderColor: colors.borderStrong },
  figure: { minWidth: "50%", flexGrow: 1, padding: 14, gap: 4, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.borderStrong },
  delta: { minWidth: "100%" },
  listRow: { flexDirection: "row", gap: 12, paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.border },
  seqRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  seqCell: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
  scene: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: colors.borderStrong, alignSelf: "stretch" },
  sceneCell: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceElevated },
  hitRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  hit: { width: 14, height: 14, borderWidth: 1 },
  barTrack: { height: 10, backgroundColor: colors.surfaceSunken },
  npc: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  discovery: { padding: 18, gap: 12, borderWidth: 1 },
  discoveryFigure: { alignSelf: "flex-start", padding: 10 },
  world: { backgroundColor: colors.nightBackground, padding: 18, gap: 10 },
});

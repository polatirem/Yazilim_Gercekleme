import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, G, Mask, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { CONTENT } from "@/content";
import { HUB_ID, MAP_SIZE, RIVER_D } from "@/content/world";
import type { WorldView } from "@/domain/world";
import { T } from "@/ui/T";
import { colors, GUTTER, HUE, palette } from "@/ui/theme";
import { useReduceMotion } from "@/ui/motion";
import { BLOCKS, polylineOf } from "./city-fabric";
import { Footprint } from "./Footprint";

const { width: W, height: H } = MAP_SIZE;
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Static layers never change; one path each so the map stays light to draw. */
const BLOCKS_D = BLOCKS.map((b) => `M${b.x} ${b.y}h${b.w}v${b.h}h${-b.w}Z`).join("");
const GRID_D = [
  ...Array.from({ length: W / 40 + 1 }, (_, i) => `M${i * 40} 0V${H}`),
  ...Array.from({ length: H / 40 + 1 }, (_, i) => `M0 ${i * 40}H${W}`),
].join("");

const Fabric = memo(function Fabric() {
  return <Path d={BLOCKS_D} fill={colors.mapBlock} stroke={colors.mapBlockEdge} strokeWidth={1} />;
});

function revealRadius(marks: number) {
  return Math.min(250, 125 + marks * 22);
}

function pathLength(d: string): number {
  const pts = polylineOf(d);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return Math.max(1, len);
}

/** A new path opening: the route is drawn from its start outward. */
function FreshRoute({ d, color, reduce }: { d: string; color: string; reduce: boolean }) {
  const len = useMemo(() => pathLength(d), [d]);
  const offset = useState(() => new Animated.Value(reduce ? 0 : len))[0];
  useEffect(() => {
    if (reduce) return;
    const a = Animated.timing(offset, { toValue: 0, duration: 1400, delay: 300, easing: Easing.bezier(0.65, 0, 0.35, 1), useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [offset, reduce]);
  return <AnimatedPath d={d} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeDasharray={[len, len]} strokeDashoffset={offset} />;
}

/** A newly revealed place: its pool of light grows in. */
function GrowCircle({ cx, cy, r, fill, reduce }: { cx: number; cy: number; r: number; fill: string; reduce: boolean }) {
  const v = useState(() => new Animated.Value(reduce ? r : 0))[0];
  useEffect(() => {
    if (reduce) return;
    const a = Animated.timing(v, { toValue: r, duration: 1400, delay: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [v, r, reduce]);
  return <AnimatedCircle cx={cx} cy={cy} r={v} fill={fill} />;
}

export interface CityMapProps {
  world: WorldView;
  selected: string | null;
  onSelect: (id: string) => void;
  fresh: { locations: string[]; paths: string[] };
  activeLocationId: string | null;
  seasonLabel: string;
}

export function CityMap({ world, selected, onSelect, fresh, activeLocationId, seasonLabel }: CityMapProps) {
  const reduce = useReduceMotion();
  const { width: screen } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const viewport = screen - GUTTER * 2 - 2;
  // Wide enough to read; the plate scrolls sideways on narrow phones.
  const mapW = Math.max(viewport, 680);
  const mapH = (mapW * H) / W;
  const k = mapW / W;
  const freshL = new Set(fresh.locations);
  const freshP = new Set(fresh.paths);
  const openPaths = CONTENT.paths.filter((p) => world.openPaths.has(p.id));

  useEffect(() => {
    const hub = CONTENT.locationById.get(HUB_ID)!;
    const x = Math.max(0, Math.min(mapW - viewport, hub.x * k - viewport / 2));
    const t = setTimeout(() => scroll.current?.scrollTo({ x, animated: false }), 0);
    return () => clearTimeout(t);
  }, [mapW, viewport, k]);

  return (
    <View style={styles.plate}>
      <View style={styles.frame}>
        <T v="data" color={colors.nightMuted} style={styles.frameText}>
          Pafta I — Şehir
        </T>
        <T v="data" color={colors.nightMuted} style={styles.frameText}>
          {seasonLabel}
        </T>
      </View>

      <View style={styles.canvas}>
        <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={mapW > viewport} bounces={false}>
          <View style={{ width: mapW, height: mapH }}>
            <Svg width={mapW} height={mapH} viewBox={`0 0 ${W} ${H}`}>
              <Defs>
                <RadialGradient id="soft-reveal" cx="50%" cy="50%" r="50%">
                  <Stop offset="0.55" stopColor="#ffffff" stopOpacity="1" />
                  <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </RadialGradient>
                <Mask id="reveal-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                  <Rect width={W} height={H} fill="#000000" />
                  {[...world.revealedLocations].map((id) => {
                    const l = CONTENT.locationById.get(id)!;
                    const r = revealRadius(world.marks[id] ?? 0);
                    return freshL.has(id) ? (
                      <GrowCircle key={id} cx={l.x} cy={l.y} r={r} fill="url(#soft-reveal)" reduce={reduce} />
                    ) : (
                      <Circle key={id} cx={l.x} cy={l.y} r={r} fill="url(#soft-reveal)" />
                    );
                  })}
                  {openPaths.map((p) => (
                    <Path key={p.id} d={p.d} stroke="#ffffff" strokeOpacity={0.85} strokeWidth={70} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                  ))}
                </Mask>
              </Defs>

              <Rect width={W} height={H} fill={colors.mapGround} />
              <Path d={GRID_D} stroke={palette.night700} strokeWidth={1} strokeOpacity={0.35} fill="none" />

              <Path d={RIVER_D} fill="none" stroke={colors.mapWater} strokeWidth={44} />
              <Path d={RIVER_D} fill="none" stroke={colors.mapWaterEdge} strokeWidth={1} strokeDasharray="2 6" />

              <G mask="url(#reveal-mask)">
                <Fabric />
              </G>

              {openPaths.map((p) => {
                const to = world.revealedLocations.has(p.to) ? CONTENT.locationById.get(p.to) : undefined;
                const color = to ? HUE[to.hue].base : colors.accent;
                return (
                  <G key={p.id}>
                    <Path d={p.d} fill="none" stroke={colors.mapGround} strokeWidth={9} strokeLinejoin="round" />
                    {freshP.has(p.id) ? (
                      <FreshRoute d={p.d} color={color} reduce={reduce} />
                    ) : (
                      <Path d={p.d} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="square" />
                    )}
                  </G>
                );
              })}

              {CONTENT.locations.map((l) => {
                const revealed = world.revealedLocations.has(l.id);
                const marks = world.marks[l.id] ?? 0;
                const hot = selected === l.id;
                const hue = HUE[l.hue];
                const ink = hot ? colors.nightText : hue.base;
                return (
                  <G key={l.id} transform={`translate(${l.x} ${l.y})`}>
                    {revealed && <Circle r={48 + Math.min(marks, 6) * 4} fill={hue.base} opacity={hot ? 0.32 : 0.16} />}
                    {revealed ? (
                      <Footprint kind={l.footprint} color={ink} soft="#2b3035" />
                    ) : (
                      <G>
                        <Circle r="30" fill="none" stroke={palette.night600} strokeWidth={1.75} strokeDasharray="3 5" />
                        <Path d="M-6 0H6M0 -6V6" stroke={palette.night600} strokeWidth={1.75} />
                      </G>
                    )}
                    {activeLocationId === l.id && <Rect x="-62" y="-62" width="124" height="124" fill="none" stroke={colors.accent} strokeWidth={1.5} strokeDasharray="10 6" />}
                    {marks > 0 && (
                      <G transform="translate(0 58)">
                        {Array.from({ length: Math.min(marks, 9) }, (_, i) => (
                          <Rect key={i} x={(i - (Math.min(marks, 9) - 1) / 2) * 9 - 3} y="0" width="6" height="6" fill={hue.base} />
                        ))}
                      </G>
                    )}
                  </G>
                );
              })}
            </Svg>

            {CONTENT.locations.map((l) => {
              const revealed = world.revealedLocations.has(l.id);
              const marks = world.marks[l.id] ?? 0;
              const name = revealed ? l.name : "Haritasız";
              const description = revealed
                ? `Burada ${marks} görev tamamlandı${activeLocationId === l.id ? ", bir görev devam ediyor" : ""}`
                : "Henüz keşfedilmedi";
              const size = Math.max(48, 100 * k);
              const on = selected === l.id;
              return (
                <Pressable
                  key={l.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${name}. ${description}.`}
                  onPress={() => onSelect(l.id)}
                  style={[styles.spot, { left: l.x * k - size / 2, top: l.y * k - size / 2, width: size, height: size }]}
                >
                  {(revealed || on) && (
                    <View style={[styles.spotLabel, { top: size - 4 }, on && { backgroundColor: HUE[l.hue].deep }]}>
                      <T v="data" color={revealed ? (freshL.has(l.id) ? HUE[l.hue].base : colors.nightText) : palette.night400} style={styles.spotText} numberOfLines={1}>
                        {name}
                      </T>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={styles.frame}>
        <View style={styles.scale}>
          <View style={styles.scaleBar} />
          <T v="data" color={colors.nightMuted} style={styles.frameText}>
            Bir görev
          </T>
        </View>
        <T v="data" color={colors.nightMuted} style={styles.frameText}>
          Haritalanan {world.revealedLocations.size} / {CONTENT.locations.length}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: { backgroundColor: colors.mapGround, borderRadius: 4, paddingVertical: 12, paddingHorizontal: 0, gap: 8 },
  frame: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingHorizontal: 14 },
  frameText: { fontSize: 10.5, letterSpacing: 1.6, textTransform: "uppercase" },
  canvas: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.nightBorder, overflow: "hidden" },
  spot: { position: "absolute", alignItems: "center" },
  spotLabel: { position: "absolute", paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.mapGround },
  spotText: { fontSize: 10.5, letterSpacing: 1.3, textTransform: "uppercase" },
  scale: { flexDirection: "row", alignItems: "center", gap: 8 },
  scaleBar: { width: 36, height: 5, borderWidth: 1, borderTopWidth: 0, borderColor: colors.nightMuted },
});

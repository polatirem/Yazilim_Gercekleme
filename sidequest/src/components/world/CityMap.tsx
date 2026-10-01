"use client";
import { memo, useState } from "react";
import { CONTENT } from "@/content";
import { MAP_SIZE, RIVER_D } from "@/content/world";
import type { WorldView } from "@/domain/world";
import { BLOCKS } from "./city-fabric";
import { Footprint } from "./Footprint";
import styles from "./CityMap.module.css";

const { width: W, height: H } = MAP_SIZE;

/** Static layers never change; memoised so hover/focus doesn't repaint 400 blocks. */
const Fabric = memo(function Fabric() {
  return (
    <g className={styles.blocks}>
      {BLOCKS.map((b) => (
        <rect key={`${b.x}-${b.y}`} x={b.x} y={b.y} width={b.w} height={b.h} />
      ))}
    </g>
  );
});

function revealRadius(marks: number) {
  return Math.min(250, 125 + marks * 22);
}

export interface CityMapProps {
  world: WorldView;
  selected: string | null;
  onSelect: (id: string) => void;
  /** Reveals being shown for the first time; they animate in. */
  fresh: { locations: string[]; paths: string[] };
  activeLocationId: string | null;
  seasonLabel: string;
}

export function CityMap({ world, selected, onSelect, fresh, activeLocationId, seasonLabel }: CityMapProps) {
  const [hot, setHot] = useState<string | null>(null);
  const freshL = new Set(fresh.locations);
  const freshP = new Set(fresh.paths);
  const surveyed = world.revealedLocations.size;
  const openPaths = CONTENT.paths.filter((p) => world.openPaths.has(p.id));

  return (
    <div className={styles.plate}>
      <div className={styles.frame} aria-hidden>
        <span>Pafta I — Şehir</span>
        <span>{seasonLabel}</span>
      </div>

      <div className={styles.canvas}>
        <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden focusable="false">
          <defs>
            <pattern id="survey-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M0 0.5H40M0.5 0V40" className={styles.gridLine} />
            </pattern>
            <radialGradient id="soft-reveal">
              <stop offset="0.55" stopColor="#fff" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <mask id="reveal-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
              <rect width={W} height={H} fill="#000" />
              {[...world.revealedLocations].map((id) => {
                const l = CONTENT.locationById.get(id)!;
                return (
                  <circle
                    key={id}
                    cx={l.x}
                    cy={l.y}
                    r={revealRadius(world.marks[id] ?? 0)}
                    fill="url(#soft-reveal)"
                    className={freshL.has(id) ? styles.growIn : undefined}
                  />
                );
              })}
              {openPaths.map((p) => (
                <path key={p.id} d={p.d} stroke="#fff" strokeOpacity="0.85" strokeWidth="70" fill="none" strokeLinejoin="round" strokeLinecap="round" pathLength={1} className={freshP.has(p.id) ? styles.drawMask : undefined} />
              ))}
            </mask>
          </defs>

          <rect width={W} height={H} className={styles.ground} />
          <rect width={W} height={H} fill="url(#survey-grid)" />

          <path d={RIVER_D} className={styles.riverBed} />
          <path d={RIVER_D} className={styles.river} />

          <g mask="url(#reveal-mask)">
            <Fabric />
          </g>

          {openPaths.map((p) => (
            <g key={p.id} className={freshP.has(p.id) ? styles.freshRoute : undefined} data-hue={world.revealedLocations.has(p.to) ? CONTENT.locationById.get(p.to)?.hue : undefined}>
              <path d={p.d} pathLength={1} className={styles.routeCasing} />
              <path d={p.d} pathLength={1} className={styles.route} />
            </g>
          ))}

          {CONTENT.locations.map((l) => {
            const revealed = world.revealedLocations.has(l.id);
            const marks = world.marks[l.id] ?? 0;
            const state = !revealed ? "hidden" : hot === l.id || selected === l.id ? "hot" : "shown";
            return (
              <g key={l.id} transform={`translate(${l.x} ${l.y})`} className={styles.location} data-state={state} data-fresh={freshL.has(l.id) || undefined} data-hue={l.hue}>
                {revealed && <circle r={48 + Math.min(marks, 6) * 4} className={styles.glow} />}
                {revealed ? (
                  <Footprint kind={l.footprint} />
                ) : (
                  <g className={styles.unmapped}>
                    <circle r="30" />
                    <path d="M-6 0H6M0 -6V6" />
                  </g>
                )}
                {activeLocationId === l.id && <rect x="-62" y="-62" width="124" height="124" className={styles.activeFrame} />}
                {marks > 0 && (
                  <g className={styles.marks} transform="translate(0 58)">
                    {Array.from({ length: Math.min(marks, 9) }, (_, i) => (
                      <rect key={i} x={(i - (Math.min(marks, 9) - 1) / 2) * 9 - 3} y="0" width="6" height="6" />
                    ))}
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        <ul className={styles.hotspots}>
          {CONTENT.locations.map((l) => {
            const revealed = world.revealedLocations.has(l.id);
            const marks = world.marks[l.id] ?? 0;
            const name = revealed ? l.name : "Haritasız";
            const description = revealed
              ? `Burada ${marks} görev tamamlandı${activeLocationId === l.id ? ", bir görev devam ediyor" : ""}`
              : "Henüz keşfedilmedi";
            return (
              <li key={l.id} style={{ left: `${(l.x / W) * 100}%`, top: `${(l.y / H) * 100}%` }} className={styles.hotspot} data-hue={l.hue}>
                <button
                  type="button"
                  className={styles.spot}
                  data-revealed={revealed}
                  aria-pressed={selected === l.id}
                  aria-label={`${name}. ${description}.`}
                  onClick={() => onSelect(l.id)}
                  onPointerEnter={() => setHot(l.id)}
                  onPointerLeave={() => setHot(null)}
                  onFocus={() => setHot(l.id)}
                  onBlur={() => setHot(null)}
                >
                  <span className={styles.spotLabel} aria-hidden data-fresh={freshL.has(l.id) || undefined}>
                    {name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.frame} aria-hidden>
        <span className={styles.scale}>
          <span className={styles.scaleBar} />
          Bir görev
        </span>
        <span>
          Haritalanan {surveyed} / {CONTENT.locations.length}
        </span>
      </div>
    </div>
  );
}

import type { Place, Quest } from "@/domain/content-types";
import { Icon, type IconName } from "@/components/ui/Icon";
import styles from "./Requirements.module.css";

export const PLACE_LABEL: Record<Place, string> = {
  home: "Ev",
  outside: "Dışarısı",
  work: "İş ya da okul",
  commuting: "Yolculuk",
  "with-people": "İnsanlarla",
};

export const PLACE_ICON: Record<Place, IconName> = {
  home: "home",
  outside: "outside",
  work: "work",
  commuting: "commuting",
  "with-people": "people",
};

const DIFFICULTY = { 1: "Hafif", 2: "Orta", 3: "Zorlu" } as const;

export function durationLabel(q: Quest): string {
  const { min, max } = q.estimatedMinutes;
  return min === max ? `${min} dk` : `${min}–${max} dk`;
}

export interface Requirement {
  icon: IconName;
  label: string;
  detail?: string;
}

/** Everything a player needs to know before accepting. Also used, verbatim, for Mystery Quests. */
export function requirementsOf(quest: Quest): Requirement[] {
  const where: Requirement = quest.requiresOutside
    ? { icon: "outside", label: "Dışarıda", detail: quest.requiresLocation }
    : {
        icon: PLACE_ICON[quest.contexts[0]],
        label: quest.contexts.length >= 4 ? "Neredeyse her yerde" : quest.contexts.map((c) => PLACE_LABEL[c]).join(" · "),
        detail: quest.requiresLocation,
      };
  const people: Requirement =
    quest.people === "solo"
      ? { icon: "solo", label: "Tek başına" }
      : quest.people === "optional"
        ? { icon: "people", label: "Tek ya da birlikte" }
        : { icon: "people", label: "Tanıdığın biriyle" };
  const reqs: Requirement[] = [{ icon: "clock", label: durationLabel(quest) }, where, people, { icon: "no-purchase", label: "Satın alma yok" }];
  if (quest.energy === "high") reqs.push({ icon: "energy", label: "Yüksek enerji" });
  return reqs;
}

export function Requirements({ quest, showDifficulty = true, tone = "paper" }: { quest: Quest; showDifficulty?: boolean; tone?: "paper" | "night" }) {
  return (
    <dl className={styles.list} data-tone={tone}>
      {requirementsOf(quest).map((r) => (
        <div key={r.label} className={styles.item}>
          <dt className="visually-hidden">{r.icon === "clock" ? "Süre" : r.icon === "no-purchase" ? "Maliyet" : r.icon === "solo" || r.icon === "people" ? "Kişi" : "Yer"}</dt>
          <dd className={styles.value}>
            <Icon name={r.icon} size={18} className={styles.icon} />
            <span>
              {r.label}
              {r.detail && <span className={styles.detail}>{r.detail}</span>}
            </span>
          </dd>
        </div>
      ))}
      {showDifficulty && (
        <div className={styles.item}>
          <dt className="visually-hidden">Zorluk</dt>
          <dd className={styles.value}>
            <span className={styles.difficulty} aria-hidden>
              {[1, 2, 3].map((n) => (
                <span key={n} data-on={n <= quest.difficulty} />
              ))}
            </span>
            <span>{DIFFICULTY[quest.difficulty]}</span>
          </dd>
        </div>
      )}
    </dl>
  );
}

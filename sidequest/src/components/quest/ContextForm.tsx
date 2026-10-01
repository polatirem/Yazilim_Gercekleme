"use client";
import { useState } from "react";
import type { Energy, Place, TimeBudget } from "@/domain/content-types";
import type { ContextInput } from "@/domain/player-types";
import { Button } from "@/components/ui/Button";
import { OptionGroup } from "@/components/ui/OptionGroup";
import { PLACE_ICON, PLACE_LABEL } from "./Requirements";
import styles from "./QuestScreen.module.css";

const PLACES: Place[] = ["home", "outside", "work", "commuting", "with-people"];
const TIMES: { value: TimeBudget; label: string }[] = [
  { value: 2, label: "2 dk" },
  { value: 5, label: "5 dk" },
  { value: 15, label: "15 dk" },
  { value: 30, label: "30+ dk" },
];

export function ContextForm({ initial, initialMystery, onSubmit }: { initial: ContextInput; initialMystery: boolean; onSubmit: (context: ContextInput, mystery: boolean) => void }) {
  const [place, setPlace] = useState<Place>(initial.place);
  const [minutes, setMinutes] = useState<TimeBudget>(initial.minutes);
  const [energy, setEnergy] = useState<Energy | "any">(initial.energy ?? "any");
  const [mystery, setMystery] = useState(initialMystery);

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ place, minutes, ...(energy !== "any" ? { energy } : {}) }, mystery);
      }}
    >
      <OptionGroup
        legend="Neredesin?"
        options={PLACES.map((p) => ({ value: p, label: PLACE_LABEL[p], icon: PLACE_ICON[p] }))}
        value={place}
        onChange={setPlace}
        columns={5}
        size="lg"
      />
      <OptionGroup legend="Ne kadar zamanın var?" options={TIMES} value={minutes} onChange={setMinutes} columns={4} />
      <OptionGroup
        legend="Enerji"
        description="İsteğe bağlı."
        options={[
          { value: "any", label: "Fark etmez" },
          { value: "low", label: "Düşük" },
          { value: "normal", label: "Normal" },
          { value: "high", label: "Yüksek" },
        ]}
        value={energy}
        onChange={setEnergy}
        columns={4}
      />
      <label className={styles.mysteryToggle}>
        <input type="checkbox" checked={mystery} onChange={(e) => setMystery(e.target.checked)} />
        <span className={styles.toggleBox} aria-hidden />
        <span>
          <span className={styles.toggleTitle}>Gizemli görev</span>
          <span className="t-caption">Yalnızca neler gerektirdiğini gör. Görevin kendisi sen kabul edene kadar mühürlü kalır.</span>
        </span>
      </label>
      <div>
        <Button type="submit" variant="primary" size="lg" icon="arrow-right">
          Bana bir görev ver
        </Button>
      </div>
    </form>
  );
}

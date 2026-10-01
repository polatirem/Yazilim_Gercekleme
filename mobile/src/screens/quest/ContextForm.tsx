import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { Energy, Place, TimeBudget } from "@/domain/content-types";
import type { ContextInput } from "@/domain/player-types";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { OptionGroup } from "@/ui/OptionGroup";
import { T } from "@/ui/T";
import { colors, HUE } from "@/ui/theme";
import { PLACE_ICON, PLACE_LABEL } from "./Requirements";

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
  const violet = HUE.violet;

  return (
    <View style={styles.form}>
      <OptionGroup
        legend="Neredesin?"
        options={PLACES.map((p) => ({ value: p, label: PLACE_LABEL[p], icon: PLACE_ICON[p] }))}
        value={place}
        onChange={setPlace}
        columns={2}
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
        columns={2}
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: mystery }}
        onPress={() => setMystery((m) => !m)}
        style={[styles.toggle, mystery && { backgroundColor: violet.wash, borderColor: violet.deep }]}
      >
        <View style={[styles.box, { borderColor: violet.deep }, mystery && { backgroundColor: violet.deep }]}>{mystery && <Icon name="check" size={16} color={colors.textInverse} />}</View>
        <View style={{ flex: 1, gap: 2 }}>
          <T style={{ fontFamily: "PlexSansMedium" }}>Gizemli görev</T>
          <T v="caption">Yalnızca neler gerektirdiğini gör. Görevin kendisi sen kabul edene kadar mühürlü kalır.</T>
        </View>
      </Pressable>
      <Button variant="primary" size="lg" icon="arrow-right" block onPress={() => onSubmit({ place, minutes, ...(energy !== "any" ? { energy } : {}) }, mystery)}>
        Bana bir görev ver
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 28 },
  toggle: { flexDirection: "row", gap: 14, alignItems: "flex-start", padding: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  box: { width: 24, height: 24, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 2 },
});

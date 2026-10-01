import { useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import type { PlayerState, Preferences } from "@/domain/player-types";
import { setPreferences } from "@/domain/game";
import { dispatch, resetProgress } from "@/state/store";
import { useNav } from "@/nav/router";
import { Actions, Button } from "@/ui/Button";
import { numericDate } from "@/ui/dates";
import { OptionGroup } from "@/ui/OptionGroup";
import { Link, Screen } from "@/ui/Screen";
import { T } from "@/ui/T";
import { colors } from "@/ui/theme";

export function SettingsScreen({ player }: { player: PlayerState }) {
  const nav = useNav();
  const [confirmErase, setConfirmErase] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
  const prefs = player.preferences;
  const update = (patch: Partial<Preferences>) => dispatch((s) => setPreferences(s, patch));

  const exportData = async () => {
    try {
      const result = await Share.share({ title: `sidequest-yolculuk-${new Date().toISOString().slice(0, 10)}.json`, message: JSON.stringify(player, null, 2) });
      setExported(result.action === Share.sharedAction ? "Paylaşıldı." : null);
    } catch (e) {
      setExported(`Paylaşılamadı: ${(e as Error).message}`);
    }
  };

  return (
    <Screen>
      <T v="label" muted>
        Ayarlar
      </T>
      <T v="hero">Ayarlar</T>

      <View style={styles.section}>
        <T v="h2">Görevler nasıl seçilir</T>
        <OptionGroup
          legend="Zamanının çoğunu geçirdiğin yer"
          options={[
            { value: "home" as const, label: "Ev" },
            { value: "work" as const, label: "İş ya da okul" },
            { value: "outside" as const, label: "Dışarısı" },
          ]}
          value={prefs.primaryPlace}
          onChange={(v) => update({ primaryPlace: v })}
          columns={3}
        />
        <OptionGroup
          legend="Genellikle ayırabildiğin zaman"
          options={[
            { value: 5 as const, label: "5 dk" },
            { value: 15 as const, label: "15 dk" },
            { value: 30 as const, label: "30 dk" },
          ]}
          value={prefs.typicalMinutes}
          onChange={(v) => update({ typicalMinutes: v })}
          columns={3}
        />
        <OptionGroup
          legend="Tanıdığın insanları içeren görevler"
          options={[
            { value: "yes" as const, label: "Evet" },
            { value: "sometimes" as const, label: "Bazen" },
            { value: "no" as const, label: "Hayır" },
          ]}
          value={prefs.peopleComfort}
          onChange={(v) => update({ peopleComfort: v })}
          columns={3}
        />
      </View>

      <View style={styles.section}>
        <T v="h2">Hareket</T>
        <OptionGroup
          legend="Animasyon"
          description="Azaltılmış hareket, harita açılışlarını ve geçişleri kaldırır. Sistem ayarını da izler."
          options={[
            { value: "system" as const, label: "Sistemi izle" },
            { value: "reduce" as const, label: "Azalt" },
          ]}
          value={prefs.motion}
          onChange={(v) => update({ motion: v })}
          columns={2}
        />
      </View>

      <View style={styles.section}>
        <T v="h2">Verilerin</T>
        <T>Sidequest&apos;in bildiği her şey yalnızca bu cihazda saklanır: cevapların, dışarıda geçirdiğin süreler ve her görevin nasıl geçtiğini anlatan olaylar. Hesap yok ve hiçbir şey bir yere gönderilmez.</T>
        <T>Konum, kamera, mikrofon ya da sağlık verisi asla istenmez. Görevler dürüstlük esasına dayanır.</T>
        <T>Görev sırasında yazdığın notlar o görevin kaydında kalır. Davranış günlüğü yalnızca bir şey yazdığını kaydeder, ne yazdığını asla.</T>
        <T v="data" muted>
          {Object.keys(player.attempts).length} görev kaydı · {player.events.length} olay · başlangıç {numericDate(player.createdAt)}
        </T>
        <Actions>
          <Button variant="secondary" onPress={exportData}>
            Verilerimi dışa aktar (JSON)
          </Button>
          {exported ? <T v="caption">{exported}</T> : null}
        </Actions>
        {confirmErase ? (
          <View style={{ gap: 10 }}>
            <T v="caption">Bu cihazdaki Şehir, Yolculuk ve Kodeks temizlenir. Geri alınamaz.</T>
            <Actions>
              <Button
                variant="danger"
                onPress={() => {
                  resetProgress();
                  setConfirmErase(false);
                  nav.reset({ name: "begin" });
                }}
              >
                Her şeyi sil
              </Button>
              <Button variant="quiet" onPress={() => setConfirmErase(false)}>
                Yolculuğum kalsın
              </Button>
            </Actions>
          </View>
        ) : (
          <Button variant="quiet" onPress={() => setConfirmErase(true)}>
            Tüm ilerlemeyi sil…
          </Button>
        )}
      </View>

      <View style={styles.section}>
        <T v="h2">Hakkında</T>
        <T>Sidequest gerçek dünyada geçen bir zihin macerasıdır: kısa bir dijital hazırlık, dışarıda küçük bir eylem, sonra neler olduğuna bir bakış. Merak ve düşünmek içindir.</T>
        <T>Tıbbi ya da tanı koyan bir araç değildir, zekâ ölçmez; belleği geliştirdiği ya da herhangi bir durumu tedavi ettiği iddiasında bulunmaz. Kodeks&apos;teki olgular çekinceleriyle birlikte, temkinli biçimde anlatılır.</T>
        {__DEV__ && (
          <T v="caption">
            Geliştirme sürümü:{" "}
            <Link v="caption" onPress={() => nav.push({ name: "dev" })}>
              demo araçları
            </Link>
          </T>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: 18, paddingTop: 20, borderTopWidth: 1, borderColor: colors.border },
});

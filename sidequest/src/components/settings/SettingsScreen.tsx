"use client";
import Link from "next/link";
import { useState } from "react";
import type { PlayerState, Preferences } from "@/domain/player-types";
import { setPreferences } from "@/domain/game";
import { dispatch, resetProgress } from "@/state/store";
import { Button } from "@/components/ui/Button";
import { OptionGroup } from "@/components/ui/OptionGroup";
import styles from "./Settings.module.css";

export function SettingsScreen({ player, showDevLink }: { player: PlayerState; showDevLink: boolean }) {
  const [confirmErase, setConfirmErase] = useState(false);
  const [exported, setExported] = useState(false);
  const prefs = player.preferences;
  const update = (patch: Partial<Preferences>) => dispatch((s) => setPreferences(s, patch));

  const exportData = () => {
    const blob = new Blob([JSON.stringify(player, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sidequest-yolculuk-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
  };

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className="t-label muted">Ayarlar</p>
        <h1 className="t-hero">Ayarlar</h1>
      </header>

      <section className={styles.section} aria-labelledby="prefs">
        <h2 id="prefs" className="t-h2">
          Görevler nasıl seçilir
        </h2>
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
      </section>

      <section className={styles.section} aria-labelledby="motion">
        <h2 id="motion" className="t-h2">
          Hareket
        </h2>
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
      </section>

      <section className={styles.section} aria-labelledby="privacy">
        <h2 id="privacy" className="t-h2">
          Verilerin
        </h2>
        <div className={styles.prose}>
          <p>Sidequest&apos;in bildiği her şey yalnızca bu tarayıcıda saklanır: cevapların, dışarıda geçirdiğin süreler ve her görevin nasıl geçtiğini anlatan olaylar. Hesap yok ve hiçbir şey bir yere gönderilmez.</p>
          <p>Konum, kamera, mikrofon ya da sağlık verisi asla istenmez. Görevler dürüstlük esasına dayanır.</p>
          <p>Görev sırasında yazdığın notlar o görevin kaydında kalır. Davranış günlüğü yalnızca bir şey yazdığını kaydeder, ne yazdığını asla.</p>
        </div>
        <p className="t-data muted">
          {Object.keys(player.attempts).length} görev kaydı · {player.events.length} olay · başlangıç {new Date(player.createdAt).toLocaleDateString("tr-TR")}
        </p>
        <div className={styles.row}>
          <Button variant="secondary" onClick={exportData}>
            Verilerimi indir (JSON)
          </Button>
          {exported && <span className="t-caption">İndirildi.</span>}
        </div>
        <div className={styles.row}>
          {confirmErase ? (
            <>
              <Button
                variant="danger"
                onClick={() => {
                  resetProgress();
                  setConfirmErase(false);
                }}
              >
                Her şeyi sil
              </Button>
              <Button variant="quiet" onClick={() => setConfirmErase(false)}>
                Yolculuğum kalsın
              </Button>
              <span className="t-caption">Bu cihazdaki Şehir, Yolculuk ve Kodeks temizlenir. Geri alınamaz.</span>
            </>
          ) : (
            <Button variant="quiet" onClick={() => setConfirmErase(true)}>
              Tüm ilerlemeyi sil…
            </Button>
          )}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="about">
        <h2 id="about" className="t-h2">
          Hakkında
        </h2>
        <div className={styles.prose}>
          <p>Sidequest gerçek dünyada geçen bir zihin macerasıdır: kısa bir dijital hazırlık, dışarıda küçük bir eylem, sonra neler olduğuna bir bakış. Merak ve düşünmek içindir.</p>
          <p>Tıbbi ya da tanı koyan bir araç değildir, zekâ ölçmez; belleği geliştirdiği ya da herhangi bir durumu tedavi ettiği iddiasında bulunmaz. Kodeks&apos;teki olgular çekinceleriyle birlikte, temkinli biçimde anlatılır.</p>
        </div>
        {showDevLink && (
          <p className="t-caption">
            Geliştirme sürümü: <Link href="/dev">demo araçları</Link>
          </p>
        )}
      </section>
    </div>
  );
}

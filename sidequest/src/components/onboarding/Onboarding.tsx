"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { PlayerState, Preferences } from "@/domain/player-types";
import { setLastContext, setPreferences } from "@/domain/game";
import { dispatch } from "@/state/store";
import { GameGate } from "@/components/shell/GameGate";
import { Button } from "@/components/ui/Button";
import { OptionGroup } from "@/components/ui/OptionGroup";
import { QuestDossier } from "@/components/quest/QuestDossier";
import { useQuestOffer } from "@/components/quest/useQuestOffer";
import styles from "./Onboarding.module.css";

type Place = "home" | "school" | "work" | "outside";
const TOTAL = 5;

function BigLogo() {
  return (
    <span className={styles.bigLogo} aria-hidden>
      {(["vermilion", "teal", "saffron", "indigo"] as const).map((h, i) => (
        <span key={h} data-hue={h} style={{ ["--i" as string]: i }} />
      ))}
    </span>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <p className={styles.progress} aria-label={`Adım ${step} / ${TOTAL}`}>
      <span className="t-data">
        {String(step).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
      </span>
      <span className={styles.progressBar} aria-hidden>
        {Array.from({ length: TOTAL }, (_, i) => (
          <span key={i} data-on={i < step} />
        ))}
      </span>
    </p>
  );
}

function FirstQuest({ player }: { player: PlayerState }) {
  const router = useRouter();
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
      <div className={styles.screen}>
        <p className="t-hero">Şehir hazır.</p>
        <Button variant="primary" size="lg" icon="arrow-right" onClick={() => router.push("/quest")}>
          Bir görev bul
        </Button>
      </div>
    );
  }
  return (
    <div className={styles.first}>
      <p className={`t-label ${styles.accent}`}>İlk görevin</p>
      <QuestDossier quest={offer.current.quest} player={player} onAccept={offer.accept} onNotNow={() => router.push("/")} onSkip={offer.skip} skipLabel="Başka birini göster" error={offer.error} />
    </div>
  );
}

function Flow({ player }: { player: PlayerState }) {
  const [step, setStep] = useState(player.preferences.onboarded ? 6 : 1);
  const [place, setPlace] = useState<Place | null>(null);
  const [minutes, setMinutes] = useState<5 | 15 | 30 | null>(null);
  const [people, setPeople] = useState<Preferences["peopleComfort"]>(null);

  const finish = (comfort: NonNullable<Preferences["peopleComfort"]>) => {
    const primaryPlace = place === "school" || place === "work" ? "work" : (place ?? "home");
    const typicalMinutes = minutes ?? 15;
    dispatch((s) =>
      setLastContext(setPreferences(s, { onboarded: true, primaryPlace, typicalMinutes, peopleComfort: comfort }), {
        place: primaryPlace,
        minutes: typicalMinutes,
      }),
    );
    setStep(6);
  };

  if (step === 1) {
    return (
      <div className={`${styles.screen} ${styles.night}`} data-hue="indigo">
        <BigLogo />
        <p className={`t-display ${styles.statement} enter`}>Dünya bir süredir otomatik pilotta.</p>
        <div className="enter" style={{ ["--i" as string]: 3 }}>
          <Button variant="inverse" size="lg" icon="arrow-right" onClick={() => setStep(2)} autoFocus>
            Devam
          </Button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className={`${styles.screen} ${styles.night}`} data-hue="vermilion">
        <p className={`t-display ${styles.statement} enter`}>Hadi onu bölelim.</p>
        <ol className={`${styles.loop} enter`} style={{ ["--i" as string]: 2 }}>
          <li>
            <span className="t-label" data-hue="amber">Düşün</span>Burada bir dakikalık hazırlık.
          </li>
          <li>
            <span className="t-label" data-hue="teal">Yap</span>Dışarıda, cihaz kenara konmuşken.
          </li>
          <li>
            <span className="t-label" data-hue="saffron">Keşfet</span>Geri dön ve neler olduğunu bul.
          </li>
        </ol>
        <p className={`${styles.small} enter`} style={{ ["--i" as string]: 3 }}>
          Hesap yok. Konum yok. Her şey bu cihazda kalır. Bir test değil, bir tedavi değil — kısmen gerçek dünyada geçen bir macera.
        </p>
        <div className="enter" style={{ ["--i" as string]: 4 }}>
          <Button variant="inverse" size="lg" icon="arrow-right" onClick={() => setStep(3)} autoFocus>
            Başla
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      {step <= 5 && <Progress step={step} />}
      {step === 3 && (
        <div className={`${styles.question} enter`} key="place">
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
            columns={4}
            size="lg"
          />
          <div className={styles.row}>
            <Button variant="primary" size="lg" icon="arrow-right" disabled={!place} onClick={() => setStep(4)}>
              Devam
            </Button>
          </div>
        </div>
      )}
      {step === 4 && (
        <div className={`${styles.question} enter`} key="time">
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
          <div className={styles.row}>
            <Button variant="primary" size="lg" icon="arrow-right" disabled={!minutes} onClick={() => setStep(5)}>
              Devam
            </Button>
            <Button variant="quiet" onClick={() => setStep(3)}>
              Geri
            </Button>
          </div>
        </div>
      )}
      {step === 5 && (
        <div className={`${styles.question} enter`} key="people">
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
          <div className={styles.row}>
            <Button variant="primary" size="lg" icon="arrow-right" disabled={!people} onClick={() => people && finish(people)}>
              Devam
            </Button>
            <Button variant="quiet" onClick={() => setStep(4)}>
              Geri
            </Button>
          </div>
        </div>
      )}
      {step === 6 && <FirstQuest player={player} />}
      {step <= 5 && (
        <p className={styles.skip}>
          <Link href="/" onClick={() => dispatch((s) => setPreferences(s, { onboarded: true }))}>
            Doğrudan Şehre geç
          </Link>
        </p>
      )}
    </div>
  );
}

export function Onboarding() {
  return <GameGate requireOnboarded={false}>{(player) => <Flow player={player} />}</GameGate>;
}

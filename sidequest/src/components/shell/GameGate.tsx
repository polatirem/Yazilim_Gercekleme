"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { PlayerState } from "@/domain/player-types";
import { resetProgress, usePlayerStore } from "@/state/store";
import { Button } from "@/components/ui/Button";
import { ErrorPanel, Notice, Surveying } from "@/components/ui/States";

function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => router.replace(to), [router, to]);
  return <Surveying />;
}

function CorruptSave({ error, raw }: { error: string; raw: string }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div style={{ padding: "var(--space-8) var(--gutter)" }}>
      <ErrorPanel
        title="Kayıtlı yolculuğun okunamadı."
        actions={
          confirm ? (
            <>
              <Button variant="danger" onClick={resetProgress}>
                Sil ve baştan başla
              </Button>
              <Button variant="quiet" onClick={() => setConfirm(false)}>
                Şimdilik sakla
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(raw)}>
                Ham kaydı kopyala
              </Button>
              <Button variant="quiet" onClick={() => setConfirm(true)}>
                Baştan başla…
              </Button>
            </>
          )
        }
      >
        <p>Bu tarayıcıda saklanan veri Sidequest&apos;in beklediğiyle uyuşmuyor. Hiçbir şey silinmedi. Saklamak istersen ham kaydı kopyala, sonra baştan başla.</p>
        <details>
          <summary>Teknik ayrıntı</summary>
          <pre>{error}</pre>
        </details>
      </ErrorPanel>
    </div>
  );
}

/**
 * Wraps every stateful screen: handles hydration, corrupt saves, storage
 * failures and the onboarding redirect in one place.
 */
export function GameGate({ children, requireOnboarded = true, loadingLabel }: { children: (player: PlayerState) => ReactNode; requireOnboarded?: boolean; loadingLabel?: string }) {
  const snap = usePlayerStore();
  if (snap.status === "loading") return <Surveying label={loadingLabel} />;
  if (snap.status === "corrupt") return <CorruptSave error={snap.error} raw={snap.raw} />;
  if (requireOnboarded && !snap.player.preferences.onboarded) return <Redirect to="/begin" />;
  return (
    <>
      {snap.saveError && (
        <div style={{ padding: "var(--space-3) var(--gutter) 0" }}>
          <Notice tone="warning">{snap.saveError}</Notice>
        </div>
      )}
      {children(snap.player)}
    </>
  );
}

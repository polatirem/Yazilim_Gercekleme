"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { Hue } from "@/domain/content-types";
import { usePlayerStore } from "@/state/store";
import { activeAttempt } from "@/domain/game";
import { Icon, type IconName } from "@/components/ui/Icon";
import styles from "./AppShell.module.css";

const NAV: { href: string; label: string; icon: IconName; hue: Hue }[] = [
  { href: "/", label: "Dünya", icon: "world", hue: "vermilion" },
  { href: "/quest", label: "Görev", icon: "location", hue: "amber" },
  { href: "/oyun-alani", label: "Oyun Alanı", icon: "play", hue: "green" },
  { href: "/journey", label: "Yolculuk", icon: "journey", hue: "teal" },
  { href: "/codex", label: "Kodeks", icon: "codex", hue: "indigo" },
];

/** Tüm ekranı kendisi yöneten rotalar: tanıtım ve görev akışı. */
const IMMERSIVE = ["/begin", "/play"];

export function Logo() {
  return (
    <span className={styles.logo} aria-hidden>
      <span data-hue="vermilion" />
      <span data-hue="teal" />
      <span data-hue="saffron" />
      <span data-hue="indigo" />
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const snap = usePlayerStore();
  const immersive = IMMERSIVE.some((p) => pathname.startsWith(p));
  const questLive = snap.status === "ready" && activeAttempt(snap.player) !== null;
  const motion = snap.status === "ready" ? snap.player.preferences.motion : "system";

  useEffect(() => {
    if (motion === "reduce") document.documentElement.dataset.motion = "reduce";
    else delete document.documentElement.dataset.motion;
  }, [motion]);

  return (
    <>
      {!immersive && (
        <header className={styles.header}>
          <Link href="/" className={styles.wordmark} aria-label="Sidequest — Şehir">
            <Logo />
            <span className={styles.name} lang="en">Sidequest</span>
          </Link>
          <nav aria-label="Ana menü" className={styles.nav}>
            <ul className={styles.list}>
              {NAV.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const live = item.href === "/quest" && questLive;
                return (
                  <li key={item.href} data-hue={item.hue}>
                    <Link href={live ? "/play" : item.href} className={styles.link} aria-current={active ? "page" : undefined}>
                      <Icon name={item.icon} size={18} className={styles.icon} />
                      <span>{item.label}</span>
                      {live && (
                        <span className={styles.live}>
                          <span className="visually-hidden"> (devam ediyor)</span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <Link href="/settings" className={styles.settings} aria-current={pathname.startsWith("/settings") ? "page" : undefined}>
            <Icon name="settings" size={18} />
            <span className={styles.settingsLabel}>Ayarlar</span>
          </Link>
        </header>
      )}
      <main id="main" className={immersive ? styles.immersive : styles.main}>
        {children}
      </main>
    </>
  );
}

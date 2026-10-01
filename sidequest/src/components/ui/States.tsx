import type { ReactNode } from "react";
import styles from "./States.module.css";

/** Contextual loading: a route being drawn, not a spinner. */
export function Surveying({ label = "Şehir haritalanıyor" }: { label?: string }) {
  return (
    <div className={styles.surveying} role="status" aria-live="polite">
      <svg viewBox="0 0 120 24" width="120" height="24" aria-hidden>
        <path d="M2 18 H40 V6 H78 V18 H118" pathLength={1} className={styles.route} />
      </svg>
      <span className="t-label">{label}…</span>
    </div>
  );
}

/** Honest error: narrative headline, plain explanation, a way forward. */
export function ErrorPanel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className={styles.error} role="alert">
      <p className="t-label">Bir şeyler ters gitti</p>
      <h2 className="t-h2">{title}</h2>
      <div className={styles.errorBody}>{children}</div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  return (
    <p className={styles.notice} data-tone={tone} role={tone === "warning" ? "alert" : "status"}>
      {children}
    </p>
  );
}

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <p className="t-h2">{title}</p>
      <p className={styles.emptyBody}>{children}</p>
      {action && <div className={styles.actions}>{action}</div>}
    </div>
  );
}

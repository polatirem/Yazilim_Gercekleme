import styles from "./Ticks.module.css";

/** Campaign progress as survey ticks: one mark per quest, filled when completed. */
export function Ticks({ done, total, tone, label }: { done: number; total: number; tone?: string; label: string }) {
  return (
    <span className={styles.ticks} role="img" aria-label={`${label}: ${total} görevden ${done} tanesi tamamlandı`} data-hue={tone}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={styles.tick} data-done={i < done} />
      ))}
    </span>
  );
}

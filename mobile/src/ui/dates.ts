/** Turkish date formatting without relying on the engine's Intl data. */
const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/** "14 Mart" */
export function dayMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "14 Mart 2026" */
export function fullDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "14 MAR" — for timelines. */
export function shortDayLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${SHORT[d.getMonth()].replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase()}`;
}

/** "14.03.2026" */
export function numericDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

/** Data de hoje no fuso do aparelho, no formato do banco (YYYY-MM-DD). */
export function todayIso(): string {
  return new Date().toLocaleDateString("sv-SE");
}

/** "2026-09-28" -> "28/09/2026" (sem conversão de fuso) */
export function formatDateBr(iso: string): string {
  const [year, month, day] = iso.split("-");
  return year && month && day ? `${day}/${month}/${year}` : iso;
}

/** "2026-09-28" -> "28/09" */
export function formatDayMonth(iso: string): string {
  return formatDateBr(iso).slice(0, 5);
}

/** Remove acentos, caixa e espaços extras — mesma regra de public.normalize_text no banco. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Colapsa espaços mantendo a grafia digitada. */
export function cleanLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Escapa curingas do LIKE/ILIKE (% _ \). */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Remove itens duplicados considerando acentos e caixa ("Película" == "pelicula"). */
export function uniqueLabels(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const label = cleanLabel(raw);
    const key = normalizeText(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }
  return result;
}

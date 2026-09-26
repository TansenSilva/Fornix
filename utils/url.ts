/** Garante protocolo em URLs digitadas sem "https://". Retorna "" se inválida. */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (!url.hostname.includes(".")) return "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

/** Só permite abrir links http(s) — evita javascript: e similares. */
export function safeHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = normalizeUrl(value);
  return normalized || null;
}

/** "https://www.loja.com.br/x" -> "loja.com.br/x" */
export function displayUrl(value: string): string {
  return value.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

/** Aceita "@perfil", "perfil" ou URL completa e devolve apenas o usuário. */
export function normalizeInstagram(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const fromUrl = trimmed.match(/instagram\.com\/([^/?#]+)/i);
  const handle = (fromUrl ? fromUrl[1] : trimmed).replace(/^@/, "");
  return handle.replace(/[^a-zA-Z0-9._]/g, "");
}

export function instagramLink(handle: string): string {
  return `https://instagram.com/${encodeURIComponent(handle)}`;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

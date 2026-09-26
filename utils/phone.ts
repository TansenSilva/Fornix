import { appConfig } from "@/lib/app-config";

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normaliza um número brasileiro para o formato internacional só com dígitos.
 * "(11) 98888-7777" -> "5511988887777"
 * "+55 11 98888-7777" -> "5511988887777"
 * "011 98888-7777" -> "5511988887777"
 * Números com outro DDI (digitados com "+") são mantidos.
 */
export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  let digits = onlyDigits(trimmed);
  if (!digits) return "";

  if (trimmed.startsWith("+") || digits.startsWith("00")) {
    return digits.replace(/^00/, "");
  }

  digits = digits.replace(/^0+/, ""); // prefixo de operadora/DDD antigo
  const cc = appConfig.defaultCountryCode;
  if (digits.startsWith(cc) && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return cc + digits;
  return digits;
}

export function isValidPhone(normalized: string): boolean {
  return /^[0-9]{8,15}$/.test(normalized);
}

/** Link direto para conversa no WhatsApp. */
export function whatsappLink(normalized: string, message?: string): string {
  const base = `https://wa.me/${onlyDigits(normalized)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telLink(normalized: string): string {
  return `tel:+${onlyDigits(normalized)}`;
}

/** "5511988887777" -> "(11) 98888-7777" */
export function formatPhone(normalized: string | null | undefined): string {
  if (!normalized) return "";
  const digits = onlyDigits(normalized);
  const cc = appConfig.defaultCountryCode;
  const local = digits.startsWith(cc) && digits.length >= 12 ? digits.slice(cc.length) : null;
  if (local && local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local && local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return `+${digits}`;
}

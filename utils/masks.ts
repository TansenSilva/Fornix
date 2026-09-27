import { appConfig } from "@/lib/app-config";

/**
 * Máscaras aplicadas enquanto o usuário digita. Recebem o texto do campo e
 * devolvem o texto formatado (parcial enquanto incompleto).
 */

/** (11) 2692-2596 · (11) 95048-5734. Números de outro país (ex.: "+1 ...") ficam livres. */
export function maskPhone(value: string): string {
  const trimmed = value.trim();
  const isForeign = trimmed.startsWith("+") && !trimmed.replace(/\D/g, "").startsWith(appConfig.defaultCountryCode);
  if (isForeign) return "+" + value.replace(/[^\d ]/g, "").trimStart();
  let digits = value.replace(/\D/g, "");
  // Colado com DDI do Brasil ("5511...") ou com zero de operadora ("011...")
  if (digits.length > 11 && digits.startsWith(appConfig.defaultCountryCode)) {
    digits = digits.slice(appConfig.defaultCountryCode.length);
  }
  digits = digits.replace(/^0+/, "").slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (digits.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

/** 00000-000 */
export function maskCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

/**
 * CPF: 000.000.000-00 · CNPJ: 00.000.000/0000-00.
 * Aceita o CNPJ alfanumérico (letras nas 12 primeiras posições, vigente desde 07/2026).
 */
export function maskCpfCnpj(value: string): string {
  const raw = value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 14);
  const hasLetters = /[A-Z]/.test(raw);

  if (!hasLetters && raw.length <= 11) {
    const d = raw;
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  const c = raw;
  let out = c.slice(0, 2);
  if (c.length > 2) out += `.${c.slice(2, 5)}`;
  if (c.length > 5) out += `.${c.slice(5, 8)}`;
  if (c.length > 8) out += `/${c.slice(8, 12)}`;
  if (c.length > 12) out += `-${c.slice(12, 14)}`;
  return out;
}

import { maskCpfCnpj } from "./masks";

/** Remove pontuação e deixa em maiúsculas: "12.ABC.345/01DE-35" -> "12ABC34501DE35". */
export function normalizeDocument(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

/** Valida CNPJ numérico e alfanumérico (valor de cada caractere = código ASCII − 48). */
function isValidCnpj(cnpj: string): boolean {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const values = [...cnpj].map((char) => char.charCodeAt(0) - 48);
  const digit = (length: number) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, weight, i) => acc + values[i] * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return digit(12) === values[12] && digit(13) === values[13];
}

export function documentType(normalized: string): "CPF" | "CNPJ" | null {
  if (normalized.length === 11 && /^\d+$/.test(normalized)) return "CPF";
  if (normalized.length === 14) return "CNPJ";
  return null;
}

export function isValidDocument(normalized: string): boolean {
  const type = documentType(normalized);
  if (type === "CPF") return isValidCpf(normalized);
  if (type === "CNPJ") return isValidCnpj(normalized);
  return false;
}

export function formatDocument(normalized: string | null | undefined): string {
  return normalized ? maskCpfCnpj(normalized) : "";
}

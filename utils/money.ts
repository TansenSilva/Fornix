const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const quantityFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

/** 1234.5 -> "R$ 1.234,50" */
export function formatMoney(value: number): string {
  return currency.format(Number.isFinite(value) ? value : 0);
}

/** 1.5 -> "1,5" */
export function formatQuantity(value: number): string {
  return quantityFormat.format(Number.isFinite(value) ? value : 0);
}

/**
 * Máscara de dinheiro enquanto digita: os dígitos entram pela direita
 * ("1" -> "0,01", "1234" -> "12,34", "123456" -> "1.234,56").
 */
export function maskMoney(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
  if (!digits) return "";
  const cents = Number(digits);
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "1.234,56" -> 1234.56 */
export function parseMoney(value: string): number {
  const normalized = value.replace(/[^\d,]/g, "").replace(",", ".");
  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

/** Quantidade aceita vírgula ou ponto: "1,5" -> 1.5 */
export function parseQuantity(value: string): number {
  const number = Number.parseFloat(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(number) ? Math.round(number * 1000) / 1000 : 0;
}

export function maskQuantity(value: string): string {
  const cleaned = value.replace(/[^\d,.]/g, "").replace(".", ",");
  const [integer, ...decimals] = cleaned.split(",");
  return decimals.length ? `${integer.slice(0, 7)},${decimals.join("").slice(0, 3)}` : integer.slice(0, 7);
}

/** Valor numérico -> texto para o campo com máscara ("1234.5" -> "1.234,50"). */
export function moneyInputValue(value: number): string {
  return value ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
}

export function quantityInputValue(value: number): string {
  return formatQuantity(value).replace(/\./g, "");
}

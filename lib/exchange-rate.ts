/**
 * Cotação do dólar (US$ → R$) consultada direto do navegador em serviços
 * públicos e gratuitos: AwesomeAPI (valor de venda do dólar comercial) e, se
 * falhar, ExchangeRate-API. Não envia nenhum dado do usuário.
 */
export interface ExchangeRate {
  rate: number;
  source: string;
}

async function awesomeApi(signal: AbortSignal): Promise<ExchangeRate> {
  const response = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", { signal });
  if (!response.ok) throw new Error(String(response.status));
  const data = (await response.json()) as { USDBRL?: { ask?: string; bid?: string } };
  const rate = Number(data.USDBRL?.ask ?? data.USDBRL?.bid);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("cotação inválida");
  return { rate, source: "AwesomeAPI" };
}

async function exchangeRateApi(signal: AbortSignal): Promise<ExchangeRate> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD", { signal });
  if (!response.ok) throw new Error(String(response.status));
  const data = (await response.json()) as { rates?: { BRL?: number } };
  const rate = Number(data.rates?.BRL);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("cotação inválida");
  return { rate, source: "ExchangeRate-API" };
}

export async function fetchUsdBrlRate(signal: AbortSignal): Promise<ExchangeRate> {
  try {
    return await awesomeApi(signal);
  } catch (error) {
    if (signal.aborted) throw error;
    return exchangeRateApi(signal);
  }
}

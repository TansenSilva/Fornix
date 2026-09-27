/**
 * Consulta de CEP direto do navegador em serviços públicos e gratuitos:
 * ViaCEP e, se falhar, BrasilAPI. Nenhum dado do usuário é enviado além do CEP.
 */
export interface CepAddress {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

async function viaCep(cep: string, signal: AbortSignal): Promise<CepAddress | null> {
  const data = (await fetchJson(`https://viacep.com.br/ws/${cep}/json/`, signal)) as Record<string, string | boolean>;
  if (data.erro) return null;
  return {
    street: String(data.logradouro ?? ""),
    neighborhood: String(data.bairro ?? ""),
    city: String(data.localidade ?? ""),
    state: String(data.uf ?? ""),
  };
}

async function brasilApi(cep: string, signal: AbortSignal): Promise<CepAddress | null> {
  try {
    const data = (await fetchJson(`https://brasilapi.com.br/api/cep/v2/${cep}`, signal)) as Record<string, string>;
    return {
      street: data.street ?? "",
      neighborhood: data.neighborhood ?? "",
      city: data.city ?? "",
      state: data.state ?? "",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "404") return null;
    throw error;
  }
}

/** Retorna o endereço, null se o CEP não existir, ou lança erro se os serviços estiverem fora do ar. */
export async function lookupCep(cep: string, signal: AbortSignal): Promise<CepAddress | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    return await viaCep(digits, signal);
  } catch (error) {
    if (signal.aborted) throw error;
    return brasilApi(digits, signal);
  }
}

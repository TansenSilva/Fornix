"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Loader2, RefreshCw } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Field, inputClasses } from "@/components/ui/field";
import { createPurchaseList } from "@/lib/data/purchase-lists";
import { fetchUsdBrlRate } from "@/lib/exchange-rate";
import { createClient } from "@/lib/supabase/client";
import type { PurchaseCurrency, SupplierOption } from "@/types/purchase";
import { fixedInputValue, maskFixed, maskPercent, parseDecimal } from "@/utils/money";
import { formatDayMonth, todayIso } from "@/utils/date";
import { cleanLabel } from "@/utils/text";

interface Props {
  suppliers: SupplierOption[];
  defaultSupplierId: string | null;
}

export function NewPurchaseListForm({ suppliers, defaultSupplierId }: Props) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(defaultSupplierId ?? "");
  const [orderDate, setOrderDate] = useState(todayIso);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<PurchaseCurrency>("BRL");
  const [rate, setRate] = useState("");
  const [fee, setFee] = useState("");
  const [rateStatus, setRateStatus] = useState<"idle" | "loading" | "error">("idle");

  async function loadRate(signal?: AbortSignal) {
    setRateStatus("loading");
    try {
      const result = await fetchUsdBrlRate(signal ?? new AbortController().signal);
      setRate(fixedInputValue(result.rate, 4));
      setRateStatus("idle");
    } catch {
      if (!signal?.aborted) setRateStatus("error");
    }
  }

  // Ao escolher "Importação", busca a cotação do dólar automaticamente.
  useEffect(() => {
    if (currency !== "USD" || rate) return;
    const controller = new AbortController();
    const timer = setTimeout(() => void loadRate(controller.signal), 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const supplierName = suppliers.find((s) => s.id === supplierId)?.name;
  const prefix = currency === "USD" ? "Importação" : supplierName ? "Pedido" : "Lista de compras";
  const suggestedTitle = `${prefix}${supplierName ? ` ${supplierName}` : ""} ${formatDayMonth(orderDate)}`;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const id = await createPurchaseList(createClient(), {
        title: (cleanLabel(title) || suggestedTitle).slice(0, 120),
        supplierId: supplierId || null,
        orderDate,
        currency,
        exchangeRate: currency === "USD" ? parseDecimal(rate) || null : null,
        defaultFeePercent: currency === "USD" ? parseDecimal(fee) : 0,
      });
      router.replace(`/listas/${id}`);
    } catch {
      setSaving(false);
      setError("Não foi possível criar a lista.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-slate-700">Tipo de lista</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { value: "BRL", title: "Nacional", hint: "Preços em reais" },
              { value: "USD", title: "Importação", hint: "Dólar + taxa %" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={currency === option.value}
              onClick={() => setCurrency(option.value)}
              className={`rounded-xl border p-3 text-left ${
                currency === option.value
                  ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-1.5 font-medium">
                {option.value === "USD" && <DollarSign className="size-4" aria-hidden />}
                {option.title}
              </span>
              <span className="block text-xs text-slate-500">{option.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {currency === "USD" && (
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
          <Field id="rate" label="Cotação (R$ por US$ 1)" hint={rateStatus === "error" ? "Não foi possível buscar. Digite a cotação." : "Você pode ajustar."}>
            <div className="relative">
              <input
                id="rate"
                inputMode="numeric"
                value={rate}
                onChange={(event) => setRate(maskFixed(event.target.value, 4))}
                placeholder="5,0000"
                className={`${inputClasses()} pr-10`}
              />
              <button
                type="button"
                onClick={() => void loadRate()}
                aria-label="Buscar cotação atual"
                className="absolute top-1/2 right-0.5 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <RefreshCw className={`size-4 ${rateStatus === "loading" ? "animate-spin" : ""}`} aria-hidden />
              </button>
            </div>
          </Field>
          <Field id="fee" label="Taxa de importação (%)" hint="Aplicada a cada item.">
            <input
              id="fee"
              inputMode="decimal"
              value={fee}
              onChange={(event) => setFee(maskPercent(event.target.value))}
              placeholder="0"
              className={inputClasses()}
            />
          </Field>
        </div>
      )}

      <Field id="supplier" label="Fornecedor (opcional)">
        <select
          id="supplier"
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
          className={inputClasses()}
        >
          <option value="">Sem fornecedor / vários</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id="title" label="Nome da lista" hint={title ? undefined : `Se vazio: "${suggestedTitle}"`}>
        <input
          id="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={suggestedTitle}
          maxLength={120}
          className={inputClasses()}
        />
      </Field>
      <Field id="orderDate" label="Data">
        <input
          id="orderDate"
          type="date"
          value={orderDate}
          onChange={(event) => setOrderDate(event.target.value || todayIso())}
          className={inputClasses()}
        />
      </Field>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={saving} className={buttonClasses("primary", "md", "w-full")}>
        {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Criar lista e lançar itens
      </button>
    </form>
  );
}

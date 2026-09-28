"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Field, inputClasses } from "@/components/ui/field";
import { createPurchaseList } from "@/lib/data/purchase-lists";
import { createClient } from "@/lib/supabase/client";
import type { SupplierOption } from "@/types/purchase";
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

  const supplierName = suppliers.find((s) => s.id === supplierId)?.name;
  const suggestedTitle = `${supplierName ? `Pedido ${supplierName}` : "Lista de compras"} ${formatDayMonth(orderDate)}`;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const id = await createPurchaseList(createClient(), {
        title: (cleanLabel(title) || suggestedTitle).slice(0, 120),
        supplierId: supplierId || null,
        orderDate,
      });
      router.replace(`/listas/${id}`);
    } catch {
      setSaving(false);
      setError("Não foi possível criar a lista.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/button";
import { PURCHASE_STATUS_LABELS, type PurchaseListSummary, type PurchaseStatus } from "@/types/purchase";
import { formatMoney } from "@/utils/money";
import { normalizeText } from "@/utils/text";
import { PurchaseListCard } from "./PurchaseListCard";

type Filter = "all" | "open" | PurchaseStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "open", label: "Em aberto" },
  { value: "ordered", label: PURCHASE_STATUS_LABELS.ordered },
  { value: "received", label: PURCHASE_STATUS_LABELS.received },
  { value: "canceled", label: PURCHASE_STATUS_LABELS.canceled },
];

function matches(list: PurchaseListSummary, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "open") return list.status === "draft" || list.status === "ordered";
  return list.status === filter;
}

/** Listagem das listas de compras com filtro por status e busca por nome/fornecedor. */
export function PurchaseListsBrowser({ lists }: { lists: PurchaseListSummary[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const term = normalizeText(search);
    return lists.filter(
      (list) =>
        matches(list, filter) &&
        (!term || normalizeText(`${list.title} ${list.supplierName ?? ""}`).includes(term)),
    );
  }, [lists, filter, search]);

  const total = visible.filter((list) => list.status !== "canceled").reduce((sum, list) => sum + list.total, 0);

  if (lists.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="size-10" />}
        title="Nenhuma lista de compras ainda"
        description="Crie uma lista, lance os produtos e valores e acompanhe o total do pedido."
        action={
          <Link href="/listas/nova" className={buttonClasses("primary")}>
            <Plus className="size-4" aria-hidden />
            Nova lista
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <label htmlFor="list-search" className="sr-only">
          Buscar lista
        </label>
        <input
          id="list-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome da lista ou fornecedor..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 focus:border-brand-600 focus:ring-2 focus:ring-brand-100 focus:outline-none md:max-w-md"
        />
        <div role="group" aria-label="Filtrar por status" className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={`h-9 shrink-0 rounded-full border px-3 text-sm ${
                filter === item.value
                  ? "border-brand-600 bg-brand-50 font-medium text-brand-700"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-slate-500">
        {visible.length === 1 ? "1 lista" : `${visible.length} listas`} ·{" "}
        <span className="font-medium text-slate-800">{formatMoney(total)}</span>
        {filter === "all" && " (sem canceladas)"}
      </p>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Nenhuma lista encontrada.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((list) => (
            <li key={list.id} className="min-w-0">
              <PurchaseListCard list={list} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

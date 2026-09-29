import Link from "next/link";
import type { PurchaseListSummary } from "@/types/purchase";
import { formatDateBr } from "@/utils/date";
import { formatMoney, formatUsd } from "@/utils/money";
import { PurchaseStatusBadge } from "./PurchaseStatusBadge";

export function PurchaseListCard({ list }: { list: PurchaseListSummary }) {
  return (
    <Link
      href={`/listas/${list.id}`}
      className="flex min-w-0 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 truncate font-semibold">{list.title}</h2>
        <PurchaseStatusBadge status={list.status} />
      </div>
      <p className="truncate text-sm text-slate-500">
        {[list.supplierName ?? "Sem fornecedor", formatDateBr(list.orderDate)].join(" · ")}
      </p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <span className="text-sm text-slate-500">
          {list.itemCount === 1 ? "1 item" : `${list.itemCount} itens`}
          {list.currency === "USD" && (
            <span className="ml-1.5 rounded bg-sky-50 px-1.5 py-0.5 text-xs font-medium text-sky-800">Importação</span>
          )}
        </span>
        <span className="text-right">
          {list.currency === "USD" && (
            <span className="block text-xs text-slate-500 tabular-nums">{formatUsd(list.totalUsd)}</span>
          )}
          <span className="text-lg font-semibold tabular-nums">{formatMoney(list.total)}</span>
        </span>
      </div>
    </Link>
  );
}

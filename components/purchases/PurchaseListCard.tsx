import Link from "next/link";
import type { PurchaseListSummary } from "@/types/purchase";
import { formatDateBr } from "@/utils/date";
import { formatMoney } from "@/utils/money";
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
        </span>
        <span className="text-lg font-semibold tabular-nums">{formatMoney(list.total)}</span>
      </div>
    </Link>
  );
}

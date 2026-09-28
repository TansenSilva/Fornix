import { PURCHASE_STATUS_LABELS, type PurchaseStatus } from "@/types/purchase";

const STYLES: Record<PurchaseStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  ordered: "bg-amber-50 text-amber-800",
  received: "bg-green-50 text-green-800",
  canceled: "bg-red-50 text-red-700 line-through",
};

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {PURCHASE_STATUS_LABELS[status]}
    </span>
  );
}

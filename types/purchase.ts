export type PurchaseStatus = "draft" | "ordered" | "received" | "canceled";
/** BRL = lista nacional; USD = lista de importação (preços em dólar + taxa %). */
export type PurchaseCurrency = "BRL" | "USD";

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  draft: "Rascunho",
  ordered: "Pedido feito",
  received: "Recebido",
  canceled: "Cancelado",
};

export interface PurchaseItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** Somente em listas de importação. */
  unitPriceUsd: number | null;
  feePercent: number;
  checked: boolean;
  position: number;
}

export interface PurchaseList {
  id: string;
  title: string;
  supplierId: string | null;
  supplierName: string | null;
  supplierWhatsapp: string | null;
  status: PurchaseStatus;
  orderDate: string;
  notes: string | null;
  currency: PurchaseCurrency;
  exchangeRate: number | null;
  exchangeRateUpdatedAt: string | null;
  defaultFeePercent: number;
  createdAt: string;
  updatedAt: string;
  items: PurchaseItem[];
}

export interface PurchaseListSummary {
  id: string;
  title: string;
  supplierId: string | null;
  supplierName: string | null;
  status: PurchaseStatus;
  orderDate: string;
  itemCount: number;
  total: number;
  currency: PurchaseCurrency;
  totalUsd: number;
  updatedAt: string;
}

export interface SupplierOption {
  id: string;
  name: string;
}

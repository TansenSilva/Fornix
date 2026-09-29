"use client";

import { useIsClient } from "@/hooks/useIsClient";
import { PURCHASE_STATUS_LABELS, type PurchaseCurrency, type PurchaseStatus } from "@/types/purchase";
import { formatDateBr } from "@/utils/date";
import { formatMoney, formatQuantity, formatUsd } from "@/utils/money";

export interface PrintRow {
  name: string;
  quantity: number;
  usd: number | null;
  fee: number;
  unit: number;
  line: number;
  checked: boolean;
}

interface Props {
  title: string;
  supplierName: string | null;
  orderDate: string;
  status: PurchaseStatus;
  currency: PurchaseCurrency;
  rate: string;
  rows: PrintRow[];
  total: number;
  totalUsd: number;
  notes: string;
}

/**
 * Versão da lista para impressão / "Salvar como PDF". Fica oculta na tela e é
 * a única parte visível ao imprimir.
 */
export function PurchaseListPrint(props: Props) {
  const isImport = props.currency === "USD";
  const th = "border-b-2 border-slate-800 px-2 py-1.5 text-left text-[11px] font-semibold uppercase";
  const td = "border-b border-slate-300 px-2 py-1.5 align-top";

  return (
    <div className="hidden text-[12px] text-black print:block">
      <header className="mb-4 flex items-start justify-between gap-4 border-b border-slate-300 pb-3">
        <div>
          <h1 className="text-xl font-bold">{props.title}</h1>
          <p className="mt-0.5 text-slate-700">
            {props.supplierName ?? "Sem fornecedor"} · {formatDateBr(props.orderDate)} ·{" "}
            {PURCHASE_STATUS_LABELS[props.status]}
          </p>
        </div>
        {isImport && (
          <p className="text-right text-slate-700">
            Importação
            <br />
            Cotação: R$ {props.rate || "—"}
          </p>
        )}
      </header>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={`${th} w-8`}>#</th>
            <th className={th}>Produto</th>
            <th className={`${th} text-right`}>Qtd</th>
            {isImport && <th className={`${th} text-right`}>US$ unit.</th>}
            {isImport && <th className={`${th} text-right`}>Taxa</th>}
            <th className={`${th} text-right`}>{isImport ? "R$ unit." : "Valor unit."}</th>
            <th className={`${th} text-right`}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, index) => (
            <tr key={index} className="break-inside-avoid">
              <td className={`${td} text-slate-500`}>{index + 1}</td>
              <td className={td}>
                {row.checked ? "✓ " : ""}
                {row.name}
              </td>
              <td className={`${td} text-right tabular-nums`}>{formatQuantity(row.quantity)}</td>
              {isImport && (
                <td className={`${td} text-right tabular-nums`}>{row.usd !== null ? formatUsd(row.usd) : "—"}</td>
              )}
              {isImport && <td className={`${td} text-right tabular-nums`}>{row.fee ? `${formatQuantity(row.fee)}%` : "—"}</td>}
              <td className={`${td} text-right tabular-nums`}>{formatMoney(row.unit)}</td>
              <td className={`${td} text-right font-semibold tabular-nums`}>{formatMoney(row.line)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 ml-auto w-64 space-y-1 text-right">
        <p className="text-slate-700">
          {props.rows.length === 1 ? "1 item" : `${props.rows.length} itens`}
        </p>
        {isImport && <p className="text-slate-700">Total em dólar: {formatUsd(props.totalUsd)}</p>}
        <p className="text-base font-bold">Total: {formatMoney(props.total)}</p>
      </div>

      {props.notes.trim() && (
        <div className="mt-4 border-t border-slate-300 pt-2">
          <p className="font-semibold">Observações</p>
          <p className="whitespace-pre-wrap">{props.notes}</p>
        </div>
      )}
      <GeneratedAt />
    </div>
  );
}

function GeneratedAt() {
  const isClient = useIsClient();
  return (
    <p className="mt-6 text-[10px] text-slate-500">
      {isClient ? `Gerado em ${new Date().toLocaleString("pt-BR")} · ` : ""}Meus Fornecedores
    </p>
  );
}

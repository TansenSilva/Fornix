"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  CopyPlus,
  MessageCircle,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/ActionMenu";
import { AutoTextarea } from "@/components/ui/AutoTextarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { buttonClasses } from "@/components/ui/button";
import { useCopy } from "@/hooks/useCopy";
import { useIsClient } from "@/hooks/useIsClient";
import { fetchUsdBrlRate } from "@/lib/exchange-rate";
import {
  addPurchaseItem,
  applyFeeToAllItems,
  deletePurchaseItem,
  deletePurchaseList,
  duplicatePurchaseList,
  getPurchaseItems,
  setPurchaseItemPositions,
  updatePurchaseItem,
  updatePurchaseList,
} from "@/lib/data/purchase-lists";
import { createClient } from "@/lib/supabase/client";
import {
  PURCHASE_STATUS_LABELS,
  type PurchaseCurrency,
  type PurchaseItem,
  type PurchaseList,
  type PurchaseStatus,
  type SupplierOption,
} from "@/types/purchase";
import { formatDateBr, todayIso } from "@/utils/date";
import {
  fixedInputValue,
  formatMoney,
  formatQuantity,
  formatUsd,
  importUnitPrice,
  maskFixed,
  maskPercent,
  maskQuantity,
  moneyInputValue,
  parseDecimal,
  parseMoney,
  parseQuantity,
  percentInputValue,
  quantityInputValue,
} from "@/utils/money";
import { whatsappLink } from "@/utils/phone";
import { printWithTitle } from "@/utils/print";
import { cleanLabel } from "@/utils/text";
import { MoneyInput } from "./MoneyInput";
import { PurchaseListPrint } from "./PurchaseListPrint";

interface Row {
  id: string;
  name: string;
  qty: string;
  /** Valor unitário em reais (listas nacionais). */
  price: string;
  /** Valor unitário em dólar (listas de importação). */
  usd: string;
  fee: string;
  checked: boolean;
  saved: PurchaseItem;
}

function toRow(item: PurchaseItem): Row {
  return {
    id: item.id,
    name: item.productName,
    qty: quantityInputValue(item.quantity),
    price: moneyInputValue(item.unitPrice),
    usd: moneyInputValue(item.unitPriceUsd ?? 0),
    fee: percentInputValue(item.feePercent),
    checked: item.checked,
    saved: item,
  };
}

const cellInput =
  "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 focus:border-brand-600 focus:ring-2 focus:ring-brand-100 focus:outline-none";

function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

interface Props {
  list: PurchaseList;
  suppliers: SupplierOption[];
  suggestions: string[];
}

/**
 * Lista de compras em formato de planilha: lança produto, quantidade e valor;
 * o total atualiza na hora. Em listas de importação o valor é digitado em
 * dólar e o preço em reais sai de: US$ × cotação × (1 + taxa %).
 */
export function PurchaseListEditor({ list: initialList, suppliers, suggestions }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const copy = useCopy();
  const isClient = useIsClient();
  const datalistId = useId();

  const [meta, setMeta] = useState({
    title: initialList.title,
    supplierId: initialList.supplierId ?? "",
    status: initialList.status,
    orderDate: initialList.orderDate,
    notes: initialList.notes ?? "",
    currency: initialList.currency,
    rate: fixedInputValue(initialList.exchangeRate, 4),
    rateUpdatedAt: initialList.exchangeRateUpdatedAt,
    defaultFee: percentInputValue(initialList.defaultFeePercent),
  });
  const savedMeta = useRef(meta);
  const [rows, setRows] = useState<Row[]>(() => initialList.items.map(toRow));
  const [draft, setDraft] = useState({ name: "", qty: "1", price: "", usd: "", fee: meta.defaultFee });
  const [adding, setAdding] = useState(false);
  const [loadingRate, setLoadingRate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const feeRef = useRef<HTMLInputElement>(null);

  const isImport = meta.currency === "USD";
  const rate = parseDecimal(meta.rate);
  const uniqueSuggestions = useMemo(() => [...new Set(suggestions)].slice(0, 500), [suggestions]);
  const supplierWhatsapp = meta.supplierId === initialList.supplierId ? initialList.supplierWhatsapp : null;

  /** Preço unitário em reais da linha, calculado a partir do que está digitado. */
  function unitBrl(row: { price: string; usd: string; fee: string }): number {
    if (isImport && row.usd) return importUnitPrice(parseMoney(row.usd), rate, parseDecimal(row.fee));
    return parseMoney(row.price);
  }

  const totals = useMemo(() => {
    let total = 0;
    let totalUsd = 0;
    let checkedTotal = 0;
    let checkedCount = 0;
    for (const row of rows) {
      const qty = parseQuantity(row.qty);
      const line = Math.round(qty * unitBrl(row) * 100) / 100;
      total += line;
      if (row.usd) totalUsd += Math.round(qty * parseMoney(row.usd) * 100) / 100;
      if (row.checked) {
        checkedTotal += line;
        checkedCount += 1;
      }
    }
    return { total, totalUsd, checkedTotal, checkedCount };
    // unitBrl depende de isImport/rate, já listados
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, isImport, rate]);

  // ---------------------------------------------------------------- lista
  async function reloadItems() {
    try {
      const items = await getPurchaseItems(createClient(), initialList.id);
      setRows(items.map(toRow));
    } catch {
      // mantém os valores atuais
    }
  }

  async function saveMeta(patch: Partial<typeof meta>) {
    const next = { ...meta, ...patch };
    setMeta(next);
    const previous = savedMeta.current;
    const title = cleanLabel(next.title) || previous.title;
    const nextRate = parseDecimal(next.rate);
    const rateChanged = next.rate !== previous.rate && nextRate > 0;
    const changes = {
      ...(title !== previous.title ? { title } : {}),
      ...(next.supplierId !== previous.supplierId ? { supplier_id: next.supplierId || null } : {}),
      ...(next.status !== previous.status ? { status: next.status } : {}),
      ...(next.orderDate !== previous.orderDate ? { order_date: next.orderDate } : {}),
      ...(next.notes !== previous.notes ? { notes: next.notes.trim() || null } : {}),
      ...(next.currency !== previous.currency ? { currency: next.currency } : {}),
      ...(rateChanged
        ? { exchange_rate: nextRate, exchange_rate_updated_at: next.rateUpdatedAt ?? new Date().toISOString() }
        : {}),
      ...(next.defaultFee !== previous.defaultFee ? { default_fee_percent: parseDecimal(next.defaultFee) } : {}),
    };
    if (Object.keys(changes).length === 0) return;
    try {
      await updatePurchaseList(createClient(), initialList.id, changes);
      savedMeta.current = { ...next, title };
      setMeta((current) => ({ ...current, title }));
      if (changes.status) toast(`Status: ${PURCHASE_STATUS_LABELS[next.status]}`);
      // O banco recalcula os preços em reais quando a cotação ou o tipo mudam.
      if (rateChanged || changes.currency) await reloadItems();
    } catch {
      setMeta(previous);
      toast("Não foi possível salvar a lista.", "error");
    }
  }

  async function refreshRate(extra: Partial<typeof meta> = {}) {
    setLoadingRate(true);
    try {
      const result = await fetchUsdBrlRate(new AbortController().signal);
      await saveMeta({ ...extra, rate: fixedInputValue(result.rate, 4), rateUpdatedAt: new Date().toISOString() });
      toast(`Cotação: ${formatMoney(result.rate)}`);
    } catch {
      if (Object.keys(extra).length > 0) await saveMeta(extra);
      toast("Não foi possível buscar a cotação. Digite manualmente.", "error");
    } finally {
      setLoadingRate(false);
    }
  }

  async function changeCurrency(currency: PurchaseCurrency) {
    if (currency === "USD" && !meta.rate) {
      await refreshRate({ currency });
    } else {
      await saveMeta({ currency });
    }
  }

  async function applyFeeToAll() {
    const fee = parseDecimal(meta.defaultFee);
    try {
      await saveMeta({});
      await applyFeeToAllItems(createClient(), initialList.id, fee);
      await reloadItems();
      setDraft((d) => ({ ...d, fee: meta.defaultFee }));
      toast(`Taxa de ${formatQuantity(fee)}% aplicada a todos os itens`);
    } catch {
      toast("Não foi possível aplicar a taxa.", "error");
    }
  }

  // ---------------------------------------------------------------- itens
  function editRow(id: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function commitRow(id: string, override?: Partial<Row>) {
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    const current = { ...row, ...override };
    const name = cleanLabel(current.name);
    const quantity = parseQuantity(current.qty);
    const saved = current.saved;

    if (!name || quantity <= 0) {
      editRow(id, toRow(saved)); // valor inválido: volta ao último salvo
      toast(name ? "A quantidade deve ser maior que zero." : "O produto não pode ficar vazio.", "error");
      return;
    }

    const usd = current.usd ? parseMoney(current.usd) : null;
    const fee = parseDecimal(current.fee);
    const unitPrice = isImport && usd !== null ? importUnitPrice(usd, rate, fee) : parseMoney(current.price);
    const patch = {
      ...(name !== saved.productName ? { product_name: name } : {}),
      ...(quantity !== saved.quantity ? { quantity } : {}),
      ...(current.checked !== saved.checked ? { checked: current.checked } : {}),
      ...(isImport
        ? {
            ...(usd !== saved.unitPriceUsd ? { unit_price_usd: usd } : {}),
            ...(fee !== saved.feePercent ? { fee_percent: fee } : {}),
            ...(usd === null && unitPrice !== saved.unitPrice ? { unit_price: unitPrice } : {}),
          }
        : unitPrice !== saved.unitPrice
          ? { unit_price: unitPrice }
          : {}),
    };
    if (Object.keys(patch).length === 0) return;
    try {
      const updated = await updatePurchaseItem(createClient(), id, patch);
      setRows((list) =>
        list.map((item) =>
          item.id === id
            ? {
                ...item,
                saved: updated,
                name: updated.productName,
                checked: updated.checked,
                price: moneyInputValue(updated.unitPrice),
              }
            : item,
        ),
      );
    } catch {
      editRow(id, toRow(saved));
      toast("Não foi possível salvar o item.", "error");
    }
  }

  async function toggleRow(row: Row) {
    editRow(row.id, { checked: !row.checked });
    await commitRow(row.id, { checked: !row.checked });
  }

  /** Sobe (-1) ou desce (+1) um item e grava a nova ordem. */
  async function moveRow(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const previous = rows;
    const reordered = [...rows];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const changed = reordered
      .map((row, position) => ({ id: row.id, position, current: row.saved.position }))
      .filter((item) => item.position !== item.current);
    setRows(reordered.map((row, position) => ({ ...row, saved: { ...row.saved, position } })));
    try {
      await setPurchaseItemPositions(
        createClient(),
        changed.map(({ id, position }) => ({ id, position })),
      );
    } catch {
      setRows(previous);
      toast("Não foi possível mover o item.", "error");
    }
  }

  async function removeRow(row: Row) {
    setRows((list) => list.filter((item) => item.id !== row.id));
    try {
      await deletePurchaseItem(createClient(), row.id);
    } catch {
      setRows((list) => [...list, row].sort((a, b) => a.saved.position - b.saved.position));
      toast("Não foi possível remover o item.", "error");
    }
  }

  async function addRow() {
    const name = cleanLabel(draft.name);
    if (!name) {
      nameRef.current?.focus();
      return;
    }
    const quantity = parseQuantity(draft.qty) || 1;
    const usd = isImport && draft.usd ? parseMoney(draft.usd) : null;
    const fee = isImport ? parseDecimal(draft.fee) : 0;
    setAdding(true);
    try {
      const position = rows.reduce((max, row) => Math.max(max, row.saved.position), -1) + 1;
      const item = await addPurchaseItem(createClient(), initialList.id, {
        productName: name,
        quantity,
        unitPrice: usd !== null ? importUnitPrice(usd, rate, fee) : parseMoney(draft.price),
        unitPriceUsd: usd,
        feePercent: fee,
        position,
      });
      setRows((list) => [...list, toRow(item)]);
      setDraft({ name: "", qty: "1", price: "", usd: "", fee: meta.defaultFee });
      nameRef.current?.focus();
    } catch {
      toast("Não foi possível adicionar o item.", "error");
    } finally {
      setAdding(false);
    }
  }

  // ---------------------------------------------------------------- ações
  function listAsText(): string {
    const lines = rows.map((row) => {
      const qty = parseQuantity(row.qty);
      const base = `• ${formatQuantity(qty)}x ${cleanLabel(row.name)}`;
      if (isImport && row.usd) {
        const usd = parseMoney(row.usd);
        return `${base} — ${formatUsd(usd)} = ${formatUsd(qty * usd)}`;
      }
      const price = parseMoney(row.price);
      return price > 0 ? `${base} — ${formatMoney(price)} = ${formatMoney(qty * price)}` : base;
    });
    const footer = isImport
      ? [
          "",
          `*Total: ${formatUsd(totals.totalUsd)}*`,
          `Em reais: ${formatMoney(totals.total)} (cotação ${meta.rate}${parseDecimal(meta.defaultFee) ? ` + ${meta.defaultFee}%` : ""})`,
        ]
      : totals.total > 0
        ? ["", `*Total: ${formatMoney(totals.total)}*`]
        : [];
    return [`*${cleanLabel(meta.title)}*`, `Data: ${formatDateBr(meta.orderDate)}`, "", ...lines, ...footer].join("\n");
  }

  function printList() {
    printWithTitle(cleanLabel(meta.title) || "Lista de compras");
  }

  async function duplicate() {
    try {
      const list: PurchaseList = {
        ...initialList,
        title: meta.title,
        supplierId: meta.supplierId || null,
        currency: meta.currency,
        exchangeRate: rate || null,
        defaultFeePercent: parseDecimal(meta.defaultFee),
        items: rows.map((row) => ({
          ...row.saved,
          productName: cleanLabel(row.name) || row.saved.productName,
          quantity: parseQuantity(row.qty) || row.saved.quantity,
          unitPrice: unitBrl(row),
          unitPriceUsd: row.usd ? parseMoney(row.usd) : null,
          feePercent: parseDecimal(row.fee),
        })),
      };
      const id = await duplicatePurchaseList(createClient(), list, todayIso());
      toast("Lista duplicada");
      router.push(`/listas/${id}`);
    } catch {
      toast("Não foi possível duplicar a lista.", "error");
    }
  }

  async function removeList() {
    setDeleting(true);
    try {
      await deletePurchaseList(createClient(), initialList.id);
      toast("Lista excluída");
      router.replace("/listas");
      router.refresh();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
      toast("Não foi possível excluir a lista.", "error");
    }
  }

  const menu: ActionMenuItem[] = [
    ...(supplierWhatsapp && rows.length > 0
      ? [
          {
            label: "Enviar pelo WhatsApp",
            href: whatsappLink(supplierWhatsapp, listAsText()),
            external: true,
            icon: <MessageCircle className="size-4" aria-hidden />,
          },
        ]
      : []),
    {
      label: "Copiar lista (texto)",
      onSelect: () => copy(listAsText(), "Lista copiada!"),
      icon: <ClipboardCopy className="size-4" aria-hidden />,
    },
    { label: "Imprimir / salvar PDF", onSelect: printList, icon: <Printer className="size-4" aria-hidden /> },
    { label: "Duplicar lista", onSelect: duplicate, icon: <CopyPlus className="size-4" aria-hidden /> },
    {
      label: "Excluir lista",
      onSelect: () => setConfirmDelete(true),
      destructive: true,
      icon: <Trash2 className="size-4" aria-hidden />,
    },
  ];

  // Colunas da "planilha" (desktop). Mobile usa layout em duas linhas por item.
  const desktopCols = isImport
    ? "md:grid-cols-[4.5rem_1fr_4.5rem_7.5rem_4.5rem_7rem_7rem_2.5rem]"
    : "md:grid-cols-[4.5rem_1fr_6rem_9rem_8rem_2.5rem]";

  const printRows = rows.map((row) => {
    const quantity = parseQuantity(row.qty);
    const unit = unitBrl(row);
    return {
      name: cleanLabel(row.name),
      quantity,
      usd: isImport && row.usd ? parseMoney(row.usd) : null,
      fee: parseDecimal(row.fee),
      unit,
      line: Math.round(quantity * unit * 100) / 100,
      checked: row.checked,
    };
  });

  return (
    <>
    <PurchaseListPrint
      title={cleanLabel(meta.title)}
      supplierName={suppliers.find((s) => s.id === meta.supplierId)?.name ?? null}
      orderDate={meta.orderDate}
      status={meta.status}
      currency={meta.currency}
      rate={meta.rate}
      rows={printRows}
      total={totals.total}
      totalUsd={totals.totalUsd}
      notes={meta.notes}
    />
    <div className="space-y-3 pb-24 print:hidden">
      {/* Cabeçalho da lista */}
      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-start gap-2">
          <label htmlFor="list-title" className="sr-only">
            Nome da lista
          </label>
          <input
            id="list-title"
            value={meta.title}
            maxLength={120}
            onChange={(event) => setMeta((m) => ({ ...m, title: event.target.value }))}
            onBlur={() => void saveMeta({})}
            onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
            className="h-10 min-w-0 flex-1 rounded-lg border border-transparent px-2 text-lg font-semibold hover:border-slate-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
          <ActionMenu items={menu} label="Ações da lista" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="col-span-2 min-w-0 md:col-span-1">
            <label htmlFor="list-supplier" className="mb-1 block text-xs font-medium text-slate-500">
              Fornecedor
            </label>
            <select
              id="list-supplier"
              value={meta.supplierId}
              onChange={(event) => void saveMeta({ supplierId: event.target.value })}
              className={cellInput}
            >
              <option value="">Sem fornecedor / vários</option>
              {suppliers.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="list-currency" className="mb-1 block text-xs font-medium text-slate-500">
              Tipo
            </label>
            <select
              id="list-currency"
              value={meta.currency}
              onChange={(event) => void changeCurrency(event.target.value as PurchaseCurrency)}
              className={cellInput}
            >
              <option value="BRL">Nacional</option>
              <option value="USD">Importação</option>
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="list-status" className="mb-1 block text-xs font-medium text-slate-500">
              Status
            </label>
            <select
              id="list-status"
              value={meta.status}
              onChange={(event) => void saveMeta({ status: event.target.value as PurchaseStatus })}
              className={cellInput}
            >
              {(Object.keys(PURCHASE_STATUS_LABELS) as PurchaseStatus[]).map((status) => (
                <option key={status} value={status}>
                  {PURCHASE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 min-w-0 md:col-span-1">
            <label htmlFor="list-date" className="mb-1 block text-xs font-medium text-slate-500">
              Data
            </label>
            <input
              id="list-date"
              type="date"
              value={meta.orderDate}
              onChange={(event) => event.target.value && void saveMeta({ orderDate: event.target.value })}
              className={cellInput}
            />
          </div>
        </div>

        {isImport && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="min-w-0">
              <label htmlFor="list-rate" className="mb-1 block text-xs font-medium text-slate-500">
                Cotação (R$ por US$ 1)
              </label>
              <div className="relative">
                <input
                  id="list-rate"
                  inputMode="numeric"
                  value={meta.rate}
                  placeholder="5,0000"
                  onChange={(event) =>
                    setMeta((m) => ({ ...m, rate: maskFixed(event.target.value, 4), rateUpdatedAt: null }))
                  }
                  onBlur={() => void saveMeta({})}
                  className={`${cellInput} pr-10 text-right tabular-nums`}
                />
                <button
                  type="button"
                  onClick={() => void refreshRate()}
                  disabled={loadingRate}
                  aria-label="Buscar cotação atual do dólar"
                  title="Buscar cotação atual"
                  className="absolute top-1/2 right-0.5 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-brand-600 hover:bg-brand-50"
                >
                  <RefreshCw className={`size-4 ${loadingRate ? "animate-spin" : ""}`} aria-hidden />
                </button>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {meta.rateUpdatedAt ? (isClient ? `Cotação de ${formatDateTime(meta.rateUpdatedAt)}` : "Cotação automática") : "Cotação manual"}
              </p>
            </div>
            <div className="min-w-0">
              <label htmlFor="list-fee" className="mb-1 block text-xs font-medium text-slate-500">
                Taxa padrão (%)
              </label>
              <input
                id="list-fee"
                inputMode="decimal"
                value={meta.defaultFee}
                placeholder="0"
                onChange={(event) => {
                  const defaultFee = maskPercent(event.target.value);
                  setMeta((m) => ({ ...m, defaultFee }));
                  setDraft((d) => ({ ...d, fee: defaultFee }));
                }}
                onBlur={() => void saveMeta({})}
                className={`${cellInput} text-right tabular-nums`}
              />
              <p className="mt-0.5 text-[11px] text-slate-500">Usada nos novos itens.</p>
            </div>
            <button
              type="button"
              onClick={() => void applyFeeToAll()}
              disabled={rows.length === 0}
              className={buttonClasses("secondary", "sm", "col-span-2 md:col-span-1 md:mb-4")}
            >
              Aplicar % a todos
            </button>
          </div>
        )}
      </section>

      {/* Itens */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div
          className={`hidden gap-2 border-b border-slate-100 px-3 py-2 text-xs font-medium tracking-wide text-slate-500 uppercase md:grid ${desktopCols}`}
        >
          <span />
          <span>Produto</span>
          <span className="text-right">Qtd</span>
          {isImport ? (
            <>
              <span className="text-right">US$ unit.</span>
              <span className="text-right">Taxa %</span>
              <span className="text-right">R$ unit.</span>
            </>
          ) : (
            <span className="text-right">Valor unit.</span>
          )}
          <span className="text-right">Subtotal</span>
          <span />
        </div>

        {rows.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            Nenhum item ainda. Lance o primeiro produto abaixo.
          </p>
        )}

        <ul className="divide-y divide-slate-100">
          {rows.map((row, index) => {
            const unit = unitBrl(row);
            const line = parseQuantity(row.qty) * unit;
            return (
              <li
                key={row.id}
                className={`grid grid-cols-[2.5rem_1fr_2.5rem] gap-x-2 gap-y-1.5 px-3 py-2 md:items-center ${desktopCols} ${
                  row.checked ? "bg-green-50/50" : ""
                }`}
              >
                {/* Mover (↑ ↓) + conferido. Celular: ↑ ☐ ↓ na vertical; desktop: ↑↓ ao lado do ☐ */}
                <div className="row-span-2 flex flex-col items-center justify-center gap-0.5 self-center md:row-span-1 md:flex-row md:gap-1">
                  <button
                    type="button"
                    onClick={() => void moveRow(index, -1)}
                    disabled={index === 0}
                    aria-label={`Mover ${row.name} para cima`}
                    title="Mover para cima"
                    className="inline-flex h-8 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-25 md:hidden"
                  >
                    <ChevronUp className="size-5" aria-hidden />
                  </button>
                  <div className="hidden flex-col md:flex">
                    <button
                      type="button"
                      onClick={() => void moveRow(index, -1)}
                      disabled={index === 0}
                      aria-label={`Mover ${row.name} para cima`}
                      title="Mover para cima"
                      className="inline-flex h-5 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 disabled:opacity-25"
                    >
                      <ChevronUp className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => void moveRow(index, 1)}
                      disabled={index === rows.length - 1}
                      aria-label={`Mover ${row.name} para baixo`}
                      title="Mover para baixo"
                      className="inline-flex h-5 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 disabled:opacity-25"
                    >
                      <ChevronDown className="size-4" aria-hidden />
                    </button>
                  </div>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={row.checked}
                    aria-label={`Marcar ${row.name} como conferido`}
                    onClick={() => void toggleRow(row)}
                    className={`inline-flex size-10 items-center justify-center rounded-lg border ${
                      row.checked ? "border-green-600 bg-green-600 text-white" : "border-slate-300 text-transparent"
                    }`}
                  >
                    <Check className="size-5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void moveRow(index, 1)}
                    disabled={index === rows.length - 1}
                    aria-label={`Mover ${row.name} para baixo`}
                    title="Mover para baixo"
                    className="inline-flex h-8 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-25 md:hidden"
                  >
                    <ChevronDown className="size-5" aria-hidden />
                  </button>
                </div>
                <div className="min-w-0">
                  <label htmlFor={`name-${row.id}`} className="sr-only">
                    Produto do item {index + 1}
                  </label>
                  <AutoTextarea
                    id={`name-${row.id}`}
                    value={row.name}
                    maxLength={120}
                    onChange={(event) => editRow(row.id, { name: event.target.value.replace(/\n/g, " ") })}
                    onBlur={() => void commitRow(row.id)}
                    className={`${cellInput} h-auto min-h-10 py-2.5 ${row.checked ? "text-slate-500 line-through" : ""}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void removeRow(row)}
                  aria-label={`Remover ${row.name}`}
                  className="inline-flex size-10 items-center justify-center self-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 md:order-last"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>

                {isImport ? (
                  <div className="col-span-2 col-start-2 grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_4rem] items-center gap-2 md:contents">
                    <div className="min-w-0">
                      <label htmlFor={`qty-${row.id}`} className="sr-only">
                        Quantidade
                      </label>
                      <input
                        id={`qty-${row.id}`}
                        inputMode="decimal"
                        value={row.qty}
                        onChange={(event) => editRow(row.id, { qty: maskQuantity(event.target.value) })}
                        onBlur={() => void commitRow(row.id)}
                        className={`${cellInput} text-right tabular-nums`}
                      />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor={`usd-${row.id}`} className="sr-only">
                        Valor unitário em dólar
                      </label>
                      <MoneyInput
                        id={`usd-${row.id}`}
                        prefix="US$"
                        value={row.usd}
                        onValueChange={(usd) => editRow(row.id, { usd })}
                        onBlur={() => void commitRow(row.id)}
                      />
                    </div>
                    <div className="relative min-w-0">
                      <label htmlFor={`fee-${row.id}`} className="sr-only">
                        Taxa em porcentagem
                      </label>
                      <input
                        id={`fee-${row.id}`}
                        inputMode="decimal"
                        value={row.fee}
                        placeholder="0"
                        onChange={(event) => editRow(row.id, { fee: maskPercent(event.target.value) })}
                        onBlur={() => void commitRow(row.id)}
                        className={`${cellInput} pr-6 text-right tabular-nums`}
                      />
                      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-sm text-slate-400">
                        %
                      </span>
                    </div>
                    <span className="col-span-3 flex items-baseline justify-between gap-2 text-sm md:contents">
                      <span className="text-slate-500 tabular-nums md:text-right">
                        <span className="md:hidden">R$ unit.: </span>
                        {formatMoney(unit)}
                      </span>
                      <span className="font-semibold tabular-nums md:text-right">{formatMoney(line)}</span>
                    </span>
                  </div>
                ) : (
                  <div className="col-span-2 col-start-2 grid min-w-0 grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-2 md:contents">
                    <div className="min-w-0">
                      <label htmlFor={`qty-${row.id}`} className="sr-only">
                        Quantidade
                      </label>
                      <input
                        id={`qty-${row.id}`}
                        inputMode="decimal"
                        value={row.qty}
                        onChange={(event) => editRow(row.id, { qty: maskQuantity(event.target.value) })}
                        onBlur={() => void commitRow(row.id)}
                        className={`${cellInput} text-right tabular-nums`}
                      />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor={`price-${row.id}`} className="sr-only">
                        Valor unitário
                      </label>
                      <MoneyInput
                        id={`price-${row.id}`}
                        value={row.price}
                        onValueChange={(price) => editRow(row.id, { price })}
                        onBlur={() => void commitRow(row.id)}
                      />
                    </div>
                    <span className="min-w-[5rem] text-right text-sm font-semibold tabular-nums">{formatMoney(line)}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* Nova linha */}
        <div className="border-t border-slate-200 bg-slate-50/70 p-3">
          <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Adicionar item</p>
          <div
            className={`grid gap-2 ${
              isImport
                ? "grid-cols-[3.5rem_minmax(0,1fr)_4.5rem] md:grid-cols-[1fr_4.5rem_7.5rem_4.5rem_auto]"
                : "grid-cols-[4.5rem_1fr] md:grid-cols-[1fr_6rem_9rem_auto]"
            }`}
          >
            <div className={`min-w-0 md:col-span-1 ${isImport ? "col-span-3" : "col-span-2"}`}>
              <label htmlFor="new-item-name" className="sr-only">
                Produto
              </label>
              <input
                id="new-item-name"
                ref={nameRef}
                list={datalistId}
                value={draft.name}
                maxLength={120}
                placeholder="Produto (ex.: Película 3D iPhone 13)"
                enterKeyHint="next"
                onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    qtyRef.current?.select();
                  }
                }}
                className={cellInput}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="new-item-qty" className="sr-only">
                Quantidade
              </label>
              <input
                id="new-item-qty"
                ref={qtyRef}
                inputMode="decimal"
                value={draft.qty}
                placeholder="Qtd"
                enterKeyHint="next"
                onChange={(event) => setDraft((d) => ({ ...d, qty: maskQuantity(event.target.value) }))}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    priceRef.current?.focus();
                  }
                }}
                className={`${cellInput} text-right tabular-nums`}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="new-item-price" className="sr-only">
                {isImport ? "Valor unitário em dólar" : "Valor unitário"}
              </label>
              <MoneyInput
                id="new-item-price"
                ref={priceRef}
                prefix={isImport ? "US$" : "R$"}
                value={isImport ? draft.usd : draft.price}
                enterKeyHint={isImport ? "next" : "done"}
                onValueChange={(value) => setDraft((d) => (isImport ? { ...d, usd: value } : { ...d, price: value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (isImport) feeRef.current?.select();
                    else void addRow();
                  }
                }}
              />
            </div>
            {isImport && (
              <div className="relative min-w-0">
                <label htmlFor="new-item-fee" className="sr-only">
                  Taxa em porcentagem
                </label>
                <input
                  id="new-item-fee"
                  ref={feeRef}
                  inputMode="decimal"
                  value={draft.fee}
                  placeholder="0"
                  enterKeyHint="done"
                  onChange={(event) => setDraft((d) => ({ ...d, fee: maskPercent(event.target.value) }))}
                  onFocus={(event) => event.currentTarget.select()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addRow();
                    }
                  }}
                  className={`${cellInput} pr-6 text-right tabular-nums`}
                />
                <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-sm text-slate-400">
                  %
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => void addRow()}
              disabled={adding}
              className={buttonClasses("primary", "sm", `${isImport ? "col-span-3" : "col-span-2"} md:col-span-1`)}
            >
              <Plus className="size-4" aria-hidden />
              Adicionar
            </button>
          </div>
          {isImport && draft.usd && (
            <p className="mt-1.5 text-xs text-slate-500">
              = {formatMoney(unitBrl(draft))} por unidade (US$ × {meta.rate || "?"}
              {parseDecimal(draft.fee) ? ` + ${draft.fee}%` : ""})
            </p>
          )}
          {isImport && !rate && (
            <p className="mt-1.5 text-xs text-amber-700">Informe a cotação do dólar para calcular os valores em reais.</p>
          )}
        </div>
        <datalist id={datalistId}>
          {uniqueSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </section>

      {/* Observações */}
      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <label htmlFor="list-notes" className="mb-1 block text-xs font-medium tracking-wide text-slate-500 uppercase">
          Observações
        </label>
        <textarea
          id="list-notes"
          rows={2}
          value={meta.notes}
          maxLength={2000}
          placeholder="Prazo de entrega, forma de pagamento, frete..."
          onChange={(event) => setMeta((m) => ({ ...m, notes: event.target.value }))}
          onBlur={() => void saveMeta({})}
          className={`${cellInput} h-auto py-2`}
        />
      </section>

      {/* Totais fixos no rodapé */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-slate-500">
            <p>
              {rows.length === 1 ? "1 item" : `${rows.length} itens`}
              {totals.checkedCount > 0 && ` · ${totals.checkedCount} conferido(s)`}
            </p>
            {isImport ? (
              <p className="truncate font-medium text-slate-700 tabular-nums">{formatUsd(totals.totalUsd)}</p>
            ) : (
              totals.checkedCount > 0 && (
                <p className="truncate text-green-700">Conferido: {formatMoney(totals.checkedTotal)}</p>
              )
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">{isImport ? "Total em reais" : "Total"}</p>
            <p className="text-xl font-bold tabular-nums" aria-live="polite">
              {formatMoney(totals.total)}
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Excluir lista ${meta.title}?`}
        description="Todos os itens desta lista serão removidos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        busy={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={removeList}
      />
    </div>
    </>
  );
}

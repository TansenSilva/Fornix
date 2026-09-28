"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CopyPlus, ClipboardCopy, MessageCircle, Plus, Trash2 } from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/ActionMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { buttonClasses } from "@/components/ui/button";
import { useCopy } from "@/hooks/useCopy";
import {
  addPurchaseItem,
  deletePurchaseItem,
  deletePurchaseList,
  duplicatePurchaseList,
  updatePurchaseItem,
  updatePurchaseList,
} from "@/lib/data/purchase-lists";
import { createClient } from "@/lib/supabase/client";
import {
  PURCHASE_STATUS_LABELS,
  type PurchaseItem,
  type PurchaseList,
  type PurchaseStatus,
  type SupplierOption,
} from "@/types/purchase";
import { formatDateBr, todayIso } from "@/utils/date";
import {
  formatMoney,
  formatQuantity,
  maskQuantity,
  moneyInputValue,
  parseMoney,
  parseQuantity,
  quantityInputValue,
} from "@/utils/money";
import { whatsappLink } from "@/utils/phone";
import { cleanLabel } from "@/utils/text";
import { MoneyInput } from "./MoneyInput";

interface Row {
  id: string;
  name: string;
  qty: string;
  price: string;
  checked: boolean;
  saved: PurchaseItem;
}

function toRow(item: PurchaseItem): Row {
  return {
    id: item.id,
    name: item.productName,
    qty: quantityInputValue(item.quantity),
    price: moneyInputValue(item.unitPrice),
    checked: item.checked,
    saved: item,
  };
}

const cellInput =
  "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 focus:border-brand-600 focus:ring-2 focus:ring-brand-100 focus:outline-none";

interface Props {
  list: PurchaseList;
  suppliers: SupplierOption[];
  suggestions: string[];
}

/** Lista de compras em formato de planilha: lança produto, quantidade e valor; o total atualiza na hora. */
export function PurchaseListEditor({ list: initialList, suppliers, suggestions }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const copy = useCopy();
  const datalistId = useId();

  const [meta, setMeta] = useState({
    title: initialList.title,
    supplierId: initialList.supplierId ?? "",
    status: initialList.status,
    orderDate: initialList.orderDate,
    notes: initialList.notes ?? "",
  });
  const savedMeta = useRef(meta);
  const [rows, setRows] = useState<Row[]>(() => initialList.items.map(toRow));
  const [draft, setDraft] = useState({ name: "", qty: "1", price: "" });
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  const uniqueSuggestions = useMemo(() => [...new Set(suggestions)].slice(0, 500), [suggestions]);
  const supplier = suppliers.find((s) => s.id === meta.supplierId);
  const supplierWhatsapp = meta.supplierId === initialList.supplierId ? initialList.supplierWhatsapp : null;

  // Totais calculados na hora, a partir do que está digitado.
  const totals = useMemo(() => {
    let total = 0;
    let checkedTotal = 0;
    let checkedCount = 0;
    for (const row of rows) {
      const line = Math.round(parseQuantity(row.qty) * parseMoney(row.price) * 100) / 100;
      total += line;
      if (row.checked) {
        checkedTotal += line;
        checkedCount += 1;
      }
    }
    return { total, checkedTotal, checkedCount };
  }, [rows]);

  // ---------------------------------------------------------------- lista
  async function saveMeta(patch: Partial<typeof meta>) {
    const next = { ...meta, ...patch };
    setMeta(next);
    const previous = savedMeta.current;
    const title = cleanLabel(next.title) || previous.title;
    const changes = {
      ...(title !== previous.title ? { title } : {}),
      ...(next.supplierId !== previous.supplierId ? { supplier_id: next.supplierId || null } : {}),
      ...(next.status !== previous.status ? { status: next.status } : {}),
      ...(next.orderDate !== previous.orderDate ? { order_date: next.orderDate } : {}),
      ...(next.notes !== previous.notes ? { notes: next.notes.trim() || null } : {}),
    };
    if (Object.keys(changes).length === 0) return;
    try {
      await updatePurchaseList(createClient(), initialList.id, changes);
      savedMeta.current = { ...next, title };
      setMeta((current) => ({ ...current, title }));
      if (changes.status) toast(`Status: ${PURCHASE_STATUS_LABELS[next.status]}`);
    } catch {
      setMeta(previous);
      toast("Não foi possível salvar a lista.", "error");
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
    const unitPrice = parseMoney(current.price);
    const saved = current.saved;

    if (!name || quantity <= 0) {
      editRow(id, toRow(saved)); // valor inválido: volta ao último salvo
      if (!name) toast("O produto não pode ficar vazio.", "error");
      else toast("A quantidade deve ser maior que zero.", "error");
      return;
    }
    const patch = {
      ...(name !== saved.productName ? { product_name: name } : {}),
      ...(quantity !== saved.quantity ? { quantity } : {}),
      ...(unitPrice !== saved.unitPrice ? { unit_price: unitPrice } : {}),
      ...(current.checked !== saved.checked ? { checked: current.checked } : {}),
    };
    if (Object.keys(patch).length === 0) return;
    try {
      const updated = await updatePurchaseItem(createClient(), id, patch);
      setRows((list) =>
        list.map((item) =>
          item.id === id
            ? { ...item, saved: updated, name: updated.productName, checked: updated.checked }
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
    setAdding(true);
    try {
      const position = rows.reduce((max, row) => Math.max(max, row.saved.position), -1) + 1;
      const item = await addPurchaseItem(createClient(), initialList.id, {
        productName: name,
        quantity,
        unitPrice: parseMoney(draft.price),
        position,
      });
      setRows((list) => [...list, toRow(item)]);
      setDraft({ name: "", qty: "1", price: "" });
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
      const price = parseMoney(row.price);
      const base = `• ${formatQuantity(qty)}x ${cleanLabel(row.name)}`;
      return price > 0 ? `${base} — ${formatMoney(price)} = ${formatMoney(qty * price)}` : base;
    });
    return [
      `*${cleanLabel(meta.title)}*`,
      `Data: ${formatDateBr(meta.orderDate)}`,
      "",
      ...lines,
      ...(totals.total > 0 ? ["", `*Total: ${formatMoney(totals.total)}*`] : []),
    ].join("\n");
  }

  async function duplicate() {
    try {
      const list: PurchaseList = {
        ...initialList,
        title: meta.title,
        supplierId: meta.supplierId || null,
        items: rows.map((row) => ({
          ...row.saved,
          productName: cleanLabel(row.name) || row.saved.productName,
          quantity: parseQuantity(row.qty) || row.saved.quantity,
          unitPrice: parseMoney(row.price),
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
    { label: "Duplicar lista", onSelect: duplicate, icon: <CopyPlus className="size-4" aria-hidden /> },
    {
      label: "Excluir lista",
      onSelect: () => setConfirmDelete(true),
      destructive: true,
      icon: <Trash2 className="size-4" aria-hidden />,
    },
  ];

  return (
    <div className="space-y-3 pb-24">
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
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-[2fr_1fr_1fr]">
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
          <div className="min-w-0">
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
        {supplier && !supplierWhatsapp && meta.supplierId !== initialList.supplierId && (
          <p className="mt-2 text-xs text-slate-500">Recarregue a página para ativar o envio pelo WhatsApp.</p>
        )}
      </section>

      {/* Itens */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[2.5rem_1fr_6rem_9rem_8rem_2.5rem] gap-2 border-b border-slate-100 px-3 py-2 text-xs font-medium tracking-wide text-slate-500 uppercase md:grid">
          <span />
          <span>Produto</span>
          <span className="text-right">Qtd</span>
          <span className="text-right">Valor unit.</span>
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
            const line = parseQuantity(row.qty) * parseMoney(row.price);
            return (
              <li
                key={row.id}
                className={`grid grid-cols-[2.5rem_1fr_2.5rem] gap-x-2 gap-y-1.5 px-3 py-2 md:grid-cols-[2.5rem_1fr_6rem_9rem_8rem_2.5rem] md:items-center ${
                  row.checked ? "bg-green-50/50" : ""
                }`}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={row.checked}
                  aria-label={`Marcar ${row.name} como conferido`}
                  onClick={() => void toggleRow(row)}
                  className={`row-span-2 inline-flex size-10 items-center justify-center self-center rounded-lg border md:row-span-1 ${
                    row.checked ? "border-green-600 bg-green-600 text-white" : "border-slate-300 text-transparent"
                  }`}
                >
                  <Check className="size-5" aria-hidden />
                </button>
                <div className="min-w-0">
                  <label htmlFor={`name-${row.id}`} className="sr-only">
                    Produto do item {index + 1}
                  </label>
                  <input
                    id={`name-${row.id}`}
                    list={datalistId}
                    value={row.name}
                    maxLength={120}
                    onChange={(event) => editRow(row.id, { name: event.target.value })}
                    onBlur={() => void commitRow(row.id)}
                    className={`${cellInput} ${row.checked ? "text-slate-500 line-through" : ""}`}
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
                  <span className="min-w-[5rem] text-right text-sm font-semibold tabular-nums">
                    {formatMoney(line)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Nova linha */}
        <div className="border-t border-slate-200 bg-slate-50/70 p-3">
          <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Adicionar item</p>
          <div className="grid grid-cols-[4.5rem_1fr] gap-2 md:grid-cols-[1fr_6rem_9rem_auto]">
            <div className="col-span-2 min-w-0 md:col-span-1">
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
                Valor unitário
              </label>
              <MoneyInput
                id="new-item-price"
                ref={priceRef}
                value={draft.price}
                enterKeyHint="done"
                onValueChange={(price) => setDraft((d) => ({ ...d, price }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void addRow();
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => void addRow()}
              disabled={adding}
              className={buttonClasses("primary", "sm", "col-span-2 md:col-span-1")}
            >
              <Plus className="size-4" aria-hidden />
              Adicionar
            </button>
          </div>
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
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-slate-500">
            <p>
              {rows.length === 1 ? "1 item" : `${rows.length} itens`}
              {totals.checkedCount > 0 && ` · ${totals.checkedCount} conferido(s)`}
            </p>
            {totals.checkedCount > 0 && (
              <p className="truncate text-green-700">Conferido: {formatMoney(totals.checkedTotal)}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Total</p>
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
  );
}

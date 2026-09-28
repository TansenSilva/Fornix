import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PurchaseItem,
  PurchaseList,
  PurchaseListSummary,
  PurchaseStatus,
  SupplierOption,
} from "@/types/purchase";

/** Camada de dados das listas de compras (RLS garante que cada usuário vê só as suas). */

interface ItemRow {
  id: string;
  product_name: string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
  checked: boolean;
  position: number;
}

interface ListRow {
  id: string;
  title: string;
  supplier_id: string | null;
  status: PurchaseStatus;
  order_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  suppliers: { name: string; whatsapp: string | null } | null;
  purchase_list_items: ItemRow[];
}

interface SummaryRow {
  id: string;
  title: string;
  supplier_id: string | null;
  supplier_name: string | null;
  status: PurchaseStatus;
  order_date: string;
  item_count: number;
  total: number | string;
  updated_at: string;
}

const ITEM_COLUMNS = "id, product_name, quantity, unit_price, line_total, checked, position";

// numeric do Postgres chega como string ou number dependendo do tamanho
const num = (value: number | string) => Number(value) || 0;

export function mapItem(row: ItemRow): PurchaseItem {
  return {
    id: row.id,
    productName: row.product_name,
    quantity: num(row.quantity),
    unitPrice: num(row.unit_price),
    lineTotal: num(row.line_total),
    checked: row.checked,
    position: row.position,
  };
}

function mapSummary(row: SummaryRow): PurchaseListSummary {
  return {
    id: row.id,
    title: row.title,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    status: row.status,
    orderDate: row.order_date,
    itemCount: row.item_count,
    total: num(row.total),
    updatedAt: row.updated_at,
  };
}

export async function getPurchaseListSummaries(
  supabase: SupabaseClient,
  filters: { supplierId?: string; limit?: number } = {},
): Promise<PurchaseListSummary[]> {
  let query = supabase
    .from("purchase_list_summaries")
    .select("id, title, supplier_id, supplier_name, status, order_date, item_count, total, updated_at")
    .order("order_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (filters.supplierId) query = query.eq("supplier_id", filters.supplierId);
  const { data, error } = await query.limit(filters.limit ?? 200);
  if (error) throw new Error(error.message);
  return ((data ?? []) as SummaryRow[]).map(mapSummary);
}

export async function getPurchaseList(supabase: SupabaseClient, id: string): Promise<PurchaseList | null> {
  const { data, error } = await supabase
    .from("purchase_lists")
    .select(
      `id, title, supplier_id, status, order_date, notes, created_at, updated_at,
       suppliers ( name, whatsapp ),
       purchase_list_items ( ${ITEM_COLUMNS} )`,
    )
    .eq("id", id)
    .order("position", { referencedTable: "purchase_list_items", ascending: true })
    .order("created_at", { referencedTable: "purchase_list_items", ascending: true })
    .maybeSingle();
  if (error) {
    if (error.code === "22P02") return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  const row = data as unknown as ListRow;
  return {
    id: row.id,
    title: row.title,
    supplierId: row.supplier_id,
    supplierName: row.suppliers?.name ?? null,
    supplierWhatsapp: row.suppliers?.whatsapp ?? null,
    status: row.status,
    orderDate: row.order_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: row.purchase_list_items.map(mapItem),
  };
}

export async function getSupplierOptions(supabase: SupabaseClient): Promise<SupplierOption[]> {
  const { data, error } = await supabase.from("suppliers").select("id, name").order("name_normalized");
  if (error) throw new Error(error.message);
  return (data ?? []) as SupplierOption[];
}

/** Nomes já usados em itens + produtos do catálogo (para o autocomplete). */
export async function getItemSuggestions(supabase: SupabaseClient): Promise<string[]> {
  const [products, items] = await Promise.all([
    supabase.from("products").select("name").order("name_normalized"),
    supabase.from("purchase_list_items").select("product_name").order("created_at", { ascending: false }).limit(1000),
  ]);
  const names = [
    ...((products.data ?? []) as { name: string }[]).map((row) => row.name),
    ...((items.data ?? []) as { product_name: string }[]).map((row) => row.product_name),
  ];
  return names;
}

export async function createPurchaseList(
  supabase: SupabaseClient,
  input: { title: string; supplierId: string | null; orderDate: string },
): Promise<string> {
  const { data, error } = await supabase
    .from("purchase_lists")
    .insert({ title: input.title, supplier_id: input.supplierId, order_date: input.orderDate })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function updatePurchaseList(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<{ title: string; supplier_id: string | null; status: PurchaseStatus; order_date: string; notes: string | null }>,
): Promise<void> {
  const { error } = await supabase.from("purchase_lists").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePurchaseList(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("purchase_lists").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addPurchaseItem(
  supabase: SupabaseClient,
  listId: string,
  item: { productName: string; quantity: number; unitPrice: number; position: number },
): Promise<PurchaseItem> {
  const { data, error } = await supabase
    .from("purchase_list_items")
    .insert({
      list_id: listId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      position: item.position,
    })
    .select(ITEM_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return mapItem(data as ItemRow);
}

export async function updatePurchaseItem(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<{ product_name: string; quantity: number; unit_price: number; checked: boolean }>,
): Promise<PurchaseItem> {
  const { data, error } = await supabase
    .from("purchase_list_items")
    .update(patch)
    .eq("id", id)
    .select(ITEM_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return mapItem(data as ItemRow);
}

export async function deletePurchaseItem(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("purchase_list_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Cria uma cópia da lista (status rascunho, data de hoje, itens desmarcados). */
export async function duplicatePurchaseList(supabase: SupabaseClient, list: PurchaseList, today: string): Promise<string> {
  const id = await createPurchaseList(supabase, {
    title: `${list.title} (cópia)`.slice(0, 120),
    supplierId: list.supplierId,
    orderDate: today,
  });
  if (list.items.length > 0) {
    const { error } = await supabase.from("purchase_list_items").insert(
      list.items.map((item, index) => ({
        list_id: id,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        position: index,
      })),
    );
    if (error) throw new Error(error.message);
  }
  return id;
}

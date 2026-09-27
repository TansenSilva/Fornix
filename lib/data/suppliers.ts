import type { SupabaseClient } from "@supabase/supabase-js";
import type { SimilarSupplierRow, SupplierRow } from "@/types/database";
import type {
  FilterOptions,
  SimilarSupplier,
  Supplier,
  SupplierQuery,
  SupplierStats,
} from "@/types/supplier";
import { escapeLike, normalizeText } from "@/utils/text";
import { mapSupplier } from "./mappers";

/**
 * Camada de dados dos fornecedores. As funções recebem o cliente Supabase
 * (do navegador ou do servidor), então funcionam nos dois lados. Toda
 * consulta é filtrada pelo RLS: cada usuário só vê os próprios registros.
 *
 * Nunca selecionamos `portal_password_encrypted` aqui — só `has_portal_password`.
 */
const SUPPLIER_COLUMNS = `
  id, name, trade_name, document, contact_name, whatsapp, phone, email, website, instagram,
  cep, street, address_number, complement, neighborhood, city, state, notes, portal_url, portal_login, has_portal_password, is_favorite,
  created_at, updated_at,
  supplier_products ( products ( id, name ) ),
  supplier_brands ( brands ( id, name ) ),
  supplier_categories ( categories ( id, name ) )
`;

/** Limite de resultados por busca — suficiente para um catálogo pessoal. */
export const SEARCH_LIMIT = 300;

export const DEFAULT_QUERY: SupplierQuery = {
  search: "",
  favoritesOnly: false,
  categoryId: null,
  brandId: null,
  state: null,
  sort: "default",
};

/**
 * Busca global em UMA consulta: cada palavra digitada precisa aparecer no
 * `search_document` (nome, vendedor, cidade, produtos, marcas e categorias,
 * sem acentos). Índice trigram (pg_trgm) torna o ILIKE '%termo%' rápido.
 */
export async function searchSuppliers(
  supabase: SupabaseClient,
  params: SupplierQuery,
): Promise<Supplier[]> {
  let columns = SUPPLIER_COLUMNS;
  // Filtros por relacionamento usam um "embed" separado com !inner, para não
  // cortar as tags exibidas no card.
  if (params.categoryId) columns += ", category_filter:supplier_categories!inner(category_id)";
  if (params.brandId) columns += ", brand_filter:supplier_brands!inner(brand_id)";

  let query = supabase.from("suppliers").select(columns);

  const terms = normalizeText(params.search).split(" ").filter(Boolean).slice(0, 6);
  for (const term of terms) {
    query = query.ilike("search_document", `%${escapeLike(term)}%`);
  }

  if (params.favoritesOnly) query = query.eq("is_favorite", true);
  if (params.state) query = query.eq("state", params.state);
  if (params.categoryId) query = query.eq("category_filter.category_id", params.categoryId);
  if (params.brandId) query = query.eq("brand_filter.brand_id", params.brandId);

  if (params.sort === "recent") {
    query = query.order("created_at", { ascending: false });
  } else if (params.sort === "name") {
    query = query.order("name_normalized", { ascending: true });
  } else {
    query = query
      .order("is_favorite", { ascending: false })
      .order("name_normalized", { ascending: true });
  }

  const { data, error } = await query.limit(SEARCH_LIMIT);
  if (error) throw new Error(error.message);
  return (data as unknown as SupplierRow[]).map(mapSupplier);
}

export async function getSupplier(supabase: SupabaseClient, id: string): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from("suppliers")
    .select(SUPPLIER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    // id malformado (não-uuid) é tratado como "não encontrado"
    if (error.code === "22P02") return null;
    throw new Error(error.message);
  }
  return data ? mapSupplier(data as unknown as SupplierRow) : null;
}

export async function getSupplierStats(supabase: SupabaseClient): Promise<SupplierStats> {
  const [suppliers, favorites, categories] = await Promise.all([
    supabase.from("suppliers").select("id", { count: "exact", head: true }),
    supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_favorite", true),
    supabase.from("categories").select("id", { count: "exact", head: true }),
  ]);
  const error = suppliers.error ?? favorites.error ?? categories.error;
  if (error) throw new Error(error.message);
  return {
    suppliers: suppliers.count ?? 0,
    favorites: favorites.count ?? 0,
    categories: categories.count ?? 0,
  };
}

export async function getFilterOptions(supabase: SupabaseClient): Promise<FilterOptions> {
  const [categories, brands, states] = await Promise.all([
    supabase.from("categories").select("id, name").order("name_normalized"),
    supabase.from("brands").select("id, name").order("name_normalized"),
    supabase.from("suppliers").select("state").not("state", "is", null),
  ]);
  const error = categories.error ?? brands.error ?? states.error;
  if (error) throw new Error(error.message);

  const stateRows = (states.data ?? []) as { state: string }[];
  return {
    categories: categories.data ?? [],
    brands: brands.data ?? [],
    states: [...new Set(stateRows.map((row) => row.state))].sort(),
  };
}

export async function setFavorite(
  supabase: SupabaseClient,
  id: string,
  isFavorite: boolean,
): Promise<void> {
  const { error } = await supabase.from("suppliers").update({ is_favorite: isFavorite }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSupplier(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  // Limpa produtos/marcas que ficaram sem fornecedor (não bloqueia a exclusão).
  await supabase.rpc("cleanup_orphan_tags");
}

export async function findSimilarSuppliers(
  supabase: SupabaseClient,
  params: { name: string; whatsapp: string; email: string; website: string; document: string; excludeId?: string },
): Promise<SimilarSupplier[]> {
  const { data, error } = await supabase.rpc("find_similar_suppliers", {
    p_name: params.name || null,
    p_whatsapp: params.whatsapp || null,
    p_email: params.email || null,
    p_website: params.website || null,
    p_exclude_id: params.excludeId ?? null,
    p_document: params.document || null,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as SimilarSupplierRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    reasons: row.reasons ?? [],
  }));
}

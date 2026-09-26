import type { SupabaseClient } from "@supabase/supabase-js";
import type { Brand, Category, Product } from "@/types/supplier";

/** Categorias, produtos e marcas do usuário (para autocomplete e seletores). */
export async function getTaxonomy(
  supabase: SupabaseClient,
): Promise<{ categories: Category[]; products: Product[]; brands: Brand[] }> {
  const [categories, products, brands] = await Promise.all([
    supabase.from("categories").select("id, name").order("name_normalized"),
    supabase.from("products").select("id, name").order("name_normalized"),
    supabase.from("brands").select("id, name").order("name_normalized"),
  ]);
  const error = categories.error ?? products.error ?? brands.error;
  if (error) throw new Error(error.message);
  return {
    categories: categories.data ?? [],
    products: products.data ?? [],
    brands: brands.data ?? [],
  };
}

export interface CategoryWithUsage extends Category {
  supplierCount: number;
}

export async function getCategoriesWithUsage(supabase: SupabaseClient): Promise<CategoryWithUsage[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, supplier_categories(count)")
    .order("name_normalized");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    supplier_categories: { count: number }[];
  }[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    supplierCount: row.supplier_categories[0]?.count ?? 0,
  }));
}

export async function createCategory(supabase: SupabaseClient, name: string): Promise<Category> {
  const { data, error } = await supabase.from("categories").insert({ name }).select("id, name").single();
  if (error) throw new Error(error.code === "23505" ? "Já existe uma categoria com esse nome." : error.message);
  return data as Category;
}

export async function renameCategory(supabase: SupabaseClient, id: string, name: string): Promise<void> {
  const { error } = await supabase.from("categories").update({ name }).eq("id", id);
  if (error) throw new Error(error.code === "23505" ? "Já existe uma categoria com esse nome." : error.message);
}

export async function deleteCategory(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

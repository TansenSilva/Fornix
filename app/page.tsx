import { SupplierBrowser } from "@/components/suppliers/SupplierBrowser";
import { parseSupplierQuery } from "@/lib/data/query-params";
import { getFilterOptions, getSupplierStats, searchSuppliers } from "@/lib/data/suppliers";
import { createClient } from "@/lib/supabase/server";
import type { FilterOptions, Supplier, SupplierStats } from "@/types/supplier";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const query = parseSupplierQuery(await searchParams);
  const supabase = await createClient();

  let suppliers: Supplier[] = [];
  let stats: SupplierStats = { suppliers: 0, favorites: 0, categories: 0 };
  let options: FilterOptions = { categories: [], brands: [], states: [] };
  let error: string | null = null;

  try {
    [suppliers, stats, options] = await Promise.all([
      searchSuppliers(supabase, query),
      getSupplierStats(supabase),
      getFilterOptions(supabase),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Erro ao carregar fornecedores.";
  }

  return (
    <SupplierBrowser
      initialQuery={query}
      initialSuppliers={suppliers}
      initialStats={stats}
      filterOptions={options}
      initialError={error}
    />
  );
}

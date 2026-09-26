import type { SupplierQuery, SupplierSort } from "@/types/supplier";
import { DEFAULT_QUERY } from "./suppliers";

type RawParams = Record<string, string | string[] | undefined>;

const SORTS: SupplierSort[] = ["default", "name", "recent"];

function first(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v ? v : null;
}

/** Converte os parâmetros da URL (?q=&fav=1&cat=&brand=&uf=&sort=) em SupplierQuery. */
export function parseSupplierQuery(params: RawParams): SupplierQuery {
  const sort = first(params.sort) as SupplierSort | null;
  return {
    search: (first(params.q) ?? "").slice(0, 100),
    favoritesOnly: first(params.fav) === "1",
    categoryId: first(params.cat),
    brandId: first(params.brand),
    state: first(params.uf),
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_QUERY.sort,
  };
}

export function serializeSupplierQuery(query: SupplierQuery): string {
  const params = new URLSearchParams();
  if (query.search.trim()) params.set("q", query.search.trim());
  if (query.favoritesOnly) params.set("fav", "1");
  if (query.categoryId) params.set("cat", query.categoryId);
  if (query.brandId) params.set("brand", query.brandId);
  if (query.state) params.set("uf", query.state);
  if (query.sort !== DEFAULT_QUERY.sort) params.set("sort", query.sort);
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function countActiveFilters(query: SupplierQuery): number {
  return [query.categoryId, query.brandId, query.state, query.sort !== DEFAULT_QUERY.sort ? "sort" : null].filter(
    Boolean,
  ).length;
}

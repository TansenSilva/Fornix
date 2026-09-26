import type { SupplierRow, TagRow } from "@/types/database";
import type { Supplier } from "@/types/supplier";

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function tags(items: (TagRow | null)[]): TagRow[] {
  return sortByName(items.filter((item): item is TagRow => item !== null));
}

export function mapSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    tradeName: row.trade_name,
    contactName: row.contact_name,
    whatsapp: row.whatsapp,
    phone: row.phone,
    email: row.email,
    website: row.website,
    instagram: row.instagram,
    city: row.city,
    state: row.state,
    notes: row.notes,
    portalUrl: row.portal_url,
    portalLogin: row.portal_login,
    hasPortalPassword: row.has_portal_password,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    products: tags((row.supplier_products ?? []).map((link) => link.products)),
    brands: tags((row.supplier_brands ?? []).map((link) => link.brands)),
    categories: tags((row.supplier_categories ?? []).map((link) => link.categories)),
  };
}

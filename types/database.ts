/**
 * Formato das linhas retornadas pelo Supabase (snake_case), usado apenas na
 * camada de dados (lib/data). A interface usa os tipos de types/supplier.ts.
 */
export interface TagRow {
  id: string;
  name: string;
}

export interface SupplierRow {
  id: string;
  name: string;
  trade_name: string | null;
  contact_name: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  portal_url: string | null;
  portal_login: string | null;
  has_portal_password: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  supplier_products: { products: TagRow | null }[];
  supplier_brands: { brands: TagRow | null }[];
  supplier_categories: { categories: TagRow | null }[];
}

export interface SimilarSupplierRow {
  id: string;
  name: string;
  reasons: string[] | null;
}

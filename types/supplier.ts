export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
}

export interface Brand {
  id: string;
  name: string;
}

/**
 * Contato de um fornecedor. Na versão 1 cada fornecedor tem um único contato,
 * armazenado nas colunas do próprio fornecedor. O tipo existe para facilitar a
 * futura migração para uma tabela `contacts` (vários contatos por fornecedor).
 */
export interface Contact {
  name: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  tradeName: string | null;
  contactName: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  portalUrl: string | null;
  portalLogin: string | null;
  /** A senha nunca é enviada junto com o fornecedor — apenas este indicador. */
  hasPortalPassword: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  products: Product[];
  brands: Brand[];
  categories: Category[];
}

export type SupplierSort = "default" | "name" | "recent";

export interface SupplierQuery {
  search: string;
  favoritesOnly: boolean;
  categoryId: string | null;
  brandId: string | null;
  state: string | null;
  sort: SupplierSort;
}

export interface SupplierStats {
  suppliers: number;
  favorites: number;
  categories: number;
}

export interface FilterOptions {
  categories: Category[];
  brands: Brand[];
  states: string[];
}

export interface SimilarSupplier {
  id: string;
  name: string;
  reasons: string[];
}

export type PasswordAction = "keep" | "set" | "clear";

/** Dados enviados pelo formulário de cadastro/edição. */
export interface SupplierFormInput {
  name: string;
  tradeName: string;
  contactName: string;
  whatsapp: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  city: string;
  state: string;
  notes: string;
  portalUrl: string;
  portalLogin: string;
  /** Nova senha em texto puro — só trafega do navegador para o servidor (HTTPS), onde é criptografada. */
  portalPassword: string;
  passwordAction: PasswordAction;
  isFavorite: boolean;
  products: string[];
  brands: string[];
  categoryIds: string[];
}

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

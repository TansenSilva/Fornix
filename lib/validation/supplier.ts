import type { SupplierFormInput } from "@/types/supplier";
import { isValidPhone, normalizePhone } from "@/utils/phone";
import { isValidState } from "@/utils/states";
import { cleanLabel, uniqueLabels } from "@/utils/text";
import { isValidEmail, normalizeInstagram, normalizeUrl } from "@/utils/url";

export const LIMITS = {
  name: 120,
  short: 120,
  notes: 4000,
  url: 500,
  tag: 80,
  tags: 100,
  password: 256,
} as const;

/** Dados já normalizados, no formato esperado pela função save_supplier. */
export interface SupplierPayload {
  name: string;
  trade_name: string;
  contact_name: string;
  whatsapp: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  city: string;
  state: string;
  notes: string;
  portal_url: string;
  portal_login: string;
  is_favorite: boolean;
}

export type ValidationResult =
  | { ok: true; payload: SupplierPayload; products: string[]; brands: string[]; categoryIds: string[] }
  | { ok: false; error: string; field?: keyof SupplierFormInput };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tooLong(value: string, max: number) {
  return value.length > max;
}

/** Valida e normaliza os dados do formulário. Usado no cliente e novamente no servidor. */
export function validateSupplier(input: SupplierFormInput): ValidationResult {
  const name = cleanLabel(input.name ?? "");
  if (!name) return { ok: false, error: "Informe o nome do fornecedor.", field: "name" };
  if (tooLong(name, LIMITS.name)) return { ok: false, error: "Nome muito longo.", field: "name" };

  const whatsapp = normalizePhone(input.whatsapp ?? "");
  if (whatsapp && !isValidPhone(whatsapp)) {
    return { ok: false, error: "WhatsApp inválido. Use DDD + número.", field: "whatsapp" };
  }
  const phone = normalizePhone(input.phone ?? "");
  if (phone && !isValidPhone(phone)) {
    return { ok: false, error: "Telefone inválido. Use DDD + número.", field: "phone" };
  }

  const email = (input.email ?? "").trim().toLowerCase();
  if (email && (!isValidEmail(email) || tooLong(email, LIMITS.short))) {
    return { ok: false, error: "E-mail inválido.", field: "email" };
  }

  const websiteRaw = (input.website ?? "").trim();
  const website = normalizeUrl(websiteRaw);
  if (websiteRaw && (!website || tooLong(website, LIMITS.url))) {
    return { ok: false, error: "Site inválido.", field: "website" };
  }

  const portalRaw = (input.portalUrl ?? "").trim();
  const portalUrl = normalizeUrl(portalRaw);
  if (portalRaw && (!portalUrl || tooLong(portalUrl, LIMITS.url))) {
    return { ok: false, error: "URL do portal inválida.", field: "portalUrl" };
  }

  const state = (input.state ?? "").trim().toUpperCase();
  if (state && !isValidState(state)) return { ok: false, error: "Estado inválido.", field: "state" };

  const shortFields = {
    tradeName: cleanLabel(input.tradeName ?? ""),
    contactName: cleanLabel(input.contactName ?? ""),
    city: cleanLabel(input.city ?? ""),
    portalLogin: (input.portalLogin ?? "").trim(),
  };
  for (const [field, value] of Object.entries(shortFields)) {
    if (tooLong(value, LIMITS.short)) {
      return { ok: false, error: "Campo muito longo.", field: field as keyof SupplierFormInput };
    }
  }

  const notes = (input.notes ?? "").trim();
  if (tooLong(notes, LIMITS.notes)) return { ok: false, error: "Observações muito longas.", field: "notes" };

  if (input.passwordAction === "set") {
    if (!input.portalPassword) return { ok: false, error: "Informe a senha do portal.", field: "portalPassword" };
    if (input.portalPassword.length > LIMITS.password) {
      return { ok: false, error: "Senha muito longa.", field: "portalPassword" };
    }
  }

  const products = uniqueLabels(input.products ?? []);
  const brands = uniqueLabels(input.brands ?? []);
  if (products.length > LIMITS.tags || products.some((p) => p.length > LIMITS.tag)) {
    return { ok: false, error: "Produtos: máximo de 100 itens com até 80 caracteres.", field: "products" };
  }
  if (brands.length > LIMITS.tags || brands.some((b) => b.length > LIMITS.tag)) {
    return { ok: false, error: "Marcas: máximo de 100 itens com até 80 caracteres.", field: "brands" };
  }
  const categoryIds = [...new Set(input.categoryIds ?? [])].filter((id) => UUID.test(id));

  return {
    ok: true,
    payload: {
      name,
      trade_name: shortFields.tradeName,
      contact_name: shortFields.contactName,
      whatsapp,
      phone,
      email,
      website,
      instagram: normalizeInstagram(input.instagram ?? ""),
      city: shortFields.city,
      state,
      notes,
      portal_url: portalUrl,
      portal_login: shortFields.portalLogin,
      is_favorite: Boolean(input.isFavorite),
    },
    products,
    brands,
    categoryIds,
  };
}

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

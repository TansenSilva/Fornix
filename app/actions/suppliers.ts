"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";
import { isUuid, validateSupplier } from "@/lib/validation/supplier";
import type { ActionResult, SupplierFormInput } from "@/types/supplier";

/**
 * Server Actions que precisam do servidor: salvar (criptografa a senha) e
 * revelar a senha do portal. As senhas nunca são registradas em logs.
 */

export async function saveSupplierAction(
  supplierId: string | null,
  input: SupplierFormInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  if (supplierId !== null && !isUuid(supplierId)) {
    return { ok: false, error: "Fornecedor inválido." };
  }

  const result = validateSupplier(input);
  if (!result.ok) return { ok: false, error: result.error };

  // Um fornecedor novo não tem senha para "manter".
  const passwordAction = supplierId === null && input.passwordAction === "clear" ? "keep" : input.passwordAction;

  let encrypted: string | null = null;
  if (passwordAction === "set") {
    try {
      encrypted = encryptSecret(input.portalPassword, user.id);
    } catch {
      return { ok: false, error: "Criptografia não configurada no servidor (CREDENTIALS_ENCRYPTION_KEY)." };
    }
  }

  const { data, error } = await supabase.rpc("save_supplier", {
    p_supplier_id: supplierId,
    p_data: result.payload,
    p_products: result.products,
    p_brands: result.brands,
    p_category_ids: result.categoryIds,
    p_password_action: passwordAction,
    p_password_encrypted: encrypted,
  });

  if (error || typeof data !== "string") {
    console.error("save_supplier failed", error?.code);
    return {
      ok: false,
      error: error?.code === "P0002" ? "Fornecedor não encontrado." : "Não foi possível salvar o fornecedor.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { id: data } };
}

export async function revealPortalPasswordAction(
  supplierId: string,
): Promise<ActionResult<{ password: string }>> {
  if (!isUuid(supplierId)) return { ok: false, error: "Fornecedor inválido." };

  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  // RLS garante que só o dono consegue ler o registro.
  const { data, error } = await supabase
    .from("suppliers")
    .select("portal_password_encrypted")
    .eq("id", supplierId)
    .maybeSingle();

  if (error) return { ok: false, error: "Não foi possível carregar a senha." };
  const encrypted = (data as { portal_password_encrypted: string | null } | null)?.portal_password_encrypted;
  if (!encrypted) return { ok: false, error: "Nenhuma senha salva." };

  try {
    return { ok: true, data: { password: decryptSecret(encrypted, user.id) } };
  } catch {
    return { ok: false, error: "Não foi possível descriptografar a senha." };
  }
}

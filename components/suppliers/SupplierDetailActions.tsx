"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { buttonClasses } from "@/components/ui/button";
import { deleteSupplier, setFavorite } from "@/lib/data/suppliers";
import { createClient } from "@/lib/supabase/client";
import { FavoriteButton } from "./FavoriteButton";

interface Props {
  supplierId: string;
  supplierName: string;
  isFavorite: boolean;
}

/** Favoritar, editar e excluir (com confirmação) na tela de detalhes. */
export function SupplierDetailActions({ supplierId, supplierName, isFavorite: initialFavorite }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function toggleFavorite() {
    const next = !isFavorite;
    setIsFavorite(next);
    setBusy(true);
    try {
      await setFavorite(createClient(), supplierId, next);
      toast(next ? "Adicionado aos favoritos" : "Removido dos favoritos");
    } catch {
      setIsFavorite(!next);
      toast("Não foi possível atualizar o favorito.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteSupplier(createClient(), supplierId);
      toast("Fornecedor excluído");
      router.replace("/");
      router.refresh();
    } catch {
      setDeleting(false);
      setConfirming(false);
      toast("Não foi possível excluir o fornecedor.", "error");
    }
  }

  return (
    <div className="flex items-center gap-1">
      <div className="mt-1 mr-1">
        <FavoriteButton isFavorite={isFavorite} onToggle={toggleFavorite} disabled={busy} supplierName={supplierName} />
      </div>
      <Link
        href={`/fornecedores/${supplierId}/editar`}
        aria-label={`Editar ${supplierName}`}
        title="Editar"
        className={buttonClasses("ghost", "icon")}
      >
        <Pencil className="size-5" aria-hidden />
      </Link>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Excluir ${supplierName}`}
        title="Excluir"
        className={buttonClasses("ghost", "icon", "-mr-2 text-red-600 hover:bg-red-50")}
      >
        <Trash2 className="size-5" aria-hidden />
      </button>
      <ConfirmDialog
        open={confirming}
        title={`Excluir fornecedor ${supplierName}?`}
        description="Esta ação não pode ser desfeita. Produtos, marcas e dados de acesso deste fornecedor serão removidos."
        confirmLabel="Excluir"
        destructive
        busy={deleting}
        onCancel={() => setConfirming(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { buttonClasses } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  type CategoryWithUsage,
} from "@/lib/data/taxonomy";
import { createClient } from "@/lib/supabase/client";
import { cleanLabel } from "@/utils/text";

function sortCategories(list: CategoryWithUsage[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** Criar, renomear e excluir categorias do usuário. */
export function CategoryManager({ initialCategories }: { initialCategories: CategoryWithUsage[] }) {
  const { toast } = useToast();
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<CategoryWithUsage | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    const name = cleanLabel(newName);
    if (!name) return;
    setCreating(true);
    try {
      const category = await createCategory(createClient(), name);
      setCategories((list) => sortCategories([...list, { ...category, supplierCount: 0 }]));
      setNewName("");
      toast("Categoria criada");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Erro ao criar categoria.", "error");
    } finally {
      setCreating(false);
    }
  }

  async function onRename(category: CategoryWithUsage) {
    const name = cleanLabel(editName);
    if (!name || name === category.name) {
      setEditingId(null);
      return;
    }
    setSavingId(category.id);
    try {
      await renameCategory(createClient(), category.id, name);
      setCategories((list) => sortCategories(list.map((c) => (c.id === category.id ? { ...c, name } : c))));
      setEditingId(null);
      toast("Categoria renomeada");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Erro ao renomear.", "error");
    } finally {
      setSavingId(null);
    }
  }

  async function onDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCategory(createClient(), toDelete.id);
      setCategories((list) => list.filter((c) => c.id !== toDelete.id));
      toast("Categoria excluída");
      setToDelete(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Erro ao excluir.", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onCreate} className="flex gap-2">
        <label htmlFor="new-category-name" className="sr-only">
          Nova categoria
        </label>
        <input
          id="new-category-name"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Nova categoria"
          maxLength={60}
          className={inputClasses()}
        />
        <button type="submit" disabled={creating || !newName.trim()} className={buttonClasses("primary", "md", "shrink-0")}>
          {creating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          Adicionar
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Nenhuma categoria cadastrada.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {categories.map((category) => (
            <li key={category.id} className="flex min-h-14 items-center gap-2 px-3 py-2">
              {editingId === category.id ? (
                <>
                  <label htmlFor={`edit-${category.id}`} className="sr-only">
                    Nome da categoria
                  </label>
                  <input
                    id={`edit-${category.id}`}
                    autoFocus
                    value={editName}
                    maxLength={60}
                    onChange={(event) => setEditName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void onRename(category);
                      }
                      if (event.key === "Escape") setEditingId(null);
                    }}
                    className={`${inputClasses()} h-10`}
                  />
                  <button
                    type="button"
                    onClick={() => void onRename(category)}
                    aria-label="Salvar nome"
                    disabled={savingId === category.id}
                    className={buttonClasses("ghost", "icon", "text-brand-600")}
                  >
                    {savingId === category.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Check className="size-5" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    aria-label="Cancelar edição"
                    className={buttonClasses("ghost", "icon")}
                  >
                    <X className="size-5" aria-hidden />
                  </button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{category.name}</p>
                    <p className="text-xs text-slate-500">
                      {category.supplierCount === 1 ? "1 fornecedor" : `${category.supplierCount} fornecedores`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(category.id);
                      setEditName(category.name);
                    }}
                    aria-label={`Renomear ${category.name}`}
                    className={buttonClasses("ghost", "icon")}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(category)}
                    aria-label={`Excluir ${category.name}`}
                    className={buttonClasses("ghost", "icon", "text-red-600 hover:bg-red-50")}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Excluir categoria ${toDelete?.name ?? ""}?`}
        description={
          toDelete && toDelete.supplierCount > 0
            ? `Ela será removida de ${toDelete.supplierCount} fornecedor(es). Os fornecedores não serão excluídos.`
            : "Os fornecedores não serão afetados."
        }
        confirmLabel="Excluir"
        destructive
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={onDelete}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { createCategory } from "@/lib/data/taxonomy";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types/supplier";
import { cleanLabel, normalizeText } from "@/utils/text";

interface CategorySelectorProps {
  categories: Category[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCategoryCreated: (category: Category) => void;
}

/** Seleção múltipla de categorias (chips), com criação rápida. */
export function CategorySelector({ categories, selectedIds, onChange, onCategoryCreated }: CategorySelectorProps) {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const selected = new Set(selectedIds);

  function toggle(id: string) {
    onChange(selected.has(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  }

  async function create() {
    const label = cleanLabel(name);
    if (!label) return;
    const existing = categories.find((c) => normalizeText(c.name) === normalizeText(label));
    if (existing) {
      if (!selected.has(existing.id)) onChange([...selectedIds, existing.id]);
      setName("");
      setAdding(false);
      return;
    }
    setSaving(true);
    try {
      const category = await createCategory(createClient(), label.slice(0, 60));
      onCategoryCreated(category);
      onChange([...selectedIds, category.id]);
      setName("");
      setAdding(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Erro ao criar categoria.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-medium text-slate-700">Categorias</legend>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const active = selected.has(category.id);
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(category.id)}
              className={`inline-flex h-9 items-center gap-1 rounded-full border px-3 text-sm transition-colors ${
                active
                  ? "border-brand-600 bg-brand-50 font-medium text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {active && <Check className="size-3.5" aria-hidden />}
              {category.name}
            </button>
          );
        })}
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 text-sm text-slate-500 hover:bg-slate-50"
          >
            <Plus className="size-3.5" aria-hidden />
            Nova
          </button>
        )}
      </div>
      {adding && (
        <div className="mt-2 flex gap-2">
          <label htmlFor="new-category" className="sr-only">
            Nome da nova categoria
          </label>
          <input
            id="new-category"
            autoFocus
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void create();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setAdding(false);
              }
            }}
            placeholder="Nome da categoria"
            className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 focus:border-brand-600 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void create()}
            disabled={saving}
            className="inline-flex h-10 items-center gap-1 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Criar
          </button>
        </div>
      )}
    </fieldset>
  );
}

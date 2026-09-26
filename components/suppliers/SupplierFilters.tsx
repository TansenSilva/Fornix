"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { buttonClasses } from "@/components/ui/button";
import { countActiveFilters } from "@/lib/data/query-params";
import { DEFAULT_QUERY } from "@/lib/data/suppliers";
import type { FilterOptions, SupplierQuery, SupplierSort } from "@/types/supplier";

interface SupplierFiltersProps {
  query: SupplierQuery;
  options: FilterOptions;
  onChange: (patch: Partial<SupplierQuery>) => void;
}

const SORT_LABELS: Record<SupplierSort, string> = {
  default: "Favoritos primeiro",
  name: "Nome A-Z",
  recent: "Mais recentes",
};

const selectClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-700 focus:border-brand-600 lg:text-sm focus:ring-2 focus:ring-brand-100 focus:outline-none";

function FilterFields({ query, options, onChange, idPrefix }: SupplierFiltersProps & { idPrefix: string }) {
  const fields = [
    {
      id: "cat",
      label: "Categoria",
      value: query.categoryId ?? "",
      onChange: (value: string) => onChange({ categoryId: value || null }),
      options: options.categories.map((c) => ({ value: c.id, label: c.name })),
      all: "Todas as categorias",
    },
    {
      id: "brand",
      label: "Marca",
      value: query.brandId ?? "",
      onChange: (value: string) => onChange({ brandId: value || null }),
      options: options.brands.map((b) => ({ value: b.id, label: b.name })),
      all: "Todas as marcas",
    },
    {
      id: "uf",
      label: "Estado",
      value: query.state ?? "",
      onChange: (value: string) => onChange({ state: value || null }),
      options: options.states.map((uf) => ({ value: uf, label: uf })),
      all: "Todos os estados",
    },
  ];

  return (
    <>
      {fields.map((field) => (
        <div key={field.id} className="min-w-0">
          <label htmlFor={`${idPrefix}-${field.id}`} className="mb-1 block text-xs font-medium text-slate-500 lg:sr-only">
            {field.label}
          </label>
          <select
            id={`${idPrefix}-${field.id}`}
            value={field.value}
            onChange={(event) => field.onChange(event.target.value)}
            className={selectClass}
          >
            <option value="">{field.all}</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div className="min-w-0">
        <label htmlFor={`${idPrefix}-sort`} className="mb-1 block text-xs font-medium text-slate-500 lg:sr-only">
          Ordenar por
        </label>
        <select
          id={`${idPrefix}-sort`}
          value={query.sort}
          onChange={(event) => onChange({ sort: event.target.value as SupplierSort })}
          className={selectClass}
        >
          {(Object.keys(SORT_LABELS) as SupplierSort[]).map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export function FavoritesToggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  const base = "h-8 flex-1 rounded-md px-3 text-sm font-medium transition-colors";
  return (
    <div role="group" aria-label="Mostrar" className="flex shrink-0 rounded-lg bg-slate-100 p-1">
      <button
        type="button"
        aria-pressed={!value}
        onClick={() => onChange(false)}
        className={`${base} ${!value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
      >
        Todos
      </button>
      <button
        type="button"
        aria-pressed={value}
        onClick={() => onChange(true)}
        className={`${base} ${value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
      >
        Favoritos
      </button>
    </div>
  );
}

/**
 * Filtros rápidos. No celular ficam atrás do botão "Filtros" (bottom sheet);
 * no desktop aparecem em linha.
 */
export function SupplierFilters({ query, options, onChange }: SupplierFiltersProps) {
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(query);
  const clear = () =>
    onChange({ categoryId: null, brandId: null, state: null, sort: DEFAULT_QUERY.sort });

  return (
    <>
      <div className="flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={buttonClasses("secondary", "sm", "h-10")}
          aria-haspopup="dialog"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filtros
          {active > 0 && (
            <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">
              {active}
            </span>
          )}
        </button>
      </div>

      <div className="hidden min-w-0 flex-1 grid-cols-4 gap-2 lg:grid">
        <FilterFields query={query} options={options} onChange={onChange} idPrefix="inline" />
      </div>
      {active > 0 && (
        <button type="button" onClick={clear} className="hidden shrink-0 text-sm font-medium text-brand-600 hover:underline lg:block">
          Limpar
        </button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Filtros"
        variant="sheet"
        footer={
          <div className="flex gap-2">
            <button type="button" onClick={clear} className={buttonClasses("secondary", "md", "flex-1")}>
              Limpar
            </button>
            <button type="button" onClick={() => setOpen(false)} className={buttonClasses("primary", "md", "flex-1")}>
              Ver resultados
            </button>
          </div>
        }
      >
        <div className="grid gap-3">
          <FilterFields query={query} options={options} onChange={onChange} idPrefix="sheet" />
        </div>
      </Modal>
    </>
  );
}

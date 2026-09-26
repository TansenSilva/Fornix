"use client";

import { Loader2, Search, X } from "lucide-react";
import { useRef } from "react";

interface SupplierSearchProps {
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
}

export function SupplierSearch({ value, onChange, loading = false }: SupplierSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative" role="search">
      <label htmlFor="supplier-search" className="sr-only">
        Buscar fornecedor, vendedor, produto ou marca
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        ref={inputRef}
        id="supplier-search"
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Buscar fornecedor, vendedor, produto ou marca..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            onChange("");
          }
          if (event.key === "Enter") event.currentTarget.blur(); // fecha o teclado no celular
        }}
        className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-12 pl-11 text-base placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-100 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center">
        {loading && !value && <Loader2 className="mr-3 size-4 animate-spin text-slate-400" aria-hidden />}
        {value && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="inline-flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <X className="size-5" aria-hidden />}
          </button>
        )}
      </div>
    </div>
  );
}

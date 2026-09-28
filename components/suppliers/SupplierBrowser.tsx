"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PackageSearch, Plus, SearchX } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Fab } from "@/components/layout/Fab";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SupplierListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { buttonClasses } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { serializeSupplierQuery } from "@/lib/data/query-params";
import {
  DEFAULT_QUERY,
  SEARCH_LIMIT,
  getFilterOptions,
  getSupplierStats,
  searchSuppliers,
  setFavorite,
} from "@/lib/data/suppliers";
import { createClient } from "@/lib/supabase/client";
import type { FilterOptions, Supplier, SupplierQuery, SupplierStats } from "@/types/supplier";
import { normalizeText } from "@/utils/text";
import { StatsBar } from "./StatsBar";
import { SupplierCard } from "./SupplierCard";
import { FavoritesToggle, SupplierFilters } from "./SupplierFilters";
import { SupplierSearch } from "./SupplierSearch";

const SEARCH_DEBOUNCE_MS = 300;

interface SupplierBrowserProps {
  initialQuery: SupplierQuery;
  initialSuppliers: Supplier[];
  initialStats: SupplierStats;
  filterOptions: FilterOptions;
  initialError: string | null;
}

/** Tela principal: busca global, filtros, indicadores e lista de fornecedores. */
export function SupplierBrowser({
  initialQuery,
  initialSuppliers,
  initialStats,
  filterOptions: initialFilterOptions,
  initialError,
}: SupplierBrowserProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState<SupplierQuery>(initialQuery);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [stats, setStats] = useState<SupplierStats>(initialStats);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(initialFilterOptions);

  // O texto é "debounced"; filtros e ordenação aplicam na hora.
  const debouncedSearch = useDebouncedValue(query.search, SEARCH_DEBOUNCE_MS);
  const effectiveQuery = useMemo(() => ({ ...query, search: debouncedSearch }), [query, debouncedSearch]);
  const queryKey = JSON.stringify(effectiveQuery);
  const lastLoadedKey = useRef(JSON.stringify(initialQuery));
  const requestId = useRef(0);

  useEffect(() => {
    // Mantém a URL em sincronia (permite voltar dos detalhes sem perder a busca),
    // sem disparar navegação no Next.
    const url = `${window.location.pathname}${serializeSupplierQuery(effectiveQuery)}`;
    window.history.replaceState(window.history.state, "", url);
  }, [effectiveQuery]);

  useEffect(() => {
    if (queryKey === lastLoadedKey.current && reloadKey === 0) return;
    lastLoadedKey.current = queryKey;
    const current = ++requestId.current;
    setLoading(true);

    searchSuppliers(createClient(), JSON.parse(queryKey) as SupplierQuery)
      .then((result) => {
        if (current !== requestId.current) return; // resposta antiga: ignora
        setSuppliers(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (current !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Erro ao buscar fornecedores.");
      })
      .finally(() => {
        if (current === requestId.current) setLoading(false);
      });
  }, [queryKey, reloadKey]);

  // A página pode vir do cache do navegador (ex.: ao voltar de outra tela) ou o app
  // pode ficar em segundo plano no celular: ao abrir/voltar, atualiza tudo.
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const supabase = createClient();
        const [nextStats, nextOptions] = await Promise.all([getSupplierStats(supabase), getFilterOptions(supabase)]);
        if (cancelled) return;
        setStats(nextStats);
        setFilterOptions(nextOptions);
        setReloadKey((key) => key + 1);
      } catch {
        // Mantém os dados atuais; a busca mostra o erro se houver.
      }
    };
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, []);

  const updateQuery = useCallback((patch: Partial<SupplierQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
  }, []);

  const toggleFavorite = useCallback(
    async (supplier: Supplier) => {
      const next = !supplier.isFavorite;
      setBusyIds((ids) => new Set(ids).add(supplier.id));
      setSuppliers((list) =>
        list
          .map((item) => (item.id === supplier.id ? { ...item, isFavorite: next } : item))
          .filter((item) => !query.favoritesOnly || item.isFavorite),
      );
      setStats((current) => ({ ...current, favorites: current.favorites + (next ? 1 : -1) }));
      try {
        await setFavorite(createClient(), supplier.id, next);
        toast(next ? "Adicionado aos favoritos" : "Removido dos favoritos");
      } catch {
        setSuppliers((list) =>
          list.some((item) => item.id === supplier.id)
            ? list.map((item) => (item.id === supplier.id ? { ...item, isFavorite: !next } : item))
            : list,
        );
        setStats((current) => ({ ...current, favorites: current.favorites + (next ? -1 : 1) }));
        toast("Não foi possível atualizar o favorito.", "error");
      } finally {
        setBusyIds((ids) => {
          const copy = new Set(ids);
          copy.delete(supplier.id);
          return copy;
        });
      }
    },
    [query.favoritesOnly, toast],
  );

  const searchTerms = useMemo(
    () => normalizeText(debouncedSearch).split(" ").filter(Boolean),
    [debouncedSearch],
  );
  const hasFilters =
    effectiveQuery.favoritesOnly ||
    Boolean(effectiveQuery.categoryId || effectiveQuery.brandId || effectiveQuery.state);
  const searchText = debouncedSearch.trim();

  function renderContent() {
    if (error) {
      return <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />;
    }
    if (suppliers.length === 0 && !loading && stats.suppliers === 0 && !searchText && !hasFilters) {
      return (
        <EmptyState
          icon={<PackageSearch className="size-10" />}
          title="Nenhum fornecedor cadastrado ainda"
          description="Cadastre seu primeiro fornecedor para encontrá-lo rapidamente depois."
          action={
            <Link href="/fornecedores/novo" className={buttonClasses("primary")}>
              <Plus className="size-4" aria-hidden />
              Cadastrar fornecedor
            </Link>
          }
        />
      );
    }
    if (loading && suppliers.length === 0) return <SupplierListSkeleton />;
    if (suppliers.length === 0) {
      return (
        <EmptyState
          icon={<SearchX className="size-10" />}
          title={
            searchText
              ? `Nenhum fornecedor encontrado para "${searchText}".`
              : "Nenhum fornecedor encontrado com esses filtros."
          }
          description={hasFilters ? "Tente remover alguns filtros." : "Tente outra palavra, como o nome de um produto ou marca."}
          action={
            hasFilters ? (
              <button
                type="button"
                className={buttonClasses("secondary")}
                onClick={() => setQuery({ ...DEFAULT_QUERY, search: query.search })}
              >
                Limpar filtros
              </button>
            ) : undefined
          }
        />
      );
    }
    return (
      <>
        <p className="sr-only" aria-live="polite">
          {suppliers.length} fornecedor(es) encontrado(s)
        </p>
        <ul
          className={`grid grid-cols-1 gap-3 transition-opacity md:grid-cols-2 xl:grid-cols-3 ${
            loading ? "opacity-60" : ""
          }`}
        >
          {suppliers.map((supplier) => (
            <li key={supplier.id} className="flex min-w-0">
              <div className="w-full min-w-0 [&>article]:h-full">
                <SupplierCard
                  supplier={supplier}
                  searchTerms={searchTerms}
                  favoriteBusy={busyIds.has(supplier.id)}
                  onToggleFavorite={toggleFavorite}
                />
              </div>
            </li>
          ))}
        </ul>
        {suppliers.length >= SEARCH_LIMIT && (
          <p className="mt-4 text-center text-sm text-slate-500">
            Mostrando os primeiros {SEARCH_LIMIT}. Refine a busca para ver outros.
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <AppHeader>
        <div className="space-y-2 md:flex md:items-center md:gap-3 md:space-y-0">
          <div className="md:min-w-0 md:flex-1 lg:w-[20rem] lg:flex-none xl:w-[24rem] 2xl:w-[32rem]">
            <SupplierSearch value={query.search} onChange={(search) => updateQuery({ search })} loading={loading} />
          </div>
          <div className="flex min-w-0 items-center gap-2 lg:flex-1">
            <FavoritesToggle value={query.favoritesOnly} onChange={(favoritesOnly) => updateQuery({ favoritesOnly })} />
            <SupplierFilters query={query} options={filterOptions} onChange={updateQuery} />
          </div>
        </div>
      </AppHeader>
      <PageContainer>
        {!searchText && !hasFilters && stats.suppliers > 0 && (
          <div className="mb-4">
            <StatsBar stats={stats} />
          </div>
        )}
        {renderContent()}
      </PageContainer>
      <Fab />
    </>
  );
}

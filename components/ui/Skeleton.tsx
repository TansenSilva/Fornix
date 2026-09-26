export function SupplierCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-3" aria-hidden>
      <div className="h-4 w-2/3 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
      <div className="mt-3 h-3 w-5/6 rounded bg-slate-100" />
      <div className="mt-4 flex gap-2">
        <div className="h-10 flex-1 rounded-lg bg-slate-100" />
        <div className="h-10 flex-1 rounded-lg bg-slate-100" />
        <div className="size-10 rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

export function SupplierListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Carregando fornecedores">
      {Array.from({ length: count }, (_, index) => (
        <SupplierCardSkeleton key={index} />
      ))}
    </div>
  );
}

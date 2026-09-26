import type { SupplierStats } from "@/types/supplier";

export function StatsBar({ stats }: { stats: SupplierStats }) {
  const items = [
    { label: "Fornecedores", value: stats.suppliers },
    { label: "Favoritos", value: stats.favorites },
    { label: "Categorias", value: stats.categories },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2 md:flex md:gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2 md:min-w-36">
          <dt className="text-xs text-slate-500">{item.label}</dt>
          <dd className="text-lg leading-6 font-semibold tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

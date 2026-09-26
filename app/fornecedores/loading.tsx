export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 px-4 pt-20" role="status" aria-label="Carregando">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
      ))}
    </div>
  );
}

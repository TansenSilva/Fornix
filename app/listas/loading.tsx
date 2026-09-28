export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-3 px-4 pt-20" role="status" aria-label="Carregando">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />
      ))}
    </div>
  );
}

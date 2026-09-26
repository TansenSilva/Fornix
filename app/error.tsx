"use client";

import { ErrorState } from "@/components/ui/ErrorState";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <ErrorState message={error.message || "Erro inesperado."} onRetry={reset} />
    </main>
  );
}

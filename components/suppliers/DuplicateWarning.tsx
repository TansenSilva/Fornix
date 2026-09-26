import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { SimilarSupplier } from "@/types/supplier";

export function DuplicateWarning({ matches }: { matches: SimilarSupplier[] }) {
  if (matches.length === 0) return null;
  return (
    <div role="status" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">Já existe um fornecedor semelhante cadastrado.</p>
        <ul className="mt-1 space-y-0.5">
          {matches.map((match) => (
            <li key={match.id} className="truncate">
              <Link href={`/fornecedores/${match.id}`} target="_blank" className="underline underline-offset-2">
                {match.name}
              </Link>{" "}
              <span className="text-amber-700">(mesmo {match.reasons.join(", ")})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

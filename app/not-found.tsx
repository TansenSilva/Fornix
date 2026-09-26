import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <EmptyState
        icon={<SearchX className="size-10" />}
        title="Página não encontrada"
        description="O fornecedor pode ter sido excluído."
        action={
          <Link href="/" className={buttonClasses("primary")}>
            Voltar para a lista
          </Link>
        }
      />
    </main>
  );
}

import Link from "next/link";
import { Plus } from "lucide-react";

/** Botão flutuante "+ Fornecedor" (somente no celular/tablet). */
export function Fab() {
  return (
    <Link
      href="/fornecedores/novo"
      aria-label="Cadastrar fornecedor"
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 inline-flex h-14 items-center gap-2 rounded-full bg-brand-600 pr-5 pl-4 font-medium text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 md:hidden"
    >
      <Plus className="size-6" aria-hidden />
      Fornecedor
    </Link>
  );
}

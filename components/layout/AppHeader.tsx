import Link from "next/link";
import { ArrowLeft, ClipboardList, LogOut, Plus, Tags } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { appConfig } from "@/lib/app-config";
import { buttonClasses } from "@/components/ui/button";

interface AppHeaderProps {
  /** Título da página. Sem título, mostra o nome do app. */
  title?: string;
  backHref?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

/** Cabeçalho fixo no topo, com navegação e (opcionalmente) a busca. */
export function AppHeader({ title, backHref, children, actions }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto w-full max-w-screen-2xl px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 md:px-6">
        <div className="flex h-11 items-center gap-2">
          {backHref && (
            <Link href={backHref} aria-label="Voltar" className={buttonClasses("ghost", "icon", "-ml-2")}>
              <ArrowLeft className="size-5" aria-hidden />
            </Link>
          )}
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
            {title ?? appConfig.name}
          </h1>
          {actions}
          {!backHref && (
            <>
              <span className="hidden md:inline-flex">
                <Link href="/fornecedores/novo" className={buttonClasses("primary", "sm")}>
                  <Plus className="size-4" aria-hidden />
                  Fornecedor
                </Link>
              </span>
              <Link href="/listas" aria-label="Listas de compras" title="Listas de compras" className={buttonClasses("ghost", "sm", "px-2.5")}>
                <ClipboardList className="size-5" aria-hidden />
                <span className="hidden sm:inline">Listas</span>
              </Link>
              <Link href="/categorias" aria-label="Gerenciar categorias" title="Categorias" className={buttonClasses("ghost", "icon")}>
                <Tags className="size-5" aria-hidden />
              </Link>
              <form action={signOutAction}>
                <button type="submit" aria-label="Sair" title="Sair" className={buttonClasses("ghost", "icon", "-mr-2")}>
                  <LogOut className="size-5" aria-hidden />
                </button>
              </form>
            </>
          )}
        </div>
        {children}
      </div>
    </header>
  );
}

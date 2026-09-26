"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { revealPortalPasswordAction } from "@/app/actions/suppliers";
import { useToast } from "@/components/ui/Toast";
import { useCopy } from "@/hooks/useCopy";

const AUTO_HIDE_MS = 30_000;

/**
 * Senha protegida: nunca vem no HTML. Só é buscada no servidor (e
 * descriptografada) quando o usuário toca em "mostrar" ou "copiar".
 * Depois de 30 s ela é ocultada e descartada da memória do componente.
 */
export function CredentialField({ supplierId }: { supplierId: string }) {
  const { toast } = useToast();
  const copy = useCopy();
  const [password, setPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function fetchPassword(): Promise<string> {
    const result = await revealPortalPasswordAction(supplierId);
    if (!result.ok) throw new Error(result.error);
    return result.data.password;
  }

  async function toggle() {
    if (password !== null) {
      setPassword(null);
      return;
    }
    setLoading(true);
    try {
      const value = await fetchPassword();
      setPassword(value);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setPassword(null), AUTO_HIDE_MS);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Erro ao carregar a senha.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 flex-1 truncate font-mono text-sm" aria-live="polite">
        {password ?? "••••••••••"}
        {password === null && <span className="sr-only">Senha oculta</span>}
      </span>
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        aria-label={password !== null ? "Ocultar senha" : "Mostrar senha"}
        title={password !== null ? "Ocultar senha" : "Mostrar senha"}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : password !== null ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
      <button
        type="button"
        onClick={() => copy(password ?? fetchPassword(), "Senha copiada!")}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <Copy className="size-4" aria-hidden />
        Copiar senha
      </button>
    </div>
  );
}

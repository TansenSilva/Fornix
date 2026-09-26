"use client";

import { useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

async function writeClipboard(value: string | Promise<string>): Promise<void> {
  // Safari exige que a escrita comece no mesmo "gesto" do usuário; com
  // ClipboardItem + Promise isso funciona mesmo quando o valor vem do servidor.
  if (typeof value !== "string" && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      const blob = value.then((text) => new Blob([text], { type: "text/plain" }));
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
      return;
    } catch {
      // cai para writeText abaixo
    }
  }
  const text = await value;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback para navegadores sem Clipboard API (ex.: HTTP local)
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

/** Copia um texto (ou o resultado de uma Promise) e mostra o toast "Copiado!". */
export function useCopy() {
  const { toast } = useToast();
  return useCallback(
    async (value: string | Promise<string>, label = "Copiado!") => {
      try {
        await writeClipboard(value);
        toast(label);
      } catch (error) {
        toast(error instanceof Error && error.message ? error.message : "Não foi possível copiar.", "error");
      }
    },
    [toast],
  );
}

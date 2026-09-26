"use client";

import { Copy } from "lucide-react";
import { useCopy } from "@/hooks/useCopy";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const copy = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(value)}
      aria-label={label}
      title={label}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
    >
      <Copy className="size-4" aria-hidden />
    </button>
  );
}

"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface FormSectionProps {
  step: number;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Seção recolhível do formulário — mantém a tela curta no celular. */
export function FormSection({ step, title, description, defaultOpen = true, children }: FormSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {step}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-slate-900">{title}</span>
            {description && !open && <span className="block truncate text-xs text-slate-500">{description}</span>}
          </span>
          <ChevronDown
            className={`size-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </h2>
      <div id={contentId} hidden={!open} className="border-t border-slate-100 px-4 pt-3 pb-4">
        {children}
      </div>
    </section>
  );
}

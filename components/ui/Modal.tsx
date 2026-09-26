"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** "sheet" abre por baixo no celular (e centralizado no desktop). */
  variant?: "center" | "sheet";
  onKeyDown?: (event: React.KeyboardEvent<HTMLDialogElement>) => void;
}

/**
 * Modal acessível baseado no <dialog> nativo: foco preso no modal, Escape
 * fecha, clique fora fecha e o foco volta ao elemento que o abriu.
 */
export function Modal({ open, onClose, title, children, footer, variant = "center", onKeyDown }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const position =
    variant === "sheet"
      ? "mt-auto mb-0 w-full max-w-full rounded-t-2xl md:m-auto md:max-w-lg md:rounded-2xl"
      : "m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl";

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
      className={`${position} max-h-[88dvh] overflow-hidden bg-white p-0 text-slate-900 shadow-xl`}
    >
      {open && (
        <div className="flex max-h-[88dvh] flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="-mr-2 inline-flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-4">{children}</div>
          {footer && <div className="safe-bottom border-t border-slate-100 px-4 pt-3 md:pb-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

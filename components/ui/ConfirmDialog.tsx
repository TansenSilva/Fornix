"use client";

import { Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import { buttonClasses } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmação explícita (Enter confirma, Escape cancela). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onCancel}
      title={title}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (event.key === "Enter" && !busy && target.dataset.role !== "cancel") {
          event.preventDefault();
          onConfirm();
        }
      }}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            data-role="cancel"
            onClick={onCancel}
            disabled={busy}
            className={buttonClasses("secondary", "md", "flex-1 sm:flex-none")}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={buttonClasses(destructive ? "danger" : "primary", "md", "flex-1 sm:flex-none")}
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {confirmLabel}
          </button>
        </div>
      }
    >
      {description && <p className="text-sm text-slate-600">{description}</p>}
    </Modal>
  );
}

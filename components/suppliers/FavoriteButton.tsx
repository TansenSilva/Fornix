"use client";

import { Star } from "lucide-react";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  disabled?: boolean;
  supplierName: string;
}

export function FavoriteButton({ isFavorite, onToggle, disabled, supplierName }: FavoriteButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `Remover ${supplierName} dos favoritos` : `Marcar ${supplierName} como favorito`}
      title={isFavorite ? "Remover dos favoritos" : "Marcar como favorito"}
      className="-mt-1 -mr-1 inline-flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-60"
    >
      <Star
        className={`size-5 ${isFavorite ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
        aria-hidden
      />
    </button>
  );
}

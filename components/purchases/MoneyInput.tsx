"use client";

import { forwardRef } from "react";
import { maskMoney } from "@/utils/money";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onValueChange: (value: string) => void;
  /** "R$" (padrão) ou "US$". */
  prefix?: string;
};

/** Campo de valor (R$ ou US$) com máscara (dígitos entram pela direita). */
export const MoneyInput = forwardRef<HTMLInputElement, Props>(function MoneyInput(
  { value, onValueChange, prefix = "R$", className = "", ...props },
  ref,
) {
  return (
    <div className="relative min-w-0">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-slate-400">{prefix}</span>
      <input
        ref={ref}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(event) => onValueChange(maskMoney(event.target.value))}
        placeholder="0,00"
        className={`h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white pr-2 ${prefix.length > 2 ? "pl-10" : "pl-8"} text-right tabular-nums focus:border-brand-600 focus:ring-2 focus:ring-brand-100 focus:outline-none ${className}`}
        {...props}
      />
    </div>
  );
});

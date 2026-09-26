import type { ReactNode } from "react";

export function inputClasses(invalid = false): string {
  return `h-11 w-full min-w-0 rounded-lg border bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:outline-none ${
    invalid
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-brand-600 focus:ring-brand-100"
  }`;
}

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}

/** Label + campo + dica/erro, com ids ligados por aria-describedby. */
export function Field({ id, label, hint, error, children, className = "" }: FieldProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

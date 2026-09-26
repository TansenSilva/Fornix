export type ButtonVariant = "primary" | "secondary" | "ghost" | "whatsapp" | "danger";
export type ButtonSize = "sm" | "md" | "icon";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-700",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100",
  ghost: "text-slate-600 hover:bg-slate-100 active:bg-slate-200",
  whatsapp: "bg-whatsapp text-white hover:bg-whatsapp-dark active:bg-whatsapp-dark",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-700",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  icon: "size-10",
};

/** Classes padronizadas para <button> e <a>. */
export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", extra = ""): string {
  return [base, variants[variant], sizes[size], extra].filter(Boolean).join(" ");
}

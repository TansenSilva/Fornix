import type { ReactNode } from "react";

export function Tag({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "brand" }) {
  const colors = tone === "brand" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex max-w-full items-center truncate rounded-md px-2 py-1 text-sm ${colors}`}>
      {children}
    </span>
  );
}

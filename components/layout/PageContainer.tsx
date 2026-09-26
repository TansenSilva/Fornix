import type { ReactNode } from "react";

export function PageContainer({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <main className={`mx-auto w-full px-4 pt-4 pb-28 md:px-6 md:pb-10 ${narrow ? "max-w-3xl" : "max-w-screen-2xl"}`}>
      {children}
    </main>
  );
}

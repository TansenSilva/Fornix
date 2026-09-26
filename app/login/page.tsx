import type { Metadata } from "next";
import { Store } from "lucide-react";
import { appConfig } from "@/lib/app-config";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 inline-flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
            <Store className="size-7" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold">{appConfig.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Entre para acessar seus fornecedores.</p>
        </div>
        <LoginForm next={typeof next === "string" ? next : "/"} />
      </div>
    </main>
  );
}

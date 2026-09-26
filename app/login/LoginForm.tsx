"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { signInAction, type LoginState } from "@/app/actions/auth";
import { buttonClasses } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";

const initialState: LoginState = { error: null, email: "" };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          key={state.email}
          className={inputClasses()}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus={Boolean(state.error)}
          className={inputClasses()}
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClasses("primary", "md", "w-full")}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Entrar
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { login, requestPasswordReset, type LoginState, type RecoveryState } from "./actions";

const field =
  "mt-1 h-12 w-full rounded-xl border border-graphite bg-background px-4 text-base text-foreground " +
  "outline-none transition focus:border-foreground";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <div className="mt-6 space-y-4">
      <form action={action} className="space-y-4">
        <label className="block text-sm text-muted">
          Correo
          <input name="email" type="email" autoComplete="username" required className={field} />
        </label>
        <label className="block text-sm text-muted">
          Contraseña
          <input name="password" type="password" autoComplete="current-password" required className={field} />
        </label>
        {state.error && (
          <p role="alert" className="text-sm text-foreground">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-xl bg-foreground font-semibold text-black transition active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Entrando…" : "ENTRAR"}
        </button>
      </form>
      <RecoveryForm />
    </div>
  );
}

function RecoveryForm() {
  const [state, action, pending] = useActionState<RecoveryState, FormData>(requestPasswordReset, {});

  return (
    <details className="border-t border-graphite pt-4">
      <summary className="cursor-pointer list-none text-center text-sm text-muted underline underline-offset-4">
        He olvidado mi contraseña
      </summary>
      <form action={action} className="mt-4 space-y-3">
        <p className="text-sm text-muted">Te enviaremos un enlace para establecer una contraseña nueva.</p>
        <label className="block text-sm text-muted">
          Correo de administrador
          <input name="email" type="email" autoComplete="email" required className={field} />
        </label>
        {state.error && <p role="alert" className="text-sm text-foreground">{state.error}</p>}
        {state.ok && <p role="status" className="text-sm text-muted">{state.ok}</p>}
        <button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-xl border border-foreground text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Enviando…" : "ENVIAR ENLACE"}
        </button>
      </form>
    </details>
  );
}

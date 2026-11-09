"use client";

import { useActionState } from "react";
import { updatePassword, type PasswordState } from "./actions";
import { field } from "@/lib/ui";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(updatePassword, {});

  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block text-sm text-muted">
        Contraseña nueva
        <input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={200} required className={`${field} mt-1`} />
      </label>
      <label className="block text-sm text-muted">
        Repite la contraseña
        <input name="confirmation" type="password" autoComplete="new-password" minLength={10} maxLength={200} required className={`${field} mt-1`} />
      </label>
      <p className="text-xs text-muted">Mínimo 10 caracteres, con mayúscula, minúscula y número.</p>
      {state.error && <p role="alert" className="text-sm text-foreground">{state.error}</p>}
      <button type="submit" disabled={pending} className="h-12 w-full rounded-xl bg-foreground font-semibold text-black transition active:scale-[0.98] disabled:opacity-60">
        {pending ? "Guardando…" : "GUARDAR CONTRASEÑA"}
      </button>
    </form>
  );
}

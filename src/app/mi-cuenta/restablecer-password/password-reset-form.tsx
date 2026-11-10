"use client";

import { useActionState } from "react";
import { resetCustomerPassword, type CustomerActionState } from "../actions";
import { field } from "@/lib/ui";

export function PasswordResetForm() {
  const [state, action, pending] = useActionState<CustomerActionState, FormData>(resetCustomerPassword, {});
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-graphite bg-surface p-5 sm:p-6">
      <label className="block text-sm text-muted">Contraseña nueva
        <input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={200} required className={`${field} mt-1`} />
      </label>
      <label className="block text-sm text-muted">Repite la contraseña
        <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={200} required className={`${field} mt-1`} />
      </label>
      {state.error && <p role="alert" className="text-sm font-semibold">{state.error}</p>}
      <button disabled={pending} className="h-12 w-full rounded-xl bg-foreground font-bold text-black disabled:opacity-60">
        {pending ? "GUARDANDO…" : "GUARDAR CONTRASEÑA"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { updateCustomerProfile, type CustomerActionState } from "../actions";
import { field } from "@/lib/ui";

export function ProfileForm({ customer }: { customer: { fullName: string; email: string; phone: string } }) {
  const [state, action, pending] = useActionState<CustomerActionState, FormData>(updateCustomerProfile, {});
  return (
    <form action={action} className="mt-7 space-y-4 rounded-2xl border border-graphite bg-surface p-5 sm:p-6">
      <label className="block text-sm text-muted">Nombre y apellidos
        <input name="fullName" defaultValue={customer.fullName} autoComplete="name" required minLength={2} maxLength={120} className={`${field} mt-1`} />
      </label>
      <label className="block text-sm text-muted">Teléfono
        <input name="phone" defaultValue={customer.phone} inputMode="tel" autoComplete="tel" required maxLength={24} className={`${field} mt-1`} />
      </label>
      <label className="block text-sm text-muted">Correo de acceso
        <input type="email" value={customer.email} readOnly className={`${field} mt-1 opacity-70`} />
        <span className="mt-1 block text-xs">Para cambiar el correo de acceso, contacta con la barbería.</span>
      </label>
      {state.error && <p role="alert" className="text-sm font-semibold">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-xl bg-foreground p-3 text-sm font-semibold text-black">{state.ok}</p>}
      <button disabled={pending} className="h-12 w-full rounded-xl bg-foreground font-bold text-black disabled:opacity-60">
        {pending ? "GUARDANDO…" : "GUARDAR CAMBIOS"}
      </button>
    </form>
  );
}

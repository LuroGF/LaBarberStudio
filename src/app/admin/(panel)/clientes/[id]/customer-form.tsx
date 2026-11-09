"use client";

import { useActionState } from "react";
import { saveCustomer } from "./actions";
import { btnPrimary, field, label } from "@/lib/ui";
import type { ActionState } from "@/lib/types";

export function CustomerForm({ customer }: { customer: { id: string; full_name: string; email: string | null; internal_notes: string | null } }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveCustomer, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={customer.id} />
      <label className={label}>Nombre<input className={`${field} mt-1`} name="fullName" required maxLength={120} defaultValue={customer.full_name} /></label>
      <label className={label}>Correo (opcional)<input className={`${field} mt-1`} name="email" type="email" maxLength={254} defaultValue={customer.email ?? ""} /></label>
      <label className={label}>Notas internas<textarea className={`${field} mt-1 h-28 py-3`} name="notes" maxLength={2000} defaultValue={customer.internal_notes ?? ""} placeholder="Preferencias, observaciones…" /></label>
      {state.error && <p role="alert" className="text-sm font-semibold">✕ {state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-muted">✓ {state.ok}</p>}
      <button disabled={pending} className={`${btnPrimary} w-full`}>{pending ? "Guardando…" : "GUARDAR CLIENTE"}</button>
    </form>
  );
}

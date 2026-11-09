"use client";

import { useActionState } from "react";
import { updateAppointment } from "./actions";
import { AvailabilityFields } from "../availability-fields";
import { btnPrimary, field, label } from "@/lib/ui";
import type { ActionState, Service } from "@/lib/types";

export function EditAppointmentForm({ appointment, services, minDate, maxDate }: { appointment: { id: string; service_id: string | null; customer_notes: string | null; private_notes: string | null }; services: Service[]; minDate: string; maxDate: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateAppointment, {});
  return <form action={action} className="space-y-6">
    <input type="hidden" name="id" value={appointment.id} />
    <AvailabilityFields services={services} minDate={minDate} maxDate={maxDate} defaultServiceId={appointment.service_id} optional />
    <fieldset className="space-y-3"><legend className="mb-3 font-semibold">Notas</legend>
      <label className={label}>Observaciones del cliente<textarea className={`${field} mt-1 h-24 py-3`} name="notes" maxLength={500} defaultValue={appointment.customer_notes ?? ""} /></label>
      <label className={label}>Notas internas<textarea className={`${field} mt-1 h-28 py-3`} name="privateNotes" maxLength={2000} defaultValue={appointment.private_notes ?? ""} placeholder="Solo visibles desde administración" /></label>
    </fieldset>
    {state.error && <p role="alert" className="rounded-xl border border-foreground p-3 text-sm font-semibold">{state.error}</p>}
    {state.ok && <p role="status" className="text-sm text-muted">✓ {state.ok}</p>}
    <button disabled={pending} className={`${btnPrimary} w-full`}>{pending ? "Guardando…" : "GUARDAR CAMBIOS"}</button>
  </form>;
}

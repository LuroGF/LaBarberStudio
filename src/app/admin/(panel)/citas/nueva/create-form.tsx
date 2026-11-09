"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createAdminBooking, type AdminBookingState } from "./actions";
import { AvailabilityFields } from "../availability-fields";
import { btnGhost, btnPrimary, field, label } from "@/lib/ui";
import type { Service } from "@/lib/types";

export function CreateAppointmentForm({ services, minDate, maxDate }: { services: Service[]; minDate: string; maxDate: string }) {
  const [state, action, pending] = useActionState<AdminBookingState, FormData>(createAdminBooking, {});
  const [copied, setCopied] = useState(false);
  if (state.ok && state.token) {
    const managePath = `/cita/${state.token}`;
    return <div className="space-y-4 text-center">
      <div className="rounded-2xl bg-foreground p-5 text-black"><p className="font-bold">✓ {state.ok}</p><p className="mt-1 text-sm">El aviso de WhatsApp está preparado en la bandeja.</p></div>
      <div className="rounded-2xl border border-graphite p-4 text-left"><p className="text-sm font-semibold">Enlace privado del cliente</p><Link href={managePath} target="_blank" className="mt-2 block break-all text-sm text-muted underline">{managePath}</Link><button type="button" className={`${btnGhost} mt-3 w-full`} onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}${managePath}`); setCopied(true); }}>{copied ? "Copiado" : "Copiar enlace"}</button></div>
      <Link href={`/admin/citas/${state.appointmentId}`} className={`${btnPrimary} w-full`}>VER CITA</Link>
      <Link href="/admin/citas/nueva" className="inline-block text-sm text-muted underline">Crear otra cita</Link>
    </div>;
  }
  return <form action={action} className="space-y-6">
    <AvailabilityFields services={services} minDate={minDate} maxDate={maxDate} />
    <fieldset className="space-y-3"><legend className="mb-3 font-semibold">Cliente</legend>
      <label className={label}>Nombre y apellidos<input className={`${field} mt-1`} name="fullName" required minLength={2} maxLength={120} autoComplete="name" /></label>
      <label className={label}>Teléfono<input className={`${field} mt-1`} name="phone" required minLength={9} maxLength={24} inputMode="tel" autoComplete="tel" placeholder="600 000 000" /></label>
      <label className={label}>Correo (opcional)<input className={`${field} mt-1`} name="email" type="email" maxLength={254} autoComplete="email" /></label>
      <label className={label}>Observaciones (opcional)<textarea className={`${field} mt-1 h-24 py-3`} name="notes" maxLength={500} /></label>
    </fieldset>
    {state.error && <p role="alert" className="rounded-xl border border-foreground p-3 text-sm font-semibold">{state.error}</p>}
    <button disabled={pending} className={`${btnPrimary} w-full`}>{pending ? "Creando…" : "CREAR Y CONFIRMAR CITA"}</button>
  </form>;
}

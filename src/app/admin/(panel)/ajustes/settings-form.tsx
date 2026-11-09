"use client";

import { useActionState } from "react";
import { saveSettings } from "./actions";
import { btnPrimary, field, label } from "@/lib/ui";
import type { ActionState } from "@/lib/types";

type Settings = {
  business_name: string; barber_display_name: string; address: string; phone_whatsapp: string; instagram_handle: string; email: string | null;
  approval_mode: "auto" | "manual"; pending_hold_minutes: number; min_notice_minutes: number; max_advance_days: number;
  cancellation_notice_hours: number; buffer_minutes: number; slot_step_minutes: number; max_active_per_phone: number;
};

const NumberField = ({ name, title, value, min = 0, max = 10080, step = 1 }: { name: string; title: string; value: number; min?: number; max?: number; step?: number }) => (
  <label className={label}>{title}<input className={`${field} mt-1`} name={name} type="number" inputMode="numeric" min={min} max={max} step={step} required defaultValue={value} /></label>
);

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSettings, {});
  return (
    <form action={action} className="space-y-6">
      <fieldset className="space-y-3"><legend className="mb-3 font-semibold">Datos públicos</legend>
        <label className={label}>Nombre del negocio<input className={`${field} mt-1`} name="businessName" required defaultValue={settings.business_name} /></label>
        <label className={label}>Nombre del profesional<input className={`${field} mt-1`} name="barberName" required defaultValue={settings.barber_display_name} /></label>
        <label className={label}>Dirección<input className={`${field} mt-1`} name="address" defaultValue={settings.address} /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className={label}>WhatsApp<input className={`${field} mt-1`} name="phone" required defaultValue={settings.phone_whatsapp} /></label><label className={label}>Instagram<input className={`${field} mt-1`} name="instagram" defaultValue={settings.instagram_handle} /></label></div>
        <label className={label}>Correo público (opcional)<input className={`${field} mt-1`} name="email" type="email" defaultValue={settings.email ?? ""} /></label>
      </fieldset>
      <fieldset className="space-y-3"><legend className="mb-3 font-semibold">Reservas</legend>
        <label className={label}>Confirmación<select className={`${field} mt-1`} name="approvalMode" defaultValue={settings.approval_mode}><option value="auto">Automática</option><option value="manual">Revisión manual</option></select></label>
        <div className="grid grid-cols-2 gap-3"><NumberField name="minNotice" title="Antelación mínima (min)" value={settings.min_notice_minutes} /><NumberField name="maxAdvance" title="Máximo de días" value={settings.max_advance_days} min={1} max={730} /></div>
        <div className="grid grid-cols-2 gap-3"><NumberField name="cancellationNotice" title="Cancelación mínima (h)" value={settings.cancellation_notice_hours} max={8760} /><NumberField name="buffer" title="Margen entre citas (min)" value={settings.buffer_minutes} max={120} /></div>
        <div className="grid grid-cols-2 gap-3"><label className={label}>Intervalo de horas<select className={`${field} mt-1`} name="slotStep" defaultValue={settings.slot_step_minutes}>{[5,10,15,20,30,60].map((v) => <option key={v} value={v}>{v} min</option>)}</select></label><NumberField name="maxActive" title="Máx. citas por cliente" value={settings.max_active_per_phone} min={1} max={20} /></div>
        <NumberField name="pendingHold" title="Caducidad de pendientes (min)" value={settings.pending_hold_minutes} min={5} max={10080} />
      </fieldset>
      {state.error && <p role="alert" className="text-sm font-semibold">✕ {state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-muted">✓ {state.ok}</p>}
      <button disabled={pending} className={`${btnPrimary} w-full`}>{pending ? "Guardando…" : "GUARDAR AJUSTES"}</button>
    </form>
  );
}

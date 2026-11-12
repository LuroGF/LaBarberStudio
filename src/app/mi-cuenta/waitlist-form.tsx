"use client";

import { useActionState } from "react";
import { BellRing } from "lucide-react";
import { updateWaitlistPreference, type CustomerActionState } from "./actions";

const days = [
  [1, "L"], [2, "M"], [3, "X"], [4, "J"], [5, "V"], [6, "S"], [7, "D"],
] as const;

type Preference = { is_active: boolean; weekdays: number[]; start_time: string; end_time: string } | null;

export function WaitlistForm({ appointmentId, preference }: { appointmentId: string; preference: Preference }) {
  const [state, action, pending] = useActionState<CustomerActionState, FormData>(updateWaitlistPreference, {});
  const active = preference?.is_active ?? false;
  const selectedDays = preference?.weekdays ?? [1, 2, 3, 4, 5, 6, 7];
  return (
    <details className="mt-4 border-t border-graphite pt-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
        <span className="flex items-center gap-2"><BellRing className="size-4 text-gold" />{active ? "Avisos de huecos activados" : "Avisarme si queda un hueco antes"}</span>
        <span className="text-xs text-muted">Configurar</span>
      </summary>
      <form action={action} className="mt-4 space-y-4 rounded-xl bg-background p-4">
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={active} className="mt-1 size-4 accent-[var(--gold)]" />
          <span><strong className="block">Quiero recibir avisos</strong><span className="mt-1 block text-xs leading-5 text-muted">Solo si se cancela una cita anterior, del mismo servicio y dentro de estas preferencias.</span></span>
        </label>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-muted">Días que me vienen bien</legend>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map(([value, label]) => <label key={value} className="relative grid h-10 place-items-center rounded-lg border border-graphite text-xs font-bold has-[:checked]:border-gold has-[:checked]:bg-gold has-[:checked]:text-black"><input className="sr-only" type="checkbox" name="weekdays" value={value} defaultChecked={selectedDays.includes(value)} />{label}</label>)}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-muted">Desde<input required type="time" name="startTime" defaultValue={(preference?.start_time ?? "09:00").slice(0, 5)} className="mt-1 h-11 w-full rounded-lg border border-graphite bg-surface px-3 text-foreground" /></label>
          <label className="text-xs text-muted">Hasta<input required type="time" name="endTime" defaultValue={(preference?.end_time ?? "21:00").slice(0, 5)} className="mt-1 h-11 w-full rounded-lg border border-graphite bg-surface px-3 text-foreground" /></label>
        </div>
        {state.error && <p role="alert" className="text-xs font-semibold">{state.error}</p>}
        {state.ok && <p role="status" className="text-xs font-semibold text-gold-light">{state.ok}</p>}
        <button disabled={pending} className="h-11 w-full rounded-lg bg-gold text-xs font-extrabold text-black disabled:opacity-60">{pending ? "GUARDANDO…" : "GUARDAR AVISOS"}</button>
      </form>
    </details>
  );
}

"use client";

import { useActionState, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { rescheduleCustomerAppointment, type CustomerActionState } from "../../../actions";
import { field } from "@/lib/ui";
import type { Service } from "@/lib/types";

const formatPrice = (cents: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
const formatSlot = (slot: string) => new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(new Date(slot));

export function RescheduleForm({ appointmentId, currentServiceId, services, minDate, maxDate }: {
  appointmentId: string;
  currentServiceId: string;
  services: Service[];
  minDate: string;
  maxDate: string;
}) {
  const [state, action, pending] = useActionState<CustomerActionState, FormData>(rescheduleCustomerAppointment, {});
  const [serviceId, setServiceId] = useState(currentServiceId || services[0]?.id || "");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [slotError, setSlotError] = useState("");

  async function loadSlots(nextService: string, nextDate: string) {
    setSlot(""); setSlots([]); setSlotError("");
    if (!nextService || !nextDate) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/disponibilidad?service=${encodeURIComponent(nextService)}&date=${encodeURIComponent(nextDate)}`, { cache: "no-store" });
      const body = await response.json() as { slots?: string[]; error?: string };
      if (!response.ok) throw new Error(body.error);
      setSlots(body.slots ?? []);
    } catch {
      setSlotError("No se han podido consultar las horas.");
    } finally { setLoading(false); }
  }

  return (
    <form action={action} className="mt-7 space-y-6">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="slot" value={slot} />

      <fieldset className="rounded-2xl border border-graphite bg-surface p-5">
        <legend className="px-2 font-bold">Servicio</legend>
        <div className="space-y-2">
          {services.map((service) => (
            <label key={service.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 ${serviceId === service.id ? "border-foreground" : "border-graphite"}`}>
              <input type="radio" className="sr-only" checked={serviceId === service.id} onChange={() => { setServiceId(service.id); void loadSlots(service.id, date); }} />
              <span><span className="block font-semibold">{service.name}</span><span className="mt-1 flex items-center gap-1 text-xs text-muted"><Clock className="size-3" />{service.duration_minutes} min</span></span>
              <span className="font-semibold">{formatPrice(service.price_cents)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-graphite bg-surface p-5">
        <legend className="px-2 font-bold">Nuevo día y hora</legend>
        <label className="block text-sm text-muted">Fecha
          <span className="relative mt-1 block"><CalendarDays className="pointer-events-none absolute left-4 top-3.5 size-5" />
            <input type="date" min={minDate} max={maxDate} value={date} onChange={(event) => { setDate(event.target.value); void loadSlots(serviceId, event.target.value); }} className={`${field} pl-12`} />
          </span>
        </label>
        <div className="mt-4" aria-live="polite">
          {loading && <p className="text-sm text-muted">Consultando horas…</p>}
          {slotError && <p className="text-sm font-semibold">{slotError}</p>}
          {!loading && date && !slotError && slots.length === 0 && <p className="text-sm text-muted">No quedan horas disponibles ese día.</p>}
          {slots.length > 0 && <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.map((item) => (
            <button type="button" key={item} onClick={() => setSlot(item)} className={`h-11 rounded-xl border text-sm font-semibold ${slot === item ? "border-foreground bg-foreground text-black" : "border-graphite"}`}>{formatSlot(item)}</button>
          ))}</div>}
        </div>
      </fieldset>

      {state.error && <p role="alert" className="rounded-xl border border-foreground p-3 text-sm font-semibold">{state.error}</p>}
      <button disabled={!slot || pending} className="h-14 w-full rounded-xl bg-foreground font-bold text-black disabled:opacity-50">
        {pending ? "GUARDANDO…" : "CONFIRMAR CAMBIO"}
      </button>
    </form>
  );
}

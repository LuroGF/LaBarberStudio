"use client";

import { useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { field, label } from "@/lib/ui";
import type { Service } from "@/lib/types";

const formatSlot = (slot: string) => new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(new Date(slot));

export function AvailabilityFields({ services, minDate, maxDate, defaultServiceId, optional = false }: { services: Service[]; minDate: string; maxDate: string; defaultServiceId?: string | null; optional?: boolean }) {
  const [serviceId, setServiceId] = useState(defaultServiceId && services.some((service) => service.id === defaultServiceId) ? defaultServiceId : services[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);

  const load = async (nextService: string, nextDate: string) => {
    request.current?.abort(); setSlot(""); setSlots([]); setError("");
    if (!nextService || !nextDate) return;
    const controller = new AbortController(); request.current = controller; setLoading(true);
    try {
      const response = await fetch(`/api/disponibilidad?service=${encodeURIComponent(nextService)}&date=${encodeURIComponent(nextDate)}`, { cache: "no-store", signal: controller.signal });
      const body = await response.json() as { slots?: string[]; error?: string };
      if (!response.ok) throw new Error(body.error || "No se han podido consultar las horas.");
      setSlots(body.slots ?? []);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "No se han podido consultar las horas.");
    } finally { if (request.current === controller) setLoading(false); }
  };

  return <fieldset className="space-y-3">
    <input type="hidden" name="serviceId" value={serviceId} />
    <input type="hidden" name="slot" value={slot} />
    <legend className="mb-3 font-semibold">{optional ? "Servicio y nueva hora" : "Servicio, día y hora"}</legend>
    {optional && <p className="text-sm text-muted">Déjalo sin hora para guardar solo las notas. Si eliges una hora, la cita se reprogramará y se preparará un aviso.</p>}
    <label className={label}>Servicio
      <select className={`${field} mt-1`} value={serviceId} onChange={(event) => { setServiceId(event.target.value); void load(event.target.value, date); }}>
        {services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.duration_minutes} min</option>)}
      </select>
    </label>
    <label className={label}>Fecha
      <span className="relative mt-1 block"><CalendarDays aria-hidden="true" className="pointer-events-none absolute left-4 top-3.5 size-5 text-muted" /><input className={`${field} pl-12`} type="date" min={minDate} max={maxDate} value={date} onChange={(event) => { setDate(event.target.value); void load(serviceId, event.target.value); }} /></span>
    </label>
    <div aria-live="polite">
      {loading && <p className="text-sm text-muted">Consultando horas…</p>}
      {error && <p className="text-sm font-semibold">{error}</p>}
      {!loading && date && !error && slots.length === 0 && <p className="rounded-xl border border-graphite p-3 text-sm text-muted">No hay horas disponibles ese día.</p>}
      {slots.length > 0 && <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.map((item) => <button key={item} type="button" onClick={() => setSlot(item)} aria-pressed={slot === item} className={`h-11 rounded-xl border text-sm font-semibold ${slot === item ? "border-foreground bg-foreground text-black" : "border-graphite"}`}>{formatSlot(item)}</button>)}</div>}
    </div>
  </fieldset>;
}

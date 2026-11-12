"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Clock, Scissors } from "lucide-react";
import { createBooking, type BookingActionState } from "./actions";
import { field } from "@/lib/ui";
import type { Service } from "@/lib/types";

type Props = {
  services: Service[];
  minDate: string;
  maxDate: string;
  initialCustomer?: { fullName: string; phone: string; email: string };
};

const initialState: BookingActionState = {};

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);

const formatSlot = (slot: string) =>
  new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(slot));

export function BookingForm({ services, minDate, maxDate, initialCustomer }: Props) {
  const [state, action, pending] = useActionState(createBooking, initialState);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState("");
  const availabilityRequest = useRef<AbortController | null>(null);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [serviceId, services],
  );

  const loadSlots = async (nextServiceId: string, nextDate: string) => {
    availabilityRequest.current?.abort();
    setSlot("");
    setSlots([]);
    setSlotError("");
    if (!nextServiceId || !nextDate) return;

    const controller = new AbortController();
    availabilityRequest.current = controller;
    setLoadingSlots(true);
    try {
      const response = await fetch(
        `/api/disponibilidad?service=${encodeURIComponent(nextServiceId)}&date=${encodeURIComponent(nextDate)}`,
        { signal: controller.signal, cache: "no-store" },
      );
      const body = (await response.json()) as { slots?: string[]; error?: string };
      if (!response.ok) throw new Error(body.error || "No se han podido consultar las horas.");
      setSlots(body.slots ?? []);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSlotError(error instanceof Error ? error.message : "No se han podido consultar las horas.");
    } finally {
      if (availabilityRequest.current === controller) setLoadingSlots(false);
    }
  };

  if (services.length === 0) {
    return (
      <div className="rounded-2xl border border-graphite bg-surface p-5 text-center">
        <Scissors className="mx-auto size-7 text-muted" aria-hidden="true" />
        <p className="mt-3 font-semibold">Todavía no hay servicios disponibles</p>
        <p className="mt-1 text-sm text-muted">Vuelve a intentarlo más tarde o contacta con la barbería.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-7">
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="slot" value={slot} />

      <fieldset>
        <legend className="flex items-center gap-2 text-lg font-semibold">
          <span className="grid size-7 place-items-center rounded-full bg-foreground text-sm text-black">1</span>
          Elige el servicio
        </legend>
        <div className="mt-3 grid gap-3">
          {services.map((service) => {
            const selected = service.id === serviceId;
            return (
              <label
                key={service.id}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  selected ? "border-foreground bg-surface" : "border-graphite hover:border-muted"
                }`}
              >
                <input
                  type="radio"
                  name="serviceChoice"
                  value={service.id}
                  checked={selected}
                  onChange={() => {
                    setServiceId(service.id);
                    void loadSlots(service.id, date);
                  }}
                  className="sr-only"
                />
                <span className="flex items-start justify-between gap-4">
                  <span>
                    <span className="block font-semibold">{service.name}</span>
                    {service.description && <span className="mt-1 block text-sm text-muted">{service.description}</span>}
                    <span className="mt-2 flex items-center gap-1 text-xs text-muted">
                      <Clock className="size-3.5" aria-hidden="true" /> {service.duration_minutes} min
                    </span>
                  </span>
                  <span className="flex items-center gap-2 font-semibold">
                    {formatPrice(service.price_cents)}
                    {selected && <Check className="size-5" aria-hidden="true" />}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="flex items-center gap-2 text-lg font-semibold">
          <span className="grid size-7 place-items-center rounded-full bg-foreground text-sm text-black">2</span>
          Elige día y hora
        </legend>
        <label className="mt-3 block text-sm text-muted" htmlFor="booking-date">
          Fecha
          <span className="relative mt-1 block">
            <CalendarDays className="pointer-events-none absolute left-4 top-3.5 size-5 text-muted" aria-hidden="true" />
            <input
              id="booking-date"
              type="date"
              min={minDate}
              max={maxDate}
              value={date}
              onChange={(event) => {
                const nextDate = event.target.value;
                setDate(nextDate);
                void loadSlots(serviceId, nextDate);
              }}
              className={`${field} pl-12`}
            />
          </span>
        </label>

        <div className="mt-3" aria-live="polite">
          {loadingSlots && <p className="text-sm text-muted">Consultando horas disponibles…</p>}
          {slotError && <p className="text-sm font-semibold">{slotError}</p>}
          {!loadingSlots && date && !slotError && slots.length === 0 && (
            <p className="rounded-xl border border-graphite p-3 text-sm text-muted">
              No quedan horas disponibles ese día. Prueba con otra fecha.
            </p>
          )}
          {slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((availableSlot) => (
                <button
                  key={availableSlot}
                  type="button"
                  onClick={() => setSlot(availableSlot)}
                  className={`h-11 rounded-xl border text-sm font-semibold transition ${
                    slot === availableSlot
                      ? "border-foreground bg-foreground text-black"
                      : "border-graphite hover:border-foreground"
                  }`}
                  aria-pressed={slot === availableSlot}
                >
                  {formatSlot(availableSlot)}
                </button>
              ))}
            </div>
          )}
        </div>
      </fieldset>

      {slot && (
        <fieldset className="animate-fade-up">
          <legend className="flex items-center gap-2 text-lg font-semibold">
            <span className="grid size-7 place-items-center rounded-full bg-foreground text-sm text-black">3</span>
            Tus datos
          </legend>
          <div className="mt-3 space-y-3">
            <label className="block text-sm text-muted" htmlFor="full-name">
              Nombre y apellidos
              <input id="full-name" name="fullName" defaultValue={initialCustomer?.fullName} required minLength={2} maxLength={120} autoComplete="name" className={`${field} mt-1`} />
            </label>
            <label className="block text-sm text-muted" htmlFor="phone">
              Teléfono
              <input id="phone" name="phone" defaultValue={initialCustomer?.phone} readOnly={Boolean(initialCustomer)} required inputMode="tel" autoComplete="tel" maxLength={24} placeholder="600 000 000" className={`${field} mt-1 ${initialCustomer ? "opacity-70" : ""}`} />
            </label>
            <label className="block text-sm text-muted" htmlFor="email">
              Correo electrónico (opcional)
              <input id="email" name="email" type="email" defaultValue={initialCustomer?.email} autoComplete="email" maxLength={254} className={`${field} mt-1`} />
            </label>
            <label className="block text-sm text-muted" htmlFor="notes">
              Observaciones (opcional)
              <textarea id="notes" name="notes" maxLength={500} rows={3} className="mt-1 w-full rounded-xl border border-graphite bg-background px-4 py-3 text-foreground outline-none focus:border-foreground" />
            </label>
            <label className="flex items-start gap-3 text-sm text-muted">
              <input name="consent" type="checkbox" required className="mt-1 size-4 accent-white" />
              <span>Acepto que se usen estos datos exclusivamente para gestionar mi cita.</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-muted">
              <input name="whatsappConsent" type="checkbox" className="mt-1 size-4 accent-[var(--gold)]" />
              <span>Quiero recibir por WhatsApp confirmaciones, cambios y recordatorios relacionados con mis citas. Puedo retirar este consentimiento contactando con la barbería.</span>
            </label>
          </div>
        </fieldset>
      )}

      {state.error && (
        <p role="alert" className="rounded-xl border border-foreground p-3 text-sm font-semibold">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={!slot || pending}
        className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-foreground px-6 font-bold text-black transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "RESERVANDO…" : `CONFIRMAR${selectedService ? ` · ${formatPrice(selectedService.price_cents)}` : ""}`}
      </button>
    </form>
  );
}


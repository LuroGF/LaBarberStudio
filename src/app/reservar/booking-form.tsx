"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock, Scissors, UserRound } from "lucide-react";
import { createBooking, type BookingActionState } from "./actions";
import { BookingCalendar } from "@/components/booking-calendar";
import { field } from "@/lib/ui";
import type { Service } from "@/lib/types";

type Props = {
  services: Service[];
  minDate: string;
  maxDate: string;
  initialServiceId?: string;
  initialCustomer?: { fullName: string; phone: string; email: string };
};

type Step = 1 | 2 | 3 | 4;
const steps = ["Servicio", "Fecha", "Hora", "Tus datos"];
const initialState: BookingActionState = {};
const formatPrice = (cents: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
const formatSlot = (slot: string) => new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(new Date(slot));
const formatSelectedDate = (date: string) => new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));

export function BookingForm({ services, minDate, maxDate, initialServiceId, initialCustomer }: Props) {
  const validInitialService = services.some((service) => service.id === initialServiceId) ? initialServiceId : services[0]?.id;
  const [state, action, pending] = useActionState(createBooking, initialState);
  const [step, setStep] = useState<Step>(1);
  const [furthestStep, setFurthestStep] = useState<Step>(1);
  const [serviceId, setServiceId] = useState(validInitialService ?? "");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [fullName, setFullName] = useState(initialCustomer?.fullName ?? "");
  const [phone, setPhone] = useState(initialCustomer?.phone ?? "");
  const [email, setEmail] = useState(initialCustomer?.email ?? "");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const availabilityRequest = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedService = useMemo(() => services.find((service) => service.id === serviceId), [serviceId, services]);

  useEffect(() => { panelRef.current?.focus({ preventScroll: true }); }, [step]);

  const moveTo = (next: Step) => {
    setStep(next);
    setFurthestStep((current) => Math.max(current, next) as Step);
  };

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
      const response = await fetch(`/api/disponibilidad?service=${encodeURIComponent(nextServiceId)}&date=${encodeURIComponent(nextDate)}`, { signal: controller.signal, cache: "no-store" });
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

  if (services.length === 0) return <div className="rounded-2xl border border-graphite bg-surface p-5 text-center"><Scissors className="mx-auto size-7 text-muted" /><p className="mt-3 font-semibold">Todavía no hay servicios disponibles</p><p className="mt-1 text-sm text-muted">Vuelve a intentarlo más tarde o contacta con la barbería.</p></div>;

  return (
    <form action={action} className="overflow-hidden rounded-3xl border border-white/10 bg-surface shadow-2xl">
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="slot" value={slot} />
      <nav aria-label="Pasos de la reserva" className="grid grid-cols-4 border-b border-white/10 bg-background/50 px-3 py-4 sm:px-6">
        {steps.map((label, index) => {
          const number = (index + 1) as Step;
          const reachable = number <= furthestStep;
          const active = number === step;
          return <button key={label} type="button" disabled={!reachable} onClick={() => reachable && setStep(number)} className="group flex min-w-0 flex-col items-center gap-2 disabled:cursor-default"><span className={`grid size-8 place-items-center rounded-full border text-xs font-bold transition ${active ? "border-gold bg-gold text-black" : number < step ? "border-gold/50 text-gold-light" : "border-white/15 text-muted"}`}>{number < step ? <Check size={15} /> : number}</span><span className={`max-w-full truncate text-[0.62rem] font-bold uppercase tracking-wide sm:text-xs ${active ? "text-white" : "text-muted"}`}>{label}</span></button>;
        })}
      </nav>

      <div ref={panelRef} tabIndex={-1} className="min-h-[31rem] p-5 outline-none sm:p-8">
        {step === 1 && <section className="animate-booking-step" aria-labelledby="step-service"><StepHeading icon={Scissors} title="¿Qué te hacemos?" text="Elige el servicio que quieres reservar." id="step-service" /><div className="mt-6 grid gap-3">{services.map((service) => {
          const selected = service.id === serviceId;
          return <button key={service.id} type="button" aria-pressed={selected} onClick={() => { setServiceId(service.id); setDate(""); setSlot(""); setSlots([]); setFurthestStep(1); }} className={`rounded-2xl border p-4 text-left transition ${selected ? "border-gold bg-gold/10" : "border-graphite hover:border-gold/50"}`}><span className="flex items-start justify-between gap-4"><span><span className="block font-semibold text-white">{service.name}</span>{service.description && <span className="mt-1 block text-sm leading-6 text-muted">{service.description}</span>}<span className="mt-2 flex items-center gap-1 text-xs text-muted"><Clock className="size-3.5" /> {service.duration_minutes} min</span></span><span className="flex items-center gap-2 font-semibold text-gold-light">{formatPrice(service.price_cents)}{selected && <Check className="size-5" />}</span></span></button>;
        })}</div><WizardNext onClick={() => moveTo(2)} disabled={!serviceId}>Elegir fecha</WizardNext></section>}

        {step === 2 && <section className="animate-booking-step" aria-labelledby="step-date"><StepHeading icon={CalendarDays} title="Elige el día" text="Puedes reservar dentro del periodo disponible." id="step-date" /><div className="mt-6"><BookingCalendar minDate={minDate} maxDate={maxDate} value={date} onChange={(nextDate) => { setDate(nextDate); setFurthestStep(2); void loadSlots(serviceId, nextDate); }} /></div><WizardNavigation onBack={() => setStep(1)} onNext={() => moveTo(3)} disabled={!date}>Ver horas</WizardNavigation></section>}

        {step === 3 && <section className="animate-booking-step" aria-labelledby="step-time"><StepHeading icon={Clock} title="Elige la hora" text={date ? `Disponibilidad para el ${formatSelectedDate(date)}.` : "Selecciona primero una fecha."} id="step-time" /><div className="mt-8 min-h-48" aria-live="polite">{loadingSlots && <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded-xl bg-white/5" />)}</div>}{slotError && <p className="rounded-xl border border-gold/40 p-4 text-sm font-semibold">{slotError}</p>}{!loadingSlots && date && !slotError && slots.length === 0 && <div className="rounded-2xl border border-graphite p-6 text-center"><p className="font-semibold text-white">No quedan horas ese día</p><p className="mt-2 text-sm text-muted">Vuelve al calendario y prueba con otra fecha.</p></div>}{!loadingSlots && slots.length > 0 && <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.map((availableSlot) => <button key={availableSlot} type="button" onClick={() => setSlot(availableSlot)} aria-pressed={slot === availableSlot} className={`h-12 rounded-xl border text-sm font-semibold transition ${slot === availableSlot ? "border-gold bg-gold text-black" : "border-graphite hover:border-gold hover:text-gold-light"}`}>{formatSlot(availableSlot)}</button>)}</div>}</div><WizardNavigation onBack={() => setStep(2)} onNext={() => moveTo(4)} disabled={!slot}>Continuar</WizardNavigation></section>}

        {step === 4 && <section className="animate-booking-step" aria-labelledby="step-details"><StepHeading icon={UserRound} title="Confirma tu cita" text="Déjanos tus datos y revisa la selección." id="step-details" /><div className="mt-6 rounded-2xl border border-gold/25 bg-background p-4 text-sm"><p className="font-bold text-white">{selectedService?.name}</p><p className="mt-1 capitalize text-muted">{formatSelectedDate(date)} · {formatSlot(slot)} · {selectedService ? formatPrice(selectedService.price_cents) : ""}</p></div><div className="mt-5 space-y-3">
          <label className="block text-sm text-muted" htmlFor="full-name">Nombre y apellidos<input id="full-name" name="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} maxLength={120} autoComplete="name" className={`${field} mt-1`} /></label>
          <label className="block text-sm text-muted" htmlFor="phone">Teléfono<input id="phone" name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} readOnly={Boolean(initialCustomer)} required inputMode="tel" autoComplete="tel" maxLength={24} placeholder="600 000 000" className={`${field} mt-1 ${initialCustomer ? "opacity-70" : ""}`} /></label>
          <label className="block text-sm text-muted" htmlFor="email">Correo electrónico (opcional)<input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} className={`${field} mt-1`} /><span className="mt-1 block text-xs">Si lo indicas, recibirás por correo los avisos de tu cita.</span></label>
          <label className="block text-sm text-muted" htmlFor="notes">Observaciones (opcional)<textarea id="notes" name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={3} className="mt-1 w-full rounded-xl border border-graphite bg-background px-4 py-3 text-foreground outline-none focus:border-foreground" /></label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-muted"><input name="consent" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required className="mt-1 size-4 accent-white" /><span>Acepto que se usen estos datos para gestionar mi cita conforme a la <Link href="/privacidad" className="text-foreground underline underline-offset-4">política de privacidad</Link>.</span></label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-muted"><input name="whatsappConsent" type="checkbox" checked={whatsappConsent} onChange={(event) => setWhatsappConsent(event.target.checked)} className="mt-1 size-4 accent-[var(--gold)]" /><span>Quiero recibir por WhatsApp confirmaciones, cambios y recordatorios relacionados con mis citas.</span></label>
        </div>{state.error && <p role="alert" className="mt-5 rounded-xl border border-foreground p-3 text-sm font-semibold">{state.error}</p>}<div className="mt-7 grid grid-cols-[auto_1fr] gap-3"><button type="button" onClick={() => setStep(3)} className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-graphite px-5 text-sm font-bold transition hover:border-white"><ArrowLeft size={17} /> Atrás</button><button type="submit" disabled={pending} className="inline-flex h-14 items-center justify-center rounded-xl bg-gold px-6 font-extrabold uppercase text-black transition hover:bg-gold-light active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50">{pending ? "RESERVANDO…" : "CONFIRMAR CITA"}</button></div></section>}
      </div>
    </form>
  );
}

function StepHeading({ icon: Icon, title, text, id }: { icon: typeof Scissors; title: string; text: string; id: string }) { return <div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-full border border-gold/35 text-gold"><Icon size={20} /></span><div><h2 id={id} className="text-xl font-extrabold uppercase tracking-tight text-white sm:text-2xl">{title}</h2><p className="mt-1 text-sm leading-6 text-muted">{text}</p></div></div>; }
function WizardNext({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) { return <button type="button" onClick={onClick} disabled={disabled} className="mt-7 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 font-extrabold uppercase text-black transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40">{children}<ArrowRight size={18} /></button>; }
function WizardNavigation({ children, onBack, onNext, disabled }: { children: React.ReactNode; onBack: () => void; onNext: () => void; disabled?: boolean }) { return <div className="mt-7 grid grid-cols-[auto_1fr] gap-3"><button type="button" onClick={onBack} className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-graphite px-5 text-sm font-bold transition hover:border-white"><ArrowLeft size={17} /> Atrás</button><button type="button" onClick={onNext} disabled={disabled} className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-gold px-6 font-extrabold uppercase text-black transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40">{children}<ArrowRight size={18} /></button></div>; }


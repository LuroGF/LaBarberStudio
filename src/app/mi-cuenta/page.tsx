import Link from "next/link";
import { connection } from "next/server";
import { CalendarDays, Clock, LogOut, Pencil, Scissors, UserRound } from "lucide-react";
import { cancelCustomerAppointment, logoutCustomer } from "./actions";
import { Wordmark } from "@/components/wordmark";
import { googleCalendarUrl } from "@/lib/calendar";
import { requireCustomer } from "@/lib/customer-auth";
import { canManageCustomerAppointment, isFutureAppointment, splitCustomerAppointments } from "@/lib/customer-appointments";
import { requestTimeMs } from "@/lib/request-time";
import { formatEuros, formatMadrid } from "@/lib/schedule";
import { createServiceClient } from "@/lib/supabase/admin";

export const instant = false;

type Appointment = {
  id: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show" | "rejected" | "expired";
  service_name: string;
  price_cents: number;
  duration_minutes: number;
  starts_at: string;
  ends_at: string;
};

const statusText: Record<Appointment["status"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No presentada",
  rejected: "Rechazada",
  expired: "Caducada",
};

export default async function CustomerAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string; modified?: string; error?: string }>;
}) {
  await connection();
  const [{ customer }, query] = await Promise.all([requireCustomer(), searchParams]);
  const admin = createServiceClient();
  const [{ data }, { data: settings }] = await Promise.all([
    admin
      .from("appointments")
      .select("id, status, service_name, price_cents, duration_minutes, starts_at, ends_at")
      .eq("customer_id", customer.id)
      .order("starts_at", { ascending: false }),
    admin.from("business_settings").select("address, cancellation_notice_hours").eq("id", true).single(),
  ]);
  const appointments = (data ?? []) as Appointment[];
  const nowMs = requestTimeMs();
  const { upcoming, history } = splitCustomerAppointments(appointments, nowMs);
  const address = settings?.address ?? "LA BARBER STUDIO";
  const noticeHours = settings?.cancellation_notice_hours ?? 2;

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 pb-12 pt-6 sm:px-6 sm:pt-10">
      <header className="flex items-center justify-between gap-4 border-b border-graphite pb-5">
        <Link href="/" aria-label="Ir al inicio"><Wordmark className="text-2xl" /></Link>
        <div className="flex items-center gap-2">
          <Link href="/mi-cuenta/perfil" className="grid size-11 place-items-center rounded-xl border border-graphite" aria-label="Editar perfil">
            <UserRound className="size-5" />
          </Link>
          <form action={logoutCustomer}>
            <button className="grid size-11 place-items-center rounded-xl border border-graphite" aria-label="Cerrar sesión">
              <LogOut className="size-5" />
            </button>
          </form>
        </div>
      </header>

      <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Hola, {customer.full_name}</p>
          <h1 className="mt-1 text-3xl font-extrabold">MIS CITAS</h1>
        </div>
        <Link href="/reservar" className="inline-flex h-11 items-center rounded-xl bg-foreground px-4 text-sm font-bold text-black">
          NUEVA CITA
        </Link>
      </div>

      {query.cancelled === "1" && <Notice>La cita se ha cancelado y el hueco vuelve a estar disponible.</Notice>}
      {query.modified === "1" && <Notice>La cita se ha modificado correctamente.</Notice>}
      {query.error && (
        <p role="alert" className="mt-5 rounded-xl border border-foreground p-3 text-sm font-semibold">
          {query.error === "late" ? "Ya queda demasiado poco para cancelar desde la web. Contacta con la barbería." : "No se ha podido cancelar la cita."}
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-bold">Próximas</h2>
        {upcoming.length ? (
          <div className="mt-3 space-y-4">
            {upcoming.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                address={address}
                canManage={canManageCustomerAppointment(appointment, nowMs, noticeHours)}
                showCalendar={isFutureAppointment(appointment, nowMs)}
                managementClosed={!canManageCustomerAppointment(appointment, nowMs, noticeHours)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-graphite bg-surface p-6 text-center">
            <CalendarDays className="mx-auto size-7 text-muted" />
            <p className="mt-3 font-semibold">No tienes próximas citas</p>
            <p className="mt-1 text-sm text-muted">Cuando reserves una, aparecerá aquí.</p>
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold">Historial</h2>
          <div className="mt-3 space-y-3">
            {history.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                address={address}
                archivedByTime={["pending", "confirmed"].includes(appointment.status)}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p role="status" className="mt-5 rounded-xl bg-foreground p-3 text-sm font-semibold text-black">{children}</p>;
}

function AppointmentCard({
  appointment,
  address,
  canManage = false,
  showCalendar = false,
  managementClosed = false,
  archivedByTime = false,
}: {
  appointment: Appointment;
  address: string;
  canManage?: boolean;
  showCalendar?: boolean;
  managementClosed?: boolean;
  archivedByTime?: boolean;
}) {
  const googleUrl = googleCalendarUrl({
    id: appointment.id,
    serviceName: appointment.service_name,
    startsAt: appointment.starts_at,
    endsAt: appointment.ends_at,
  }, address);
  return (
    <article className="rounded-2xl border border-graphite bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm capitalize text-muted">{formatMadrid(appointment.starts_at, "EEEE d 'de' MMMM")}</p>
          <h3 className="mt-1 text-xl font-bold">{appointment.service_name}</h3>
        </div>
        <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-black">
          {archivedByTime ? (appointment.status === "pending" ? "Caducada" : "Finalizada") : statusText[appointment.status]}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
        <span className="flex items-center gap-2"><Clock className="size-4" />{formatMadrid(appointment.starts_at, "HH:mm")} · {appointment.duration_minutes} min</span>
        <span className="flex items-center gap-2"><Scissors className="size-4" />{formatEuros(appointment.price_cents)}</span>
      </div>
      {appointment.status === "confirmed" && showCalendar && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-graphite pt-4">
          <a href={googleUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-xl border border-graphite px-3 text-xs font-semibold">
            GOOGLE CALENDAR
          </a>
          <a href={`/api/mi-cuenta/citas/${appointment.id}/calendar`} className="inline-flex h-10 items-center rounded-xl border border-graphite px-3 text-xs font-semibold">
            APPLE / OUTLOOK
          </a>
        </div>
      )}
      {canManage && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={`/mi-cuenta/citas/${appointment.id}/cambiar`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-foreground text-sm font-semibold">
            <Pencil className="size-4" /> CAMBIAR
          </Link>
          <details className="relative">
            <summary className="flex h-11 cursor-pointer list-none items-center justify-center rounded-xl border border-graphite text-sm font-semibold">CANCELAR</summary>
            <form action={cancelCustomerAppointment} className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-graphite bg-background p-3 shadow-xl">
              <input type="hidden" name="appointmentId" value={appointment.id} />
              <p className="text-xs text-muted">La hora quedará libre. Esta acción no se puede deshacer.</p>
              <button className="mt-3 h-10 w-full rounded-lg bg-foreground text-xs font-bold text-black">CONFIRMAR CANCELACIÓN</button>
            </form>
          </details>
        </div>
      )}
      {managementClosed && (
        <p className="mt-4 border-t border-graphite pt-4 text-xs text-muted">
          Esta cita ya no se puede modificar ni cancelar online.
        </p>
      )}
    </article>
  );
}


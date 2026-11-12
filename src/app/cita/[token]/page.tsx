import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock, Scissors } from "lucide-react";
import { cancelAppointment } from "./actions";
import { Wordmark } from "@/components/wordmark";
import { hashManageToken, MANAGE_TOKEN_RE } from "@/lib/booking";
import { googleCalendarUrl } from "@/lib/calendar";
import { formatEuros, formatMadrid } from "@/lib/schedule";
import { createServiceClient } from "@/lib/supabase/admin";

export const metadata = { title: "Tu cita | LA BARBER STUDIO", robots: { index: false, follow: false } };

type Appointment = {
  out_id: string;
  out_status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show" | "rejected" | "expired";
  out_service_name: string;
  out_price_cents: number;
  out_duration_minutes: number;
  out_starts_at: string;
  out_ends_at: string;
  out_expires_at: string | null;
  out_customer_name: string;
  out_can_cancel: boolean;
};

const statusText: Record<Appointment["out_status"], string> = {
  pending: "Pendiente de confirmación",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No presentada",
  rejected: "Rechazada",
  expired: "Solicitud caducada",
};

async function AppointmentContent({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ created?: string; cancelled?: string; error?: string }>;
}) {
  await connection();
  const [{ token }, query] = await Promise.all([params, searchParams]);
  if (!MANAGE_TOKEN_RE.test(token)) notFound();

  const supabase = createServiceClient();
  await supabase.rpc("expire_pending_appointments");
  const [{ data, error }, { data: settings }] = await Promise.all([
    supabase.rpc("get_appointment_by_token", { p_token_hash: hashManageToken(token) }),
    supabase.from("business_settings").select("address").eq("id", true).single(),
  ]);
  const appointment = (Array.isArray(data) ? data[0] : null) as Appointment | null;
  if (error || !appointment) notFound();
  const googleUrl = googleCalendarUrl({
    id: appointment.out_id,
    serviceName: appointment.out_service_name,
    startsAt: appointment.out_starts_at,
    endsAt: appointment.out_ends_at,
  }, settings?.address ?? "LA BARBER STUDIO");

  return (
    <>
      {query.created === "1" && (
        <div className="mb-4 rounded-2xl bg-foreground p-4 text-center text-black">
          <CheckCircle2 className="mx-auto size-7" aria-hidden="true" />
          <p className="mt-2 font-bold">Tu cita se ha registrado correctamente</p>
          <p className="mt-1 text-sm">Guarda esta página para consultar o cancelar la cita.</p>
        </div>
      )}
      {query.cancelled === "1" && (
        <p role="status" className="mb-4 rounded-xl border border-graphite p-3 text-center text-sm">
          La cita se ha cancelado correctamente.
        </p>
      )}
      {query.error && (
        <p role="alert" className="mb-4 rounded-xl border border-foreground p-3 text-center text-sm font-semibold">
          {query.error === "late"
            ? "Ya no es posible cancelar desde la web porque queda poco para la cita. Contacta con la barbería."
            : "No se ha podido cancelar la cita. Inténtalo de nuevo."}
        </p>
      )}

      <section className="rounded-2xl border border-graphite bg-surface p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Cita de {appointment.out_customer_name}</p>
            <h1 className="mt-1 text-2xl font-bold">{appointment.out_service_name}</h1>
          </div>
          <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-black">
            {statusText[appointment.out_status]}
          </span>
        </div>

        <dl className="mt-6 space-y-4 border-y border-graphite py-5">
          <div className="flex items-center gap-3">
            <CalendarDays className="size-5 text-muted" aria-hidden="true" />
            <div>
              <dt className="text-xs text-muted">Fecha</dt>
              <dd className="font-semibold capitalize">{formatMadrid(appointment.out_starts_at, "EEEE d 'de' MMMM")}</dd>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="size-5 text-muted" aria-hidden="true" />
            <div>
              <dt className="text-xs text-muted">Hora y duración</dt>
              <dd className="font-semibold">
                {formatMadrid(appointment.out_starts_at, "HH:mm")} · {appointment.out_duration_minutes} min
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Scissors className="size-5 text-muted" aria-hidden="true" />
            <div>
              <dt className="text-xs text-muted">Precio</dt>
              <dd className="font-semibold">{formatEuros(appointment.out_price_cents)}</dd>
            </div>
          </div>
        </dl>

        {appointment.out_status === "confirmed" && (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <a href={googleUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-xl border border-graphite text-center text-xs font-semibold">
              GOOGLE CALENDAR
            </a>
            <a href={`/api/cita/${token}/calendar`} className="inline-flex h-11 items-center justify-center rounded-xl border border-graphite text-center text-xs font-semibold">
              APPLE / OUTLOOK
            </a>
          </div>
        )}

        {appointment.out_can_cancel && (
          <details className="mt-5">
            <summary className="cursor-pointer text-center text-sm text-muted underline underline-offset-4">
              Necesito cancelar la cita
            </summary>
            <div className="mt-3 rounded-xl border border-graphite p-3">
              <p className="text-sm text-muted">Esta acción no se puede deshacer y la hora quedará libre.</p>
              <form action={cancelAppointment.bind(null, token)} className="mt-3">
                <button className="h-11 w-full rounded-xl border border-foreground text-sm font-semibold">
                  SÍ, CANCELAR CITA
                </button>
              </form>
            </div>
          </details>
        )}
      </section>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link href="/" className="inline-flex h-11 items-center justify-center rounded-xl border border-graphite text-center text-xs font-semibold transition hover:border-foreground">
          VOLVER AL INICIO
        </Link>
        <Link href="/reservar" className="inline-flex h-11 items-center justify-center rounded-xl border border-gold/40 text-center text-xs font-semibold text-gold-light transition hover:border-gold">
          NUEVA CITA
        </Link>
      </div>
    </>
  );
}

function AppointmentFallback() {
  return <div className="h-80 animate-pulse rounded-2xl border border-graphite bg-surface" aria-label="Cargando cita" />;
}

export default function AppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ created?: string; cancelled?: string; error?: string }>;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <header className="mb-6 text-center">
        <Link href="/" aria-label="Volver al inicio">
          <Wordmark className="text-3xl" />
        </Link>
      </header>
      <Suspense fallback={<AppointmentFallback />}>
        <AppointmentContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}


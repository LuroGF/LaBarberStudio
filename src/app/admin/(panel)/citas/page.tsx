import Link from "next/link";
import { changeAppointmentStatus } from "./actions";
import { requireAdmin } from "@/lib/auth";
import { addDaysStr, daysBoundsUtc, formatEuros, formatMadrid, isDate, todayMadrid } from "@/lib/schedule";
import { btnGhost, btnPrimary, card } from "@/lib/ui";

export const metadata = { title: "Citas | LA BARBER STUDIO" };

type View = "day" | "week" | "month";
type Status = "pending" | "confirmed" | "completed" | "cancelled" | "no_show" | "rejected" | "expired";

type Appointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  service_name: string;
  price_cents: number;
  status: Status;
  customer_notes: string | null;
  customers: { full_name: string; phone: string; email: string | null } | { full_name: string; phone: string; email: string | null }[] | null;
};

const statusLabel: Record<Status, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No presentada",
  rejected: "Rechazada",
  expired: "Caducada",
};

const filters: { value: "active" | Status | "all"; label: string }[] = [
  { value: "active", label: "Activas" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "completed", label: "Completadas" },
  { value: "all", label: "Todas" },
];

function startOfWeek(date: string): string {
  const value = new Date(`${date}T12:00:00Z`);
  const day = value.getUTCDay() || 7;
  return addDaysStr(date, 1 - day);
}

function monthBounds(date: string): { from: string; to: string } {
  const [year, month] = date.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${String(month).padStart(2, "0")}-01`, to: `${year}-${String(month).padStart(2, "0")}-${last}` };
}

function shiftMonth(date: string, amount: number): string {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + amount, 1)).toISOString().slice(0, 10);
}

function customerOf(appointment: Appointment) {
  return Array.isArray(appointment.customers) ? appointment.customers[0] : appointment.customers;
}

function StatusActions({ appointment }: { appointment: Appointment }) {
  if (appointment.status === "pending") {
    return (
      <div className="flex flex-wrap gap-2">
        <form action={changeAppointmentStatus.bind(null, appointment.id, "confirmed")}>
          <button className={`${btnGhost} border-foreground font-semibold`}>Confirmar</button>
        </form>
        <form action={changeAppointmentStatus.bind(null, appointment.id, "rejected")}>
          <button className={btnGhost}>Rechazar</button>
        </form>
      </div>
    );
  }
  if (appointment.status === "confirmed") {
    return (
      <div className="flex flex-wrap gap-2">
        <form action={changeAppointmentStatus.bind(null, appointment.id, "completed")}>
          <button className={`${btnGhost} border-foreground font-semibold`}>Completar</button>
        </form>
        <form action={changeAppointmentStatus.bind(null, appointment.id, "no_show")}>
          <button className={btnGhost}>No presentada</button>
        </form>
        <details>
          <summary className={`${btnGhost} cursor-pointer list-none`}>Cancelar</summary>
          <form action={changeAppointmentStatus.bind(null, appointment.id, "cancelled")} className="mt-2">
            <button className={`${btnGhost} w-full font-semibold`}>Confirmar cancelación</button>
          </form>
        </details>
      </div>
    );
  }
  return null;
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; status?: string }>;
}) {
  const query = await searchParams;
  const selectedDate = query.date && isDate(query.date) ? query.date : todayMadrid();
  const view: View = query.view === "week" || query.view === "month" ? query.view : "day";
  const status = filters.some((item) => item.value === query.status) ? query.status! : "active";

  let from = selectedDate;
  let to = selectedDate;
  if (view === "week") {
    from = startOfWeek(selectedDate);
    to = addDaysStr(from, 6);
  } else if (view === "month") {
    ({ from, to } = monthBounds(selectedDate));
  }

  const { start, end } = daysBoundsUtc(from, to);
  const { supabase } = await requireAdmin();
  let request = supabase
    .from("appointments")
    .select("id, starts_at, ends_at, service_name, price_cents, status, customer_notes, customers(full_name, phone, email)")
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .order("starts_at");

  if (status === "active") request = request.in("status", ["pending", "confirmed"]);
  else if (status !== "all") request = request.eq("status", status);

  const { data, error } = await request;
  const appointments = (data ?? []) as Appointment[];
  const groups = Map.groupBy(appointments, (appointment) => formatMadrid(appointment.starts_at, "yyyy-MM-dd"));

  const previous = view === "month" ? shiftMonth(selectedDate, -1) : addDaysStr(selectedDate, view === "week" ? -7 : -1);
  const next = view === "month" ? shiftMonth(selectedDate, 1) : addDaysStr(selectedDate, view === "week" ? 7 : 1);
  const href = (overrides: { date?: string; view?: string; status?: string }) => {
    const params = new URLSearchParams({ date: selectedDate, view, status, ...overrides });
    return `/admin/citas?${params}`;
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">Citas</h1>
        <p className="mt-1 text-sm text-muted">Consulta la agenda y actualiza el estado de cada cita.</p></div>
        <Link href="/admin/citas/nueva" className={`${btnPrimary} h-11 shrink-0 px-4 text-sm`}>+ Nueva</Link>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {(["day", "week", "month"] as const).map((item) => (
          <Link key={item} href={href({ view: item })} className={`${btnGhost} ${view === item ? "border-foreground font-semibold" : ""}`}>
            {item === "day" ? "Día" : item === "week" ? "Semana" : "Mes"}
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Link href={href({ date: previous })} className={btnGhost} aria-label="Periodo anterior">←</Link>
        <div className="text-center">
          <p className="font-semibold capitalize">
            {view === "day"
              ? formatMadrid(`${selectedDate}T12:00:00Z`, "EEEE d 'de' MMMM")
              : view === "week"
                ? `${formatMadrid(`${from}T12:00:00Z`, "d MMM")} – ${formatMadrid(`${to}T12:00:00Z`, "d MMM")}`
                : formatMadrid(`${from}T12:00:00Z`, "MMMM yyyy")}
          </p>
          <Link href={href({ date: todayMadrid() })} className="text-xs text-muted underline underline-offset-4">Ir a hoy</Link>
        </div>
        <Link href={href({ date: next })} className={btnGhost} aria-label="Periodo siguiente">→</Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <Link
            key={item.value}
            href={href({ status: item.value })}
            className={`shrink-0 rounded-full border px-3 py-2 text-xs ${status === item.value ? "border-foreground bg-foreground font-semibold text-black" : "border-graphite text-muted"}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {error && <p role="alert" className="text-sm font-semibold">No se han podido cargar las citas.</p>}
      {!error && appointments.length === 0 && (
        <div className={`${card} text-center`}>
          <p className="font-semibold">No hay citas en este periodo</p>
          <p className="mt-1 text-sm text-muted">Prueba con otro periodo o filtro.</p>
        </div>
      )}

      {[...groups.entries()].map(([day, items]) => (
        <section key={day} className="space-y-3">
          <h2 className="text-sm font-semibold capitalize text-muted">{formatMadrid(`${day}T12:00:00Z`, "EEEE d 'de' MMMM")}</h2>
          {items.map((appointment) => {
            const customer = customerOf(appointment);
            const whatsapp = customer?.phone ? `https://wa.me/${customer.phone.replace(/\D/g, "")}` : null;
            return (
              <article key={appointment.id} className={`${card} space-y-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-bold">{formatMadrid(appointment.starts_at, "HH:mm")}</p>
                    <p className="font-semibold">{appointment.service_name}</p>
                    <p className="text-sm text-muted">{customer?.full_name ?? "Cliente"} · {formatEuros(appointment.price_cents)}</p>
                  </div>
                  <span className="rounded-full border border-graphite px-3 py-1 text-xs text-muted">{statusLabel[appointment.status]}</span>
                </div>
                {appointment.customer_notes && <p className="rounded-xl bg-background p-3 text-sm text-muted">{appointment.customer_notes}</p>}
                <div className="flex flex-wrap gap-3 text-sm">
                  {customer?.phone && <a href={`tel:${customer.phone}`} className="underline underline-offset-4">{customer.phone}</a>}
                  {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className="underline underline-offset-4">WhatsApp</a>}
                  {customer?.email && <a href={`mailto:${customer.email}`} className="underline underline-offset-4">Correo</a>}
                </div>
                <StatusActions appointment={appointment} />
                <Link href={`/admin/citas/${appointment.id}`} className={`${btnGhost} w-full`}>Ver y editar cita</Link>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}


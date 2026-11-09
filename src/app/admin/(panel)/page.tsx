import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { daysBoundsUtc, formatMadrid, todayMadrid } from "@/lib/schedule";
import { card } from "@/lib/ui";

export const metadata = { title: "Panel | LA BARBER STUDIO" };

export default async function AdminHome() {
  const { profile, user, supabase } = await requireAdmin();
  const today = todayMadrid();
  const { start, end } = daysBoundsUtc(today);
  const now = new Date().toISOString();
  const [todayRes, pendingRes, notificationsRes, nextRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "confirmed"])
      .gte("starts_at", start.toISOString())
      .lt("starts_at", end.toISOString()),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending").gt("starts_at", now),
    supabase.from("notification_events").select("id", { count: "exact", head: true }).eq("status", "pending").eq("channel", "whatsapp_manual"),
    supabase
      .from("appointments")
      .select("id, starts_at, service_name, status, customers(full_name)")
      .in("status", ["pending", "confirmed"])
      .gte("starts_at", now)
      .order("starts_at")
      .limit(5),
  ]);

  const nextAppointments = (nextRes.data ?? []) as {
    id: string;
    starts_at: string;
    service_name: string;
    status: string;
    customers: { full_name: string } | { full_name: string }[] | null;
  }[];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Hola, {profile.full_name ?? user.email}</h1>
      <div className="grid grid-cols-3 gap-3">
        <Link href="/admin/citas" className={`${card} block transition hover:border-foreground`}>
          <p className="text-3xl font-bold">{todayRes.count ?? 0}</p>
          <p className="mt-1 text-sm text-muted">Citas activas hoy</p>
        </Link>
        <Link href="/admin/citas?status=pending" className={`${card} block transition hover:border-foreground`}>
          <p className="text-3xl font-bold">{pendingRes.count ?? 0}</p>
          <p className="mt-1 text-sm text-muted">Pendientes</p>
        </Link>
        <Link href="/admin/notificaciones" className={`${card} block transition hover:border-foreground`}>
          <p className="text-3xl font-bold">{notificationsRes.count ?? 0}</p>
          <p className="mt-1 text-sm text-muted">Avisos</p>
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Próximas citas</h2>
          <Link href="/admin/citas" className="text-sm text-muted underline underline-offset-4">Ver agenda</Link>
        </div>
        {nextAppointments.length === 0 ? (
          <p className={`${card} text-sm text-muted`}>No hay citas próximas.</p>
        ) : (
          <ul className="space-y-2">
            {nextAppointments.map((appointment) => {
              const customer = Array.isArray(appointment.customers) ? appointment.customers[0] : appointment.customers;
              return (
                <li key={appointment.id} className={`${card} flex items-center justify-between gap-3`}>
                  <div>
                    <p className="font-semibold capitalize">{formatMadrid(appointment.starts_at, "EEE d MMM · HH:mm")}</p>
                    <p className="text-sm text-muted">{customer?.full_name ?? "Cliente"} · {appointment.service_name}</p>
                  </div>
                  {appointment.status === "pending" && <span className="text-xs font-semibold">Pendiente</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/admin/clientes" className={`${card} block transition hover:border-foreground`}>
          <p className="font-semibold">Clientes</p>
          <p className="mt-1 text-sm text-muted">Fichas, notas e historial.</p>
        </Link>
        <Link href="/admin/servicios" className={`${card} block transition hover:border-foreground`}>
          <p className="font-semibold">Servicios</p>
          <p className="mt-1 text-sm text-muted">Precios, duraciones y orden.</p>
        </Link>
        <Link href="/admin/horarios" className={`${card} block transition hover:border-foreground`}>
          <p className="font-semibold">Horarios</p>
          <p className="mt-1 text-sm text-muted">Horario semanal, vacaciones y bloqueos.</p>
        </Link>
        <Link href="/admin/ajustes" className={`${card} block transition hover:border-foreground`}>
          <p className="font-semibold">Ajustes</p>
          <p className="mt-1 text-sm text-muted">Datos públicos y reglas de reserva.</p>
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { CalendarDays, CircleCheckBig, Euro, TrendingDown, TrendingUp, UserX } from "lucide-react";
import { buildAdminStats, type StatsAppointment } from "@/lib/admin-stats";
import { requireAdmin } from "@/lib/auth";
import { daysBoundsUtc, formatEuros, formatMadrid, todayMadrid } from "@/lib/schedule";
import { card } from "@/lib/ui";

export const metadata = { title: "Panel | LA BARBER STUDIO" };

type TodayAppointment = { id: string; price_cents: number; status: string };
type NextAppointment = {
  id: string;
  starts_at: string;
  service_name: string;
  status: string;
  customers: { full_name: string } | { full_name: string }[] | null;
};

export default async function AdminHome() {
  const { profile, user, supabase } = await requireAdmin();
  const today = todayMadrid();
  const { start, end } = daysBoundsUtc(today);
  const now = new Date();
  const nowIso = now.toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const [todayRes, pendingRes, notificationsRes, nextRes, periodRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, price_cents, status")
      .in("status", ["pending", "confirmed", "completed"])
      .gte("starts_at", start.toISOString())
      .lt("starts_at", end.toISOString()),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending").gt("starts_at", nowIso),
    supabase.from("notification_events").select("id", { count: "exact", head: true }).in("status", ["pending", "failed"]).in("channel", ["whatsapp_manual", "whatsapp_api", "email"]),
    supabase
      .from("appointments")
      .select("id, starts_at, service_name, status, customers(full_name)")
      .in("status", ["pending", "confirmed"])
      .gte("starts_at", nowIso)
      .order("starts_at")
      .limit(5),
    supabase
      .from("appointments")
      .select("starts_at, service_name, price_cents, status")
      .gte("starts_at", sixtyDaysAgo)
      .lt("starts_at", nowIso),
  ]);

  const todayAppointments = (todayRes.data ?? []) as TodayAppointment[];
  const todayForecast = todayAppointments.reduce((sum, appointment) => sum + appointment.price_cents, 0);
  const stats = buildAdminStats((periodRes.data ?? []) as StatsAppointment[], now);
  const nextAppointments = (nextRes.data ?? []) as unknown as NextAppointment[];

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm text-muted">Resumen del negocio</p>
        <h1 className="mt-1 text-2xl font-semibold">Hola, {profile.full_name ?? user.email}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard href="/admin/citas" icon={<CalendarDays className="size-4" />} value={String(todayAppointments.length)} label="Citas hoy" />
        <MetricCard href="/admin/citas" icon={<Euro className="size-4" />} value={formatEuros(todayForecast)} label="Previsión de hoy" />
        <MetricCard href="/admin/citas?status=pending" value={String(pendingRes.count ?? 0)} label="Pendientes" />
        <MetricCard href="/admin/notificaciones" value={String(notificationsRes.count ?? 0)} label="Avisos por revisar" />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">Últimos 30 días</h2>
          <p className="mt-1 text-xs text-muted">Importes calculados con servicios marcados como completados.</p>
        </div>
        <div className={`${card} space-y-5`}>
          <div className="flex items-end justify-between gap-4 border-b border-graphite pb-4">
            <div><p className="text-sm text-muted">Ingresos completados</p><p className="mt-1 text-3xl font-bold text-gold-light">{formatEuros(stats.completedRevenue)}</p></div>
            <RevenueChange value={stats.revenueChange} />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <SmallStat icon={<CircleCheckBig className="size-4 text-gold" />} value={stats.completed} label="Completadas" />
            <SmallStat value={stats.cancelled} label="Canceladas" />
            <SmallStat icon={<UserX className="size-4 text-muted" />} value={stats.noShow} label="Ausencias" />
          </div>
          <div className="rounded-xl bg-background p-3">
            <div className="flex items-center justify-between text-sm"><span className="text-muted">Tasa de finalización</span><strong>{stats.completionRate === null ? "Sin datos" : `${stats.completionRate}%`}</strong></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-graphite"><div className="h-full rounded-full bg-gold" style={{ width: `${stats.completionRate ?? 0}%` }} /></div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Servicios más solicitados</h2>
        {stats.topServices.length === 0 ? <p className={`${card} text-sm text-muted`}>Todavía no hay suficientes citas para mostrar tendencias.</p> : (
          <div className={`${card} space-y-4`}>
            {stats.topServices.map((service) => <div key={service.name}>
              <div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{service.name}</span><span className="text-muted">{service.count} {service.count === 1 ? "cita" : "citas"}</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-gold" style={{ width: `${service.percentage}%` }} /></div>
            </div>)}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Próximas citas</h2>
          <Link href="/admin/citas" className="text-sm text-muted underline underline-offset-4">Ver agenda</Link>
        </div>
        {nextAppointments.length === 0 ? <p className={`${card} text-sm text-muted`}>No hay citas próximas.</p> : <ul className="space-y-2">
          {nextAppointments.map((appointment) => {
            const customer = Array.isArray(appointment.customers) ? appointment.customers[0] : appointment.customers;
            return <li key={appointment.id} className={`${card} flex items-center justify-between gap-3`}>
              <div><p className="font-semibold capitalize">{formatMadrid(appointment.starts_at, "EEE d MMM · HH:mm")}</p><p className="text-sm text-muted">{customer?.full_name ?? "Cliente"} · {appointment.service_name}</p></div>
              {appointment.status === "pending" && <span className="text-xs font-semibold">Pendiente</span>}
            </li>;
          })}
        </ul>}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <QuickLink href="/admin/clientes" title="Clientes">Fichas, notas e historial.</QuickLink>
        <QuickLink href="/admin/servicios" title="Servicios">Precios, duraciones y orden.</QuickLink>
        <QuickLink href="/admin/horarios" title="Horarios">Horario semanal, vacaciones y bloqueos.</QuickLink>
        <QuickLink href="/admin/ajustes" title="Ajustes">Datos públicos y reglas de reserva.</QuickLink>
      </div>
    </div>
  );
}

function MetricCard({ href, icon, value, label }: { href: string; icon?: React.ReactNode; value: string; label: string }) {
  return <Link href={href} className={`${card} block min-w-0 transition hover:border-foreground`}>
    <div className="flex items-center gap-2 text-muted">{icon}<p className="truncate text-xs">{label}</p></div>
    <p className="mt-2 truncate text-2xl font-bold">{value}</p>
  </Link>;
}

function RevenueChange({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted">Sin periodo anterior</span>;
  const positive = value >= 0;
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold ${positive ? "text-gold-light" : "text-muted"}`}>
    {positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}{positive ? "+" : ""}{value}% vs. 30 días anteriores
  </span>;
}

function SmallStat({ icon, value, label }: { icon?: React.ReactNode; value: number; label: string }) {
  return <div><div className="flex items-center justify-center gap-1"><strong className="text-xl">{value}</strong>{icon}</div><p className="mt-1 text-[11px] text-muted">{label}</p></div>;
}

function QuickLink({ href, title, children }: { href: string; title: string; children: React.ReactNode }) {
  return <Link href={href} className={`${card} block transition hover:border-foreground`}><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted">{children}</p></Link>;
}

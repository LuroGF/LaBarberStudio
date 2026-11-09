import { NotificationActions } from "./notification-actions";
import { PrepareReminders } from "./prepare-reminders";
import { requireAdmin } from "@/lib/auth";
import { notificationMessage, whatsappUrl } from "@/lib/notifications";
import { formatMadrid } from "@/lib/schedule";
import { card } from "@/lib/ui";

type Appointment = { service_name: string; starts_at: string; status: string; customers: { full_name: string; phone: string } | { full_name: string; phone: string }[] | null };
type Event = { id: string; event_type: string; created_at: string; appointments: Appointment | Appointment[] | null };

export const metadata = { title: "Avisos | LA BARBER STUDIO" };
const eventLabels: Record<string, string> = { request_created: "Nueva cita", approved: "Confirmación", rejected: "Rechazo", modified: "Cambio", cancelled: "Cancelación", reminder: "Recordatorio" };

export default async function NotificationsPage() {
  const { supabase } = await requireAdmin();
  const [{ data }, { data: settings }] = await Promise.all([
    supabase.from("notification_events").select("id, event_type, created_at, appointments(service_name, starts_at, status, customers(full_name, phone))").eq("status", "pending").eq("channel", "whatsapp_manual").order("created_at"),
    supabase.from("business_settings").select("business_name").eq("id", true).single(),
  ]);
  const events = (data ?? []) as unknown as Event[];
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-semibold">Avisos</h1><p className="mt-1 text-sm text-muted">Abre WhatsApp, envía el texto preparado y marca el aviso como enviado.</p></div>
      <PrepareReminders />
      {events.length === 0 ? <p className={`${card} text-sm text-muted`}>No hay avisos pendientes.</p> : events.map((event) => {
        const appointment = Array.isArray(event.appointments) ? event.appointments[0] : event.appointments;
        if (!appointment) return null;
        const customer = Array.isArray(appointment.customers) ? appointment.customers[0] : appointment.customers;
        if (!customer) return null;
        const message = notificationMessage(event.event_type, appointment, customer.full_name, settings?.business_name);
        return <article key={event.id} className={`${card} space-y-3`}>
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{customer.full_name}</h2><p className="mt-1 text-sm text-muted">{appointment.service_name} · {formatMadrid(appointment.starts_at, "d MMM · HH:mm")}</p></div><span className="text-xs text-muted">{eventLabels[event.event_type] ?? event.event_type}</span></div>
          <p className="rounded-xl bg-background p-3 text-sm leading-6">{message}</p>
          <NotificationActions id={event.id} url={whatsappUrl(customer.phone, message)} />
        </article>;
      })}
    </div>
  );
}

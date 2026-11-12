import { BellRing } from "lucide-react";
import { NotificationActions } from "./notification-actions";
import { PrepareReminders } from "./prepare-reminders";
import { WaitlistMatchActions } from "./waitlist-match-actions";
import { requireAdmin } from "@/lib/auth";
import { notificationMessage, waitlistOpeningMessage, whatsappUrl } from "@/lib/notifications";
import { formatMadrid } from "@/lib/schedule";
import { card } from "@/lib/ui";
import { whatsappAutomationStatus } from "@/lib/whatsapp-cloud";

type Appointment = { service_name: string; starts_at: string; status: string; customers: { full_name: string; phone: string } | { full_name: string; phone: string }[] | null };
type Event = { id: string; event_type: string; status: string; channel: string; error: string | null; created_at: string; appointments: Appointment | Appointment[] | null };
type Match = { id: string; waitlist_request_id: string; opening_appointment_id: string; created_at: string };
type Request = { id: string; customer_id: string; appointment_id: string };
type Opening = { id: string; barber_id: string; service_id: string | null; service_name: string; starts_at: string; status: string };
type Target = { id: string; service_name: string; starts_at: string; status: string };
type Customer = { id: string; full_name: string; phone: string };

export const metadata = { title: "Avisos | LA BARBER STUDIO" };
const eventLabels: Record<string, string> = { request_created: "Nueva cita", approved: "Confirmación", rejected: "Rechazo", modified: "Cambio", cancelled: "Cancelación", reminder: "Recordatorio" };

export default async function NotificationsPage() {
  const { supabase } = await requireAdmin();
  const automation = whatsappAutomationStatus();
  const [{ data }, { data: settings }, { data: matchesData }] = await Promise.all([
    supabase.from("notification_events").select("id, event_type, status, channel, error, created_at, appointments(service_name, starts_at, status, customers(full_name, phone))").in("status", ["pending", "failed"]).in("channel", ["whatsapp_manual", "whatsapp_api"]).order("created_at"),
    supabase.from("business_settings").select("business_name").eq("id", true).single(),
    supabase.from("waitlist_matches").select("id, waitlist_request_id, opening_appointment_id, created_at").eq("status", "pending").order("created_at"),
  ]);
  const events = (data ?? []) as unknown as Event[];
  const matches = (matchesData ?? []) as Match[];
  const waitlistItems = await loadWaitlistItems(supabase, matches);

  return (
    <div className="space-y-7">
      <div><h1 className="text-2xl font-semibold">Avisos</h1><p className="mt-1 text-sm text-muted">Abre WhatsApp, envía el texto preparado y marca el aviso como enviado.</p></div>
      <div className={`${card} flex items-start justify-between gap-4`}>
        <div><p className="font-semibold">WhatsApp automático</p><p className="mt-1 text-sm text-muted">{automation.configured ? "Meta Cloud API está configurada. Los envíos se procesan cada 10 minutos." : "Modo manual activo. Añade las credenciales y plantillas de Meta para automatizarlo."}</p></div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${automation.configured ? "bg-gold text-black" : "bg-background text-muted"}`}>{automation.configured ? "ACTIVO" : automation.enabled ? "INCOMPLETO" : "MANUAL"}</span>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2"><BellRing className="size-5 text-gold" /><h2 className="font-semibold">Huecos para la lista de espera</h2></div>
        {waitlistItems.length === 0 ? <p className={`${card} text-sm text-muted`}>No hay coincidencias pendientes.</p> : waitlistItems.map(({ match, opening, target, customer, available }) => {
          const message = waitlistOpeningMessage(opening, customer.full_name, settings?.business_name);
          return <article key={match.id} className={`${card} space-y-3 border-gold/30`}>
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="font-semibold">{customer.full_name}</h3><p className="mt-1 text-sm text-gold-light">Hueco: {formatMadrid(opening.starts_at, "EEE d MMM · HH:mm")} · {opening.service_name}</p><p className="mt-1 text-xs text-muted">Cita actual: {formatMadrid(target.starts_at, "EEE d MMM · HH:mm")}</p></div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${available ? "bg-gold text-black" : "bg-background text-muted"}`}>{available ? "Disponible" : "Ya ocupado"}</span>
            </div>
            <p className="rounded-xl bg-background p-3 text-sm leading-6">{message}</p>
            <WaitlistMatchActions id={match.id} url={whatsappUrl(customer.phone, message)} available={available} />
          </article>;
        })}
      </section>

      <section className="space-y-3 border-t border-graphite pt-6">
        <h2 className="font-semibold">Citas y recordatorios</h2>
        <PrepareReminders />
        {events.length === 0 ? <p className={`${card} text-sm text-muted`}>No hay avisos de citas pendientes.</p> : events.map((event) => {
          const appointment = Array.isArray(event.appointments) ? event.appointments[0] : event.appointments;
          if (!appointment) return null;
          const customer = Array.isArray(appointment.customers) ? appointment.customers[0] : appointment.customers;
          if (!customer) return null;
          const message = notificationMessage(event.event_type, appointment, customer.full_name, settings?.business_name);
          return <article key={event.id} className={`${card} space-y-3`}>
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{customer.full_name}</h3><p className="mt-1 text-sm text-muted">{appointment.service_name} · {formatMadrid(appointment.starts_at, "d MMM · HH:mm")}</p>{event.status === "failed" && <p className="mt-2 text-xs font-semibold text-gold-light">El envío automático falló; puedes enviarlo manualmente.</p>}</div><span className="text-xs text-muted">{eventLabels[event.event_type] ?? event.event_type}</span></div>
            <p className="rounded-xl bg-background p-3 text-sm leading-6">{message}</p>
            <NotificationActions id={event.id} url={whatsappUrl(customer.phone, message)} />
          </article>;
        })}
      </section>
    </div>
  );
}

async function loadWaitlistItems(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], matches: Match[]) {
  if (!matches.length) return [];
  const requestIds = [...new Set(matches.map((match) => match.waitlist_request_id))];
  const openingIds = [...new Set(matches.map((match) => match.opening_appointment_id))];
  const [{ data: requestsData }, { data: openingsData }] = await Promise.all([
    supabase.from("waitlist_requests").select("id, customer_id, appointment_id").in("id", requestIds),
    supabase.from("appointments").select("id, barber_id, service_id, service_name, starts_at, status").in("id", openingIds),
  ]);
  const requests = (requestsData ?? []) as Request[];
  const openings = (openingsData ?? []) as Opening[];
  const [{ data: customersData }, { data: targetsData }] = await Promise.all([
    requests.length ? supabase.from("customers").select("id, full_name, phone").in("id", [...new Set(requests.map((request) => request.customer_id))]) : Promise.resolve({ data: [] as Customer[] }),
    requests.length ? supabase.from("appointments").select("id, service_name, starts_at, status").in("id", [...new Set(requests.map((request) => request.appointment_id))]) : Promise.resolve({ data: [] as Target[] }),
  ]);
  const customers = (customersData ?? []) as Customer[];
  const targets = (targetsData ?? []) as Target[];
  const availability = new Map<string, boolean>();
  await Promise.all(openings.map(async (opening) => {
    if (!opening.service_id || opening.status !== "cancelled") return availability.set(opening.id, false);
    const { data: slots } = await supabase.rpc("get_slots", {
      p_service_id: opening.service_id,
      p_date: formatMadrid(opening.starts_at, "yyyy-MM-dd"),
      p_barber_id: opening.barber_id,
    });
    availability.set(opening.id, (slots ?? []).some((slot: { slot_start: string }) => new Date(slot.slot_start).getTime() === new Date(opening.starts_at).getTime()));
  }));
  return matches.flatMap((match) => {
    const request = requests.find((item) => item.id === match.waitlist_request_id);
    const opening = openings.find((item) => item.id === match.opening_appointment_id);
    if (!request || !opening) return [];
    const target = targets.find((item) => item.id === request.appointment_id);
    const customer = customers.find((item) => item.id === request.customer_id);
    if (!target || !customer || target.status !== "confirmed") return [];
    return [{ match, request, opening, target, customer, available: availability.get(opening.id) ?? false }];
  });
}

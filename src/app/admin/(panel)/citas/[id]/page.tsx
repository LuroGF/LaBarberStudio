import Link from "next/link";
import { notFound } from "next/navigation";
import { EditAppointmentForm } from "./edit-form";
import {
  appointmentHistoryActionLabel,
  appointmentHistoryActorLabel,
  type AppointmentHistoryActor,
} from "@/lib/appointment-history";
import { requireAdmin } from "@/lib/auth";
import { addDaysStr, formatEuros, formatMadrid, todayMadrid } from "@/lib/schedule";
import { createServiceClient } from "@/lib/supabase/admin";
import { card } from "@/lib/ui";
import type { Service } from "@/lib/types";

type Customer = { id: string; full_name: string; phone: string; email: string | null };
type HistoryEntry = { id: number; actor_id: string | null; action: string; created_at: string };
const labels: Record<string, string> = { pending: "Pendiente", confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada", no_show: "No presentada", rejected: "Rechazada", expired: "Caducada" };

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const serviceClient = createServiceClient();
  const [{ data }, { data: services }, { data: settings }, { data: history }] = await Promise.all([
    supabase.from("appointments").select("id, service_id, service_name, price_cents, starts_at, ends_at, status, customer_notes, private_notes, customers(id, full_name, phone, email)").eq("id", id).maybeSingle(),
    supabase.from("services").select("id, name, description, price_cents, duration_minutes, is_active, sort_order").eq("is_active", true).is("deleted_at", null).order("sort_order"),
    supabase.from("business_settings").select("max_advance_days").eq("id", true).single(),
    serviceClient.from("appointment_history").select("id, actor_id, action, created_at").eq("appointment_id", id).order("created_at", { ascending: false }),
  ]);
  if (!data) notFound();

  const historyEntries = (history ?? []) as HistoryEntry[];
  const actorIds = [...new Set(historyEntries.flatMap((entry) => entry.actor_id ? [entry.actor_id] : []))];
  const actors = new Map<string, AppointmentHistoryActor>();
  if (actorIds.length > 0) {
    const { data: actorProfiles } = await serviceClient
      .from("profiles")
      .select("id, full_name, login_username")
      .in("id", actorIds);
    for (const actor of actorProfiles ?? []) actors.set(actor.id, actor);
  }

  const customer = (Array.isArray(data.customers) ? data.customers[0] : data.customers) as Customer | null;
  const editable = ["pending", "confirmed"].includes(data.status) && (services ?? []).length > 0;
  const minDate = todayMadrid();
  return <div className="space-y-6">
    <div><Link href="/admin/citas" className="text-sm text-muted underline">← Agenda</Link><div className="mt-3 flex items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">{data.service_name}</h1><p className="mt-1 capitalize text-muted">{formatMadrid(data.starts_at, "EEEE d 'de' MMMM · HH:mm")}</p></div><span className="rounded-full border border-graphite px-3 py-1 text-xs text-muted">{labels[data.status] ?? data.status}</span></div></div>
    <section className={`${card} space-y-2`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{customer?.full_name ?? "Cliente"}</p><p className="text-sm text-muted">{data.service_name} · {formatEuros(data.price_cents)}</p></div>{customer && <Link href={`/admin/clientes/${customer.id}`} className="text-sm underline">Ver cliente</Link>}</div>{customer && <div className="flex flex-wrap gap-3 pt-2 text-sm"><a href={`tel:${customer.phone}`} className="underline">{customer.phone}</a><a href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="underline">WhatsApp</a>{customer.email && <a href={`mailto:${customer.email}`} className="underline">Correo</a>}</div>}</section>
    {editable ? <section className={card}><EditAppointmentForm appointment={data} services={(services ?? []) as Service[]} minDate={minDate} maxDate={addDaysStr(minDate, settings?.max_advance_days ?? 30)} /></section> : <p className={`${card} text-sm text-muted`}>Esta cita ya no se puede reprogramar porque su estado es {labels[data.status]?.toLowerCase() ?? data.status}.</p>}
    <section className={card}>
      <div className="mb-4">
        <h2 className="font-semibold">Actividad</h2>
        <p className="mt-1 text-sm text-muted">Cambios registrados en esta cita.</p>
      </div>
      {historyEntries.length > 0 ? (
        <ol className="space-y-0">
          {historyEntries.map((entry, index) => (
            <li key={entry.id} className="grid grid-cols-[0.75rem_1fr] gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1.5 size-2 rounded-full bg-gold" />
                {index < historyEntries.length - 1 && <span className="mt-1 w-px flex-1 bg-graphite" />}
              </div>
              <div className={index < historyEntries.length - 1 ? "pb-5" : ""}>
                <p className="text-sm font-semibold">{appointmentHistoryActionLabel(entry.action)}</p>
                <p className="mt-1 text-xs text-muted">
                  {appointmentHistoryActorLabel(entry.actor_id, entry.actor_id ? actors.get(entry.actor_id) : undefined)} · {formatMadrid(entry.created_at, "d MMM yyyy · HH:mm")}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">Todavía no hay actividad registrada.</p>
      )}
    </section>
  </div>;
}

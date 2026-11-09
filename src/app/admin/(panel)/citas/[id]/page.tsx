import Link from "next/link";
import { notFound } from "next/navigation";
import { EditAppointmentForm } from "./edit-form";
import { requireAdmin } from "@/lib/auth";
import { addDaysStr, formatEuros, formatMadrid, todayMadrid } from "@/lib/schedule";
import { card } from "@/lib/ui";
import type { Service } from "@/lib/types";

type Customer = { id: string; full_name: string; phone: string; email: string | null };
const labels: Record<string, string> = { pending: "Pendiente", confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada", no_show: "No presentada", rejected: "Rechazada", expired: "Caducada" };

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data }, { data: services }, { data: settings }] = await Promise.all([
    supabase.from("appointments").select("id, service_id, service_name, price_cents, starts_at, ends_at, status, customer_notes, private_notes, customers(id, full_name, phone, email)").eq("id", id).maybeSingle(),
    supabase.from("services").select("id, name, description, price_cents, duration_minutes, is_active, sort_order").eq("is_active", true).is("deleted_at", null).order("sort_order"),
    supabase.from("business_settings").select("max_advance_days").eq("id", true).single(),
  ]);
  if (!data) notFound();
  const customer = (Array.isArray(data.customers) ? data.customers[0] : data.customers) as Customer | null;
  const editable = ["pending", "confirmed"].includes(data.status) && (services ?? []).length > 0;
  const minDate = todayMadrid();
  return <div className="space-y-6">
    <div><Link href="/admin/citas" className="text-sm text-muted underline">← Agenda</Link><div className="mt-3 flex items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">{data.service_name}</h1><p className="mt-1 capitalize text-muted">{formatMadrid(data.starts_at, "EEEE d 'de' MMMM · HH:mm")}</p></div><span className="rounded-full border border-graphite px-3 py-1 text-xs text-muted">{labels[data.status] ?? data.status}</span></div></div>
    <section className={`${card} space-y-2`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{customer?.full_name ?? "Cliente"}</p><p className="text-sm text-muted">{data.service_name} · {formatEuros(data.price_cents)}</p></div>{customer && <Link href={`/admin/clientes/${customer.id}`} className="text-sm underline">Ver cliente</Link>}</div>{customer && <div className="flex flex-wrap gap-3 pt-2 text-sm"><a href={`tel:${customer.phone}`} className="underline">{customer.phone}</a><a href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="underline">WhatsApp</a>{customer.email && <a href={`mailto:${customer.email}`} className="underline">Correo</a>}</div>}</section>
    {editable ? <section className={card}><EditAppointmentForm appointment={data} services={(services ?? []) as Service[]} minDate={minDate} maxDate={addDaysStr(minDate, settings?.max_advance_days ?? 30)} /></section> : <p className={`${card} text-sm text-muted`}>Esta cita ya no se puede reprogramar porque su estado es {labels[data.status]?.toLowerCase() ?? data.status}.</p>}
  </div>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerForm } from "./customer-form";
import { requireAdmin } from "@/lib/auth";
import { formatEuros, formatMadrid } from "@/lib/schedule";
import { card } from "@/lib/ui";

type Appointment = { id: string; starts_at: string; service_name: string; price_cents: number; status: string };
const statuses: Record<string, string> = { pending: "Pendiente", confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada", no_show: "No presentada", rejected: "Rechazada", expired: "Caducada" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("customers").select("id, full_name, phone, email, internal_notes, appointments(id, starts_at, service_name, price_cents, status)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const appointments = ([...(data.appointments ?? [])] as Appointment[]).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/clientes" className="text-sm text-muted underline underline-offset-4">← Clientes</Link>
        <h1 className="mt-3 text-2xl font-semibold">{data.full_name}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a href={`tel:${data.phone}`} className="underline underline-offset-4">{data.phone}</a>
          <a href={`https://wa.me/${data.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">WhatsApp</a>
        </div>
      </div>
      <section className={card}><h2 className="mb-4 font-semibold">Ficha del cliente</h2><CustomerForm customer={data} /></section>
      <section className="space-y-3">
        <h2 className="font-semibold">Historial ({appointments.length})</h2>
        {appointments.length === 0 ? <p className={`${card} text-sm text-muted`}>Sin citas todavía.</p> : appointments.map((appointment) => (
          <div key={appointment.id} className={`${card} flex items-start justify-between gap-3`}>
            <div><p className="font-semibold capitalize">{formatMadrid(appointment.starts_at, "EEE d MMM yyyy · HH:mm")}</p><p className="mt-1 text-sm text-muted">{appointment.service_name} · {formatEuros(appointment.price_cents)}</p></div>
            <span className="text-xs text-muted">{statuses[appointment.status] ?? appointment.status}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

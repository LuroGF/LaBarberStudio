import Link from "next/link";
import { CreateAppointmentForm } from "./create-form";
import { requireAdmin } from "@/lib/auth";
import { addDaysStr, todayMadrid } from "@/lib/schedule";
import { card } from "@/lib/ui";
import type { Service } from "@/lib/types";

export const metadata = { title: "Nueva cita | LA BARBER STUDIO" };

export default async function NewAppointmentPage() {
  const { supabase } = await requireAdmin();
  const [{ data: services }, { data: settings }] = await Promise.all([
    supabase.from("services").select("id, name, description, price_cents, duration_minutes, is_active, sort_order").eq("is_active", true).is("deleted_at", null).order("sort_order"),
    supabase.from("business_settings").select("max_advance_days").eq("id", true).single(),
  ]);
  const minDate = todayMadrid();
  return <div className="space-y-5">
    <div><Link href="/admin/citas" className="text-sm text-muted underline">← Agenda</Link><h1 className="mt-3 text-2xl font-semibold">Nueva cita</h1><p className="mt-1 text-sm text-muted">Para reservas recibidas por teléfono, WhatsApp o en persona.</p></div>
    {(services ?? []).length === 0 ? <p className={`${card} text-sm text-muted`}>Necesitas al menos un servicio activo.</p> : <section className={card}><CreateAppointmentForm services={(services ?? []) as Service[]} minDate={minDate} maxDate={addDaysStr(minDate, settings?.max_advance_days ?? 30)} /></section>}
  </div>;
}

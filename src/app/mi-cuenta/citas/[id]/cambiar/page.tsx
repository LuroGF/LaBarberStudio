import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireCustomer } from "@/lib/customer-auth";
import { addDaysStr, todayMadrid } from "@/lib/schedule";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Service } from "@/lib/types";
import { RescheduleForm } from "./reschedule-form";

export const instant = false;

export default async function ReschedulePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ customer }, { id }] = await Promise.all([requireCustomer(), params]);
  const admin = createServiceClient();
  const [{ data: appointment }, { data: services }, { data: settings }] = await Promise.all([
    admin.from("appointments").select("id, service_id, service_name, starts_at, status").eq("id", id).eq("customer_id", customer.id).maybeSingle(),
    admin.from("services").select("id, name, description, price_cents, duration_minutes, is_active, sort_order").eq("is_active", true).is("deleted_at", null).order("sort_order"),
    admin.from("business_settings").select("max_advance_days").eq("id", true).single(),
  ]);
  if (!appointment || !["pending", "confirmed"].includes(appointment.status)) notFound();
  const minDate = todayMadrid();
  const maxDate = addDaysStr(minDate, settings?.max_advance_days ?? 30);

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 py-8 sm:py-12">
      <Link href="/mi-cuenta" className="inline-flex items-center gap-2 text-sm text-muted"><ArrowLeft className="size-4" /> Mis citas</Link>
      <h1 className="mt-6 text-3xl font-extrabold">CAMBIAR CITA</h1>
      <p className="mt-2 text-sm text-muted">Elige un nuevo servicio, día y hora. El cambio se aplicará al confirmar.</p>
      <RescheduleForm
        appointmentId={appointment.id}
        currentServiceId={appointment.service_id ?? ""}
        services={(services ?? []) as Service[]}
        minDate={minDate}
        maxDate={maxDate}
      />
    </main>
  );
}


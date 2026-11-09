import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { BookingForm } from "./booking-form";
import { Wordmark } from "@/components/wordmark";
import { addDaysStr, todayMadrid } from "@/lib/schedule";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Service } from "@/lib/types";

export const metadata = {
  title: "Reservar cita | LA BARBER STUDIO",
  description: "Elige servicio, día y hora para reservar tu cita en LA BARBER STUDIO.",
};

async function BookingContent() {
  await connection();
  const supabase = createServiceClient();
  const [{ data: servicesData, error: servicesError }, { data: settings }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, description, price_cents, duration_minutes, is_active, sort_order")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order")
      .order("created_at"),
    supabase.from("business_settings").select("max_advance_days").eq("id", true).single(),
  ]);

  const services = (servicesData ?? []) as Service[];
  const minDate = todayMadrid();
  const maxDate = addDaysStr(minDate, settings?.max_advance_days ?? 30);

  return (
    <>
      {servicesError ? (
        <div role="alert" className="rounded-2xl border border-graphite bg-surface p-5 text-center">
          <p className="font-semibold">No hemos podido cargar los servicios</p>
          <p className="mt-1 text-sm text-muted">Inténtalo de nuevo dentro de unos minutos.</p>
        </div>
      ) : (
        <BookingForm services={services} minDate={minDate} maxDate={maxDate} />
      )}
    </>
  );
}

function BookingFallback() {
  return (
    <div className="space-y-3" aria-label="Cargando servicios">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-2xl border border-graphite bg-surface" />
      ))}
    </div>
  );
}

export default function BookingPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-xl px-5 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <Link href="/" aria-label="Volver al inicio">
          <Wordmark className="text-3xl" />
        </Link>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">RESERVA TU CITA</h1>
        <p className="mt-2 text-sm text-muted">Elige lo que necesitas y encuentra tu mejor momento.</p>
      </header>
      <Suspense fallback={<BookingFallback />}>
        <BookingContent />
      </Suspense>
    </main>
  );
}


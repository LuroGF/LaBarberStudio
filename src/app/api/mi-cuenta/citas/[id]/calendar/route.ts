import { appointmentIcs } from "@/lib/calendar";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  // RLS limita la consulta a las citas del cliente autenticado.
  const [{ data: appointment }, { data: settings }] = await Promise.all([
    supabase.from("appointments").select("id, service_name, starts_at, ends_at").eq("id", id).maybeSingle(),
    supabase.from("business_settings").select("address").eq("id", true).single(),
  ]);
  if (!appointment) return new Response("Cita no encontrada", { status: 404 });

  const body = appointmentIcs({
    id: appointment.id,
    serviceName: appointment.service_name,
    startsAt: appointment.starts_at,
    endsAt: appointment.ends_at,
  }, settings?.address ?? "LA BARBER STUDIO");
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="cita-la-barber-${appointment.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}


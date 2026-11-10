import { appointmentIcs } from "@/lib/calendar";
import { hashManageToken, MANAGE_TOKEN_RE } from "@/lib/booking";
import { createServiceClient } from "@/lib/supabase/admin";

type TokenAppointment = {
  out_id: string;
  out_service_name: string;
  out_starts_at: string;
  out_ends_at: string;
};

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!MANAGE_TOKEN_RE.test(token)) return new Response("Cita no encontrada", { status: 404 });
  const admin = createServiceClient();
  const [{ data }, { data: settings }] = await Promise.all([
    admin.rpc("get_appointment_by_token", { p_token_hash: hashManageToken(token) }),
    admin.from("business_settings").select("address").eq("id", true).single(),
  ]);
  const appointment = (Array.isArray(data) ? data[0] : null) as TokenAppointment | null;
  if (!appointment) return new Response("Cita no encontrada", { status: 404 });
  const body = appointmentIcs({
    id: appointment.out_id,
    serviceName: appointment.out_service_name,
    startsAt: appointment.out_starts_at,
    endsAt: appointment.out_ends_at,
  }, settings?.address ?? "LA BARBER STUDIO");
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="cita-la-barber-${appointment.out_id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}


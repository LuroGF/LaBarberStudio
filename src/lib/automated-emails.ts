import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatMadrid } from "@/lib/schedule";
import { getEmailConfig, sendTransactionalEmail } from "@/lib/email-cloud";

type Customer = { full_name: string; email: string | null };
type Appointment = { service_name: string; starts_at: string; status: string; customers: Customer | Customer[] | null };
type Event = { id: string; event_type: string; appointments: Appointment | Appointment[] | null };

const subjects: Record<string, string> = {
  request_created: "Hemos recibido tu cita",
  approved: "Tu cita está confirmada",
  rejected: "Actualización sobre tu solicitud",
  modified: "Tu cita ha cambiado",
  cancelled: "Tu cita ha sido cancelada",
  reminder: "Recordatorio de tu cita",
};

const messages: Record<string, string> = {
  request_created: "Hemos recibido tu solicitud de cita.",
  approved: "Tu cita está confirmada.",
  rejected: "No hemos podido aceptar esta solicitud de cita.",
  modified: "Hemos actualizado los datos de tu cita.",
  cancelled: "Tu cita ha sido cancelada.",
  reminder: "Te recordamos que tienes una cita próximamente.",
};

export async function processPendingEmailNotifications(supabase: SupabaseClient, limit = 25) {
  const config = getEmailConfig();
  const result = { enabled: Boolean(config), processed: 0, sent: 0, failed: 0, skipped: 0 };
  if (!config) return result;
  const { data: claimed, error: claimError } = await supabase.rpc("claim_email_notification_events", { p_after: config.startAt, p_limit: limit });
  if (claimError) throw claimError;
  const ids = (claimed ?? []).map((row: { id: string }) => row.id);
  if (!ids.length) return result;

  const [{ data, error }, { data: settings }] = await Promise.all([
    supabase.from("notification_events").select("id, event_type, appointments(service_name, starts_at, status, customers(full_name, email))").in("id", ids),
    supabase.from("business_settings").select("business_name").eq("id", true).single(),
  ]);
  if (error) throw error;
  const businessName = settings?.business_name ?? "LA BARBER STUDIO";

  for (const event of (data ?? []) as unknown as Event[]) {
    result.processed += 1;
    const appointment = Array.isArray(event.appointments) ? event.appointments[0] : event.appointments;
    const customer = appointment && (Array.isArray(appointment.customers) ? appointment.customers[0] : appointment.customers);
    if (!appointment || !customer?.email) {
      await supabase.from("notification_events").update({ status: "skipped", processing_started_at: null, error: customer ? "CUSTOMER_EMAIL_MISSING" : "APPOINTMENT_OR_CUSTOMER_MISSING" }).eq("id", event.id).eq("status", "processing");
      result.skipped += 1;
      continue;
    }
    try {
      const emailId = await sendTransactionalEmail(config, {
        eventId: event.id,
        to: customer.email,
        subject: `${subjects[event.event_type] ?? "Actualización de tu cita"} · ${businessName}`,
        html: renderAppointmentEmail({ businessName, customerName: customer.full_name, message: messages[event.event_type] ?? "Tenemos una actualización sobre tu cita.", service: appointment.service_name, startsAt: appointment.starts_at, siteUrl: config.siteUrl }),
      });
      await supabase.from("notification_events").update({ status: "sent", sent_at: new Date().toISOString(), processing_started_at: null, error: null, payload: { email_id: emailId } }).eq("id", event.id).eq("status", "processing");
      result.sent += 1;
    } catch (error) {
      await supabase.from("notification_events").update({ status: "failed", processing_started_at: null, error: safeError(error) }).eq("id", event.id).eq("status", "processing");
      result.failed += 1;
    }
  }
  return result;
}

function renderAppointmentEmail(input: { businessName: string; customerName: string; message: string; service: string; startsAt: string; siteUrl: string }) {
  const date = formatMadrid(input.startsAt, "EEEE d 'de' MMMM");
  const time = formatMadrid(input.startsAt, "HH:mm");
  return `<!doctype html><html lang="es"><body style="margin:0;background:#111;color:#f5f5f5;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;padding:36px 20px"><p style="font-size:12px;letter-spacing:3px;color:#c9a45c;font-weight:700">${escapeHtml(input.businessName)}</p><div style="margin-top:20px;border:1px solid #333;border-radius:20px;background:#1d1d1d;padding:28px"><h1 style="margin:0;font-size:24px">Hola ${escapeHtml(input.customerName)}</h1><p style="margin:16px 0;color:#c7c7c7;line-height:1.6">${escapeHtml(input.message)}</p><div style="margin-top:24px;padding:18px;border-radius:14px;background:#111"><p style="margin:0 0 8px;font-weight:700">${escapeHtml(input.service)}</p><p style="margin:0;color:#c7c7c7;text-transform:capitalize">${escapeHtml(date)} · ${escapeHtml(time)}</p></div><a href="${escapeHtml(input.siteUrl)}/mi-cuenta" style="display:inline-block;margin-top:24px;border-radius:999px;background:#c9a45c;color:#111;text-decoration:none;font-weight:700;padding:14px 22px">VER MIS CITAS</a></div><p style="margin-top:20px;color:#777;font-size:12px;line-height:1.5">Este es un mensaje operativo relacionado con una cita. No contiene publicidad.</p></div></body></html>`;
}

function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char); }
function safeError(error: unknown) { return error instanceof Error ? error.message.slice(0, 300) : "EMAIL_UNKNOWN_ERROR"; }


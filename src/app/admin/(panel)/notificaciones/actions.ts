"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getEmailConfig, sendTransactionalEmail } from "@/lib/email-cloud";
import { queueAppointmentReminders } from "@/lib/reminders";
import { formatMadrid } from "@/lib/schedule";

export type ReminderState = { ok?: string; error?: string };
export type WaitlistEmailState = { ok?: string; error?: string };

export async function prepareReminders(): Promise<ReminderState> {
  const { supabase } = await requireAdmin();
  try {
    const now = new Date();
    const count = await queueAppointmentReminders(supabase, now, new Date(now.getTime() + 48 * 60 * 60 * 1000));
    revalidatePath("/admin/notificaciones");
    revalidatePath("/admin");
    return { ok: count === 0 ? "No había recordatorios nuevos para las próximas 48 horas." : `${count} ${count === 1 ? "recordatorio preparado" : "recordatorios preparados"}.` };
  } catch {
    return { error: "No se han podido preparar los recordatorios." };
  }
}

export async function setNotificationStatus(id: string, status: "sent" | "skipped") {
  if (!z.string().uuid().safeParse(id).success || !["sent", "skipped"].includes(status)) return;
  const { supabase } = await requireAdmin();
  await supabase.from("notification_events").update({ status, sent_at: status === "sent" ? new Date().toISOString() : null, error: null }).eq("id", id).in("status", ["pending", "failed"]);
  revalidatePath("/admin/notificaciones");
  revalidatePath("/admin");
}

export async function setWaitlistMatchStatus(id: string, status: "sent" | "skipped") {
  if (!z.string().uuid().safeParse(id).success || !["sent", "skipped"].includes(status)) return;
  const { supabase } = await requireAdmin();
  await supabase.from("waitlist_matches").update({
    status,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  }).eq("id", id).eq("status", "pending");
  revalidatePath("/admin/notificaciones");
}

export async function sendWaitlistMatchEmail(id: string): Promise<WaitlistEmailState> {
  if (!z.string().uuid().safeParse(id).success) return { error: "El aviso no es válido." };
  const config = getEmailConfig();
  if (!config) return { error: "Brevo no está configurado completamente." };

  const { supabase } = await requireAdmin();
  const { data: match, error: matchError } = await supabase
    .from("waitlist_matches")
    .select("id, waitlist_request_id, opening_appointment_id, status")
    .eq("id", id)
    .maybeSingle();
  if (matchError || !match || match.status !== "pending") return { error: "Este aviso ya no está pendiente." };

  const { data: request, error: requestError } = await supabase
    .from("waitlist_requests")
    .select("appointment_id, customer_id, is_active")
    .eq("id", match.waitlist_request_id)
    .maybeSingle();
  if (requestError || !request || !request.is_active) return { error: "La solicitud de huecos ya no está activa." };

  const [{ data: opening }, { data: target }, { data: customer }, { data: settings }] = await Promise.all([
    supabase.from("appointments").select("barber_id, service_id, service_name, starts_at, status").eq("id", match.opening_appointment_id).maybeSingle(),
    supabase.from("appointments").select("status").eq("id", request.appointment_id).maybeSingle(),
    supabase.from("customers").select("full_name, email").eq("id", request.customer_id).maybeSingle(),
    supabase.from("business_settings").select("business_name").eq("id", true).maybeSingle(),
  ]);
  if (!opening || opening.status !== "cancelled" || !opening.service_id || target?.status !== "confirmed") {
    return { error: "El hueco o la cita del cliente ya no están disponibles." };
  }
  if (!customer?.email) return { error: "El cliente no tiene un correo guardado." };

  const { data: slots, error: slotsError } = await supabase.rpc("get_slots", {
    p_service_id: opening.service_id,
    p_date: formatMadrid(opening.starts_at, "yyyy-MM-dd"),
    p_barber_id: opening.barber_id,
  });
  const available = !slotsError && (slots ?? []).some((slot: { slot_start: string }) =>
    new Date(slot.slot_start).getTime() === new Date(opening.starts_at).getTime());
  if (!available) return { error: "El hueco acaba de ocuparse. No se ha enviado el correo." };

  const businessName = settings?.business_name ?? "LA BARBER STUDIO";
  try {
    await sendTransactionalEmail(config, {
      eventId: match.id,
      to: customer.email,
      subject: `Se ha liberado un hueco · ${businessName}`,
      html: renderWaitlistEmail({
        businessName,
        customerName: customer.full_name,
        serviceName: opening.service_name,
        startsAt: opening.starts_at,
        changeUrl: `${config.siteUrl}/mi-cuenta/citas/${request.appointment_id}/cambiar`,
      }),
    });
  } catch {
    return { error: "Brevo no ha podido enviar el correo. Inténtalo de nuevo en unos minutos." };
  }

  const { error: updateError } = await supabase.from("waitlist_matches").update({
    status: "sent",
    sent_at: new Date().toISOString(),
  }).eq("id", id).eq("status", "pending");
  if (updateError) return { error: "El correo se envió, pero no se pudo cerrar el aviso." };
  revalidatePath("/admin/notificaciones");
  return { ok: `Correo enviado a ${customer.full_name}.` };
}

function renderWaitlistEmail(input: { businessName: string; customerName: string; serviceName: string; startsAt: string; changeUrl: string }) {
  const date = formatMadrid(input.startsAt, "EEEE d 'de' MMMM");
  const time = formatMadrid(input.startsAt, "HH:mm");
  return `<!doctype html><html lang="es"><body style="margin:0;background:#111;color:#f5f5f5;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;padding:36px 20px"><p style="font-size:12px;letter-spacing:3px;color:#c9a45c;font-weight:700">${escapeHtml(input.businessName)}</p><div style="margin-top:20px;border:1px solid #333;border-radius:20px;background:#1d1d1d;padding:28px"><h1 style="margin:0;font-size:24px">Hola ${escapeHtml(input.customerName)}</h1><p style="margin:16px 0;color:#c7c7c7;line-height:1.6">Se ha liberado un hueco antes de tu cita actual. Si te interesa, puedes intentar adelantarla mientras siga disponible.</p><div style="margin-top:24px;padding:18px;border-radius:14px;background:#111"><p style="margin:0 0 8px;font-weight:700">${escapeHtml(input.serviceName)}</p><p style="margin:0;color:#c7c7c7">${escapeHtml(date)} · ${escapeHtml(time)}</p></div><a href="${escapeHtml(input.changeUrl)}" style="display:inline-block;margin-top:24px;border-radius:999px;background:#c9a45c;color:#111;text-decoration:none;font-weight:700;padding:14px 22px">CAMBIAR MI CITA</a><p style="margin:20px 0 0;color:#888;font-size:12px;line-height:1.5">El hueco se asignará a la primera persona que confirme el cambio.</p></div><p style="margin-top:20px;color:#777;font-size:12px;line-height:1.5">Este es un mensaje operativo solicitado desde la lista de espera. No contiene publicidad.</p></div></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);
}

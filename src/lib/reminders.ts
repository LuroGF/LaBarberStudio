import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Añade avisos manuales sin repetir citas que ya tuvieron recordatorio. */
export async function queueAppointmentReminders(supabase: SupabaseClient, from: Date, to: Date): Promise<number> {
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("id")
    .eq("status", "confirmed")
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString());
  if (error) throw error;
  const ids = (appointments ?? []).map((appointment: { id: string }) => appointment.id);
  if (ids.length === 0) return 0;

  const { data: existing, error: existingError } = await supabase
    .from("notification_events")
    .select("appointment_id")
    .eq("event_type", "reminder")
    .in("appointment_id", ids);
  if (existingError) throw existingError;
  const queued = new Set((existing ?? []).map((event: { appointment_id: string | null }) => event.appointment_id));
  const rows = ids.filter((id) => !queued.has(id)).map((appointment_id) => ({ appointment_id, event_type: "reminder", channel: "whatsapp_manual" }));
  if (rows.length === 0) return 0;
  const { error: insertError } = await supabase.from("notification_events").insert(rows);
  if (insertError) throw insertError;
  return rows.length;
}

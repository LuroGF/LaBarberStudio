"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { processWhatsAppAfterResponse } from "@/lib/automated-notifications";

const statusSchema = z.enum(["confirmed", "completed", "cancelled", "no_show", "rejected"]);

const transitions: Record<string, string[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
};

export async function changeAppointmentStatus(id: string, nextStatus: string): Promise<void> {
  if (!z.string().uuid().safeParse(id).success) return;
  const parsedStatus = statusSchema.safeParse(nextStatus);
  if (!parsedStatus.success) return;

  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("appointments").select("status").eq("id", id).maybeSingle();
  if (!data || !transitions[data.status]?.includes(parsedStatus.data)) return;

  const { data: updated } = await supabase
    .from("appointments")
    .update({ status: parsedStatus.data })
    .eq("id", id)
    .eq("status", data.status)
    .select("id")
    .maybeSingle();
  if (!updated) return;

  const eventType = parsedStatus.data === "confirmed" ? "approved"
    : parsedStatus.data === "rejected" ? "rejected"
      : parsedStatus.data === "cancelled" ? "cancelled"
        : null;
  if (eventType) {
    await supabase.from("notification_events").insert({ appointment_id: id, event_type: eventType, channel: "whatsapp_manual" });
    processWhatsAppAfterResponse();
  }
  revalidatePath("/admin");
  revalidatePath("/admin/citas");
  revalidatePath("/admin/notificaciones");
}


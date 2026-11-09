"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { queueAppointmentReminders } from "@/lib/reminders";

export type ReminderState = { ok?: string; error?: string };

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
  await supabase.from("notification_events").update({ status, sent_at: status === "sent" ? new Date().toISOString() : null }).eq("id", id).eq("status", "pending");
  revalidatePath("/admin/notificaciones");
  revalidatePath("/admin");
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { formatMadrid } from "@/lib/schedule";
import { createServiceClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/types";

const schema = z.object({
  id: z.string().uuid(), serviceId: z.string().uuid(),
  slot: z.union([z.literal(""), z.string().datetime({ offset: true })]),
  notes: z.string().trim().max(500, "Las observaciones admiten 500 caracteres como máximo."),
  privateNotes: z.string().trim().max(2000, "Las notas internas admiten 2.000 caracteres como máximo."),
});
const value = (formData: FormData, name: string) => typeof formData.get(name) === "string" ? formData.get(name) as string : "";

export async function updateAppointment(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse({ id: value(formData, "id"), serviceId: value(formData, "serviceId"), slot: value(formData, "slot"), notes: value(formData, "notes"), privateNotes: value(formData, "privateNotes") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase } = await requireAdmin();
  const { data: current } = await supabase.from("appointments").select("service_id, status").eq("id", parsed.data.id).maybeSingle();
  if (!current) return { error: "La cita ya no existe." };
  if (!["pending", "confirmed"].includes(current.status)) return { error: "Solo se pueden editar citas pendientes o confirmadas." };

  const changingService = current.service_id !== parsed.data.serviceId;
  if (changingService && !parsed.data.slot) return { error: "Al cambiar de servicio debes elegir una nueva hora." };
  const update: Record<string, string | number | null> = {
    customer_notes: parsed.data.notes || null,
    private_notes: parsed.data.privateNotes || null,
  };
  let moved = false;
  if (parsed.data.slot) {
    const { data: service } = await supabase.from("services").select("id, name, price_cents, duration_minutes").eq("id", parsed.data.serviceId).eq("is_active", true).is("deleted_at", null).maybeSingle();
    if (!service) return { error: "El servicio seleccionado ya no está disponible." };
    const serviceClient = createServiceClient();
    const { data: slots, error: slotsError } = await serviceClient.rpc("get_slots", {
      p_service_id: service.id, p_date: formatMadrid(parsed.data.slot, "yyyy-MM-dd"), p_barber_id: null,
    });
    if (slotsError || !(slots ?? []).some((item: { slot_start: string }) => item.slot_start === parsed.data.slot)) {
      return { error: "Esa hora ya no está disponible. Elige otra." };
    }
    const endsAt = new Date(new Date(parsed.data.slot).getTime() + service.duration_minutes * 60_000).toISOString();
    Object.assign(update, { service_id: service.id, service_name: service.name, price_cents: service.price_cents, duration_minutes: service.duration_minutes, starts_at: parsed.data.slot, ends_at: endsAt, status: "confirmed" });
    moved = true;
  }
  const { error } = await supabase.from("appointments").update(update).eq("id", parsed.data.id);
  if (error) return { error: error.code === "23P01" ? "Esa hora se solapa con otra cita." : "No se ha podido guardar la cita." };
  if (moved) await supabase.from("notification_events").insert({ appointment_id: parsed.data.id, event_type: "modified", channel: "whatsapp_manual" });
  revalidatePath("/admin");
  revalidatePath("/admin/citas");
  revalidatePath(`/admin/citas/${parsed.data.id}`);
  revalidatePath("/admin/notificaciones");
  return { ok: moved ? "Cita reprogramada." : "Notas guardadas." };
}

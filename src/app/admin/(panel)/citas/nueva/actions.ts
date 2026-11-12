"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { processWhatsAppAfterResponse } from "@/lib/automated-notifications";
import { bookingErrorMessage, createManageToken, hashManageToken } from "@/lib/booking";
import { createServiceClient } from "@/lib/supabase/admin";

const schema = z.object({
  serviceId: z.string().uuid(),
  slot: z.string().datetime({ offset: true }),
  fullName: z.string().trim().min(2, "Escribe el nombre del cliente.").max(120),
  phone: z.string().trim().min(9, "Escribe un teléfono válido.").max(24),
  email: z.union([z.literal(""), z.string().trim().email("El correo no es válido.").max(254)]),
  notes: z.string().trim().max(500, "Las observaciones admiten 500 caracteres como máximo."),
});

export type AdminBookingState = { error?: string; ok?: string; token?: string; appointmentId?: string };
const value = (formData: FormData, name: string) => typeof formData.get(name) === "string" ? formData.get(name) as string : "";

export async function createAdminBooking(_previous: AdminBookingState, formData: FormData): Promise<AdminBookingState> {
  const parsed = schema.safeParse({
    serviceId: value(formData, "serviceId"), slot: value(formData, "slot"), fullName: value(formData, "fullName"),
    phone: value(formData, "phone"), email: value(formData, "email"), notes: value(formData, "notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { supabase, user } = await requireAdmin();
  const token = createManageToken();
  const data = parsed.data;
  const serviceClient = createServiceClient();
  const { data: created, error } = await serviceClient.rpc("create_appointment", {
    p_service_id: data.serviceId, p_starts_at: data.slot, p_full_name: data.fullName, p_phone: data.phone,
    p_email: data.email || null, p_notes: data.notes || null, p_token_hash: hashManageToken(token),
  });
  if (error) return { error: bookingErrorMessage(error.message) };
  const appointment = Array.isArray(created) ? created[0] as { out_id?: string } | undefined : undefined;
  if (!appointment?.out_id) return { error: "No se ha podido crear la cita." };

  const { error: confirmError } = await supabase.from("appointments").update({ status: "confirmed", created_by: user.id }).eq("id", appointment.out_id);
  if (confirmError) return { error: "La cita se creó, pero no se pudo confirmar automáticamente. Revísala en la agenda." };
  processWhatsAppAfterResponse();
  revalidatePath("/admin");
  revalidatePath("/admin/citas");
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/notificaciones");
  return { ok: "Cita creada y confirmada.", token, appointmentId: appointment.out_id };
}

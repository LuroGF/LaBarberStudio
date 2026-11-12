"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { bookingErrorMessage, createManageToken, hashManageToken } from "@/lib/booking";
import { processWhatsAppAfterResponse } from "@/lib/automated-notifications";
import { createServiceClient } from "@/lib/supabase/admin";

const schema = z.object({
  serviceId: z.string().uuid(),
  slot: z.string().datetime({ offset: true }),
  fullName: z.string().trim().min(2, "Escribe tu nombre.").max(120),
  phone: z.string().trim().min(9, "Escribe un teléfono válido.").max(24),
  email: z.union([z.literal(""), z.string().trim().email("Escribe un correo válido.").max(254)]),
  notes: z.string().trim().max(500, "Las observaciones admiten 500 caracteres como máximo."),
  consent: z.literal("on", { error: "Debes aceptar el uso de tus datos para gestionar la cita." }),
  whatsappConsent: z.boolean(),
});

export type BookingActionState = { error?: string };

const value = (formData: FormData, name: string) => {
  const item = formData.get(name);
  return typeof item === "string" ? item : "";
};

export async function createBooking(
  _previous: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = schema.safeParse({
    serviceId: value(formData, "serviceId"),
    slot: value(formData, "slot"),
    fullName: value(formData, "fullName"),
    phone: value(formData, "phone"),
    email: value(formData, "email"),
    notes: value(formData, "notes"),
    consent: value(formData, "consent"),
    whatsappConsent: value(formData, "whatsappConsent") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const token = createManageToken();
  const data = parsed.data;
  const supabase = createServiceClient();
  const { data: appointment, error } = await supabase.rpc("create_appointment", {
    p_service_id: data.serviceId,
    p_starts_at: data.slot,
    p_full_name: data.fullName,
    p_phone: data.phone,
    p_email: data.email || null,
    p_notes: data.notes || null,
    p_token_hash: hashManageToken(token),
  });

  if (error) return { error: bookingErrorMessage(error.message) };
  if (!Array.isArray(appointment) || appointment.length === 0) {
    return { error: "La cita no se ha podido confirmar. Inténtalo de nuevo." };
  }

  if (data.whatsappConsent) {
    const appointmentId = appointment[0]?.out_id;
    if (typeof appointmentId === "string") {
      const { data: savedAppointment } = await supabase
        .from("appointments")
        .select("customer_id")
        .eq("id", appointmentId)
        .maybeSingle();
      if (savedAppointment?.customer_id) {
        await supabase.from("customers").update({
          whatsapp_opt_in_at: new Date().toISOString(),
          whatsapp_opt_in_source: "booking",
        }).eq("id", savedAppointment.customer_id);
      }
    }
  }

  processWhatsAppAfterResponse();

  redirect(`/cita/${token}?created=1`);
}


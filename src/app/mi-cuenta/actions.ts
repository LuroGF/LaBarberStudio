"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { processWhatsAppAfterResponse } from "@/lib/automated-notifications";
import { requireCustomer } from "@/lib/customer-auth";
import { normalizePhone } from "@/lib/phone";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CustomerActionState = { error?: string; ok?: string };

const value = (formData: FormData, name: string) => {
  const item = formData.get(name);
  return typeof item === "string" ? item : "";
};

const credentialsSchema = z.object({
  email: z.string().trim().email("Introduce un correo válido.").max(254),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(200),
});

export async function loginCustomer(
  _previous: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const parsed = credentialsSchema.safeParse({
    email: value(formData, "email"),
    password: value(formData, "password"),
  });
  if (!parsed.success) return { error: "Introduce un correo válido y una contraseña de al menos 8 caracteres." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Correo o contraseña incorrectos, o el correo todavía no está confirmado." };
  redirect("/mi-cuenta");
}

const registerSchema = credentialsSchema.extend({
  phone: z.string().trim().min(9).max(24),
  fullName: z.string().trim().min(2, "Escribe tu nombre y apellidos.").max(120),
  consent: z.literal("on", { error: "Debes aceptar el uso de tus datos para crear la cuenta." }),
});

export async function registerCustomer(
  _previous: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const parsed = registerSchema.safeParse({
    email: value(formData, "email"),
    phone: value(formData, "phone"),
    password: value(formData, "password"),
    fullName: value(formData, "fullName"),
    consent: value(formData, "consent"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { error: "Introduce un número de teléfono válido." };

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/mi-cuenta`,
      data: { full_name: parsed.data.fullName, phone },
    },
  });
  if (error) return { error: "No se ha podido crear la cuenta. Revisa el correo o inténtalo más tarde." };

  if (data.session && data.user?.email_confirmed_at) redirect("/mi-cuenta");
  redirect("/mi-cuenta/verificar");
}

export async function requestCustomerPasswordReset(
  _previous: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const parsed = z.string().trim().email().max(254).safeParse(value(formData, "email"));
  if (!parsed.success) return { error: "Introduce un correo válido." };

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl}/auth/callback?next=/mi-cuenta/restablecer-password`,
  });
  if (error) return { error: "No se ha podido enviar el correo. Espera unos minutos e inténtalo de nuevo." };
  redirect("/mi-cuenta/recuperar");
}

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(200),
    confirmPassword: z.string().min(8).max(200),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export async function resetCustomerPassword(
  _previous: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: value(formData, "password"),
    confirmPassword: value(formData, "confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "El enlace ha caducado. Solicita uno nuevo." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "No se ha podido actualizar la contraseña." };
  redirect("/mi-cuenta");
}

export async function logoutCustomer() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe tu nombre y apellidos.").max(120),
  phone: z.string().trim().min(9, "Escribe un teléfono válido.").max(24),
});

export async function updateCustomerProfile(
  _previous: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const parsed = profileSchema.safeParse({
    fullName: value(formData, "fullName"),
    phone: value(formData, "phone"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { error: "Introduce un número de teléfono válido." };

  const { customer, supabase } = await requireCustomer();
  const admin = createServiceClient();
  const { error } = await admin
    .from("customers")
    .update({ full_name: parsed.data.fullName, phone })
    .eq("id", customer.id);
  if (error?.code === "23505") return { error: "Ese teléfono ya está asociado a otro cliente." };
  if (error) return { error: "No se han podido guardar los cambios." };
  await supabase.auth.updateUser({ data: { full_name: parsed.data.fullName, phone } });
  revalidatePath("/mi-cuenta");
  revalidatePath("/mi-cuenta/perfil");
  return { ok: "Tus datos se han actualizado." };
}

const waitlistSchema = z.object({
  appointmentId: z.string().uuid(),
  enabled: z.boolean(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  weekdays: z.array(z.coerce.number().int().min(1).max(7)).min(1).max(7),
}).refine((data) => data.endTime > data.startTime, {
  message: "La hora final debe ser posterior a la inicial.",
  path: ["endTime"],
});

export async function updateWaitlistPreference(
  _previous: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const parsed = waitlistSchema.safeParse({
    appointmentId: value(formData, "appointmentId"),
    enabled: value(formData, "enabled") === "on",
    startTime: value(formData, "startTime"),
    endTime: value(formData, "endTime"),
    weekdays: formData.getAll("weekdays"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { customer } = await requireCustomer();
  const admin = createServiceClient();
  const { data: appointment, error: appointmentError } = await admin
    .from("appointments")
    .select("id, status, starts_at")
    .eq("id", parsed.data.appointmentId)
    .eq("customer_id", customer.id)
    .maybeSingle();
  if (appointmentError || !appointment || appointment.status !== "confirmed" || new Date(appointment.starts_at) <= new Date()) {
    return { error: "Esta cita ya no admite avisos de huecos." };
  }

  const { error } = await admin.from("waitlist_requests").upsert({
    appointment_id: parsed.data.appointmentId,
    customer_id: customer.id,
    is_active: parsed.data.enabled,
    weekdays: [...new Set(parsed.data.weekdays)].sort(),
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
  }, { onConflict: "appointment_id" });
  if (error) {
    const missingMigration = error.code === "42P01" || error.message.includes("waitlist_requests");
    return { error: missingMigration ? "La lista de espera todavía no está activada en la base de datos." : "No se han podido guardar los avisos de huecos." };
  }
  processWhatsAppAfterResponse();
  revalidatePath("/mi-cuenta");
  return { ok: parsed.data.enabled ? "Te avisaremos si aparece un hueco compatible antes de tu cita." : "Has desactivado los avisos para esta cita." };
}

export async function cancelCustomerAppointment(formData: FormData) {
  await requireCustomer();
  const appointmentId = value(formData, "appointmentId");
  if (!z.string().uuid().safeParse(appointmentId).success) redirect("/mi-cuenta?error=cancel");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_customer_appointment", { p_appointment_id: appointmentId });
  if (error) {
    const reason = error.message.includes("TOO_LATE") ? "late" : "cancel";
    redirect(`/mi-cuenta?error=${reason}`);
  }
  processWhatsAppAfterResponse();
  revalidatePath("/mi-cuenta");
  redirect("/mi-cuenta?cancelled=1");
}

const rescheduleSchema = z.object({
  appointmentId: z.string().uuid(),
  serviceId: z.string().uuid(),
  slot: z.string().datetime({ offset: true }),
});

export async function rescheduleCustomerAppointment(
  _previous: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  await requireCustomer();
  const parsed = rescheduleSchema.safeParse({
    appointmentId: value(formData, "appointmentId"),
    serviceId: value(formData, "serviceId"),
    slot: value(formData, "slot"),
  });
  if (!parsed.success) return { error: "Selecciona un servicio, un día y una hora." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_customer_appointment", {
    p_appointment_id: parsed.data.appointmentId,
    p_service_id: parsed.data.serviceId,
    p_starts_at: parsed.data.slot,
  });
  if (error) {
    if (error.message.includes("SLOT_UNAVAILABLE")) return { error: "Ese horario acaba de dejar de estar disponible." };
    if (error.message.includes("TOO_LATE")) return { error: "Ya queda demasiado poco para modificar esta cita." };
    return { error: "No se ha podido modificar la cita." };
  }
  revalidatePath("/mi-cuenta");
  redirect("/mi-cuenta?modified=1");
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

const schema = z.object({
  businessName: z.string().trim().min(1).max(120),
  barberName: z.string().trim().min(1).max(120),
  address: z.string().trim().max(250),
  phone: z.string().trim().regex(/^\+[0-9]{8,15}$/, "El teléfono debe incluir prefijo, por ejemplo +34664573491."),
  instagram: z.string().trim().max(80),
  email: z.union([z.literal(""), z.email("El correo no es válido.")]),
  legalName: z.string().trim().max(160),
  taxId: z.string().trim().max(32),
  legalAddress: z.string().trim().max(250),
  privacyEmail: z.union([z.literal(""), z.email("El correo de privacidad no es válido.")]),
  approvalMode: z.enum(["auto", "manual"]),
  pendingHold: z.coerce.number().int().min(5).max(10080),
  minNotice: z.coerce.number().int().min(0).max(10080),
  maxAdvance: z.coerce.number().int().min(1).max(730),
  cancellationNotice: z.coerce.number().int().min(0).max(8760),
  buffer: z.coerce.number().int().min(0).max(120),
  slotStep: z.coerce.number().int().refine((value) => [5, 10, 15, 20, 30, 60].includes(value)),
  maxActive: z.coerce.number().int().min(1).max(20),
});

const get = (formData: FormData, key: string) => formData.get(key) ?? "";

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse({
    businessName: get(formData, "businessName"), barberName: get(formData, "barberName"), address: get(formData, "address"),
    phone: get(formData, "phone"), instagram: get(formData, "instagram"), email: get(formData, "email"), approvalMode: get(formData, "approvalMode"),
    legalName: get(formData, "legalName"), taxId: get(formData, "taxId"), legalAddress: get(formData, "legalAddress"), privacyEmail: get(formData, "privacyEmail"),
    pendingHold: get(formData, "pendingHold"), minNotice: get(formData, "minNotice"), maxAdvance: get(formData, "maxAdvance"),
    cancellationNotice: get(formData, "cancellationNotice"), buffer: get(formData, "buffer"), slotStep: get(formData, "slotStep"), maxActive: get(formData, "maxActive"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message || "Revisa los datos introducidos." };
  const d = parsed.data;
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("business_settings").update({
    business_name: d.businessName, barber_display_name: d.barberName, address: d.address, phone_whatsapp: d.phone,
    instagram_handle: d.instagram.replace(/^@/, ""), email: d.email || null, approval_mode: d.approvalMode,
    legal_name: d.legalName || null, tax_id: d.taxId || null, legal_address: d.legalAddress || null, privacy_email: d.privacyEmail || null,
    pending_hold_minutes: d.pendingHold, min_notice_minutes: d.minNotice, max_advance_days: d.maxAdvance,
    cancellation_notice_hours: d.cancellationNotice, buffer_minutes: d.buffer, slot_step_minutes: d.slotStep,
    max_active_per_phone: d.maxActive,
  }).eq("id", true);
  if (error) return { error: "No se han podido guardar los ajustes." };
  revalidatePath("/admin/ajustes");
  revalidatePath("/reservar");
  revalidatePath("/aviso-legal");
  revalidatePath("/privacidad");
  return { ok: "Ajustes guardados." };
}

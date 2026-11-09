"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

const schema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(1, "Escribe el nombre.").max(120),
  email: z.union([z.literal(""), z.email("El correo no es válido.")]),
  notes: z.string().trim().max(2000, "Las notas admiten 2.000 caracteres como máximo."),
});

export async function saveCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse({
    id: formData.get("id"), fullName: formData.get("fullName"), email: formData.get("email"), notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("customers").update({
    full_name: parsed.data.fullName,
    email: parsed.data.email || null,
    internal_notes: parsed.data.notes || null,
  }).eq("id", parsed.data.id);
  if (error) return { error: "No se ha podido guardar el cliente." };
  revalidatePath("/admin/clientes");
  revalidatePath(`/admin/clientes/${parsed.data.id}`);
  return { ok: "Cliente actualizado." };
}

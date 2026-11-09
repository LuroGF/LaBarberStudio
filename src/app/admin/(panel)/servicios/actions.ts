"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { parseEuros } from "@/lib/schedule";
import type { ActionState } from "@/lib/types";

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Escribe el nombre del servicio.").max(80, "El nombre admite 80 caracteres como máximo."),
  description: z.string().trim().max(300, "La descripción admite 300 caracteres como máximo."),
  price: z.string().refine((v) => parseEuros(v) !== null, "Precio no válido. Escribe, por ejemplo, 12 o 12,50."),
  duration: z.coerce
    .number({ error: "La duración debe ser un número." })
    .int("La duración debe ser un número entero de minutos.")
    .min(5, "La duración mínima es de 5 minutos.")
    .max(480, "La duración máxima es de 480 minutos."),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

export async function saveService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = schema.safeParse({
    id: str(formData, "id") || undefined,
    name: str(formData, "name"),
    description: str(formData, "description"),
    price: str(formData, "price"),
    duration: str(formData, "duration"),
    sortOrder: str(formData, "sortOrder") || "0",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const d = parsed.data;
  const row = {
    name: d.name,
    description: d.description || null,
    price_cents: parseEuros(d.price)!,
    duration_minutes: d.duration,
    sort_order: d.sortOrder,
  };

  const { error } = d.id
    ? await supabase.from("services").update(row).eq("id", d.id).is("deleted_at", null)
    : await supabase.from("services").insert(row);
  if (error) return { error: "No se ha podido guardar el servicio. Inténtalo de nuevo." };

  revalidatePath("/admin/servicios");
  return { ok: d.id ? "Servicio guardado." : "Servicio creado." };
}

export async function setServiceActive(id: string, active: boolean): Promise<void> {
  const { supabase } = await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return;
  await supabase.from("services").update({ is_active: active }).eq("id", id).is("deleted_at", null);
  revalidatePath("/admin/servicios");
}

/**
 * Borrado lógico: el servicio desaparece de la web y del panel, pero las citas ya hechas conservan
 * su nombre, precio y duración (se guardan en cada cita).
 */
export async function deleteService(id: string): Promise<void> {
  const { supabase } = await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return;
  await supabase
    .from("services")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id)
    .is("deleted_at", null);
  revalidatePath("/admin/servicios");
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z
  .object({
    password: z
      .string()
      .min(10, "La contraseña debe tener al menos 10 caracteres.")
      .max(200)
      .regex(/[a-z]/, "Incluye al menos una letra minúscula.")
      .regex(/[A-Z]/, "Incluye al menos una letra mayúscula.")
      .regex(/[0-9]/, "Incluye al menos un número."),
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmation"],
  });

export type PasswordState = { error?: string };

export async function updatePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const parsed = schema.safeParse({
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "No se ha podido actualizar la contraseña. Solicita un enlace nuevo." };

  await supabase.auth.signOut();
  redirect("/admin/login?reset=1");
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

const recoverySchema = z.object({ email: z.string().trim().email().max(254) });

export type LoginState = { error?: string };
export type RecoveryState = { error?: string; ok?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Introduce un correo y una contraseña válidos." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Mensaje genérico: no revelar si el correo existe.
  if (error) return { error: "Correo o contraseña incorrectos." };

  redirect("/admin");
}

export async function requestPasswordReset(
  _prev: RecoveryState,
  formData: FormData,
): Promise<RecoveryState> {
  const parsed = recoverySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Introduce un correo válido." };

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/admin/restablecer-password`,
  });

  if (error) return { error: "No se ha podido enviar el correo. Espera unos minutos e inténtalo de nuevo." };
  return {
    ok: "Si existe una cuenta con ese correo, recibirás un enlace para crear una contraseña nueva.",
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

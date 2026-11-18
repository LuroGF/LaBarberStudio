"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeAdminUsername } from "@/lib/admin-usernames";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

const schema = z.object({
  username: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(200),
});

const recoverySchema = z.object({ email: z.string().trim().email().max(254) });

export type LoginState = { error?: string };
export type RecoveryState = { error?: string; ok?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Introduce un usuario y una contraseña válidos." };

  const email = await resolveAdminEmail(parsed.data.username);
  if (!email) return { error: "Usuario o contraseña incorrectos." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  // Mensaje genérico: no revelar si el usuario existe.
  if (error) return { error: "Usuario o contraseña incorrectos." };

  redirect("/admin");
}

async function resolveAdminEmail(input: string) {
  const value = input.trim();
  // Compatibilidad temporal para no bloquear el acceso antes de ejecutar la migración
  // y configurar el primer nombre de usuario.
  if (value.includes("@")) return z.email().safeParse(value).success ? value.toLowerCase() : null;

  try {
    const admin = createServiceClient();
    const { data: profile, error } = await admin.from("profiles").select("id").eq("login_username", normalizeAdminUsername(value)).eq("role", "admin").maybeSingle();
    if (error || !profile) return null;
    const { data, error: userError } = await admin.auth.admin.getUserById(profile.id);
    return userError ? null : data.user?.email?.toLowerCase() ?? null;
  } catch {
    return null;
  }
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

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ADMIN_USERNAME_PATTERN, normalizeAdminUsername } from "@/lib/admin-usernames";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/admin";

export type AdminUserState = { error?: string; ok?: string };

const usernameSchema = z.string().trim().transform(normalizeAdminUsername).pipe(
  z.string().regex(ADMIN_USERNAME_PATTERN, "Usa entre 3 y 32 caracteres: letras minúsculas, números, punto, guion o guion bajo."),
);

const createSchema = z.object({
  fullName: z.string().trim().min(2, "Introduce el nombre del administrador.").max(120),
  username: usernameSchema,
  email: z.email("El correo no es válido.").max(254),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(200),
  passwordConfirm: z.string().max(200),
}).refine((data) => data.password === data.passwordConfirm, { message: "Las contraseñas no coinciden.", path: ["passwordConfirm"] });

export async function setOwnUsername(_prev: AdminUserState, formData: FormData): Promise<AdminUserState> {
  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "El usuario no es válido." };

  const { user } = await requireAdmin();
  const admin = createServiceClient();
  const { error } = await admin.from("profiles").update({ login_username: parsed.data }).eq("id", user.id).eq("role", "admin");
  if (error?.code === "23505") return { error: "Ese nombre de usuario ya está en uso." };
  if (error?.code === "42703") return { error: "Ejecuta primero la migración 0012_admin_usernames.sql." };
  if (error) return { error: "No se ha podido guardar el nombre de usuario." };

  revalidatePath("/admin/administradores");
  return { ok: "Nombre de usuario actualizado." };
}

export async function createAdminUser(_prev: AdminUserState, formData: FormData): Promise<AdminUserState> {
  const parsed = createSchema.safeParse({
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos introducidos." };

  await requireAdmin();
  const admin = createServiceClient();
  const { data: existing, error: lookupError } = await admin.from("profiles").select("id").eq("login_username", parsed.data.username).maybeSingle();
  if (lookupError?.code === "42703") return { error: "Ejecuta primero la migración 0012_admin_usernames.sql." };
  if (lookupError) return { error: "No se ha podido comprobar el nombre de usuario." };
  if (existing) return { error: "Ese nombre de usuario ya está en uso." };

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });
  if (createError || !created.user) {
    const duplicate = createError?.message.toLowerCase().includes("already") || createError?.message.toLowerCase().includes("registered");
    return { error: duplicate ? "Ya existe una cuenta con ese correo." : "No se ha podido crear la cuenta de administrador." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: parsed.data.fullName,
    role: "admin",
    login_username: parsed.data.username,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    if (profileError.code === "23505") return { error: "Ese nombre de usuario ya está en uso." };
    if (profileError.code === "42703") return { error: "Ejecuta primero la migración 0012_admin_usernames.sql." };
    return { error: "La cuenta no ha podido recibir permisos de administrador." };
  }

  revalidatePath("/admin/administradores");
  return { ok: `Administrador ${parsed.data.username} creado correctamente.` };
}

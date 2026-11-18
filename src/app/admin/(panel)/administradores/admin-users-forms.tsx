"use client";

import { useActionState } from "react";
import { createAdminUser, setOwnUsername, type AdminUserState } from "./actions";
import { btnPrimary, field, label } from "@/lib/ui";

export function OwnUsernameForm({ username }: { username: string }) {
  const [state, action, pending] = useActionState<AdminUserState, FormData>(setOwnUsername, {});
  return (
    <form action={action} className="space-y-3">
      <label className={label}>Mi usuario de acceso<input className={`${field} mt-1`} name="username" autoComplete="username" required minLength={3} maxLength={32} defaultValue={username} placeholder="alvaro" /></label>
      <p className="text-xs leading-5 text-muted">Minúsculas, números, punto, guion o guion bajo. El correo seguirá utilizándose únicamente para recuperar la contraseña.</p>
      <FormMessage state={state} />
      <button disabled={pending} className={`${btnPrimary} w-full`}>{pending ? "Guardando…" : "GUARDAR MI USUARIO"}</button>
    </form>
  );
}

export function CreateAdminForm() {
  const [state, action, pending] = useActionState<AdminUserState, FormData>(createAdminUser, {});
  return (
    <form action={action} className="space-y-3">
      <label className={label}>Nombre y apellidos<input className={`${field} mt-1`} name="fullName" autoComplete="name" required maxLength={120} /></label>
      <label className={label}>Usuario<input className={`${field} mt-1`} name="username" autoComplete="off" required minLength={3} maxLength={32} placeholder="eduardo" /></label>
      <label className={label}>Correo de recuperación<input className={`${field} mt-1`} name="email" type="email" autoComplete="off" required maxLength={254} /></label>
      <label className={label}>Contraseña inicial<input className={`${field} mt-1`} name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={200} /></label>
      <label className={label}>Repetir contraseña<input className={`${field} mt-1`} name="passwordConfirm" type="password" autoComplete="new-password" required minLength={8} maxLength={200} /></label>
      <p className="text-xs leading-5 text-muted">La contraseña debe tener al menos 8 caracteres. No se mostrará ni se almacenará en la ficha del administrador.</p>
      <FormMessage state={state} />
      <button disabled={pending} className={`${btnPrimary} w-full`}>{pending ? "Creando…" : "CREAR ADMINISTRADOR"}</button>
    </form>
  );
}

function FormMessage({ state }: { state: AdminUserState }) {
  if (state.error) return <p role="alert" className="text-sm font-semibold">✕ {state.error}</p>;
  if (state.ok) return <p role="status" className="text-sm text-muted">✓ {state.ok}</p>;
  return null;
}

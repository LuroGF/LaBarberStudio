"use client";

import { useActionState, useState } from "react";
import { loginCustomer, registerCustomer, requestCustomerPasswordReset, type CustomerActionState } from "../actions";
import { field } from "@/lib/ui";

const initialState: CustomerActionState = {};

export function CustomerAccessForms() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginAction, loginPending] = useActionState(loginCustomer, initialState);
  const [registerState, registerAction, registerPending] = useActionState(registerCustomer, initialState);
  const [recoveryState, recoveryAction, recoveryPending] = useActionState(requestCustomerPasswordReset, initialState);

  return (
    <section className="rounded-2xl border border-graphite bg-surface p-5 sm:p-6">
      <div className="relative grid grid-cols-2 overflow-hidden rounded-xl bg-background p-1" role="tablist" aria-label="Acceso de clientes">
        <span
          aria-hidden="true"
          className={`absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-lg bg-foreground transition-transform duration-300 ease-out ${
            mode === "register" ? "translate-x-full" : "translate-x-0"
          }`}
        />
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => setMode("login")}
          className={`relative z-10 h-10 rounded-lg text-sm font-semibold transition-colors duration-300 ${mode === "login" ? "text-black" : "text-muted"}`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          onClick={() => setMode("register")}
          className={`relative z-10 h-10 rounded-lg text-sm font-semibold transition-colors duration-300 ${mode === "register" ? "text-black" : "text-muted"}`}
        >
          Crear cuenta
        </button>
      </div>

      {mode === "login" ? (
        <div key="login" className="mt-6 animate-auth-panel-left">
          <form action={loginAction} className="space-y-4">
            <EmailField />
            <PasswordField autoComplete="current-password" />
            {loginState.error && <p role="alert" className="text-sm font-semibold">{loginState.error}</p>}
            <button disabled={loginPending} className="h-12 w-full rounded-xl bg-foreground font-bold text-black disabled:opacity-60">
              {loginPending ? "ENTRANDO…" : "ENTRAR"}
            </button>
          </form>
          <details className="border-t border-graphite pt-4">
            <summary className="cursor-pointer list-none text-center text-sm text-muted underline underline-offset-4">He olvidado mi contraseña</summary>
            <form action={recoveryAction} className="mt-4 space-y-3">
              <p className="text-xs text-muted">Recibirás un enlace para establecer una contraseña nueva.</p>
              <EmailField />
              {recoveryState.error && <p role="alert" className="text-sm font-semibold">{recoveryState.error}</p>}
              <button disabled={recoveryPending} className="h-11 w-full rounded-xl border border-foreground text-sm font-semibold disabled:opacity-60">
                {recoveryPending ? "ENVIANDO…" : "ENVIAR CÓDIGO"}
              </button>
            </form>
          </details>
        </div>
      ) : (
        <form key="register" action={registerAction} className="mt-6 space-y-4 animate-auth-panel-right">
          <label className="block text-sm text-muted">
            Nombre y apellidos
            <input name="fullName" autoComplete="name" required minLength={2} maxLength={120} className={`${field} mt-1`} />
          </label>
          <EmailField />
          <PhoneField />
          <PasswordField autoComplete="new-password" />
          <label className="flex items-start gap-3 text-sm text-muted">
            <input name="consent" type="checkbox" required className="mt-1 size-4 accent-white" />
            <span>Acepto el uso de mis datos para gestionar mi cuenta y mis citas.</span>
          </label>
          {registerState.error && <p role="alert" className="text-sm font-semibold">{registerState.error}</p>}
          <button disabled={registerPending} className="h-12 w-full rounded-xl bg-foreground font-bold text-black disabled:opacity-60">
            {registerPending ? "CREANDO…" : "CREAR CUENTA"}
          </button>
          <p className="text-xs text-muted">Te enviaremos un correo para confirmar la cuenta antes de iniciar sesión.</p>
        </form>
      )}
    </section>
  );
}

function EmailField() {
  return (
    <label className="block text-sm text-muted">
      Correo electrónico
      <input
        name="email"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        placeholder="tu@correo.com"
        className={`${field} mt-1`}
      />
    </label>
  );
}

function PhoneField() {
  return (
    <label className="block text-sm text-muted">
      Teléfono
      <input
        name="phone"
        inputMode="tel"
        autoComplete="tel"
        required
        maxLength={24}
        placeholder="600 000 000"
        className={`${field} mt-1`}
      />
    </label>
  );
}

function PasswordField({ autoComplete }: { autoComplete: "current-password" | "new-password" }) {
  return (
    <label className="block text-sm text-muted">
      Contraseña
      <input
        name="password"
        type="password"
        autoComplete={autoComplete}
        required
        minLength={8}
        maxLength={200}
        className={`${field} mt-1`}
      />
      {autoComplete === "new-password" && <span className="mt-1 block text-xs">Mínimo 8 caracteres.</span>}
    </label>
  );
}


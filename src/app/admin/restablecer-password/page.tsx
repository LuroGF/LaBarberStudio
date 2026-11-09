import { PasswordForm } from "./password-form";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Nueva contraseña | LA BARBER STUDIO", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="animate-fade-up rounded-2xl border border-graphite bg-surface p-6">
        <Wordmark className="block text-center text-2xl" />
        <h1 className="mt-5 text-center text-xl font-semibold">Crea una contraseña nueva</h1>
        <p className="mt-2 text-center text-sm text-muted">Se cerrará la sesión al guardarla para que puedas entrar de nuevo.</p>
        <PasswordForm />
      </div>
    </main>
  );
}

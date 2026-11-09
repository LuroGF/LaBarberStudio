import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Acceso | LA BARBER STUDIO", robots: { index: false } };

async function LoginContent({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string }> }) {
  const { error, reset } = await searchParams;
  return (
    <>
      {error === "forbidden" && (
        <p role="alert" className="mt-4 rounded-lg border border-graphite p-3 text-sm text-muted">
          Esta cuenta no tiene permisos de administrador.
        </p>
      )}
      {error === "recovery" && (
        <p role="alert" className="mt-4 rounded-lg border border-graphite p-3 text-sm text-muted">
          El enlace de recuperación no es válido o ha caducado. Solicita uno nuevo.
        </p>
      )}
      {reset === "1" && (
        <p role="status" className="mt-4 rounded-lg border border-foreground p-3 text-sm text-foreground">
          Contraseña actualizada. Ya puedes iniciar sesión.
        </p>
      )}
      <LoginForm />
    </>
  );
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string }> }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="animate-fade-up rounded-2xl border border-graphite bg-surface p-6">
        <Wordmark className="block text-center text-2xl" />
        <p className="mt-1 text-center text-sm text-muted">Panel de administración</p>
        <Suspense fallback={<p className="mt-6 text-center text-sm text-muted">Cargando…</p>}>
          <LoginContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

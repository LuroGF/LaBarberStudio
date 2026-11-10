import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { CustomerAccessForms } from "./customer-access-forms";

export const instant = false;

export default async function CustomerAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <header className="mb-7 text-center">
        <Link href="/" aria-label="Volver al inicio"><Wordmark className="text-3xl" /></Link>
        <h1 className="mt-6 text-2xl font-extrabold">TU ESPACIO</h1>
        <p className="mt-2 text-sm text-muted">Consulta, modifica o cancela tus citas.</p>
      </header>
      {query.error === "account" && (
        <p role="alert" className="mb-4 rounded-xl border border-foreground p-3 text-sm">
          No hemos podido vincular la cuenta con tus datos. Contacta con la barbería.
        </p>
      )}
      {query.error === "recovery" && (
        <p role="alert" className="mb-4 rounded-xl border border-foreground p-3 text-sm">
          El enlace no es válido o ha caducado. Solicita uno nuevo.
        </p>
      )}
      <CustomerAccessForms />
      <Link href="/reservar" className="mt-6 text-center text-sm text-muted underline underline-offset-4">
        Continuar sin cuenta
      </Link>
    </main>
  );
}


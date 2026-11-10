import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { requireCustomer } from "@/lib/customer-auth";
import { PasswordResetForm } from "./password-reset-form";

export const instant = false;

export default async function CustomerPasswordResetPage() {
  await requireCustomer();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <header className="mb-7 text-center">
        <Link href="/" aria-label="Volver al inicio"><Wordmark className="text-3xl" /></Link>
        <h1 className="mt-6 text-2xl font-extrabold">NUEVA CONTRASEÑA</h1>
        <p className="mt-2 text-sm text-muted">Elige una contraseña nueva de al menos 8 caracteres.</p>
      </header>
      <PasswordResetForm />
    </main>
  );
}


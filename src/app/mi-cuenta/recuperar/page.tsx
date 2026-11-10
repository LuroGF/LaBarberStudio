import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Wordmark } from "@/components/wordmark";

export default function CustomerPasswordResetPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <header className="mb-7 text-center">
        <Link href="/" aria-label="Volver al inicio"><Wordmark className="text-3xl" /></Link>
        <MailCheck className="mx-auto mt-7 size-9" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-extrabold">REVISA TU CORREO</h1>
        <p className="mt-2 text-sm text-muted">Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña.</p>
      </header>
      <Link href="/mi-cuenta/acceso" className="text-center text-sm text-muted underline underline-offset-4">Volver al acceso</Link>
    </main>
  );
}


import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Wordmark } from "@/components/wordmark";

export default function VerifyCustomerPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <header className="mb-7 text-center">
        <Link href="/" aria-label="Volver al inicio"><Wordmark className="text-3xl" /></Link>
        <MailCheck className="mx-auto mt-7 size-9" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-extrabold">REVISA TU CORREO</h1>
        <p className="mt-2 text-sm text-muted">Abre el enlace que te hemos enviado para confirmar la cuenta.</p>
      </header>
      <div className="rounded-2xl border border-graphite bg-surface p-5 text-center text-sm text-muted">
        <p>Después de confirmar volverás automáticamente a tu espacio de cliente.</p>
        <Link href="/mi-cuenta/acceso" className="mt-4 inline-block underline underline-offset-4">Volver al acceso</Link>
      </div>
    </main>
  );
}


import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="animate-fade-up">
        <Wordmark className="text-5xl sm:text-6xl" />
        <p className="mt-8 text-2xl font-extrabold tracking-tight">TU ESTILO. TUS REGLAS.</p>
        <p className="mt-2 text-muted">Tu próximo corte empieza aquí.</p>
        <Link
          href="/reservar"
          className="mt-8 inline-flex h-14 items-center justify-center rounded-xl bg-foreground px-8 font-bold text-black transition active:scale-[0.98]"
        >
          RESERVAR CITA
        </Link>
        <Link
          href="/mi-cuenta"
          className="mt-3 inline-flex h-12 items-center justify-center rounded-xl border border-graphite px-7 text-sm font-semibold transition hover:border-foreground"
        >
          MIS CITAS
        </Link>
        <p className="mt-10 text-xs text-muted/70">
          Reserva online de forma rápida, segura y sin llamadas.
        </p>
      </div>
    </main>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/wordmark";

export function LegalPageShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Volver al inicio"><Wordmark className="text-lg" /></Link>
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted transition hover:text-white"><ArrowLeft size={15} /> Volver</Link>
        </div>
      </header>
      <main className="px-5 py-16 sm:px-8 sm:py-24">
        <article className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.045em] text-white sm:text-6xl">{title}</h1>
          <div className="legal-copy mt-12 space-y-9 text-sm leading-7 text-muted sm:text-base">{children}</div>
        </article>
      </main>
    </div>
  );
}


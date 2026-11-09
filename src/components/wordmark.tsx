import { cn } from "@/lib/utils";

/** Logotipo tipográfico provisional basado en la identidad de LA BARBER STUDIO. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="LA BARBER STUDIO"
      className={cn("inline-flex flex-col items-center font-brand font-bold uppercase leading-none text-foreground", className)}
    >
      <span aria-hidden="true" className="whitespace-nowrap tracking-[-0.045em]">
        LA BARBER
      </span>
      <span aria-hidden="true" className="mt-[0.25em] flex w-full items-center justify-center gap-[0.35em] text-[0.34em] font-medium tracking-[0.5em]">
        <span className="h-px w-[1.7em] bg-current" />
        <span className="pl-[0.5em]">STUDIO</span>
        <span className="h-px w-[1.7em] bg-current" />
      </span>
    </span>
  );
}

import { Suspense } from "react";

export const metadata = { robots: { index: false, follow: false } };

// Todo /admin depende de la sesión (cookies): se renderiza bajo demanda, nunca se precalcula.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Suspense fallback={<div className="p-6 text-sm text-muted">Cargando…</div>}>{children}</Suspense>
    </div>
  );
}

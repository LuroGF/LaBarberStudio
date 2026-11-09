import { AdminHeader } from "@/components/admin-header";
import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/auth";

// Cada página y cada acción vuelven a comprobar el rol de administrador: este layout no se
// vuelve a ejecutar en las navegaciones del cliente, así que no es la única barrera.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <AdminHeader />
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-6">{children}</main>
      <AdminNav />
    </>
  );
}

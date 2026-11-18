import { CreateAdminForm, OwnUsernameForm } from "./admin-users-forms";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/admin";
import { card } from "@/lib/ui";

type AdminProfile = { id: string; full_name: string | null; login_username?: string | null; created_at: string };

export const metadata = { title: "Administradores | LA BARBER STUDIO" };

export default async function AdministratorsPage() {
  const { user } = await requireAdmin();
  const admin = createServiceClient();
  const [{ data: profilesData }, { data: authData }] = await Promise.all([
    admin.from("profiles").select("*").eq("role", "admin").order("created_at"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const profiles = (profilesData ?? []) as AdminProfile[];
  const emails = new Map((authData?.users ?? []).map((authUser) => [authUser.id, authUser.email ?? ""]));
  const current = profiles.find((profile) => profile.id === user.id);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Administradores</h1><p className="mt-1 text-sm text-muted">Accesos autorizados al panel del negocio.</p></div>
      <section className={card}><h2 className="mb-4 font-semibold">Mi acceso</h2><OwnUsernameForm username={current?.login_username ?? ""} /></section>
      <section className={card}><h2 className="mb-1 font-semibold">Nuevo administrador</h2><p className="mb-4 text-sm leading-6 text-muted">Crea una cuenta independiente para otra persona. No compartáis la misma contraseña.</p><CreateAdminForm /></section>
      <section className="space-y-3">
        <h2 className="font-semibold">Cuentas autorizadas ({profiles.length})</h2>
        {profiles.map((profile) => <article key={profile.id} className={`${card} flex items-start justify-between gap-3`}><div><p className="font-semibold">{profile.full_name || "Administrador"}</p><p className="mt-1 text-sm text-muted">{profile.login_username ? `@${profile.login_username}` : "Usuario pendiente de configurar"}</p><p className="mt-1 text-xs text-muted">{emails.get(profile.id) || "Correo no disponible"}</p></div>{profile.id === user.id && <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-black">TÚ</span>}</article>)}
      </section>
    </div>
  );
}

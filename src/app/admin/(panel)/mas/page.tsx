import Link from "next/link";
import { Bell, Clock3, Settings } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { card } from "@/lib/ui";

export const metadata = { title: "Más | LA BARBER STUDIO" };

const links = [
  { href: "/admin/horarios", title: "Horarios", text: "Horario semanal, vacaciones y bloqueos.", icon: Clock3 },
  { href: "/admin/notificaciones", title: "Avisos", text: "Mensajes pendientes para enviar por WhatsApp.", icon: Bell },
  { href: "/admin/ajustes", title: "Ajustes", text: "Datos del negocio y reglas de reserva.", icon: Settings },
];

export default async function MorePage() {
  await requireAdmin();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Más</h1>
        <p className="mt-1 text-sm text-muted">Configuración y herramientas del negocio.</p>
      </div>
      <div className="space-y-3">
        {links.map(({ href, title, text, icon: Icon }) => (
          <Link key={href} href={href} className={`${card} flex items-center gap-4 transition hover:border-foreground`}>
            <Icon aria-hidden="true" size={24} />
            <span>
              <span className="block font-semibold">{title}</span>
              <span className="mt-1 block text-sm text-muted">{text}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

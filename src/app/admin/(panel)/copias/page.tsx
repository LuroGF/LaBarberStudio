import { CalendarDays, Download, ShieldCheck, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { btnPrimary, card } from "@/lib/ui";

export const metadata = { title: "Copias de datos | LA BARBER STUDIO" };

const exports = [
  {
    href: "/api/admin/export/clientes",
    title: "Clientes",
    text: "Datos de contacto, consentimiento de WhatsApp y notas internas.",
    icon: Users,
  },
  {
    href: "/api/admin/export/citas",
    title: "Citas",
    text: "Histórico completo de reservas, estados, importes y notas.",
    icon: CalendarDays,
  },
];

export default async function BackupsPage() {
  await requireAdmin();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Copias de datos</h1>
        <p className="mt-1 text-sm leading-6 text-muted">Descarga archivos compatibles con Excel para conservar una copia fuera de la aplicación.</p>
      </div>

      <div className={`${card} flex gap-3`}>
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-gold" />
        <p className="text-sm leading-6 text-muted">Estos archivos contienen datos personales. Guárdalos en un lugar privado y no los envíes por mensajería.</p>
      </div>

      <div className="space-y-3">
        {exports.map(({ href, title, text, icon: Icon }) => (
          <section key={href} className={card}>
            <div className="flex items-start gap-3">
              <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
              </div>
            </div>
            <a href={href} download className={`${btnPrimary} mt-4 w-full gap-2`}>
              <Download aria-hidden="true" size={17} /> DESCARGAR CSV
            </a>
          </section>
        ))}
      </div>

      <p className="text-xs leading-5 text-muted">Recomendación: descarga ambas copias una vez por semana y antes de cualquier cambio importante en horarios o servicios.</p>
    </div>
  );
}

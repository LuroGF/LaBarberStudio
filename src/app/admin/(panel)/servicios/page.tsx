import { requireAdmin } from "@/lib/auth";
import { card, btnGhost } from "@/lib/ui";
import { centsToInput, formatEuros } from "@/lib/schedule";
import type { Service } from "@/lib/types";
import { ServiceForm } from "./service-form";
import { deleteService, setServiceActive } from "./actions";

export const metadata = { title: "Servicios | LA BARBER STUDIO" };

export default async function ServicesPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, description, price_cents, duration_minutes, is_active, sort_order")
    .is("deleted_at", null)
    .order("sort_order")
    .order("created_at");
  const services = (data ?? []) as Service[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Servicios</h1>
        <p className="mt-1 text-sm text-muted">
          Lo que verán tus clientes al reservar. Si cambias un precio, las citas ya reservadas conservan el
          que tenían.
        </p>
      </header>

      {error && <p role="alert" className="text-sm font-semibold">✕ No se han podido cargar los servicios.</p>}

      {services.length === 0 && !error && (
        <div className={card}>
          <p className="font-semibold">Todavía no hay servicios</p>
          <p className="mt-1 text-sm text-muted">Añade el primero abajo. Sin servicios activos nadie puede reservar.</p>
        </div>
      )}

      <ul className="space-y-4">
        {services.map((s) => (
          <li key={s.id} className={`${card} space-y-4`}>
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate font-semibold">
                {s.name} <span className="font-normal text-muted">· {formatEuros(s.price_cents)} · {s.duration_minutes} min</span>
              </p>
              <span
                className={
                  s.is_active
                    ? "shrink-0 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-black"
                    : "shrink-0 rounded-full border border-muted px-3 py-1 text-xs text-muted"
                }
              >
                {s.is_active ? "Activo" : "Oculto"}
              </span>
            </div>

            <ServiceForm
              service={{
                id: s.id,
                name: s.name,
                description: s.description,
                priceInput: centsToInput(s.price_cents),
                duration: s.duration_minutes,
                sortOrder: s.sort_order,
              }}
            />

            <div className="flex flex-wrap gap-2 border-t border-graphite pt-4">
              <form action={setServiceActive.bind(null, s.id, !s.is_active)}>
                <button className={btnGhost}>{s.is_active ? "Ocultar de la web" : "Mostrar en la web"}</button>
              </form>
              <details className="group">
                <summary className={`${btnGhost} cursor-pointer list-none`}>Eliminar</summary>
                <div className="mt-2 space-y-2 rounded-xl border border-graphite p-3">
                  <p className="text-sm text-muted">
                    Desaparece de la web y del panel. Las citas que ya tiene se conservan tal cual.
                  </p>
                  <form action={deleteService.bind(null, s.id)}>
                    <button className={`${btnGhost} w-full font-semibold`}>Sí, eliminar «{s.name}»</button>
                  </form>
                </div>
              </details>
            </div>
          </li>
        ))}
      </ul>

      <section className={`${card} space-y-3`}>
        <h2 className="font-semibold">Añadir servicio</h2>
        <ServiceForm />
      </section>
    </div>
  );
}

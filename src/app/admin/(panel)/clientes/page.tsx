import Link from "next/link";
import { Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { formatMadrid } from "@/lib/schedule";
import { card, field } from "@/lib/ui";

type Appointment = { id: string; starts_at: string; status: string; service_name: string };
type Customer = {
  id: string; full_name: string; phone: string; email: string | null; internal_notes: string | null;
  updated_at: string; appointments: Appointment[] | null;
};

export const metadata = { title: "Clientes | LA BARBER STUDIO" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { supabase } = await requireAdmin();
  const q = (await searchParams).q?.trim().toLocaleLowerCase("es") ?? "";
  const { data } = await supabase
    .from("customers")
    .select("id, full_name, phone, email, internal_notes, updated_at, appointments(id, starts_at, status, service_name)")
    .order("updated_at", { ascending: false })
    .limit(250);
  const customers = ((data ?? []) as Customer[]).filter((customer) =>
    !q || [customer.full_name, customer.phone, customer.email ?? ""].some((value) => value.toLocaleLowerCase("es").includes(q)),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <p className="mt-1 text-sm text-muted">Datos, notas internas e historial de citas.</p>
      </div>
      <form role="search" className="relative">
        <Search aria-hidden="true" className="absolute left-4 top-3.5 text-muted" size={20} />
        <input className={`${field} pl-11`} name="q" defaultValue={q} placeholder="Buscar por nombre, teléfono o correo" />
      </form>
      {customers.length === 0 ? (
        <p className={`${card} text-sm text-muted`}>{q ? "No hay clientes que coincidan con la búsqueda." : "Aún no hay clientes."}</p>
      ) : (
        <ul className="space-y-3">
          {customers.map((customer) => {
            const appointments = [...(customer.appointments ?? [])].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
            const last = appointments[0];
            return (
              <li key={customer.id}>
                <Link href={`/admin/clientes/${customer.id}`} className={`${card} block transition hover:border-foreground`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{customer.full_name}</p>
                      <p className="mt-1 text-sm text-muted">{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-muted">{appointments.length} {appointments.length === 1 ? "cita" : "citas"}</span>
                  </div>
                  {last && <p className="mt-3 text-xs text-muted">Última: {formatMadrid(last.starts_at, "d MMM yyyy · HH:mm")} · {last.service_name}</p>}
                  {customer.internal_notes && <p className="mt-2 line-clamp-2 text-sm">{customer.internal_notes}</p>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { createCsv, csvDownload, exportDate } from "@/lib/admin-export";
import { requireAdmin } from "@/lib/auth";

type AppointmentCustomer = { full_name: string; phone: string; email: string | null };

export async function GET() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, status, service_name, price_cents, duration_minutes, starts_at, ends_at, is_paid, customer_notes, private_notes, created_at, customers(full_name, phone, email)")
    .order("starts_at", { ascending: true });

  if (error) return Response.json({ error: "No se han podido exportar las citas." }, { status: 500 });

  const csv = createCsv(
    ["ID", "Estado", "Servicio", "Cliente", "Teléfono", "Correo", "Inicio", "Fin", "Precio EUR", "Duración minutos", "Pagada", "Notas cliente", "Notas internas", "Creada"],
    (data ?? []).map((appointment) => {
      const relation = appointment.customers as AppointmentCustomer | AppointmentCustomer[] | null;
      const customer = Array.isArray(relation) ? relation[0] : relation;
      return [
        appointment.id,
        appointment.status,
        appointment.service_name,
        customer?.full_name,
        customer?.phone,
        customer?.email,
        appointment.starts_at,
        appointment.ends_at,
        (appointment.price_cents / 100).toFixed(2),
        appointment.duration_minutes,
        appointment.is_paid ? "Sí" : "No",
        appointment.customer_notes,
        appointment.private_notes,
        appointment.created_at,
      ];
    }),
  );
  return csvDownload(csv, `citas-${exportDate()}.csv`);
}

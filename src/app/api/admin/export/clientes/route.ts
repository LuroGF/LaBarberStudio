import { createCsv, csvDownload, exportDate } from "@/lib/admin-export";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name, phone, email, whatsapp_opt_in_at, whatsapp_opt_in_source, internal_notes, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: "No se han podido exportar los clientes." }, { status: 500 });

  const csv = createCsv(
    ["ID", "Nombre", "Teléfono", "Correo", "Consentimiento WhatsApp", "Origen consentimiento", "Notas internas", "Creado", "Actualizado"],
    (data ?? []).map((customer) => [
      customer.id,
      customer.full_name,
      customer.phone,
      customer.email,
      customer.whatsapp_opt_in_at,
      customer.whatsapp_opt_in_source,
      customer.internal_notes,
      customer.created_at,
      customer.updated_at,
    ]),
  );
  return csvDownload(csv, `clientes-${exportDate()}.csv`);
}

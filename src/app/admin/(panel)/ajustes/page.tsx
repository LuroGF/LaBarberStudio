import { SettingsForm } from "./settings-form";
import { requireAdmin } from "@/lib/auth";
import { card } from "@/lib/ui";

export const metadata = { title: "Ajustes | LA BARBER STUDIO" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("business_settings").select("business_name, barber_display_name, address, phone_whatsapp, instagram_handle, email, legal_name, tax_id, legal_address, privacy_email, approval_mode, pending_hold_minutes, min_notice_minutes, max_advance_days, cancellation_notice_hours, buffer_minutes, slot_step_minutes, max_active_per_phone").eq("id", true).single();
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-semibold">Ajustes</h1><p className="mt-1 text-sm text-muted">Datos públicos y reglas que controlan las reservas.</p></div>
      {data ? <section className={card}><SettingsForm settings={data} /></section> : <p className={`${card} text-sm text-muted`}>No se han podido cargar los ajustes.</p>}
    </div>
  );
}

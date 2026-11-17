import { SettingsForm } from "./settings-form";
import { requireAdmin } from "@/lib/auth";
import { card } from "@/lib/ui";

export const metadata = { title: "Ajustes | LA BARBER STUDIO" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("business_settings").select("*").eq("id", true).single();
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-semibold">Ajustes</h1><p className="mt-1 text-sm text-muted">Datos públicos y reglas que controlan las reservas.</p></div>
      {data ? <section className={card}><SettingsForm settings={data} /></section> : <p className={`${card} text-sm text-muted`}>No se han podido cargar los ajustes.</p>}
    </div>
  );
}

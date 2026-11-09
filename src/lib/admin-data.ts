import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Conflict } from "@/lib/types";

/** Barbero activo (en la v1 solo hay uno). */
export async function getBarberId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .from("barbers")
    .select("id")
    .eq("is_active", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Error("No hay ningún barbero configurado.");
  return data.id as string;
}

export type ApptRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  service_name: string;
  status: string;
  customers: { full_name: string; phone: string } | { full_name: string; phone: string }[] | null;
};

export function toConflict(a: ApptRow): Conflict {
  const c = Array.isArray(a.customers) ? a.customers[0] : a.customers;
  return {
    id: a.id,
    starts_at: a.starts_at,
    ends_at: a.ends_at,
    service_name: a.service_name,
    status: a.status,
    customer: c?.full_name ?? "Cliente",
    phone: c?.phone ?? "",
  };
}

export const APPT_COLUMNS = "id, starts_at, ends_at, service_name, status, customers(full_name, phone)";

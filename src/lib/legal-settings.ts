import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";

export type LegalSettings = {
  business_name: string;
  legal_name: string | null;
  tax_id: string | null;
  legal_address: string | null;
  address: string;
  privacy_email: string | null;
  email: string | null;
  phone_whatsapp: string;
};

const fallback: LegalSettings = {
  business_name: "LA BARBER STUDIO",
  legal_name: null,
  tax_id: null,
  legal_address: null,
  address: "Fuenlabrada, Madrid",
  privacy_email: null,
  email: null,
  phone_whatsapp: "",
};

export async function getLegalSettings(): Promise<LegalSettings> {
  const { data } = await createServiceClient()
    .from("business_settings")
    .select("business_name, legal_name, tax_id, legal_address, address, privacy_email, email, phone_whatsapp")
    .eq("id", true)
    .maybeSingle();

  return data ? { ...fallback, ...data } : fallback;
}

export function legalContact(settings: LegalSettings) {
  return settings.privacy_email || settings.email;
}


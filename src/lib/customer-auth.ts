import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CustomerAccount = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
};

type LinkableCustomer = CustomerAccount & { auth_user_id: string | null };

/** Vincula un correo ya verificado con el cliente histórico que usó ese mismo correo al reservar. */
export async function linkCustomerForUser(user: User): Promise<CustomerAccount> {
  if (!user.email || !user.email_confirmed_at) throw new Error("EMAIL_NOT_VERIFIED");
  const phone = typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : null;
  if (!phone) throw new Error("PHONE_REQUIRED");

  const admin = createServiceClient();
  const { data: linked, error: linkedError } = await admin
    .from("customers")
    .select("id, full_name, phone, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (linkedError) throw linkedError;
  if (linked) return linked as CustomerAccount;

  const { data: matches, error: existingError } = await admin
    .from("customers")
    .select("id, full_name, phone, email, auth_user_id")
    .ilike("email", user.email)
    .limit(2);
  if (existingError) throw existingError;
  if ((matches?.length ?? 0) > 1) throw new Error("AMBIGUOUS_EMAIL");
  let existing = (matches?.[0] ?? null) as LinkableCustomer | null;
  if (existing?.auth_user_id && existing.auth_user_id !== user.id) throw new Error("EMAIL_ALREADY_LINKED");

  // Reservas antiguas pueden tener otro correo o ninguno. En ese caso reutilizamos el cliente
  // con el teléfono declarado durante el alta, siempre que aún no pertenezca a otra cuenta.
  let matchedByPhone = false;
  if (!existing) {
    const { data: phoneMatch, error: phoneError } = await admin
      .from("customers")
      .select("id, full_name, phone, email, auth_user_id")
      .eq("phone", phone)
      .maybeSingle();
    if (phoneError) throw phoneError;
    if (phoneMatch?.auth_user_id && phoneMatch.auth_user_id !== user.id) throw new Error("PHONE_ALREADY_LINKED");
    existing = (phoneMatch ?? null) as LinkableCustomer | null;
    matchedByPhone = Boolean(existing);
  }

  if (existing) {
    const { data, error } = await admin
      .from("customers")
      .update({ auth_user_id: user.id, ...(matchedByPhone ? { email: user.email } : {}) })
      .eq("id", existing.id)
      .is("auth_user_id", null)
      .select("id, full_name, phone, email")
      .single();
    if (error) throw error;
    return data as CustomerAccount;
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim().length >= 2
      ? user.user_metadata.full_name.trim()
      : "Cliente";
  const { data, error } = await admin
    .from("customers")
    .insert({ auth_user_id: user.id, full_name: fullName, phone, email: user.email })
    .select("id, full_name, phone, email")
    .single();
  if (error) throw error;
  return data as CustomerAccount;
}

export async function requireCustomer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/mi-cuenta/acceso");

  try {
    const customer = await linkCustomerForUser(user);
    return { supabase, user, customer };
  } catch {
    redirect("/mi-cuenta/acceso?error=account");
  }
}

export async function getOptionalCustomer(): Promise<CustomerAccount | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !user.email_confirmed_at) return null;
  try {
    return await linkCustomerForUser(user);
  } catch {
    return null;
  }
}


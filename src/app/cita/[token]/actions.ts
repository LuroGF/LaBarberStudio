"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashManageToken, MANAGE_TOKEN_RE } from "@/lib/booking";
import { createServiceClient } from "@/lib/supabase/admin";

export async function cancelAppointment(token: string): Promise<void> {
  if (!MANAGE_TOKEN_RE.test(token)) redirect("/");

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("cancel_appointment_by_token", {
    p_token_hash: hashManageToken(token),
  });

  if (error) {
    const reason = error.message.includes("TOO_LATE") ? "late" : "failed";
    redirect(`/cita/${token}?error=${reason}`);
  }

  revalidatePath(`/cita/${token}`);
  redirect(`/cita/${token}?cancelled=1`);
}


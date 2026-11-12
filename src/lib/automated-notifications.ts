import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { formatMadrid } from "@/lib/schedule";
import { createServiceClient } from "@/lib/supabase/admin";
import { getWhatsAppConfig, sendWhatsAppTemplate } from "@/lib/whatsapp-cloud";

type Customer = { full_name: string; phone: string; whatsapp_opt_in_at: string | null };
type Appointment = {
  service_name: string;
  starts_at: string;
  status: string;
  customers: Customer | Customer[] | null;
};
type Event = {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  appointments: Appointment | Appointment[] | null;
};

const eventLabels: Record<string, string> = {
  request_created: "Hemos recibido",
  approved: "Hemos confirmado",
  rejected: "No hemos podido aceptar",
  modified: "Hemos actualizado",
  cancelled: "Hemos cancelado",
  reminder: "Te recordamos",
};

export type AutomatedNotificationResult = {
  enabled: boolean;
  processed: number;
  customerSent: number;
  barberSent: number;
  failed: number;
};

export async function processPendingWhatsAppNotifications(
  supabase: SupabaseClient,
  limit = 25,
): Promise<AutomatedNotificationResult> {
  const config = getWhatsAppConfig();
  const result: AutomatedNotificationResult = { enabled: Boolean(config), processed: 0, customerSent: 0, barberSent: 0, failed: 0 };
  if (!config) return result;

  const { data: claimed, error: claimError } = await supabase.rpc("claim_whatsapp_notification_events", {
    p_after: config.startAt,
    p_limit: limit,
  });
  if (claimError) throw claimError;
  const claimedIds = (claimed ?? []).map((row: { id: string }) => row.id);
  if (!claimedIds.length) return result;

  const [{ data, error }, { data: settings }] = await Promise.all([
    supabase.from("notification_events").select("id, event_type, payload, appointments(service_name, starts_at, status, customers(full_name, phone, whatsapp_opt_in_at))").in("id", claimedIds),
    supabase.from("business_settings").select("business_name").eq("id", true).single(),
  ]);
  if (error) throw error;
  const businessName = settings?.business_name ?? "LA BARBER STUDIO";

  for (const event of (data ?? []) as unknown as Event[]) {
    const appointment = Array.isArray(event.appointments) ? event.appointments[0] : event.appointments;
    const customerValue = appointment && (Array.isArray(appointment.customers) ? appointment.customers[0] : appointment.customers);
    if (!appointment || !customerValue) {
      await supabase.from("notification_events").update({ status: "skipped", processing_started_at: null, error: "APPOINTMENT_OR_CUSTOMER_MISSING" }).eq("id", event.id).eq("status", "processing");
      continue;
    }
    result.processed += 1;
    const payload = { ...(event.payload ?? {}) };
    const label = eventLabels[event.event_type] ?? "Actualización";
    const date = formatMadrid(appointment.starts_at, "d 'de' MMMM");
    const time = formatMadrid(appointment.starts_at, "HH:mm");

    if (
      ["request_created", "modified", "cancelled"].includes(event.event_type)
      && config.barberTemplate
      && config.barberPhone
      && !payload.barber_whatsapp_id
      && !payload.barber_auto_error
    ) {
      try {
        payload.barber_whatsapp_id = await sendWhatsAppTemplate(config, config.barberPhone, config.barberTemplate, [
          label,
          customerValue.full_name,
          customerValue.phone,
          appointment.service_name,
          date,
          time,
        ]);
        result.barberSent += 1;
      } catch (error) {
        payload.barber_auto_error = safeError(error);
      }
    }

    if (!customerValue.whatsapp_opt_in_at) {
      payload.auto_skipped_no_consent = true;
      if (JSON.stringify(payload) !== JSON.stringify(event.payload ?? {})) {
        await supabase.from("notification_events").update({ payload, status: "pending", processing_started_at: null }).eq("id", event.id).eq("status", "processing");
      } else {
        await supabase.from("notification_events").update({ status: "pending", processing_started_at: null }).eq("id", event.id).eq("status", "processing");
      }
      continue;
    }

    try {
      const messageId = await sendWhatsAppTemplate(config, customerValue.phone, config.appointmentTemplate, [
        customerValue.full_name,
        label,
        appointment.service_name,
        date,
        time,
        businessName,
      ]);
      await supabase.from("notification_events").update({
        channel: "whatsapp_api",
        status: "sent",
        sent_at: new Date().toISOString(),
        processing_started_at: null,
        error: null,
        payload: { ...payload, customer_whatsapp_id: messageId },
      }).eq("id", event.id).eq("status", "processing");
      result.customerSent += 1;
    } catch (error) {
      await supabase.from("notification_events").update({
        channel: "whatsapp_api",
        status: "failed",
        error: safeError(error),
        payload,
        processing_started_at: null,
      }).eq("id", event.id).eq("status", "processing");
      result.failed += 1;
    }
  }
  return result;
}

/** Procesa la cola tras responder al usuario. En Vercel usa waitUntil y no retrasa la navegación. */
export function processWhatsAppAfterResponse() {
  after(async () => {
    try {
      await processPendingWhatsAppNotifications(createServiceClient());
    } catch (error) {
      console.error("No se ha podido procesar la cola de WhatsApp:", safeError(error));
    }
  });
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 300) : "WHATSAPP_UNKNOWN_ERROR";
}


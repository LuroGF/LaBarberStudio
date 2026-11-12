import "server-only";

type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  graphVersion: string;
  appointmentTemplate: string;
  barberTemplate: string | null;
  barberPhone: string | null;
  languageCode: string;
  startAt: string;
};

type TemplateParameter = { type: "text"; text: string };

export function getWhatsAppConfig(): WhatsAppConfig | null {
  if (process.env.WHATSAPP_CLOUD_ENABLED !== "true") return null;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim();
  const appointmentTemplate = process.env.WHATSAPP_TEMPLATE_APPOINTMENT?.trim();
  const startAt = process.env.WHATSAPP_AUTOMATION_START_AT?.trim();
  if (!accessToken || !phoneNumberId || !graphVersion || !appointmentTemplate || !startAt || Number.isNaN(Date.parse(startAt))) return null;
  return {
    accessToken,
    phoneNumberId,
    graphVersion,
    appointmentTemplate,
    barberTemplate: process.env.WHATSAPP_TEMPLATE_BARBER?.trim() || null,
    barberPhone: process.env.WHATSAPP_BARBER_PHONE?.trim() || null,
    languageCode: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "es_ES",
    startAt: new Date(startAt).toISOString(),
  };
}

export function whatsappAutomationStatus() {
  const enabled = process.env.WHATSAPP_CLOUD_ENABLED === "true";
  const configured = Boolean(getWhatsAppConfig());
  return { enabled, configured };
}

export async function sendWhatsAppTemplate(
  config: WhatsAppConfig,
  to: string,
  templateName: string,
  values: string[],
): Promise<string> {
  const recipient = to.replace(/\D/g, "");
  if (!recipient) throw new Error("WHATSAPP_INVALID_RECIPIENT");
  const parameters: TemplateParameter[] = values.map((text) => ({ type: "text", text: text.slice(0, 1024) }));
  const response = await fetch(
    `https://graph.facebook.com/${encodeURIComponent(config.graphVersion)}/${encodeURIComponent(config.phoneNumberId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "template",
        template: {
          name: templateName,
          language: { code: config.languageCode },
          components: [{ type: "body", parameters }],
        },
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const body = await response.json().catch(() => null) as { messages?: { id?: string }[]; error?: { code?: number } } | null;
  const messageId = body?.messages?.[0]?.id;
  if (!response.ok || !messageId) {
    throw new Error(`WHATSAPP_API_${response.status}_${body?.error?.code ?? "UNKNOWN"}`);
  }
  return messageId;
}

export type { WhatsAppConfig };


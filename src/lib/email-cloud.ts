import "server-only";

export type EmailConfig = {
  apiKey: string;
  senderName: string;
  senderEmail: string;
  replyTo: string | null;
  startAt: string;
  siteUrl: string;
};

export function getEmailConfig(): EmailConfig | null {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED !== "true") return null;
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderName = process.env.EMAIL_FROM_NAME?.trim();
  const senderEmail = process.env.EMAIL_FROM_ADDRESS?.trim();
  const startAt = process.env.EMAIL_AUTOMATION_START_AT?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!apiKey || !senderName || !senderEmail || !startAt || !siteUrl || Number.isNaN(Date.parse(startAt))) return null;
  return {
    apiKey,
    senderName,
    senderEmail,
    startAt: new Date(startAt).toISOString(),
    siteUrl: siteUrl.replace(/\/$/, ""),
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || null,
  };
}

export function emailAutomationStatus() {
  const enabled = process.env.EMAIL_NOTIFICATIONS_ENABLED === "true";
  return { enabled, configured: Boolean(getEmailConfig()) };
}

export async function sendTransactionalEmail(config: EmailConfig, input: { eventId: string; to: string; subject: string; html: string }) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: config.senderName, email: config.senderEmail },
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.html,
      headers: { IdempotencyKey: input.eventId },
      ...(config.replyTo ? { replyTo: { email: config.replyTo } } : {}),
    }),
  });
  const body = await response.json().catch(() => null) as { messageId?: string; message?: string; code?: string } | null;
  if (!response.ok || !body?.messageId) {
    const detail = body?.message ?? body?.code ?? "UNKNOWN";
    throw new Error(`EMAIL_API_${response.status}_${detail.slice(0, 120)}`);
  }
  return body.messageId;
}


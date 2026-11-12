import "server-only";

export type EmailConfig = {
  apiKey: string;
  from: string;
  replyTo: string | null;
  startAt: string;
  siteUrl: string;
};

export function getEmailConfig(): EmailConfig | null {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED !== "true") return null;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const startAt = process.env.EMAIL_AUTOMATION_START_AT?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!apiKey || !from || !startAt || !siteUrl || Number.isNaN(Date.parse(startAt))) return null;
  return { apiKey, from, startAt: new Date(startAt).toISOString(), siteUrl: siteUrl.replace(/\/$/, ""), replyTo: process.env.EMAIL_REPLY_TO?.trim() || null };
}

export function emailAutomationStatus() {
  const enabled = process.env.EMAIL_NOTIFICATIONS_ENABLED === "true";
  return { enabled, configured: Boolean(getEmailConfig()) };
}

export async function sendTransactionalEmail(config: EmailConfig, input: { eventId: string; to: string; subject: string; html: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `appointment-event/${input.eventId}` },
    body: JSON.stringify({ from: config.from, to: [input.to], subject: input.subject, html: input.html, ...(config.replyTo ? { reply_to: config.replyTo } : {}) }),
  });
  const body = await response.json().catch(() => null) as { id?: string; message?: string } | null;
  if (!response.ok || !body?.id) throw new Error(`EMAIL_API_${response.status}_${body?.message?.slice(0, 120) ?? "UNKNOWN"}`);
  return body.id;
}


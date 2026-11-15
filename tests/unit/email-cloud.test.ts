import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let getEmailConfig: typeof import("../../src/lib/email-cloud").getEmailConfig;
let sendTransactionalEmail: typeof import("../../src/lib/email-cloud").sendTransactionalEmail;

beforeAll(async () => {
  ({ getEmailConfig, sendTransactionalEmail } = await import("../../src/lib/email-cloud"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("correo transaccional con Brevo", () => {
  it("solo se configura cuando están presentes todas las variables necesarias", () => {
    vi.stubEnv("EMAIL_NOTIFICATIONS_ENABLED", "true");
    vi.stubEnv("BREVO_API_KEY", "secret");
    vi.stubEnv("EMAIL_FROM_NAME", "LA BARBER STUDIO");
    vi.stubEnv("EMAIL_FROM_ADDRESS", "labarberstudiofuenlabrada@gmail.com");
    vi.stubEnv("EMAIL_REPLY_TO", "labarberstudiofuenlabrada@gmail.com");
    vi.stubEnv("EMAIL_AUTOMATION_START_AT", "2026-11-15T12:00:00+01:00");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://labarber-studio.vercel.app/");

    expect(getEmailConfig()).toEqual({
      apiKey: "secret",
      senderName: "LA BARBER STUDIO",
      senderEmail: "labarberstudiofuenlabrada@gmail.com",
      replyTo: "labarberstudiofuenlabrada@gmail.com",
      startAt: "2026-11-15T11:00:00.000Z",
      siteUrl: "https://labarber-studio.vercel.app",
    });
  });

  it("envía el formato esperado por Brevo sin exponer la clave en el contenido", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messageId: "brevo-message-id" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const id = await sendTransactionalEmail({
      apiKey: "secret",
      senderName: "LA BARBER STUDIO",
      senderEmail: "labarberstudiofuenlabrada@gmail.com",
      replyTo: "labarberstudiofuenlabrada@gmail.com",
      startAt: "2026-11-15T11:00:00.000Z",
      siteUrl: "https://labarber-studio.vercel.app",
    }, {
      eventId: "d3597154-bf24-4322-9057-9695cf9947bf",
      to: "cliente@example.com",
      subject: "Tu cita está confirmada",
      html: "<p>Confirmada</p>",
    });

    expect(id).toBe("brevo-message-id");
    expect(fetchMock).toHaveBeenCalledWith("https://api.brevo.com/v3/smtp/email", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "api-key": "secret" }),
    }));
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      sender: { name: "LA BARBER STUDIO", email: "labarberstudiofuenlabrada@gmail.com" },
      to: [{ email: "cliente@example.com" }],
      subject: "Tu cita está confirmada",
      htmlContent: "<p>Confirmada</p>",
      headers: { IdempotencyKey: "d3597154-bf24-4322-9057-9695cf9947bf" },
      replyTo: { email: "labarberstudiofuenlabrada@gmail.com" },
    });
  });
});

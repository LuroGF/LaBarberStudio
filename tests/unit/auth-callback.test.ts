import { describe, expect, it } from "vitest";
import { getAuthErrorPath, getEmailOtpType, getSafeAuthNext } from "../../src/lib/auth-callback";

const origin = "https://www.labarberstudio.es";

describe("callback de autenticación", () => {
  it("acepta únicamente los tipos de OTP utilizados por la aplicación", () => {
    expect(getEmailOtpType("signup")).toBe("signup");
    expect(getEmailOtpType("recovery")).toBe("recovery");
    expect(getEmailOtpType("invite")).toBeNull();
    expect(getEmailOtpType(null)).toBeNull();
  });

  it("conserva los destinos internos permitidos", () => {
    expect(getSafeAuthNext({ next: "/mi-cuenta", redirectTo: null, origin })).toBe("/mi-cuenta");
    expect(getSafeAuthNext({ next: "/admin/restablecer-password", redirectTo: null, origin }))
      .toBe("/admin/restablecer-password");
  });

  it("extrae el destino del redirect_to generado por Supabase", () => {
    const redirectTo = `${origin}/auth/callback?next=/mi-cuenta/restablecer-password`;
    expect(getSafeAuthNext({ next: null, redirectTo, origin }))
      .toBe("/mi-cuenta/restablecer-password");
  });

  it("rechaza redirecciones externas y rutas no permitidas", () => {
    expect(getSafeAuthNext({ next: "https://example.com", redirectTo: null, origin })).toBe("/admin");
    expect(getSafeAuthNext({
      next: null,
      redirectTo: "https://example.com/auth/callback?next=/mi-cuenta",
      origin,
    })).toBe("/admin");
    expect(getSafeAuthNext({ next: "/api/cron/recordatorios", redirectTo: null, origin })).toBe("/admin");
  });

  it("elige la pantalla de error correspondiente al portal", () => {
    expect(getAuthErrorPath("/mi-cuenta/restablecer-password"))
      .toBe("/mi-cuenta/acceso?error=recovery");
    expect(getAuthErrorPath("/admin/restablecer-password"))
      .toBe("/admin/login?error=recovery");
  });
});

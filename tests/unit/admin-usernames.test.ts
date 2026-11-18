import { describe, expect, it } from "vitest";
import { isValidAdminUsername, normalizeAdminUsername } from "../../src/lib/admin-usernames";

describe("usuarios de administración", () => {
  it("normaliza espacios y mayúsculas", () => {
    expect(normalizeAdminUsername("  Alvaro.GF ")).toBe("alvaro.gf");
  });

  it("acepta únicamente nombres seguros de 3 a 32 caracteres", () => {
    expect(isValidAdminUsername("eduardo_01")).toBe(true);
    expect(isValidAdminUsername("ab")).toBe(false);
    expect(isValidAdminUsername("álvaro")).toBe(false);
    expect(isValidAdminUsername("admin correo")).toBe(false);
  });
});

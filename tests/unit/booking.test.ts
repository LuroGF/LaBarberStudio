import { describe, expect, it } from "vitest";
import { bookingErrorMessage, createManageToken, hashManageToken, MANAGE_TOKEN_RE } from "../../src/lib/booking";

describe("enlaces de gestión", () => {
  it("genera tokens aleatorios válidos y guarda solo su hash", () => {
    const first = createManageToken();
    const second = createManageToken();
    expect(first).toMatch(MANAGE_TOKEN_RE);
    expect(second).toMatch(MANAGE_TOKEN_RE);
    expect(first).not.toBe(second);
    expect(hashManageToken(first)).toMatch(MANAGE_TOKEN_RE);
    expect(hashManageToken(first)).not.toBe(first);
  });
});

describe("errores de reserva", () => {
  it("convierte errores internos en mensajes comprensibles", () => {
    expect(bookingErrorMessage("SLOT_UNAVAILABLE")).toContain("hora");
    expect(bookingErrorMessage("INVALID_PHONE")).toContain("teléfono");
    expect(bookingErrorMessage("internal database detail")).not.toContain("database");
  });
});


import { describe, expect, it } from "vitest";
import {
  appointmentHistoryActionLabel,
  appointmentHistoryActorLabel,
} from "../../src/lib/appointment-history";

describe("appointment history labels", () => {
  it("translates the actions stored by the database trigger", () => {
    expect(appointmentHistoryActionLabel("created")).toBe("Cita creada");
    expect(appointmentHistoryActionLabel("updated")).toBe("Datos de la cita actualizados");
    expect(appointmentHistoryActionLabel("status:confirmed")).toBe("Cita confirmada");
    expect(appointmentHistoryActionLabel("status:no_show")).toBe("Marcada como no presentada");
  });

  it("uses a safe fallback for future actions", () => {
    expect(appointmentHistoryActionLabel("future:action")).toBe("Cita actualizada");
  });

  it("identifies administrators without exposing their email", () => {
    expect(
      appointmentHistoryActorLabel("admin-id", {
        full_name: "  Álvaro  ",
        login_username: "alvaro",
      }),
    ).toBe("Álvaro");
    expect(
      appointmentHistoryActorLabel("admin-id", {
        full_name: null,
        login_username: "alvaro",
      }),
    ).toBe("@alvaro");
    expect(appointmentHistoryActorLabel(null)).toBe("Cliente o sistema");
  });
});

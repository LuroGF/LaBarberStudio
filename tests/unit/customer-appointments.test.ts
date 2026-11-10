import { describe, expect, it } from "vitest";
import { canManageCustomerAppointment, splitCustomerAppointments } from "../../src/lib/customer-appointments";

const appointment = (id: string, starts: string, ends: string, status = "confirmed") => ({
  id,
  status,
  starts_at: starts,
  ends_at: ends,
});

describe("portal de citas del cliente", () => {
  const now = new Date("2026-11-10T12:00:00Z").getTime();

  it("mantiene una cita hasta una hora después de terminar y luego la pasa al historial", () => {
    const recent = appointment("recent", "2026-11-10T10:30:00Z", "2026-11-10T11:30:01Z");
    const old = appointment("old", "2026-11-10T10:00:00Z", "2026-11-10T11:00:00Z");
    const result = splitCustomerAppointments([recent, old], now);
    expect(result.upcoming.map((item) => item.id)).toEqual(["recent"]);
    expect(result.history.map((item) => item.id)).toEqual(["old"]);
  });

  it("no permite gestionar una cita pasada aunque siga dentro de la hora de margen", () => {
    const recent = appointment("recent", "2026-11-10T11:00:00Z", "2026-11-10T11:40:00Z");
    expect(canManageCustomerAppointment(recent, now, 2)).toBe(false);
  });

  it("respeta el plazo de cancelación para una cita futura confirmada", () => {
    const near = appointment("near", "2026-11-10T13:00:00Z", "2026-11-10T13:40:00Z");
    const far = appointment("far", "2026-11-10T15:00:00Z", "2026-11-10T15:40:00Z");
    expect(canManageCustomerAppointment(near, now, 2)).toBe(false);
    expect(canManageCustomerAppointment(far, now, 2)).toBe(true);
  });
});

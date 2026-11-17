import { describe, expect, it } from "vitest";
import { buildAdminStats, type StatsAppointment } from "../../src/lib/admin-stats";

const now = new Date("2026-11-17T12:00:00.000Z");
const appointment = (daysAgo: number, status: string, service = "Corte", price = 1200): StatsAppointment => ({
  starts_at: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
  service_name: service,
  price_cents: price,
  status,
});

describe("estadísticas de administración", () => {
  it("calcula ingresos solo con citas completadas y compara periodos", () => {
    const result = buildAdminStats([
      appointment(2, "completed", "Corte", 1200),
      appointment(3, "completed", "Barba", 800),
      appointment(4, "cancelled", "Corte", 1200),
      appointment(35, "completed", "Corte", 1000),
    ], now);
    expect(result.completedRevenue).toBe(2000);
    expect(result.revenueChange).toBe(100);
    expect(result.completed).toBe(2);
    expect(result.cancelled).toBe(1);
    expect(result.completionRate).toBe(67);
  });

  it("ordena servicios y excluye canceladas, rechazadas y caducadas", () => {
    const result = buildAdminStats([
      appointment(1, "completed", "Corte"),
      appointment(2, "confirmed", "Corte"),
      appointment(3, "no_show", "Barba"),
      appointment(4, "cancelled", "Barba"),
      appointment(5, "rejected", "Color"),
    ], now);
    expect(result.topServices).toEqual([
      { name: "Corte", count: 2, percentage: 67 },
      { name: "Barba", count: 1, percentage: 33 },
    ]);
  });
});

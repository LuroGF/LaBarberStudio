import { describe, expect, it } from "vitest";
import {
  addDaysStr,
  centsToInput,
  daysBoundsUtc,
  isDate,
  isOutsideRanges,
  madridToUtc,
  parseEuros,
  validateRanges,
} from "../../src/lib/schedule";

describe("parseEuros", () => {
  it("acepta coma, punto y símbolo", () => {
    expect(parseEuros("12")).toBe(1200);
    expect(parseEuros("12,5")).toBe(1250);
    expect(parseEuros("12.50")).toBe(1250);
    expect(parseEuros(" 9 € ")).toBe(900);
    expect(parseEuros("0")).toBe(0);
  });
  it("rechaza importes inválidos", () => {
    for (const bad of ["", "abc", "-5", "12,345", "1e3", "100000", "12,", ",5"]) {
      expect(parseEuros(bad)).toBeNull();
    }
  });
  it("round-trip con centsToInput", () => {
    expect(centsToInput(1200)).toBe("12");
    expect(centsToInput(1250)).toBe("12,50");
    expect(parseEuros(centsToInput(1250))).toBe(1250);
  });
});

describe("hora de Madrid", () => {
  it("convierte invierno y verano a UTC", () => {
    expect(madridToUtc("2026-11-04", "10:00").toISOString()).toBe("2026-11-04T09:00:00.000Z"); // CET
    expect(madridToUtc("2027-07-01", "10:00").toISOString()).toBe("2027-07-01T08:00:00.000Z"); // CEST
  });
  it("un día con cambio de hora dura 23 h (marzo) o 25 h (octubre)", () => {
    const h = (d: string) => {
      const { start, end } = daysBoundsUtc(d);
      return (end.getTime() - start.getTime()) / 3600000;
    };
    expect(h("2027-03-28")).toBe(23);
    expect(h("2027-10-31")).toBe(25);
    expect(h("2027-05-10")).toBe(24);
  });
  it("un rango de varios días (vacaciones) cubre desde las 00:00 del primero hasta el final del último", () => {
    const { start, end } = daysBoundsUtc("2027-08-02", "2027-08-04");
    expect(start.toISOString()).toBe("2027-08-01T22:00:00.000Z");
    expect(end.toISOString()).toBe("2027-08-04T22:00:00.000Z");
  });
  it("addDaysStr cruza fin de mes y año", () => {
    expect(addDaysStr("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysStr("2027-03-01", -1)).toBe("2027-02-28");
  });
  it("isDate valida fechas reales", () => {
    expect(isDate("2027-02-29")).toBe(false);
    expect(isDate("2028-02-29")).toBe(true);
    expect(isDate("2027-13-01")).toBe(false);
  });
});

describe("tramos", () => {
  it("acepta mañana y tarde", () => {
    expect(
      validateRanges([
        { start: "10:00", end: "14:00" },
        { start: "16:00", end: "20:00" },
      ]),
    ).toBeNull();
  });
  it("rechaza fin anterior al inicio, solapes y horas mal escritas", () => {
    expect(validateRanges([{ start: "14:00", end: "10:00" }])).toMatch(/posterior/);
    expect(
      validateRanges([
        { start: "10:00", end: "14:00" },
        { start: "13:00", end: "18:00" },
      ]),
    ).toMatch(/solapar/);
    expect(validateRanges([{ start: "9:00", end: "14:00" }])).toMatch(/HH:MM/);
  });
  it("detecta citas que quedarían fuera del horario (hora de Madrid)", () => {
    const ranges = [{ start: "10:00", end: "14:00" }];
    // 10:30–11:00 Madrid (invierno = 09:30Z–10:00Z)
    expect(isOutsideRanges("2026-11-04T09:30:00Z", "2026-11-04T10:00:00Z", ranges)).toBe(false);
    // 13:45–14:15 se sale del tramo
    expect(isOutsideRanges("2026-11-04T12:45:00Z", "2026-11-04T13:15:00Z", ranges)).toBe(true);
    // Día cerrado (sin tramos)
    expect(isOutsideRanges("2026-11-04T09:30:00Z", "2026-11-04T10:00:00Z", [])).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { createCsv, exportDate } from "../../src/lib/admin-export";

describe("exportaciones CSV del panel", () => {
  it("genera CSV con BOM, separador español y saltos de línea de Windows", () => {
    const csv = createCsv(["Nombre", "Correo"], [["Álvaro", "alvaro@example.com"]]);
    expect(csv).toBe("\uFEFFNombre;Correo\r\nÁlvaro;alvaro@example.com\r\n");
  });

  it("escapa separadores, comillas y saltos de línea", () => {
    const csv = createCsv(["Dato"], [["uno; dos"], ['dice "hola"'], ["línea 1\nlínea 2"]]);
    expect(csv).toContain('"uno; dos"');
    expect(csv).toContain('"dice ""hola"""');
    expect(csv).toContain('"línea 1\nlínea 2"');
  });

  it("neutraliza fórmulas y conserva teléfonos internacionales", () => {
    const csv = createCsv(["Dato"], [["=1+1"], ["+34601091819"], ["@SUM(A1:A2)"]]);
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'+34601091819");
    expect(csv).toContain("'@SUM(A1:A2)");
  });

  it("crea nombres de archivo con una fecha estable", () => {
    expect(exportDate(new Date("2026-11-25T23:30:00Z"))).toBe("2026-11-25");
  });
});

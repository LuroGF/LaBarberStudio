import { es } from "date-fns/locale";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const TZ = "Europe/Madrid";

/** 1 = lunes … 7 = domingo (ISO), igual que `business_hours.weekday`. */
export const WEEKDAYS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

export type Range = { start: string; end: string };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isTime = (v: string) => TIME_RE.test(v);
export const isDate = (v: string) => {
  if (!DATE_RE.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

export const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** "12", "12,5", "12.50" → céntimos. Devuelve null si no es un importe válido (máx. 10 000 €). */
export function parseEuros(input: string): number | null {
  const v = input.trim().replace(/\s|€/g, "").replace(",", ".");
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(v)) return null;
  const cents = Math.round(parseFloat(v) * 100);
  return cents <= 1_000_000 ? cents : null;
}

export function formatEuros(cents: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/** Céntimos → texto editable ("12" o "12,50"). */
export function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ",");
}

/** Fecha y hora locales de Madrid → instante UTC (respeta el cambio de hora). */
export function madridToUtc(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, TZ);
}

export function addDaysStr(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Desde las 00:00 de `from` hasta las 00:00 del día siguiente a `to` (ambos inclusive), en Madrid. */
export function daysBoundsUtc(from: string, to: string = from): { start: Date; end: Date } {
  return { start: madridToUtc(from, "00:00"), end: madridToUtc(addDaysStr(to, 1), "00:00") };
}

export function formatMadrid(d: Date | string, pattern: string): string {
  return formatInTimeZone(d, TZ, pattern, { locale: es });
}

export function todayMadrid(now: Date = new Date()): string {
  return formatInTimeZone(now, TZ, "yyyy-MM-dd");
}

/** Comprueba tramos de un día: hora válida, fin posterior a inicio y sin solapes. */
export function validateRanges(ranges: Range[]): string | null {
  for (const r of ranges) {
    if (!isTime(r.start) || !isTime(r.end)) return "Las horas deben tener formato HH:MM.";
    if (toMinutes(r.end) <= toMinutes(r.start)) return "La hora de cierre debe ser posterior a la de apertura.";
  }
  const sorted = [...ranges].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  for (let i = 1; i < sorted.length; i++) {
    if (toMinutes(sorted[i].start) < toMinutes(sorted[i - 1].end)) return "Los tramos del mismo día no pueden solaparse.";
  }
  return null;
}

/** ¿La cita (instantes UTC) cae fuera de los tramos de apertura, mirando la hora de Madrid? */
export function isOutsideRanges(startsAt: string | Date, endsAt: string | Date, ranges: Range[]): boolean {
  const s = toMinutes(formatMadrid(startsAt, "HH:mm"));
  const durationMin = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);
  const e = s + durationMin;
  return !ranges.some((r) => s >= toMinutes(r.start) && e <= toMinutes(r.end));
}

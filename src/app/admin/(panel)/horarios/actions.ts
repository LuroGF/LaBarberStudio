"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { APPT_COLUMNS, getBarberId, toConflict, type ApptRow } from "@/lib/admin-data";
import {
  daysBoundsUtc,
  formatMadrid,
  isDate,
  isOutsideRanges,
  isTime,
  madridToUtc,
  validateRanges,
  type Range,
} from "@/lib/schedule";
import type { ActionState } from "@/lib/types";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

/** Ids de citas que el administrador ya ha visto en el aviso (los reenvía el formulario). */
const acknowledged = (fd: FormData) => new Set(str(fd, "ack").split(",").filter(Boolean));

export async function saveDayHours(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const weekday = Number(str(formData, "weekday"));
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) return { error: "Día no válido." };

  const ranges: Range[] = [];
  for (const p of ["m", "t"]) {
    const start = str(formData, `${p}Start`);
    const end = str(formData, `${p}End`);
    if (!start && !end) continue;
    if (!start || !end) return { error: "Completa apertura y cierre de cada tramo, o deja los dos vacíos." };
    ranges.push({ start, end });
  }
  const invalid = validateRanges(ranges);
  if (invalid) return { error: invalid };

  const barberId = await getBarberId(supabase);

  // Citas futuras de ese día de la semana que quedarían fuera del nuevo horario.
  const { data, error: readError } = await supabase
    .from("appointments")
    .select(APPT_COLUMNS)
    .eq("barber_id", barberId)
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(500);
  if (readError) return { error: "No se han podido comprobar las citas existentes. Inténtalo de nuevo." };

  const affected = ((data ?? []) as unknown as ApptRow[]).filter(
    (a) => Number(formatMadrid(a.starts_at, "i")) === weekday && isOutsideRanges(a.starts_at, a.ends_at, ranges),
  );
  const ack = acknowledged(formData);
  if (affected.some((a) => !ack.has(a.id))) return { warning: affected.map(toConflict) };

  const { error } = await supabase.rpc("set_day_hours", {
    p_barber: barberId,
    p_weekday: weekday,
    p_ranges: ranges,
  });
  if (error) {
    return {
      error: error.message.includes("business_hours_no_overlap")
        ? "Los tramos del mismo día no pueden solaparse."
        : "No se ha podido guardar el horario. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/admin/horarios");
  const note = affected.length ? ` Hay ${affected.length} cita(s) fuera del nuevo horario: siguen activas, revísalas.` : "";
  return { ok: (ranges.length ? "Horario guardado." : "Día marcado como cerrado.") + note };
}

export async function createBlock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const mode = str(formData, "mode") === "hours" ? "hours" : "days";
  const date = str(formData, "date");
  if (!isDate(date)) return { error: "Elige una fecha." };
  const reason = str(formData, "reason").trim().slice(0, 200);

  let kind: "closed" | "block";
  let start: Date;
  let end: Date;
  if (mode === "days") {
    const to = str(formData, "dateTo") || date;
    if (!isDate(to) || to < date) return { error: "La fecha final no puede ser anterior a la inicial." };
    ({ start, end } = daysBoundsUtc(date, to));
    kind = "closed";
  } else {
    const from = str(formData, "from");
    const to = str(formData, "to");
    if (!isTime(from) || !isTime(to)) return { error: "Indica la hora de inicio y la de fin." };
    if (to <= from) return { error: "La hora de fin debe ser posterior a la de inicio." };
    start = madridToUtc(date, from);
    end = madridToUtc(date, to);
    kind = "block";
  }
  if (end.getTime() <= Date.now()) return { error: "Esa fecha ya ha pasado." };

  const barberId = await getBarberId(supabase);
  const { data, error: readError } = await supabase
    .from("appointments")
    .select(APPT_COLUMNS)
    .eq("barber_id", barberId)
    .in("status", ["pending", "confirmed"])
    .lt("starts_at", end.toISOString())
    .gt("ends_at", start.toISOString())
    .order("starts_at");
  if (readError) return { error: "No se han podido comprobar las citas existentes. Inténtalo de nuevo." };

  const conflicts = ((data ?? []) as unknown as ApptRow[]).map(toConflict);
  const resolution = str(formData, "resolution"); // "" | "keep" | "cancel"
  const ack = acknowledged(formData);
  if (conflicts.length && (!["keep", "cancel"].includes(resolution) || conflicts.some((c) => !ack.has(c.id)))) {
    return { warning: conflicts };
  }

  const { data: cancelled, error } = await supabase.rpc("create_block", {
    p_barber: barberId,
    p_kind: kind,
    p_starts: start.toISOString(),
    p_ends: end.toISOString(),
    p_reason: reason || null,
    p_cancel: resolution === "cancel",
  });
  if (error) return { error: "No se ha podido bloquear el horario. Inténtalo de nuevo." };

  revalidatePath("/admin/horarios");
  const n = typeof cancelled === "number" ? cancelled : 0;
  if (n > 0) return { ok: `Horario bloqueado. Se han cancelado ${n} cita(s): avisa a esos clientes por WhatsApp.` };
  if (conflicts.length) return { ok: `Horario bloqueado. ${conflicts.length} cita(s) siguen activas dentro del bloqueo: revísalas.` };
  return { ok: "Horario bloqueado." };
}

export async function deleteBlock(id: string): Promise<void> {
  const { supabase } = await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return;
  await supabase.from("schedule_exceptions").delete().eq("id", id).in("kind", ["closed", "block"]);
  revalidatePath("/admin/horarios");
}

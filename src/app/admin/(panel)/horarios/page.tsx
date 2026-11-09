import { requireAdmin } from "@/lib/auth";
import { getBarberId } from "@/lib/admin-data";
import { btnGhost, card } from "@/lib/ui";
import { WEEKDAYS, formatMadrid, todayMadrid, type Range } from "@/lib/schedule";
import type { BusinessHourRow, ScheduleExceptionRow } from "@/lib/types";
import { BlockForm } from "./block-form";
import { DayHoursForm } from "./day-hours-form";
import { deleteBlock } from "./actions";

export const metadata = { title: "Horarios | LA BARBER STUDIO" };

function describe(e: ScheduleExceptionRow): string {
  if (e.kind === "block") {
    return `${formatMadrid(e.starts_at, "EEE d MMM")} · ${formatMadrid(e.starts_at, "HH:mm")}–${formatMadrid(e.ends_at, "HH:mm")}`;
  }
  const first = formatMadrid(e.starts_at, "EEE d MMM");
  const last = formatMadrid(new Date(new Date(e.ends_at).getTime() - 60_000), "EEE d MMM");
  return first === last ? `${first} · día completo` : `Del ${first} al ${last}`;
}

export default async function SchedulePage() {
  const { supabase } = await requireAdmin();
  const barberId = await getBarberId(supabase);

  const [hoursRes, exceptionsRes] = await Promise.all([
    supabase
      .from("business_hours")
      .select("id, weekday, start_time, end_time")
      .eq("barber_id", barberId)
      .order("start_time"),
    supabase
      .from("schedule_exceptions")
      .select("id, kind, starts_at, ends_at, reason")
      .eq("barber_id", barberId)
      .in("kind", ["closed", "block"])
      .gte("ends_at", new Date().toISOString())
      .order("starts_at"),
  ]);

  const byDay = new Map<number, Range[]>();
  for (const h of (hoursRes.data ?? []) as BusinessHourRow[]) {
    const list = byDay.get(h.weekday) ?? [];
    list.push({ start: h.start_time.slice(0, 5), end: h.end_time.slice(0, 5) });
    byDay.set(h.weekday, list);
  }
  const exceptions = (exceptionsRes.data ?? []) as ScheduleExceptionRow[];
  const loadFailed = hoursRes.error || exceptionsRes.error;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Horarios</h1>
        <p className="mt-1 text-sm text-muted">
          Horas de Madrid. Las horas libres que ven los clientes salen de aquí, de la duración de cada servicio y de las
          citas ya reservadas.
        </p>
      </header>

      {loadFailed && <p role="alert" className="text-sm font-semibold">✕ No se ha podido cargar el horario.</p>}

      <BlockForm today={todayMadrid()} />

      <section className="space-y-3">
        <h2 className="font-semibold">Bloqueos y vacaciones próximos</h2>
        {exceptions.length === 0 ? (
          <p className={`${card} text-sm text-muted`}>No hay ningún bloqueo próximo.</p>
        ) : (
          <ul className="space-y-2">
            {exceptions.map((e) => (
              <li key={e.id} className={`${card} flex items-center justify-between gap-3`}>
                <div className="min-w-0">
                  <p className="font-medium capitalize-first">{describe(e)}</p>
                  {e.reason && <p className="truncate text-sm text-muted">{e.reason}</p>}
                </div>
                <form action={deleteBlock.bind(null, e.id)}>
                  <button className={btnGhost}>Quitar</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Horario semanal</h2>
        {byDay.size === 0 && !loadFailed && (
          <p className={`${card} text-sm text-muted`}>
            Aún no has definido ningún horario, así que nadie puede reservar. Rellena los días en los que abres.
          </p>
        )}
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <DayHoursForm key={d} weekday={d} name={WEEKDAYS[d]} ranges={byDay.get(d) ?? []} />
        ))}
      </section>
    </div>
  );
}

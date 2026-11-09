"use client";

import { useActionState, useRef, useTransition } from "react";
import { saveDayHours } from "./actions";
import { ConflictWarning } from "@/components/conflict-warning";
import { btnGhost, btnPrimary, card, field } from "@/lib/ui";
import type { ActionState } from "@/lib/types";
import type { Range } from "@/lib/schedule";

export function DayHoursForm({ weekday, name, ranges }: { weekday: number; name: string; ranges: Range[] }) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(saveDayHours, {});
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  // Se envía con FormData a mano para que el formulario no se reinicie y conserve lo escrito
  // mientras el administrador decide qué hacer con las citas afectadas.
  function submit(ack?: string[]) {
    const fd = new FormData(ref.current!);
    if (ack) fd.set("ack", ack.join(","));
    startTransition(() => dispatch(fd));
  }

  const [morning, afternoon] = ranges;
  const id = `d${weekday}`;
  const time = `${field} !h-11 !px-2`;

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={`${card} space-y-3`}
    >
      <input type="hidden" name="weekday" value={weekday} />
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{name}</h3>
        <span className={ranges.length ? "text-sm text-muted" : "text-sm font-semibold"}>
          {ranges.length ? "Abierto" : "Cerrado"}
        </span>
      </div>

      {(
        [
          ["m", "Mañana", morning],
          ["t", "Tarde", afternoon],
        ] as const
      ).map(([p, text, r]) => (
        <div key={p} className="grid grid-cols-[4.5rem_1fr_auto_1fr] items-center gap-2">
          <span className="text-sm text-muted">{text}</span>
          <input aria-label={`${name}, ${text}: apertura`} id={`${id}${p}s`} name={`${p}Start`} type="time" defaultValue={r?.start ?? ""} className={time} />
          <span className="text-muted">a</span>
          <input aria-label={`${name}, ${text}: cierre`} id={`${id}${p}e`} name={`${p}End`} type="time" defaultValue={r?.end ?? ""} className={time} />
        </div>
      ))}
      <p className="text-xs text-muted">Deja los dos tramos vacíos para marcar el día como cerrado.</p>

      {state.error && (
        <p role="alert" className="text-sm font-semibold">
          ✕ {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-sm text-muted">
          ✓ {state.ok}
        </p>
      )}
      {state.warning && (
        <ConflictWarning conflicts={state.warning} title={`Este horario deja ${state.warning.length} cita(s) fuera de apertura`}>
          <button type="button" disabled={pending} onClick={() => submit(state.warning!.map((c) => c.id))} className={`${btnPrimary} w-full`}>
            GUARDAR IGUALMENTE
          </button>
          <p className="text-center text-xs text-muted">Las citas se quedan como están. Si no quieres cambiar el horario, ignora este aviso.</p>
        </ConflictWarning>
      )}

      <button type="submit" disabled={pending} className={`${btnGhost} w-full`}>
        {pending ? "Guardando…" : "Guardar " + name.toLowerCase()}
      </button>
    </form>
  );
}

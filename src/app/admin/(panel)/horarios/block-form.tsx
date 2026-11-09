"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createBlock } from "./actions";
import { ConflictWarning } from "@/components/conflict-warning";
import { btnGhost, btnPrimary, card, field, label } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/types";

export function BlockForm({ today }: { today: string }) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(createBlock, {});
  const [, startTransition] = useTransition();
  const [mode, setMode] = useState<"days" | "hours">("days");
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  function submit(resolution?: "keep" | "cancel") {
    const fd = new FormData(ref.current!);
    if (resolution) {
      fd.set("resolution", resolution);
      fd.set("ack", (state.warning ?? []).map((c) => c.id).join(","));
    }
    startTransition(() => dispatch(fd));
  }

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={`${card} space-y-3`}
    >
      <h2 className="font-semibold">Bloquear horario</h2>
      <input type="hidden" name="mode" value={mode} />

      <div role="group" aria-label="Qué quieres bloquear" className="grid grid-cols-2 gap-1 rounded-xl border border-graphite p-1">
        {(
          [
            ["days", "Días completos"],
            ["hours", "Unas horas"],
          ] as const
        ).map(([m, text]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={cn("h-10 rounded-lg text-sm transition", mode === m ? "bg-foreground font-semibold text-black" : "text-muted")}
          >
            {text}
          </button>
        ))}
      </div>

      <label className={label} htmlFor="b-date">
        {mode === "days" ? "Desde el día" : "Día"}
        <input id="b-date" name="date" type="date" required min={today} className={`${field} mt-1`} />
      </label>

      {mode === "days" ? (
        <label className={label} htmlFor="b-date-to">
          Hasta el día (vacaciones; déjalo vacío si es un solo día)
          <input id="b-date-to" name="dateTo" type="date" min={today} className={`${field} mt-1`} />
        </label>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className={label} htmlFor="b-from">
            Desde
            <input id="b-from" name="from" type="time" required className={`${field} mt-1`} />
          </label>
          <label className={label} htmlFor="b-to">
            Hasta
            <input id="b-to" name="to" type="time" required className={`${field} mt-1`} />
          </label>
        </div>
      )}

      <label className={label} htmlFor="b-reason">
        Motivo (opcional)
        <input id="b-reason" name="reason" maxLength={200} placeholder="Vacaciones, médico, festivo…" className={`${field} mt-1`} />
      </label>

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
        <ConflictWarning conflicts={state.warning} title={`Este bloqueo afecta a ${state.warning.length} cita(s)`}>
          <button type="button" disabled={pending} onClick={() => submit("keep")} className={`${btnPrimary} w-full`}>
            BLOQUEAR Y MANTENER LAS CITAS
          </button>
          <button type="button" disabled={pending} onClick={() => submit("cancel")} className={`${btnGhost} w-full font-semibold`}>
            Bloquear y cancelar esas citas
          </button>
        </ConflictWarning>
      )}

      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "Bloqueando…" : "BLOQUEAR HORARIO"}
      </button>
    </form>
  );
}

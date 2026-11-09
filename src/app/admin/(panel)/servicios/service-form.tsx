"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveService } from "./actions";
import { btnPrimary, field, label } from "@/lib/ui";
import type { ActionState } from "@/lib/types";

type Props = {
  service?: {
    id: string;
    name: string;
    description: string | null;
    priceInput: string;
    duration: number;
    sortOrder: number;
  };
};

export function ServiceForm({ service }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveService, {});
  const ref = useRef<HTMLFormElement>(null);
  const isNew = !service;
  const uid = service?.id ?? "new";

  // Al crear un servicio, el formulario se vacía para poder añadir otro.
  useEffect(() => {
    if (isNew && state.ok) ref.current?.reset();
  }, [isNew, state]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      {service && <input type="hidden" name="id" value={service.id} />}
      <label className={label} htmlFor={`name-${uid}`}>
        Nombre
        <input id={`name-${uid}`} name="name" required maxLength={80} defaultValue={service?.name} className={`${field} mt-1`} />
      </label>
      <label className={label} htmlFor={`desc-${uid}`}>
        Descripción (opcional)
        <input id={`desc-${uid}`} name="description" maxLength={300} defaultValue={service?.description ?? ""} className={`${field} mt-1`} />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className={label} htmlFor={`price-${uid}`}>
          Precio (€)
          <input id={`price-${uid}`} name="price" required inputMode="decimal" defaultValue={service?.priceInput} className={`${field} mt-1`} />
        </label>
        <label className={label} htmlFor={`dur-${uid}`}>
          Minutos
          <input id={`dur-${uid}`} name="duration" required type="number" inputMode="numeric" min={5} max={480} step={5} defaultValue={service?.duration ?? 30} className={`${field} mt-1`} />
        </label>
        <label className={label} htmlFor={`ord-${uid}`}>
          Orden
          <input id={`ord-${uid}`} name="sortOrder" type="number" inputMode="numeric" min={0} max={999} defaultValue={service?.sortOrder ?? 0} className={`${field} mt-1`} />
        </label>
      </div>
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
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "Guardando…" : isNew ? "AÑADIR SERVICIO" : "GUARDAR"}
      </button>
    </form>
  );
}

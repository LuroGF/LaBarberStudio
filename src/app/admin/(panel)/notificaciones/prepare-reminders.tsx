"use client";

import { useActionState } from "react";
import { prepareReminders, type ReminderState } from "./actions";
import { btnGhost } from "@/lib/ui";

export function PrepareReminders() {
  const [state, action, pending] = useActionState<ReminderState, FormData>(() => prepareReminders(), {});
  return <form action={action} className="space-y-2">
    <button disabled={pending} className={`${btnGhost} w-full`}>{pending ? "Preparando…" : "Preparar recordatorios de las próximas 48 h"}</button>
    {state.ok && <p role="status" className="text-sm text-muted">✓ {state.ok}</p>}
    {state.error && <p role="alert" className="text-sm font-semibold">✕ {state.error}</p>}
  </form>;
}

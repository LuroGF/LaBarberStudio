"use client";

import { useTransition } from "react";
import { setWaitlistMatchStatus } from "./actions";
import { btnGhost } from "@/lib/ui";

export function WaitlistMatchActions({ id, url, available }: { id: string; url: string; available: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {available ? <a href={url} target="_blank" rel="noreferrer" className={`${btnGhost} col-span-2 sm:col-span-1`}>Abrir WhatsApp</a> : <span className="col-span-2 flex h-11 items-center justify-center rounded-xl border border-graphite text-xs text-muted sm:col-span-1">Hueco ocupado</span>}
      <button disabled={pending || !available} onClick={() => startTransition(() => setWaitlistMatchStatus(id, "sent"))} className={btnGhost}>Enviada</button>
      <button disabled={pending} onClick={() => startTransition(() => setWaitlistMatchStatus(id, "skipped"))} className={btnGhost}>Omitir</button>
    </div>
  );
}

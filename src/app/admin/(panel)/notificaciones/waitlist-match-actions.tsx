"use client";

import { useState, useTransition } from "react";
import { sendWaitlistMatchEmail, setWaitlistMatchStatus } from "./actions";
import { btnGhost } from "@/lib/ui";

export function WaitlistMatchActions({ id, url, available, emailAvailable }: { id: string; url: string; available: boolean; emailAvailable: boolean }) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok?: string; error?: string }>({});

  const sendEmail = () => startTransition(async () => {
    setNotice({});
    setNotice(await sendWaitlistMatchEmail(id));
  });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {available ? <a href={url} target="_blank" rel="noreferrer" className={btnGhost}>Abrir WhatsApp</a> : <span className="flex h-11 items-center justify-center rounded-xl border border-graphite text-xs text-muted">Hueco ocupado</span>}
        <button disabled={pending || !available || !emailAvailable} onClick={sendEmail} className={btnGhost}>{pending ? "Enviando…" : emailAvailable ? "Enviar correo" : "Sin correo"}</button>
        <button disabled={pending || !available} onClick={() => startTransition(() => setWaitlistMatchStatus(id, "sent"))} className={btnGhost}>Marcar enviada</button>
        <button disabled={pending} onClick={() => startTransition(() => setWaitlistMatchStatus(id, "skipped"))} className={btnGhost}>Omitir</button>
      </div>
      {notice.error && <p role="alert" className="text-sm font-semibold text-gold-light">{notice.error}</p>}
      {notice.ok && <p role="status" className="text-sm font-semibold text-gold">{notice.ok}</p>}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { setNotificationStatus } from "./actions";
import { btnGhost } from "@/lib/ui";

export function NotificationActions({ id, url, channel = "WhatsApp" }: { id: string; url: string; channel?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid grid-cols-3 gap-2">
      <a href={url} target="_blank" rel="noreferrer" className={`${btnGhost} col-span-3 sm:col-span-1`}>Abrir {channel}</a>
      <button disabled={pending} onClick={() => startTransition(() => setNotificationStatus(id, "sent"))} className={btnGhost}>Enviada</button>
      <button disabled={pending} onClick={() => startTransition(() => setNotificationStatus(id, "skipped"))} className={btnGhost}>Omitir</button>
    </div>
  );
}

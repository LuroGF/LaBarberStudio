"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";

const DISMISSED_KEY = "la-barber-pwa-install-dismissed";
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;

type InstallChoice = { outcome: "accepted" | "dismissed" };
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"prompt" | "ios" | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const dismissedAt = readDismissedAt();
    if (standalone || Date.now() - dismissedAt < DISMISS_FOR_MS) return;

    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (!mobile) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const iosTimer = ios ? window.setTimeout(() => setMode("ios"), 1600) : undefined;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setMode("prompt");
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setMode(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      if (iosTimer) window.clearTimeout(iosTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    rememberDismissed();
    setMode(null);
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "dismissed") rememberDismissed();
    setInstallPrompt(null);
    setMode(null);
  };

  if (!mode) return null;

  return (
    <aside aria-label="Instalar LA BARBER STUDIO" className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md rounded-2xl border border-gold/35 bg-[#1b1b1b]/98 p-4 shadow-2xl backdrop-blur-xl md:hidden">
      <button type="button" onClick={dismiss} aria-label="Cerrar invitación de instalación" className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-muted transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
      <div className="flex gap-3 pr-9">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold text-black">{mode === "ios" ? <Share2 size={20} /> : <Download size={20} />}</span>
        <div>
          <p className="font-extrabold text-white">Instala LA BARBER</p>
          <p className="mt-1 text-sm leading-5 text-muted">Accede a tus citas y reserva más rápido desde la pantalla de inicio.</p>
        </div>
      </div>
      {mode === "ios" ? (
        <p className="mt-4 rounded-xl bg-background px-4 py-3 text-sm leading-5 text-foreground">Pulsa <strong>Compartir</strong> y después <strong>Añadir a pantalla de inicio</strong>.</p>
      ) : (
        <button type="button" onClick={() => void install()} className="mt-4 h-11 w-full rounded-full bg-gold text-xs font-extrabold uppercase tracking-wide text-black transition active:scale-[0.98]">Instalar aplicación</button>
      )}
    </aside>
  );
}

function readDismissedAt() {
  try { return Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0); } catch { return 0; }
}

function rememberDismissed() {
  try { window.localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* El aviso se ocultará durante esta sesión. */ }
}

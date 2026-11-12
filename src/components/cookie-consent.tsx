"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";

export const CONSENT_STORAGE_KEY = "la-barber-cookie-consent-v1";
export const CONSENT_CHANGE_EVENT = "la-barber:consent-change";
export const CONSENT_OPEN_EVENT = "la-barber:open-consent";

export type ConsentPreferences = {
  external: boolean;
  updatedAt: string;
};

export function readConsent(): ConsentPreferences | null {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value ? JSON.parse(value) as ConsentPreferences : null;
  } catch {
    return null;
  }
}

function consentSnapshot() {
  try { return window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? ""; } catch { return ""; }
}

function subscribeConsent(callback: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useConsentPreferences(): ConsentPreferences | null {
  const snapshot = useSyncExternalStore(subscribeConsent, consentSnapshot, () => "");
  try { return snapshot ? JSON.parse(snapshot) as ConsentPreferences : null; } catch { return null; }
}

export function saveConsent(external: boolean) {
  const preferences = { external, updatedAt: new Date().toISOString() } satisfies ConsentPreferences;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: preferences }));
}

export function CookieConsent() {
  const preferences = useConsentPreferences();
  const [forcedOpen, setForcedOpen] = useState(false);

  useEffect(() => {
    const reopen = () => setForcedOpen(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  const open = forcedOpen || preferences === null;
  if (!open) return null;

  const choose = (external: boolean) => {
    saveConsent(external);
    setForcedOpen(false);
  };

  return (
    <aside aria-label="Preferencias de privacidad" className="fixed inset-x-4 bottom-20 z-[80] mx-auto max-w-3xl rounded-2xl border border-white/15 bg-[#1b1b1b]/95 p-5 shadow-2xl backdrop-blur-xl md:bottom-5 md:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-white">Tu privacidad</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Usamos almacenamiento necesario para el acceso y las reservas. Google Maps solo se cargará si aceptas el contenido externo.
          </p>
          <p className="mt-2 text-xs text-muted"><Link className="underline underline-offset-4 hover:text-white" href="/cookies">Ver política de cookies</Link></p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={() => choose(false)} className="h-11 rounded-full border border-white/20 px-5 text-xs font-bold uppercase transition hover:border-white">Solo necesarias</button>
          <button type="button" onClick={() => choose(true)} className="h-11 rounded-full bg-gold px-5 text-xs font-extrabold uppercase text-black transition hover:bg-gold-light">Aceptar todo</button>
        </div>
      </div>
    </aside>
  );
}

export function CookieSettingsLink({ className = "" }: { className?: string }) {
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}>Configurar cookies</button>;
}


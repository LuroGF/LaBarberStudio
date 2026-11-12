"use client";

import { ArrowUpRight, MapPin } from "lucide-react";
import { saveConsent, useConsentPreferences } from "@/components/cookie-consent";

export function ConsentMap({ businessName, address, mapsUrl, embedUrl }: { businessName: string; address: string; mapsUrl: string; embedUrl: string }) {
  const allowed = Boolean(useConsentPreferences()?.external);

  return (
    <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-background">
      {allowed ? (
        <iframe
          title={`Mapa de ${businessName}`}
          src={embedUrl}
          className="h-[22rem] w-full border-0 saturate-[0.9] contrast-[1.03] sm:h-[30rem]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="flex h-[22rem] flex-col items-center justify-center px-6 text-center sm:h-[30rem]">
          <span className="flex size-14 items-center justify-center rounded-full border border-gold/35 text-gold"><MapPin size={25} /></span>
          <h3 className="mt-5 text-xl font-extrabold uppercase text-white">Mapa protegido</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">Para mostrar el mapa, Google necesita cargar contenido externo. Puedes permitirlo ahora o abrir la dirección directamente.</p>
          <button type="button" onClick={() => saveConsent(true)} className="mt-6 h-11 rounded-full bg-gold px-5 text-xs font-extrabold uppercase text-black transition hover:bg-gold-light">Permitir Google Maps</button>
          <p className="mt-4 text-xs text-muted">{address}</p>
        </div>
      )}
      <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 border-t border-white/10 px-6 py-4 text-sm font-bold transition hover:bg-gold/10 hover:text-gold-light">
        Abrir en Google Maps <ArrowUpRight size={18} />
      </a>
    </div>
  );
}


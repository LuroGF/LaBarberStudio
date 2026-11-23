import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowRight, ArrowUpRight, AtSign, CalendarDays, Clock3, MapPin, MessageCircle, Sparkles, UserRound } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { ConsentMap } from "@/components/consent-map";
import { CookieSettingsLink } from "@/components/cookie-consent";
import { WEEKDAYS, formatEuros } from "@/lib/schedule";
import { buildHairSalonJsonLd, serializeJsonLd } from "@/lib/seo";
import { createServiceClient } from "@/lib/supabase/admin";
import type { BusinessHourRow, Service } from "@/lib/types";

export const metadata: Metadata = { alternates: { canonical: "/" } };

type BusinessSettings = {
  business_name: string;
  barber_display_name: string;
  address: string;
  phone_whatsapp: string;
  instagram_handle: string;
};

const fallbackSettings: BusinessSettings = {
  business_name: "LA BARBER STUDIO",
  barber_display_name: "LA BARBER STUDIO",
  address: "Fuenlabrada, Madrid",
  phone_whatsapp: "",
  instagram_handle: "labarber.studio",
};

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-8">
        <Link href="#inicio" aria-label="Ir al inicio" className="flex min-h-11 items-center"><Wordmark className="text-[1.05rem] min-[360px]:text-[1.15rem] sm:text-[1.35rem]" /></Link>
        <nav aria-label="Navegación principal" className="hidden items-center gap-8 text-xs font-semibold uppercase tracking-[0.14em] lg:flex">
          <Link className="transition hover:text-gold-light" href="#servicios">Servicios</Link>
          <Link className="transition hover:text-gold-light" href="#experiencia">La experiencia</Link>
          <Link className="transition hover:text-gold-light" href="#visitanos">Visítanos</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/mi-cuenta" className="hidden h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-xs font-bold uppercase tracking-wide transition hover:border-white sm:flex">
            <UserRound size={16} /> Mis citas
          </Link>
          <Link href="/reservar" className="inline-flex h-11 items-center rounded-full bg-gold px-4 text-[0.7rem] font-extrabold uppercase tracking-wide text-black shadow-[0_8px_24px_rgba(201,164,92,0.18)] transition hover:bg-gold-light active:scale-[0.98] sm:px-5 sm:text-xs">Reservar</Link>
        </div>
      </div>
    </header>
  );
}

async function LandingContent() {
  await connection();
  const supabase = createServiceClient();
  const [servicesResult, settingsResult, hoursResult] = await Promise.all([
    supabase.from("services").select("id, name, description, price_cents, duration_minutes, is_active, sort_order").eq("is_active", true).order("sort_order"),
    supabase.from("business_settings").select("business_name, barber_display_name, address, phone_whatsapp, instagram_handle").eq("id", true).maybeSingle(),
    supabase.from("business_hours").select("id, weekday, start_time, end_time").order("weekday").order("start_time"),
  ]);

  const services = (servicesResult.data ?? []) as Service[];
  const settings = (settingsResult.data as BusinessSettings | null) ?? fallbackSettings;
  const hours = (hoursResult.data ?? []) as BusinessHourRow[];
  const whatsappUrl = buildWhatsappUrl(settings.phone_whatsapp);
  const instagramHandle = settings.instagram_handle.replace(/^@/, "");
  const instagramUrl = instagramHandle ? `https://instagram.com/${instagramHandle}` : null;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`;
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed`;
  const jsonLd = buildHairSalonJsonLd(settings, services, hours);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <SiteHeader />
      <main id="inicio" className="overflow-hidden pb-24 md:pb-0">
        <section className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden border-b border-white/10 sm:min-h-[calc(100dvh-5rem)]">
          <Image
            src="/brand/barbershop-hero-v1.webp"
            alt="Interior de una barbería con un sillón de barbero"
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover object-[68%_center] sm:object-[62%_center]"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(17,17,17,0.97)_0%,rgba(17,17,17,0.88)_55%,rgba(17,17,17,0.48)_100%)] sm:bg-[linear-gradient(90deg,rgba(17,17,17,0.98)_0%,rgba(17,17,17,0.88)_38%,rgba(17,17,17,0.32)_72%,rgba(17,17,17,0.42)_100%)]" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(17,17,17,0.88)_0%,rgba(17,17,17,0.2)_58%,rgba(17,17,17,0.35)_100%)] sm:bg-[linear-gradient(0deg,rgba(17,17,17,0.65),transparent_45%)]" />
          <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl items-end px-5 pb-28 pt-12 sm:min-h-[calc(100dvh-5rem)] sm:items-center sm:px-8 sm:py-16 lg:py-20">
            <div className="relative z-10 max-w-4xl animate-fade-up">
              <p className="mb-5 flex items-center gap-3 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-gold-light sm:mb-7 sm:text-xs sm:tracking-[0.24em]"><span className="h-px w-8 bg-gold sm:w-10" /> Barbería en Fuenlabrada</p>
              <h1 className="max-w-4xl text-[clamp(3rem,15vw,5rem)] font-black uppercase leading-[0.82] tracking-[-0.07em] text-white sm:text-[clamp(3.5rem,10vw,8.6rem)] sm:leading-[0.79] sm:tracking-[-0.075em]">
                Tu estilo.<br /><span className="text-gold">Tus reglas.</span>
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-6 text-[#c7c7c7] sm:mt-8 sm:text-lg sm:leading-7">Corte, detalle y criterio. Reserva tu próxima cita online, sin llamadas y en menos de un minuto.</p>
              <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
                <Link href="/reservar" className="group inline-flex h-14 items-center justify-center gap-3 rounded-full bg-gold px-7 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_12px_32px_rgba(201,164,92,0.2)] transition hover:bg-gold-light">
                  Reservar cita <ArrowRight className="transition group-hover:translate-x-1" size={18} />
                </Link>
                <Link href="/mi-cuenta" className="inline-flex h-14 items-center justify-center gap-3 rounded-full border border-white/20 px-7 text-sm font-bold uppercase tracking-wide transition hover:border-white">Consultar mis citas</Link>
              </div>
              <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#bdbdbd] sm:text-xs">Huecos reales · Confirmación por correo · Gestiona tu cita online</p>
            </div>
          </div>
        </section>

        <section id="servicios" className="scroll-mt-20 border-b border-white/10 bg-[#161616] px-5 py-16 sm:scroll-mt-24 sm:px-8 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-12 sm:gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">01 — Elige tu servicio</p>
                <h2 className="mt-3 text-3xl font-black uppercase leading-[0.95] tracking-[-0.045em] text-white sm:mt-4 sm:text-6xl">Servicios sin rodeos.</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted sm:text-base sm:leading-7">Precios y duración claros antes de reservar. Tú eliges el servicio y la hora que mejor te encaja.</p>
            </div>
            {services.length ? (
              <>
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted md:hidden">Desliza para ver todos <ArrowRight size={14} /></p>
                <div className="mobile-card-scroller -mx-5 grid snap-x snap-mandatory auto-cols-[min(84vw,22rem)] grid-flow-col gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid-flow-row md:auto-cols-auto md:gap-px md:overflow-hidden md:rounded-3xl md:border md:border-white/10 md:bg-white/10 md:p-0">
                {services.map((service, index) => (
                  <Link href={`/reservar?servicio=${service.id}`} key={service.id} className="group flex min-h-56 snap-start flex-col justify-between rounded-2xl border border-white/10 bg-[#1c1c1c] p-6 transition active:scale-[0.99] md:min-h-64 md:rounded-none md:border-0 md:p-9 md:hover:bg-[#242424]">
                    <div>
                      <div className="flex items-start justify-between gap-5">
                        <span className="text-xs font-bold tracking-[0.2em] text-muted">{String(index + 1).padStart(2, "0")}</span>
                        <ArrowUpRight className="transition group-hover:-translate-y-1 group-hover:translate-x-1" size={24} />
                      </div>
                      <h3 className="mt-7 text-2xl font-extrabold uppercase tracking-tight text-white sm:text-3xl">{service.name}</h3>
                      {service.description && <p className="mt-3 max-w-md text-sm leading-6 text-muted">{service.description}</p>}
                    </div>
                    <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5 font-bold">
                      <span className="flex items-center gap-2 text-sm text-muted"><Clock3 size={16} /> {service.duration_minutes} min</span>
                      <span className="text-lg text-gold-light">{formatEuros(service.price_cents)}</span>
                    </div>
                  </Link>
                ))}
                </div>
              </>
            ) : <div className="rounded-3xl border border-white/10 bg-surface p-10 text-muted">Los servicios estarán disponibles muy pronto.</div>}
          </div>
        </section>

        <section id="experiencia" className="scroll-mt-20 px-5 py-16 sm:scroll-mt-24 sm:px-8 sm:py-24 lg:py-32">
          <div className="mx-auto grid max-w-7xl gap-10 sm:gap-16 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">02 — La experiencia</p>
              <h2 className="mt-3 text-3xl font-black uppercase leading-[0.95] tracking-[-0.045em] text-white sm:mt-4 sm:text-6xl">Tu corte empieza antes de sentarte.</h2>
              <p className="mt-5 max-w-lg text-sm leading-6 text-muted sm:mt-7 sm:text-base sm:leading-7">Una experiencia directa, cuidada y a tu ritmo. Desde la reserva hasta el último detalle.</p>
            </div>
            <ol className="divide-y divide-white/10 border-y border-white/10">
              <ExperienceStep icon={CalendarDays} number="01" title="Reserva a tu manera">Consulta huecos reales y elige fecha y hora desde cualquier dispositivo.</ExperienceStep>
              <ExperienceStep icon={MessageCircle} number="02" title="Todo bajo control">Recibe la información de tu cita y consúltala o cancélala desde tu espacio.</ExperienceStep>
              <ExperienceStep icon={Sparkles} number="03" title="El detalle importa">Un servicio personal, sin prisas y adaptado al estilo que buscas.</ExperienceStep>
            </ol>
          </div>
        </section>

        <section id="visitanos" className="scroll-mt-20 border-y border-white/10 bg-[#161616] px-5 py-16 sm:scroll-mt-24 sm:px-8 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">03 — Ven a vernos</p>
            <div className="mt-3 grid gap-9 sm:mt-4 sm:gap-12 lg:grid-cols-2 lg:gap-24">
              <div>
                <h2 className="text-3xl font-black uppercase leading-[0.95] tracking-[-0.045em] text-white sm:text-6xl">Tu próximo corte, aquí.</h2>
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="group mt-7 flex min-h-14 max-w-lg items-start gap-3 border-t border-white/10 pt-5 sm:mt-10 sm:gap-4 sm:pt-6">
                  <MapPin className="mt-1 shrink-0 text-gold" size={22} /><span className="text-lg font-semibold leading-7 text-white">{settings.address}</span>
                  <ArrowUpRight className="ml-auto shrink-0 transition group-hover:-translate-y-1 group-hover:translate-x-1" size={20} />
                </a>
                <div className="mt-6 grid gap-3 min-[430px]:grid-cols-2 sm:mt-8 sm:flex sm:flex-wrap">
                  {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-gold/35 px-5 text-sm font-bold transition hover:border-gold hover:text-gold-light"><MessageCircle size={17} /> WhatsApp</a>}
                  {instagramUrl && <a href={instagramUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-gold/35 px-5 text-sm font-bold transition hover:border-gold hover:text-gold-light"><AtSign size={17} /> @{instagramHandle}</a>}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-background p-5 sm:rounded-3xl sm:p-9">
                <div className="mb-6 flex items-center gap-3"><Clock3 size={20} /><h3 className="text-sm font-extrabold uppercase tracking-[0.16em] text-white">Horario</h3></div>
                <dl className="divide-y divide-white/10">
                  {formatHours(hours).map(({ day, value }) => <div key={day} className="flex items-center justify-between gap-5 py-3 text-sm"><dt className="font-semibold text-white">{day}</dt><dd className="text-right text-muted">{value}</dd></div>)}
                </dl>
              </div>
            </div>
            <ConsentMap businessName={settings.business_name} address={settings.address} mapsUrl={mapsUrl} embedUrl={mapEmbedUrl} />
          </div>
        </section>

        <section className="landing-metal px-5 py-16 text-center sm:px-8 sm:py-24 lg:py-32">
          <Wordmark className="text-3xl sm:text-5xl" />
          <h2 className="mx-auto mt-8 max-w-4xl text-3xl font-black uppercase leading-[0.95] tracking-[-0.045em] text-white sm:mt-10 sm:text-7xl">¿Listo para tu próximo corte?</h2>
          <Link href="/reservar" className="group mt-8 inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-gold px-8 text-sm font-extrabold uppercase tracking-wide text-black shadow-[0_12px_32px_rgba(201,164,92,0.2)] transition hover:bg-gold-light sm:mt-10 sm:w-auto">Reservar ahora <ArrowRight className="transition group-hover:translate-x-1" size={18} /></Link>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between"><p>{settings.business_name}</p><div className="flex flex-wrap gap-x-5 gap-y-3"><Link href="/aviso-legal">Aviso legal</Link><Link href="/privacidad">Privacidad</Link><Link href="/cookies">Cookies</Link><CookieSettingsLink className="text-left" /><Link href="/mi-cuenta">Área de clientes</Link><Link href="/admin">Administración</Link></div></div></footer>
      <div className="fixed inset-x-0 bottom-0 z-50 flex gap-2 border-t border-white/10 bg-background/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(0,0,0,0.25)] backdrop-blur md:hidden"><Link href="/mi-cuenta" className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-white/15 text-xs font-bold uppercase"><UserRound size={16} /> Mis citas</Link><Link href="/reservar" className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-gold text-xs font-extrabold uppercase text-black">Reservar</Link></div>
    </>
  );
}

function ExperienceStep({ icon: Icon, number, title, children }: { icon: typeof CalendarDays; number: string; title: string; children: React.ReactNode }) {
  return <li className="grid grid-cols-[2.75rem_1fr] gap-4 py-6 sm:grid-cols-[3.5rem_1fr] sm:gap-5 sm:py-8"><div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/35 text-gold sm:h-12 sm:w-12"><Icon size={19} /></div><div><p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-gold sm:text-xs">{number}</p><h3 className="mt-1.5 text-lg font-extrabold uppercase text-white sm:mt-2 sm:text-xl">{title}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-muted sm:text-base sm:leading-7">{children}</p></div></li>;
}

function buildWhatsappUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

function formatHours(rows: BusinessHourRow[]) {
  return Object.entries(WEEKDAYS).map(([weekday, day]) => {
    const ranges = rows.filter((row) => row.weekday === Number(weekday)).map((row) => `${row.start_time.slice(0, 5)}–${row.end_time.slice(0, 5)}`);
    return { day, value: ranges.length ? ranges.join(" · ") : "Cerrado" };
  });
}

function LandingFallback() {
  return <div className="min-h-dvh animate-pulse bg-background" aria-label="Cargando página" />;
}

export default function Home() {
  return <Suspense fallback={<LandingFallback />}><LandingContent /></Suspense>;
}

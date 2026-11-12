import { LegalPageShell } from "@/components/legal-page-shell";
import { CookieSettingsLink } from "@/components/cookie-consent";

export const metadata = { title: "Cookies | LA BARBER STUDIO" };

export default function Page() {
  return (
    <LegalPageShell eyebrow="Preferencias" title="Política de cookies">
      <section><h2>1. Qué utilizamos</h2><p>La aplicación utiliza almacenamiento técnico imprescindible para mantener sesiones seguras del área de clientes y administración. También guarda localmente la elección de privacidad para no volver a preguntarla en cada visita.</p></section>
      <section><h2>2. Almacenamiento necesario</h2><p>Las cookies de autenticación de Supabase se crean cuando una persona inicia sesión. Son necesarias para identificar la sesión y proteger las zonas privadas; no se utilizan para publicidad.</p></section>
      <section><h2>3. Contenido externo</h2><p>El mapa de Google Maps permanece bloqueado hasta que el visitante lo autoriza. Al aceptarlo, Google puede recibir información técnica como la dirección IP y aplicar sus propias tecnologías conforme a sus políticas.</p></section>
      <section><h2>4. Cambiar la elección</h2><p>Puedes rechazar o volver a permitir el contenido externo en cualquier momento. El cambio se aplica al mapa en este dispositivo.</p><CookieSettingsLink className="mt-5 h-11 rounded-full border border-gold/50 px-5 text-xs font-bold uppercase text-gold-light transition hover:border-gold" /></section>
      <section><h2>5. Configuración del navegador</h2><p>También puedes eliminar cookies y datos locales desde la configuración del navegador. Si bloqueas el almacenamiento estrictamente necesario, el acceso a la cuenta puede dejar de funcionar correctamente.</p></section>
      <p className="border-t border-white/10 pt-6 text-xs">Última actualización: 12 de noviembre de 2026.</p>
    </LegalPageShell>
  );
}

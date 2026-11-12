import { Suspense } from "react";
import { connection } from "next/server";
import { LegalPageShell } from "@/components/legal-page-shell";
import { getLegalSettings, legalContact } from "@/lib/legal-settings";

export const metadata = { title: "Privacidad | LA BARBER STUDIO" };

async function Content() {
  await connection();
  const settings = await getLegalSettings();
  const owner = settings.legal_name || settings.business_name;
  const email = legalContact(settings);
  return (
    <LegalPageShell eyebrow="Protección de datos" title="Privacidad">
      <section><h2>1. Responsable</h2><p><strong>{owner}</strong>{settings.tax_id ? <> · NIF/CIF: {settings.tax_id}</> : null}<br />Dirección: {settings.legal_address || settings.address}<br />{email ? <>Contacto para privacidad: <a href={`mailto:${email}`}>{email}</a></> : <>Puedes ejercer tus derechos contactando directamente con la barbería.</>}</p></section>
      <section><h2>2. Datos tratados</h2><p>Podemos tratar nombre y apellidos, teléfono, correo electrónico, información de la cita, observaciones facilitadas por el cliente, historial de reservas y datos técnicos imprescindibles para la seguridad y el funcionamiento de la cuenta.</p></section>
      <section><h2>3. Finalidades y bases jurídicas</h2><ul><li>Gestionar solicitudes, citas, cambios, cancelaciones y la cuenta del cliente: ejecución del servicio solicitado.</li><li>Enviar comunicaciones operativas sobre la cita: ejecución del servicio e interés legítimo en prestar una atención adecuada.</li><li>Enviar avisos por WhatsApp: consentimiento expreso, que puede retirarse en cualquier momento.</li><li>Prevenir abusos y proteger el sistema: interés legítimo y cumplimiento de obligaciones legales.</li></ul></section>
      <section><h2>4. Destinatarios</h2><p>Los datos pueden ser tratados por proveedores necesarios para prestar el servicio, como Supabase para base de datos y autenticación, Vercel para alojamiento, Resend para comunicaciones operativas por correo y, únicamente cuando proceda, Meta/WhatsApp para enviar los avisos consentidos. Google Maps solo se carga si el visitante acepta contenido externo.</p></section>
      <section><h2>5. Conservación</h2><p>Los datos se conservarán mientras sean necesarios para gestionar la relación con el cliente y durante los plazos exigidos para atender posibles responsabilidades. El consentimiento para WhatsApp se mantendrá hasta su retirada.</p></section>
      <section><h2>6. Derechos</h2><p>Puedes solicitar acceso, rectificación, supresión, oposición, limitación o portabilidad, así como retirar un consentimiento, utilizando el contacto indicado. También puedes reclamar ante la Agencia Española de Protección de Datos en <a href="https://www.aepd.es" target="_blank" rel="noreferrer">aepd.es</a>.</p></section>
      <section><h2>7. Menores</h2><p>Las personas menores de edad deben realizar la reserva con la autorización de sus representantes legales cuando resulte exigible.</p></section>
      <p className="border-t border-white/10 pt-6 text-xs">Última actualización: 12 de noviembre de 2026.</p>
    </LegalPageShell>
  );
}

export default function Page() { return <Suspense><Content /></Suspense>; }


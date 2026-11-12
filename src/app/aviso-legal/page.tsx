import { Suspense } from "react";
import { connection } from "next/server";
import { LegalPageShell } from "@/components/legal-page-shell";
import { getLegalSettings, legalContact } from "@/lib/legal-settings";

export const metadata = { title: "Aviso legal | LA BARBER STUDIO" };

async function Content() {
  await connection();
  const settings = await getLegalSettings();
  const owner = settings.legal_name || settings.business_name;
  const address = settings.legal_address || settings.address;
  const email = legalContact(settings);
  return (
    <LegalPageShell eyebrow="Información legal" title="Aviso legal">
      <section><h2>1. Titular del sitio</h2><p><strong>{owner}</strong>{settings.tax_id ? <> · NIF/CIF: {settings.tax_id}</> : null}<br />Domicilio: {address}<br />{email ? <>Contacto: <a href={`mailto:${email}`}>{email}</a></> : <>Contacto disponible a través de la barbería.</>}</p></section>
      <section><h2>2. Objeto</h2><p>Este sitio permite consultar información sobre {settings.business_name}, solicitar y gestionar citas y acceder al área privada de clientes. El acceso implica aceptar estas condiciones y utilizar el servicio de forma lícita.</p></section>
      <section><h2>3. Reservas</h2><p>La disponibilidad mostrada puede cambiar hasta que la reserva quede registrada. Las condiciones de modificación y cancelación se muestran durante el proceso y pueden depender de la antelación configurada por el negocio.</p></section>
      <section><h2>4. Propiedad intelectual</h2><p>Los textos, marcas, logotipos, imágenes y elementos gráficos propios del sitio no pueden reproducirse o utilizarse sin autorización, salvo en los casos permitidos por la ley.</p></section>
      <section><h2>5. Responsabilidad y enlaces</h2><p>Se procura mantener la información y el servicio disponibles y actualizados, sin garantizar la ausencia total de interrupciones. Los enlaces a servicios externos, como Google Maps, Instagram o WhatsApp, se rigen por las condiciones de sus respectivos proveedores.</p></section>
      <section><h2>6. Legislación aplicable</h2><p>Estas condiciones se rigen por la legislación española. Las controversias se someterán a los órganos legalmente competentes, respetando en todo caso los derechos de consumidores y usuarios.</p></section>
      <p className="border-t border-white/10 pt-6 text-xs">Última actualización: 12 de noviembre de 2026.</p>
    </LegalPageShell>
  );
}

export default function Page() { return <Suspense><Content /></Suspense>; }


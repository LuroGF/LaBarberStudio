import { formatMadrid } from "@/lib/schedule";

export function notificationMessage(eventType: string, appointment: { service_name: string; starts_at: string; status: string }, customerName: string, businessName = "LA BARBER STUDIO") {
  const when = formatMadrid(appointment.starts_at, "EEEE d 'de' MMMM 'a las' HH:mm");
  const greeting = `Hola ${customerName},`;
  if (eventType === "approved") return `${greeting} tu cita de ${appointment.service_name} para el ${when} está confirmada. — ${businessName}`;
  if (eventType === "rejected") return `${greeting} no hemos podido aceptar tu solicitud de cita de ${appointment.service_name} para el ${when}. Contacta con nosotros si quieres buscar otro hueco. — ${businessName}`;
  if (eventType === "cancelled") return `${greeting} tu cita de ${appointment.service_name} para el ${when} ha sido cancelada. — ${businessName}`;
  if (eventType === "modified") return `${greeting} tu cita ha sido actualizada: ${appointment.service_name}, ${when}. — ${businessName}`;
  if (eventType === "reminder") return `${greeting} te recordamos tu cita de ${appointment.service_name} el ${when}. — ${businessName}`;
  return `${greeting} hemos recibido tu cita de ${appointment.service_name} para el ${when}. Estado: ${appointment.status === "confirmed" ? "confirmada" : "pendiente"}. — ${businessName}`;
}

export function whatsappUrl(phone: string, message: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

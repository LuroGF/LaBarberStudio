type CalendarAppointment = {
  id: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
};

const utcStamp = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

export function googleCalendarUrl(appointment: CalendarAppointment, address: string): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${appointment.serviceName} · LA BARBER STUDIO`,
    dates: `${utcStamp(appointment.startsAt)}/${utcStamp(appointment.endsAt)}`,
    details: "Cita reservada en LA BARBER STUDIO.",
    location: address,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const escapeIcs = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

export function appointmentIcs(appointment: CalendarAppointment, address: string): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LA BARBER STUDIO//Citas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@${new URL(siteUrl).host}`,
    `DTSTAMP:${utcStamp(new Date().toISOString())}`,
    `DTSTART:${utcStamp(appointment.startsAt)}`,
    `DTEND:${utcStamp(appointment.endsAt)}`,
    `SUMMARY:${escapeIcs(`${appointment.serviceName} · LA BARBER STUDIO`)}`,
    `DESCRIPTION:${escapeIcs("Cita reservada en LA BARBER STUDIO.")}`,
    `LOCATION:${escapeIcs(address)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

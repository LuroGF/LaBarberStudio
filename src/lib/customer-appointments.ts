export const PORTAL_HISTORY_GRACE_MS = 60 * 60 * 1000;

export type TimedAppointment = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
};

const ACTIVE_STATUSES = new Set(["pending", "confirmed"]);

/** Mantiene una cita activa en "Próximas" hasta una hora después de que termine. */
export function splitCustomerAppointments<T extends TimedAppointment>(appointments: T[], nowMs: number) {
  const upcoming = appointments
    .filter((item) => ACTIVE_STATUSES.has(item.status) && new Date(item.ends_at).getTime() + PORTAL_HISTORY_GRACE_MS > nowMs)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const upcomingIds = new Set(upcoming.map((item) => item.id));
  return { upcoming, history: appointments.filter((item) => !upcomingIds.has(item.id)) };
}

export function canManageCustomerAppointment(
  appointment: TimedAppointment,
  nowMs: number,
  cancellationNoticeHours: number,
) {
  const startsMs = new Date(appointment.starts_at).getTime();
  if (!ACTIVE_STATUSES.has(appointment.status) || startsMs <= nowMs) return false;
  if (appointment.status === "pending") return true;
  return startsMs - cancellationNoticeHours * 60 * 60 * 1000 > nowMs;
}

export function isFutureAppointment(appointment: TimedAppointment, nowMs: number) {
  return new Date(appointment.starts_at).getTime() > nowMs;
}


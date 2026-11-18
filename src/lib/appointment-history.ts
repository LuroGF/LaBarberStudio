export type AppointmentHistoryActor = {
  full_name: string | null;
  login_username: string | null;
};

const actionLabels: Record<string, string> = {
  created: "Cita creada",
  updated: "Datos de la cita actualizados",
  "status:pending": "Cita marcada como pendiente",
  "status:confirmed": "Cita confirmada",
  "status:completed": "Cita completada",
  "status:cancelled": "Cita cancelada",
  "status:no_show": "Marcada como no presentada",
  "status:rejected": "Solicitud rechazada",
  "status:expired": "Solicitud caducada",
};

export function appointmentHistoryActionLabel(action: string): string {
  return actionLabels[action] ?? "Cita actualizada";
}

export function appointmentHistoryActorLabel(
  actorId: string | null,
  actor?: AppointmentHistoryActor,
): string {
  if (!actorId) return "Cliente o sistema";
  if (actor?.full_name?.trim()) return actor.full_name.trim();
  if (actor?.login_username?.trim()) return `@${actor.login_username.trim()}`;
  return "Administrador";
}

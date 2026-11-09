export type Service = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
};

export type BusinessHourRow = { id: string; weekday: number; start_time: string; end_time: string };

export type ScheduleExceptionRow = {
  id: string;
  kind: "closed" | "block" | "extra_open";
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

/** Cita activa que se vería afectada por un cambio de horario o un bloqueo. */
export type Conflict = {
  id: string;
  starts_at: string;
  ends_at: string;
  service_name: string;
  status: string;
  customer: string;
  phone: string;
};

/** Resultado de una acción de formulario del panel. */
export type ActionState = {
  ok?: string;
  error?: string;
  /** Citas afectadas: el administrador debe decidir de forma explícita antes de continuar. */
  warning?: Conflict[];
};

import { formatMadrid } from "@/lib/schedule";
import type { Conflict } from "@/lib/types";

const STATUS: Record<string, string> = { pending: "Pendiente", confirmed: "Confirmada" };

/** Aviso con las citas afectadas. Los botones de decisión los pone quien lo usa (children). */
export function ConflictWarning({
  conflicts,
  title,
  children,
}: {
  conflicts: Conflict[];
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div role="alert" className="space-y-3 rounded-xl border-2 border-foreground p-4">
      <p className="font-semibold">{title}</p>
      <ul className="space-y-1 text-sm">
        {conflicts.map((c) => (
          <li key={c.id} className="flex flex-wrap justify-between gap-x-3">
            <span>
              {formatMadrid(c.starts_at, "EEE d MMM · HH:mm")} · {c.customer}
            </span>
            <span className="text-muted">
              {c.service_name} · {STATUS[c.status] ?? c.status}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">No se cancela ninguna cita sin que tú lo decidas.</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
